#!/usr/bin/env bash
# ============================================================
# AiGAP — Generic VPS deploy script (Traefik-fronted Docker stack)
#
# Tek script: kodu çeker → image build → (ops) DB bekle + migrate → up → health.
# HER ŞEYİ .env.production'dan okur; bu dosyada proje-özel hardcode YOKTUR.
#
# Sunucu modeli: paylaşılan Traefik (80/443) hostname'e göre yönlendirir.
# Projeler PORT AÇMAZ; Traefik ağına ('edge') katılır ve dynamic.yml'deki
# bir router üzerinden yayınlanır (bkz. scripts/traefik-route.sh).
#
# Kullanım (repo kökünde):
#   ./deploy.sh                 # tam deploy (çek + build + migrate + up)
#   ./deploy.sh --no-pull       # kod çekmeden mevcut dosyalarla deploy
#   ./deploy.sh --down          # servisleri durdur
#   ./deploy.sh --status        # servis durumu
#   ./deploy.sh --logs [servis] # logları izle
#   ./deploy.sh --help
# ============================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_ROOT/.env.production"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()     { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn()    { echo -e "${YELLOW}[$(date +%H:%M:%S) WARN]${NC} $*"; }
err()     { echo -e "${RED}[$(date +%H:%M:%S) ERR ]${NC} $*" >&2; exit 1; }
section() { echo -e "\n${BLUE}━━━━━ $* ━━━━━${NC}"; }

# .env'den TEK anahtar oku (dosyayı `source` ETME — değerlerdeki <,>,boşluk vb.
# shell'i bozar; compose dosyanın tamamını --env-file ile zaten okur).
getenv() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-; }

ORIG_ARGS=("$@")
MODE="full"; DO_PULL=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull) DO_PULL=0; shift ;;
    --down)    MODE="down"; shift ;;
    --status)  MODE="status"; shift ;;
    --logs)    MODE="logs"; shift; LOG_SVC="${1:-}"; [[ -n "${LOG_SVC:-}" ]] && shift || true ;;
    --help|-h) sed -n '2,28p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) err "Bilinmeyen argüman: $1 (--help)" ;;
  esac
done

# ============================================================
# Pre-flight + config
# ============================================================
section "Pre-flight"
[[ -f "$ENV_FILE" ]]        || err "$ENV_FILE yok. .env.production.example'dan kopyalayıp doldurun."
command -v docker >/dev/null 2>&1 || err "docker kurulu değil"
docker info >/dev/null 2>&1 || err "Docker daemon çalışmıyor"

GIT_REPO_URL="$(getenv GIT_REPO_URL)"
GIT_BRANCH="$(getenv GIT_BRANCH)"; GIT_BRANCH="${GIT_BRANCH:-main}"
COMPOSE_FILE="$(getenv COMPOSE_FILE)"; COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
TRAEFIK_NETWORK="$(getenv TRAEFIK_NETWORK)"; TRAEFIK_NETWORK="${TRAEFIK_NETWORK:-aigap-prod_aigap-net}"
DB_SERVICE="$(getenv DB_SERVICE)"
DB_USER="$(getenv DB_USER)"
DB_NAME="$(getenv DB_NAME)"
MIGRATE_SERVICE="$(getenv MIGRATE_SERVICE)"
MIGRATE_CMD="$(getenv MIGRATE_CMD)"
HEALTHCHECK_SERVICE="$(getenv HEALTHCHECK_SERVICE)"
HEALTHCHECK_PORT="$(getenv HEALTHCHECK_PORT)"; HEALTHCHECK_PORT="${HEALTHCHECK_PORT:-80}"
HEALTHCHECK_PATH="$(getenv HEALTHCHECK_PATH)"; HEALTHCHECK_PATH="${HEALTHCHECK_PATH:-/health}"

[[ -f "$REPO_ROOT/$COMPOSE_FILE" ]] || err "Compose dosyası yok: $REPO_ROOT/$COMPOSE_FILE"

# docker compose sarmalayıcı (repo kökünden çalışır)
dc() { ( cd "$REPO_ROOT" && docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@" ); }

log "Pre-flight OK — compose=$COMPOSE_FILE, branch=$GIT_BRANCH, net=$TRAEFIK_NETWORK"

# Yardımcı modlar
case "$MODE" in
  down)   section "Servisler durduruluyor"; dc down; log "✓ Durduruldu"; exit 0 ;;
  status) section "Servis durumu"; dc ps; exit 0 ;;
  logs)   section "Loglar (${LOG_SVC:-tümü}) — Ctrl-C ile çık"; dc logs -f --tail=200 ${LOG_SVC:-}; exit 0 ;;
esac

# ============================================================
# 1) KODU ÇEK (git) — script kendini de güncelleyip yeniden çalışır
# ============================================================
if [[ $DO_PULL -eq 1 && "${AIGAP_DEPLOY_REEXEC:-0}" != "1" ]]; then
  section "Kod güncelleniyor (git)"
  [[ -d "$REPO_ROOT/.git" ]] || err "$REPO_ROOT bir git reposu değil. Önce: git clone \$GIT_REPO_URL"
  if [[ -n "$GIT_REPO_URL" && "$GIT_REPO_URL" != *CHANGE_ME* ]]; then
    git -C "$REPO_ROOT" remote set-url origin "$GIT_REPO_URL" 2>/dev/null || true
  fi
  log "Çekiliyor: origin/$GIT_BRANCH"
  git -C "$REPO_ROOT" fetch --prune origin
  git -C "$REPO_ROOT" reset --hard "origin/$GIT_BRANCH"
  git -C "$REPO_ROOT" log -1 --pretty="  → %h %s (%an, %ar)"
  # `bash ...` ile çağır: +x biti olmasa da çalışsın
  AIGAP_DEPLOY_REEXEC=1 exec bash "$REPO_ROOT/$(basename "${BASH_SOURCE[0]}")" "${ORIG_ARGS[@]}" --no-pull
fi

# ============================================================
# 2) Traefik ağı kontrolü
# ============================================================
if ! docker network inspect "$TRAEFIK_NETWORK" >/dev/null 2>&1; then
  warn "Traefik ağı '$TRAEFIK_NETWORK' bulunamadı — servis dışarı yayınlanamayabilir."
fi

# ============================================================
# 3) BUILD
# ============================================================
section "Build"
dc build
log "✓ Build tamam"

# ============================================================
# 4) DB (ops) — başlat + hazır olmasını bekle
# ============================================================
if [[ -n "$DB_SERVICE" ]]; then
  section "Veritabanı"
  dc up -d "$DB_SERVICE"
  log "$DB_SERVICE hazır olması bekleniyor..."
  for i in $(seq 1 30); do
    if dc exec -T "$DB_SERVICE" pg_isready ${DB_USER:+-U "$DB_USER"} ${DB_NAME:+-d "$DB_NAME"} >/dev/null 2>&1; then
      log "✓ $DB_SERVICE hazır"; break
    fi
    [[ $i -eq 30 ]] && err "$DB_SERVICE health timeout — dc logs $DB_SERVICE"
    sleep 2
  done
fi

# ============================================================
# 5) MIGRATION (ops) — tek seferlik
# ============================================================
if [[ -n "$MIGRATE_SERVICE" && -n "$MIGRATE_CMD" ]]; then
  section "Migration"
  log "Çalıştırılıyor: $MIGRATE_SERVICE → $MIGRATE_CMD"
  # shellcheck disable=SC2086
  dc run --rm "$MIGRATE_SERVICE" $MIGRATE_CMD
  log "✓ Migration tamam"
fi

# ============================================================
# 6) DEPLOY
# ============================================================
section "Deploy"
dc up -d
log "✓ Servisler ayağa kalktı"

# ============================================================
# 7) HEALTH CHECK (ops)
# ============================================================
if [[ -n "$HEALTHCHECK_SERVICE" ]]; then
  section "Health check"
  log "$HEALTHCHECK_SERVICE bekleniyor (http://localhost:$HEALTHCHECK_PORT$HEALTHCHECK_PATH)..."
  for i in $(seq 1 30); do
    if dc exec -T "$HEALTHCHECK_SERVICE" wget -qO- "http://localhost:${HEALTHCHECK_PORT}${HEALTHCHECK_PATH}" >/dev/null 2>&1; then
      log "✓ $HEALTHCHECK_SERVICE healthy"; break
    fi
    [[ $i -eq 30 ]] && err "$HEALTHCHECK_SERVICE health timeout — dc logs $HEALTHCHECK_SERVICE"
    sleep 2
  done
fi

# ============================================================
# 8) POST-DEPLOY
# ============================================================
section "Post-deploy"
docker image prune -f --filter "until=48h" >/dev/null 2>&1 || true
log "✓ Deploy başarılı — commit $(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo n/a)"
dc ps --format "table {{.Name}}\t{{.Status}}" 2>/dev/null || dc ps
