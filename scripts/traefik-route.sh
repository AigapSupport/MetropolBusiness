#!/usr/bin/env bash
# ============================================================
# AiGAP — Paylaşılan Traefik dynamic.yml'e route ekle/çıkar
#
# Bu VPS'teki Traefik FILE provider kullanır (tek dosya:
# /opt/aigap/infra/traefik/dynamic.yml). Yeni bir projeyi yayınlamak için
# o dosyaya bir router + service eklemek gerekir. Bu script yedek alır,
# minimal ekleme yapar, YAML doğrular; Traefik dosyayı izlediği için
# otomatik reload olur.
#
# Kullanım (VPS'te):
#   sudo'suz çalışır ama dosya root'sa otomatik sudo dener.
#   ./traefik-route.sh add  <router-adı> <host> <hedef>
#   ./traefik-route.sh remove <router-adı>
#
# Örnek:
#   ./traefik-route.sh add myproj myproj.com myproj-web:80
#   ./traefik-route.sh add myproj "myproj.com,www.myproj.com" myproj-web:80
#   ./traefik-route.sh remove myproj
#
# Ortam değişkenleri (ops):
#   TRAEFIK_DYNAMIC=/opt/aigap/infra/traefik/dynamic.yml
#   CERT_RESOLVER=le
# ============================================================
set -euo pipefail

DYN="${TRAEFIK_DYNAMIC:-/opt/aigap/infra/traefik/dynamic.yml}"
RESOLVER="${CERT_RESOLVER:-le}"
ACTION="${1:-}"; NAME="${2:-}"; HOSTS="${3:-}"; TARGET="${4:-}"

red(){ echo -e "\033[0;31m$*\033[0m" >&2; }
grn(){ echo -e "\033[0;32m$*\033[0m"; }

# root değilse ve dosya yazılamıyorsa sudo kullan
SUDO=""
if [[ ! -w "$DYN" ]]; then SUDO="sudo -n"; fi
run(){ $SUDO "$@"; }

[[ -f "$DYN" ]] || { red "dynamic.yml yok: $DYN (TRAEFIK_DYNAMIC ile yol verin)"; exit 1; }

case "$ACTION" in
  add)
    [[ -n "$NAME" && -n "$HOSTS" && -n "$TARGET" ]] || { red "Kullanım: $0 add <router-adı> <host[,host2]> <hedef:port>"; exit 1; }
    if run grep -q "[\" ]$NAME:" "$DYN" 2>/dev/null || run grep -q "service: $NAME" "$DYN" 2>/dev/null; then
      red "'$NAME' router'ı zaten var gibi. Önce remove edin."; exit 1
    fi
    BK="${DYN}.bak.$(date -u +%Y%m%d-%H%M%S)"
    run cp -a "$DYN" "$BK"; grn "Yedek: $BK"

    # Host kuralı: virgülle ayrılmış host'ları Host(`a`) || Host(`b`) yap
    RULE=""
    IFS=',' read -ra HS <<< "$HOSTS"
    for h in "${HS[@]}"; do h="$(echo "$h" | xargs)"; [[ -z "$h" ]] && continue
      RULE="${RULE:+$RULE || }Host(\`$h\`)"; done

    cat > /tmp/_route_r.txt <<EOF
    $NAME:
      rule: '$RULE'
      entryPoints: [websecure]
      service: $NAME
      tls:
        certResolver: $RESOLVER
EOF
    cat > /tmp/_route_s.txt <<EOF
    $NAME:
      loadBalancer:
        servers:
          - url: 'http://$TARGET'
EOF
    run sed -e "/^  routers:/r /tmp/_route_r.txt" -e "/^  services:/r /tmp/_route_s.txt" "$DYN" > /tmp/_route_new.yml
    if command -v python3 >/dev/null 2>&1 && python3 -c "import yaml" 2>/dev/null; then
      python3 -c "import yaml,sys; d=yaml.safe_load(open('/tmp/_route_new.yml')); assert '$NAME' in d['http']['routers'] and '$NAME' in d['http']['services']; print('YAML OK')" || { red "YAML doğrulama başarısız — değişiklik UYGULANMADI"; rm -f /tmp/_route_*.txt /tmp/_route_new.yml; exit 1; }
    fi
    run cp /tmp/_route_new.yml "$DYN"
    rm -f /tmp/_route_r.txt /tmp/_route_s.txt /tmp/_route_new.yml
    grn "✓ Route eklendi: $RULE → http://$TARGET (resolver: $RESOLVER)"
    grn "  Traefik dosyayı otomatik reload eder; sertifika birkaç sn içinde gelir."
    ;;

  remove)
    [[ -n "$NAME" ]] || { red "Kullanım: $0 remove <router-adı>"; exit 1; }
    BK="${DYN}.bak.$(date -u +%Y%m%d-%H%M%S)"
    run cp -a "$DYN" "$BK"; grn "Yedek: $BK"
    # '    <name>:' bloğunu (6-girintili alt satırlarıyla) hem routers hem
    # services altından sil. awk ile blok-bazlı.
    run awk -v n="$NAME" '
      $0 ~ "^    " n ":[ \t]*$" { skip=1; next }
      skip==1 { if ($0 ~ /^    [A-Za-z0-9_-]+:[ \t]*$/) { skip=0 } else { next } }
      { print }
    ' "$DYN" > /tmp/_route_new.yml
    run cp /tmp/_route_new.yml "$DYN"; rm -f /tmp/_route_new.yml
    grn "✓ '$NAME' router+service kaldırıldı."
    ;;

  *)
    red "Kullanım: $0 {add|remove} ..."
    echo "  $0 add <router-adı> <host[,host2]> <hedef:port>"
    echo "  $0 remove <router-adı>"
    exit 1 ;;
esac
