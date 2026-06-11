# DEPLOY — MetropolBusiness (AiGAP VPS / Traefik)

> Deploy modeli: [aigap-deploy-template](https://github.com/AigapSupport/aigap-deploy-template)
> (Larabay dev kurulumuyla aynı desen).
> Paylaşılan VPS'te **Traefik** 80/443'ü tutar ve hostname'e göre yönlendirir;
> bu proje **port açmaz**, `edge` ağına katılıp route ile yayınlanır.
>
> **Dev ortamı:** `yedibella.com` — repo: `https://github.com/AigapSupport/MetropolBusiness.git`
>
> | Subdomain | Ne | Container |
> |---|---|---|
> | `metropolapi.yedibella.com` | API + SignalR (mobil) | `metropolbusiness-app:8080` |
> | `metropolpanel.yedibella.com` | Firma yönetim paneli | `metropolbusiness-panel:80` |
> | `metropolyonetim.yedibella.com` | Platform paneli | `metropolbusiness-admin:80` |

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
ssh aigap@213.136.89.144
# private ise URL'e fine-grained PAT (Contents: Read) göm
git clone https://github.com/AigapSupport/MetropolBusiness.git ~/metropolbusiness
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
Seed dev giriş bilgileri (YALNIZCA dev): `admin@demo.local` ve `admin@atlas.local`,
şifre `Demo1234!` (company_admin). Gerçek platform_admin kaydı için DB'de
`users.role='platform_admin'` satırı açılır ve `POST /auth/set-password`
davet akışıyla şifre belirlenir.

## Yayına alma (Traefik route'ları — 3 adet)

```bash
./scripts/traefik-route.sh add metropolbusiness-api    metropolapi.yedibella.com     metropolbusiness-app:8080
./scripts/traefik-route.sh add metropolbusiness-panel  metropolpanel.yedibella.com   metropolbusiness-panel:80
./scripts/traefik-route.sh add metropolbusiness-admin  metropolyonetim.yedibella.com metropolbusiness-admin:80
```
DNS'lerin VPS IP'sine baktığından emin olun; TLS'i Traefik (`le`) otomatik alır.
SignalR websocket Traefik'ten sorunsuz geçer (ek ayar gerekmez).

## Güncelleme

```bash
ssh aigap@213.136.89.144 'cd ~/metropolbusiness && ./deploy.sh'
```

## Mobil yapılandırma ve build

`mobile/src/utils/config.ts` varsayılan olarak dev sunucusuna bakar
(`https://metropolapi.yedibella.com`); yerel backend için dosyadaki yoruma bak.
(react-native-config ile .env'e taşınması TODO'da.)

**Dev girişi:** SMS sağlayıcı bağlanana kadar (NoopSmsSender) dev sunucuda
`DEV_FIXED_OTP=123456` açık — seed telefonları (`5550000001..4`) + kod `123456`.
Üretimde bu değişken BOŞ bırakılır.

### Android APK (Windows'ta, admin gerekmez)
```powershell
# Araçlar (tek seferlik): Temurin JDK 17 + Android cmdline-tools → C:\Users\<u>\tools
#   sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" + lisanslar
$env:JAVA_HOME="C:\Users\<u>\tools\jdk-17..."; $env:ANDROID_HOME="C:\Users\<u>\tools\android-sdk"
cd mobile\android
.\gradlew assembleRelease     # çıktı: app\build\outputs\apk\release\app-release.apk
```
Release build'i RN şablonu gereği debug keystore ile imzalıdır — dev dağıtımı için
yeterli; mağaza yayını öncesi gerçek keystore üretilecek (Faz 3).

### iOS (Mac gerektirir)
```bash
cd mobile && npm install
cd ios && pod install              # CocoaPods (brew install cocoapods)
open MetropolBusiness.xcworkspace  # Xcode 15+
# Signing & Capabilities → Team seç (ücretsiz Apple ID 7 günlük imza verir),
# hedef cihazı seçip Run. Dağıtım için TestFlight (Apple Developer hesabı gerekir).
```
Notlar: Info.plist'te kamera/konum izin metinleri hazır; `config.ts` zaten dev
API'ye baktığı için ek ayar gerekmez. ATS https zorunluluğu sağlanıyor (TLS var).

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
