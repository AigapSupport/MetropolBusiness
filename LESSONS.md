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

**Güncelleme (Faz 1.1):** İlk migration (`InitialIdentity`) design-time factory ile DB'siz üretildi; tenant izolasyon testleri SQLite in-memory ile yazıldı (9 test yeşil). `dotnet ef database update` ve gerçek Postgres entegrasyon testleri Docker engeli çözülünce çalıştırılacak.

---

## 2026-06-10 — wsl.exe çıktısı PowerShell'de bozuk görünüyor

**Belirti:** `wsl --status` çıktısı boşluklu/UTF-16 karakterlerle geliyor (`D e f a u l t...`).
**Neden:** wsl.exe UTF-16LE çıktı verir; PowerShell 5.1 bunu yanlış kod sayfasıyla okur.
**Ders:** wsl çıktısını okumadan önce `$env:WSL_UTF8=1` ayarla veya `[Console]::OutputEncoding` değiştir; karar verirken çıktıdaki boşlukları temizleyerek oku.

---

## 2026-06-10 — MetropolModels.cs kaynağı repoda yok (Faz 1.3)

**Belirti:** `backend/src/MetropolBusiness.Integration.Metropol/Models/MetropolModels.cs` 0-byte placeholder; gerçek Metropol sözleşme dosyası (DTO'lar + `ApiEndpoints` sabitleri) projeye henüz verilmedi.

**Etki:** CLAUDE.md kural 6 sözleşmeyi uydurmayı yasaklar → `MetropolApiClient` endpoint metotları ve `IMetropolAuthClient`'ın HTTP implementasyonu (getdate/GenerateToken URL'leri) yazılamadı; TODO 1.3'te iki madde `[!]`. Sözleşmeden bağımsız kısımlar tamamlandı: AES helper, token cache + single-flight (`MetropolTokenService`), maskeleme, kısmi hata kataloğu. Token akışı için `Models/AccessTokenModels.cs` içinde minimal geçici tipler tanımlandı (AES anahtarının UTF-8/16 bayt kodlaması ve `AccessData` JSON alan adları VARSAYIMDIR).

**Gereken:** Gerçek `MetropolModels.cs` dosyasının sağlanması (proje sahibi/Metropol tarafı). Dosya gelince: placeholder'a taşı + namespace düzenle, `AccessTokenModels.cs` ile birleştir, varsayımları (anahtar kodlaması, alan adları) teyit et, `MetropolApiClient` + `IMetropolAuthClient` HTTP implementasyonunu yaz, hata kodu tablosunu genişlet.

---

## 2026-06-10 — RN native projeleri (android/ios) bu ortamda üretilemedi (Faz 0.4)

**Belirti/kısıt:** `npx react-native init` boş olmayan klasöre kurulamaz; ayrıca iOS native projesi yalnızca macOS'ta üretilir/derlenir — bu makine Windows Server.

**Yapılan:** `mobile/` altına yalnızca TS/JS uygulama iskeleti + config (babel/metro/tsconfig/eslint) kuruldu. `index.js` AppRegistry kaydı hazır; native klasörler eklendiğinde uygulama kodu değişmez. `npm run typecheck` ve `npm run lint` doğrulandı; Metro/native build bu ortamda test edilmedi.

**Kalıcı çözüm:** macOS'ta (Android için herhangi bir makinede) RN CLI 0.74 şablonundan proje üretilip (`npx @react-native-community/cli init MetropolBusiness --version 0.74.x`) `android/` ve `ios/` klasörleri bu repoya kopyalanacak. App adı `mobile/app.json > name: MetropolBusiness` ile eşleşmeli.

---

## 2026-06-10 — React Query v5 + TS 5.0.4: useQuery dönüşü sessizce `any` (Faz 1.8)

**Belirti:** `useQuery(...).data` üzerinden gelen listelerde `.map()` parametreleri `TS7006: implicitly has an 'any' type` verdi; sorgu verisinin tüm tipi kaybolmuştu (strict/no-any kuralına sessiz ihlal riski).

**Kök neden:** `@tanstack/react-query` `^5.59.20` aralığından **5.101.0** kuruluydu; bu sürümün tip bildirimi `useQuery` dönüşünde TS **5.4+** yerleşiği olan `NoInfer<T>`'i kullanıyor. Projede TS **5.0.4** vardı; `skipLibCheck` nedeniyle çözülemeyen `NoInfer` hata vermeden `any`'ye düşüyor ve tüm query verileri `any` oluyordu.

**Çözüm:** `mobile` devDependency `typescript` **5.6.3**'e sabitlendi (typescript-eslint 8.13 desteği `<5.7` olduğundan 5.6 seçildi); typecheck+lint yeşil. **Ders:** React Query 5.6x+ kullanan tüm istemcilerde (web/admin eklenirse) TS ≥ 5.4 şart; `skipLibCheck` bu tür uyumsuzlukları gizler — kütüphane güncellemesinden sonra bilinen bir tipin `any`'ye dönüp dönmediğini probe ile kontrol et.

---

## 2026-06-10 — Panel girişi (e-posta+şifre) sözleşme boşluğu (Faz 1.9)

**Belirti:** `docs/PANELS_SPEC.md §0.4` web/admin panelleri için e-posta+şifre girişi (+şifremi unuttum) tanımlar; ancak `docs/API_CONTRACT.md §1`'de yalnızca telefon+OTP akışı var ve `users` şemasında şifre (hash) kolonu yok.

**Yapılmadı (bilinçli):** Şifre kolonu ve e-posta+şifre login ucu eklemek hem API sözleşmesini hem DB şemasını tek taraflı genişletmek olurdu (CLAUDE.md §12: belirsizlikte dur ve sor). 1.9'un backend uçları panel girişinden bağımsız tamamlandı — `company_admin`/`platform_admin` rollü kullanıcılar mevcut OTP akışıyla token alabildiği için uçlar şimdiden test edilebilir durumda.

**Seçenekler (karar bekliyor):**
1. **OTP'yi panele taşımak:** panel girişi de telefon+OTP olur. Mevcut altyapı yeterli (firma admin daveti zaten telefonu zorunlu alıyor); sözleşme değişikliği minimal, şifre saklama/sıfırlama güvenlik yüzeyi hiç açılmaz. PANELS_SPEC §0.4 güncellenir.
2. **users'a password_hash kolonu + e-posta+şifre login ucu:** PANELS_SPEC'e birebir uyar; karşılığında şifre politikası, hashing, "şifremi unuttum" (e-posta gönderimi) ve ayrı rate-limit gerektirir.

**Karar sahibi:** proje sahibi. Karar netleşince `API_CONTRACT.md §1` ve `docs/TODO.md` 1.9 altındaki `[!]` maddesi güncellenecek.
