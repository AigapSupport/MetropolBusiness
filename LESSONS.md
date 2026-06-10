# LESSONS — Karşılaşılan Sorunlar & Dersler

> Geliştirme sırasında karşılaşılan engeller, kök nedenleri ve çözümleri/geçici yolları. Tarihler UTC+3.

---

## 2026-06-10 — Docker Desktop bu sunucuda başlatılamıyor (Faz 0.2)

**Belirti:** `docker compose up -d` → `unable to get image: failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.

**Kök neden zinciri:**
1. Ortam **Windows Server 2022** ve oturum **yönetici (admin) yetkisiz** çalışıyor.
2. `com.docker.service` durdurulmuş; `Start-Service` → erişim hatası (yükseltme gerekiyor).
3. Docker Desktop uygulaması başlatıldı (süreçler ayakta) ama Linux engine kalkmıyor.
4. WSL durumu: varsayılan sürüm **1**, **hiç dağıtım yok**; `wsl --set-default-version 2` etkisiz/başarısız (kutu içi eski WSL + yetki).
5. `Get-WindowsOptionalFeature` dahi "İstenen işlem için yükseltme gerekiyor" diyor → Windows özelliği etkinleştirme/feature sorgusu admin istiyor.
6. Not: Docker Desktop, Windows Server'da resmî olarak desteklenmez (Win 10/11 içindir).

**Denenenler (başarısız):** servis başlatma, Docker Desktop'ı elle başlatıp 6+ dk daemon bekleme, WSL2'ye geçirme, kernel güncelleme (`--web-download` bu WSL sürümünde yok).

**Sonuç / geçici durum:**
- `infra/docker/docker-compose.yml` yazıldı ve `docker compose config --quiet` ile **sözdizimi doğrulandı** — Docker'ı çalışan herhangi bir makinede `up -d` ile kullanılabilir.
- Konteynerler **bu sunucuda ayağa kaldırılamadı** (ortam kısıtı, kod hatası değil).

**Kalıcı çözüm için gereken (yönetici aksiyonu):**
```powershell
# Yükseltilmiş (admin) PowerShell'de:
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart
wsl --set-default-version 2
wsl --update
# Docker Desktop'ı yeniden başlat; gerekirse com.docker.service'i Automatic yap.
```

**Faz 1'e etkisi:** EF Core migration'ları ve entegrasyon testleri yerel PostgreSQL ister. Docker çözülene kadar alternatifler: (a) yönetici Docker'ı etkinleştirir, (b) uzak/test PostgreSQL bağlantı dizesi kullanılır, (c) testlerde Testcontainers yerine SQLite/InMemory **yalnızca** birim test düzeyinde (tenant filtresi davranış farkları nedeniyle entegrasyon testleri yine gerçek Postgres ister).

---

## 2026-06-10 — wsl.exe çıktısı PowerShell'de bozuk görünüyor

**Belirti:** `wsl --status` çıktısı boşluklu/UTF-16 karakterlerle geliyor (`D e f a u l t...`).
**Neden:** wsl.exe UTF-16LE çıktı verir; PowerShell 5.1 bunu yanlış kod sayfasıyla okur.
**Ders:** wsl çıktısını okumadan önce `$env:WSL_UTF8=1` ayarla veya `[Console]::OutputEncoding` değiştir; karar verirken çıktıdaki boşlukları temizleyerek oku.

---

## 2026-06-10 — RN native projeleri (android/ios) bu ortamda üretilemedi (Faz 0.4)

**Belirti/kısıt:** `npx react-native init` boş olmayan klasöre kurulamaz; ayrıca iOS native projesi yalnızca macOS'ta üretilir/derlenir — bu makine Windows Server.

**Yapılan:** `mobile/` altına yalnızca TS/JS uygulama iskeleti + config (babel/metro/tsconfig/eslint) kuruldu. `index.js` AppRegistry kaydı hazır; native klasörler eklendiğinde uygulama kodu değişmez. `npm run typecheck` ve `npm run lint` doğrulandı; Metro/native build bu ortamda test edilmedi.

**Kalıcı çözüm:** macOS'ta (Android için herhangi bir makinede) RN CLI 0.74 şablonundan proje üretilip (`npx @react-native-community/cli init MetropolBusiness --version 0.74.x`) `android/` ve `ios/` klasörleri bu repoya kopyalanacak. App adı `mobile/app.json > name: MetropolBusiness` ile eşleşmeli.
