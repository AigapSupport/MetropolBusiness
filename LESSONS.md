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
