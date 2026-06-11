# DEPLOY — MetropolBusiness (AiGAP VPS / Traefik)

> Deploy modeli: [aigap-deploy-template](https://github.com/AigapSupport/aigap-deploy-template).
> Paylaşılan VPS'te **Traefik** 80/443'ü tutar ve hostname'e göre yönlendirir;
> bu proje **port açmaz**, `edge` ağına katılıp route ile yayınlanır.

## Stack (docker-compose.prod.yml)

| Servis | İmaj | Dışa açılır mı | Ne |
|---|---|---|---|
| `db` | postgres:16-alpine | hayır | Veritabanı (volume: `db_data`) |
| `redis` | redis:7-alpine | hayır | OTP/refresh/rate-limit + Metropol token + bakiye cache |
| `app` | `backend/Dockerfile` (.NET 8) | `api.DOMAIN` | API + SignalR `/hubs/chat` (8080) |
| `panel` | `web/Dockerfile` (nginx) | `panel.DOMAIN` | Firma yönetim paneli (statik + `/api` proxy) |
| `adminpanel` | `admin/Dockerfile` (nginx) | `yonetim.DOMAIN` | Platform paneli (statik + `/api` proxy) |

Paneller `/api`'yi **kendi nginx'lerinden** app'e proxy'ler → CORS yok.
Mobil uygulama doğrudan `https://api.DOMAIN/api/v1` + `wss://api.DOMAIN/hubs/chat` kullanır.

## İlk kurulum (sunucuda)

```bash
ssh aigap@<VPS_IP>
git clone https://<TOKEN>@github.com/AigapSupport/<REPO>.git ~/metropolbusiness
cd ~/metropolbusiness
cp .env.production.example .env.production
nano .env.production            # domain'ler, DB/JWT/Metropol/Gemini sırları
chmod 600 .env.production

./deploy.sh --no-pull           # build → db bekle → migrate → up → health
```

`deploy.sh`'ın migration adımı: `dc run --rm app dotnet MetropolBusiness.Api.dll migrate`
(imaj `migrate` argümanını destekler — uygular ve çıkar; dotnet-ef gerekmez).

### Seed (opsiyonel, ilk kurulumda)
```bash
docker exec -i metropolbusiness-postgres psql -U metropol -d metropolbusiness \
  < infra/scripts/seed.sql
```
Ardından ilk platform admin kullanıcısını oluşturun (geçici): seed'deki bir
company_admin OTP ile girebilir; gerçek platform_admin kaydı için DB'de
`users.role='platform_admin'` satırı açılır ve `POST /auth/set-password`
davet akışıyla şifre belirlenir.

## Yayına alma (Traefik route'ları — 3 adet)

```bash
./scripts/traefik-route.sh add metropolbusiness-api    api.DOMAIN     metropolbusiness-app:8080
./scripts/traefik-route.sh add metropolbusiness-panel  panel.DOMAIN   metropolbusiness-panel:80
./scripts/traefik-route.sh add metropolbusiness-admin  yonetim.DOMAIN metropolbusiness-admin:80
```
DNS'lerin VPS IP'sine baktığından emin olun; TLS'i Traefik (`le`) otomatik alır.
SignalR websocket Traefik'ten sorunsuz geçer (ek ayar gerekmez).

## Güncelleme

```bash
ssh aigap@<VPS_IP> 'cd ~/metropolbusiness && ./deploy.sh'
```

## Mobil yapılandırma

`mobile/src/utils/config.ts` şu an localhost'a bakar; release build öncesi:
```ts
apiBaseUrl: 'https://api.DOMAIN/api/v1',
signalRHubUrl: 'https://api.DOMAIN/hubs/chat',
```
(react-native-config ile .env'e taşınması TODO'da.)

## Deploy sonrası ilk doğrulamalar

1. `https://api.DOMAIN/health` → `Healthy`
2. Panel/Yönetim login sayfaları açılıyor; `POST /auth/login` çalışıyor
3. **Metropol varsayım testleri** (LESSONS.md "Belgesiz Metropol semantikleri"):
   gerçek AccessKey/AesKey ile `GenerateToken`, `AddAccount` akışı, `BalanceQuery`
   (UserRefType=2), `SaleConfirm` (PaymentTypeId=1), transfer `Amount` birimi,
   MemberId 32-hex kabulü — ilk uçtan uca testte teyit edilir.

## Notlar / tuzaklar (şablonla aynı)

- **Port açma** — hostname-bazlı yönlendirme; publish yok.
- `.env.production` **asla** commit edilmez; değerlerde `<`,`>` sorun değil
  (deploy.sh source etmez, grep'ler).
- `Auth__DevFixedOtp` üretimde **boş** (compose'da sabitlenmiş).
- Tek instance: SignalR backplane'siz, Metropol token kilidi process-içi —
  çoklu instance'a geçişte Redis backplane + dağıtık kilit (kodda TODO'lu).
