# MetropolBusiness

Firmalara white-label olarak dağıtılan kurumsal **yan-haklar ve dijital ödeme** platformu. Her firma uygulamayı kendi markası ve kullanıcılarıyla kullanır. Platformun çekirdeğinde **MetropolCard** yemek/market kartı entegrasyonu (kart ekleme, bakiye, QR/kısa kod ile harcama, bakiye transferi, işlem geçmişi, üye işyeri haritası); etrafında firma içi içerik (anket/duyuru/eğitim videosu), yan haklar (kampanya/kupon/hediye çeki), WebSocket tabanlı sohbet (kullanıcı + AI asistan) ve modüler İK araçları (izin/masraf) bulunur.

---

## İçerik Haritası (önce bunları oku)

| Doküman | Ne anlatır |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Ürün gereksinimleri — *ne* yapılacak (sekmeler, ekranlar, akışlar, roller) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Sistem mimarisi, PostgreSQL şeması, multi-tenancy, Metropol token akışı |
| [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) | Tüm API uçları — request/response şemaları, hata kodları |
| [`docs/TODO.md`](docs/TODO.md) | Faz bazlı görev listesi |
| [`docs/CLAUDE.md`](docs/CLAUDE.md) | AI kodlama asistanı için kalıcı talimatlar — *nasıl* geliştirilecek |

> Yeni başlıyorsan sırayla: README → PRD → ARCHITECTURE → API_CONTRACT.

---

## Mimari Özet

```
Mobile (RN)   Web (firma admin)   Admin (platform)
     \              |                  /
      \             |                 /
        ── HTTPS / JWT ──> ASP.NET Core API (tek backend)
                               |
        ┌──────────┬───────────┼───────────┬──────────┐
   PostgreSQL    Redis      SignalR    Metropol API  Gemini
   (kalıcı)   (cache/token) (sohbet)  (proxy, backend) (AI)
```

İstemciler yalnızca kendi backend'imizle konuşur; Metropol ve Gemini'ye **doğrudan erişmez**.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | ASP.NET Core (.NET 8+), C#, Clean Architecture |
| Veritabanı | PostgreSQL (EF Core) |
| Cache / Realtime | Redis · SignalR |
| Mobil | React Native + TypeScript (iOS öncelikli) |
| Web (firma) | React + TypeScript |
| Admin (platform) | React + TypeScript |
| AI | Google Gemini (backend üzerinden) |
| Auth | JWT (access + refresh), telefon + OTP |

---

## Repo Yapısı

```
MetropolBusiness/
├── docs/         # PRD, ARCHITECTURE, API_CONTRACT, TODO, CLAUDE
├── backend/      # ASP.NET Core (tek API) — Clean Architecture katmanları
│   └── src/
│       ├── *.Api / *.Application / *.Domain / *.Infrastructure
│       ├── *.Integration.Metropol   # Metropol client + AES + token + modeller
│       └── *.Integration.Gemini     # Gemini client
├── mobile/       # React Native (son kullanıcı, 5 sekme)
├── web/          # React (firma yönetim paneli)
├── admin/        # React (Metropol platform paneli)
├── shared/types/ # web + admin + mobile ortak TS tipleri
└── infra/        # docker-compose (postgres, redis), scriptler
```

---

## Hızlı Başlangıç

### Ön koşullar
- .NET 8 SDK
- Node.js 18+ ve npm
- Docker + Docker Compose
- (Mobil için) Xcode / Android Studio

### 1. Altyapıyı başlat (PostgreSQL + Redis)
```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

### 2. Ortam değişkenleri
Her uygulamada `.env.example` dosyasını `.env` olarak kopyala ve doldur:
```bash
cp backend/.env.example backend/.env
cp mobile/.env.example mobile/.env
# web / admin için de aynısı
```
> **Sırlar (Metropol AccessKey, AES Key, ConsumerId, Gemini API key) asla repoya commit edilmez.** `.env` dosyaları `.gitignore`'dadır.

### 3. Backend
```bash
cd backend
dotnet restore
dotnet ef database update --startup-project src/MetropolBusiness.Api   # migration uygula
dotnet run --project src/MetropolBusiness.Api
```
API varsayılan: `http://localhost:5000` · Sağlık: `GET /health`

### 4. Mobil
```bash
cd mobile
npm install
npm run ios        # veya: npm run android
```

### 5. Web / Admin
```bash
cd web && npm install && npm run dev
cd admin && npm install && npm run dev
```

> Komutlar proje generate edilince kesinleşecek; güncel hâli `docs/CLAUDE.md` Bölüm 9'da tutulur.

---

## Kritik Kurallar (özet — tamamı `docs/CLAUDE.md`)

1. **Tenant izolasyonu kutsaldır** — hiçbir sorgu bir firmanın verisini başkasına sızdıramaz.
2. **Metropol sırları yalnızca backend'de** — log'a, response'a, istemciye, repoya gitmez.
3. **Metropol'e istemciden doğrudan çağrı yok** — her şey backend proxy.
4. **PII maskelenir, log'lanmaz** — kart no, TCKN, OTP.
5. **Para = `decimal` / `numeric`** — asla float.
6. **Para uçlarında idempotency** — çift harcama/transfer engeli.
7. **Yıkıcı işlem onaysız çalıştırılmaz** — silmeler mümkünse soft-delete.

---

## Test & Kalite

```bash
# Backend
cd backend && dotnet test

# İstemciler
cd mobile && npm run lint && npm run typecheck
cd web    && npm run lint && npm run typecheck
cd admin  && npm run lint && npm run typecheck
```
Zorunlu testler: para hareketi (harcama/transfer), tenant izolasyonu, modül yetkilendirme, Metropol AES token üretimi, maskeleme.

---

## Geliştirme Akışı

- `main`'e doğrudan push yok → feature branch + PR.
- Commit mesajı: `<alan>: <ne yapıldı>` (örn. `metropol: token cache eklendi`).
- PR öncesi: backend `dotnet test`, istemci `lint` + `typecheck` geçmeli.

---

## Durum

Şu an **doküman ve iskelet** aşamasında (Faz 0). Yol haritası ve görevler için `docs/TODO.md`. Netleştirilmesi gereken açık kararlar `docs/PRD.md` Bölüm 17'de.

---

## Ortamlar

| Ortam | Metropol Auth URL | Metropol API URL |
|---|---|---|
| Test | `testauth.metropolodeme.com` | `testapi.metropolcard.com` |
| Prod | (env ile) | (env ile) |
