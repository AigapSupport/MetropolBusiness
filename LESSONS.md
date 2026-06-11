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

**✅ ÇÖZÜLDÜ (2026-06-10):** Proje sahibi dosyayı sağladı; `Models/MetropolModels.cs`'e taşındı (yalnız namespace + Newtonsoft temizliği; alan adları/tipleri birebir). `MetropolAuthClient` + `MetropolApiClient` (16 uç) yazıldı; token servisi gerçek sözleşmeye bağlandı (GenerateTokenRequest: ConsumerId/ConsumerName/RefNo; TTL = `expiration − getdate` → yerel saatten bağımsız). **Kalan varsayımlar (Metropol testinde teyit edilecek):**
1. AES anahtarı UTF-8 ile 16 bayt kabul edildi (orijinal şifreleme kodu paylaşılmadı, yalnız modeller geldi).
2. `getdate` yanıt şeması sözleşmede yok — ham gövde tarih olarak ayrıştırılıyor (düz/JSON-string toleranslı).
3. `BalanceTransferRequest.Amount` **int** — TL tam sayı mı kuruş mu belirsiz; uygulama katmanı tam-TL doğrulamasıyla gönderecek, Metropol testinde netleşecek.
4. `PaymentInfo.PaymentTypeId` ve `BankRefCode` semantiği belgelenmemiş — SaleConfirm akışı (Faz 1.6) test ortamında doğrulanacak.

---

## 2026-06-10 — RN native projeleri (android/ios) bu ortamda üretilemedi (Faz 0.4)

**Belirti/kısıt:** `npx react-native init` boş olmayan klasöre kurulamaz; ayrıca iOS native projesi yalnızca macOS'ta üretilir/derlenir — bu makine Windows Server.

**Yapılan:** `mobile/` altına yalnızca TS/JS uygulama iskeleti + config (babel/metro/tsconfig/eslint) kuruldu. `index.js` AppRegistry kaydı hazır; native klasörler eklendiğinde uygulama kodu değişmez. `npm run typecheck` ve `npm run lint` doğrulandı; Metro/native build bu ortamda test edilmedi.

**Kalıcı çözüm:** macOS'ta (Android için herhangi bir makinede) RN CLI 0.74 şablonundan proje üretilip (`npx @react-native-community/cli init MetropolBusiness --version 0.74.x`) `android/` ve `ios/` klasörleri bu repoya kopyalanacak. App adı `mobile/app.json > name: MetropolBusiness` ile eşleşmeli.

**✅ GÜNCELLEME (2026-06-11):** android/ios klasörleri RN 0.74.5 şablonundan üretildi (Windows'ta şablon üretimi mümkün; derleme değil). 4 native modül (react-native-vision-camera v4 QR, react-native-biometrics v3, react-native-video v6, @react-native-clipboard/clipboard v1) JS entegrasyonu + izinler (AndroidManifest CAMERA/USE_BIOMETRIC, minSdk 23→26, Info.plist NSCameraUsageDescription/NSFaceIDUsageDescription) eklendi; Metro bundle doğrulandı (typecheck + lint + `react-native bundle` exit 0). Tüm native modüller `mobile/src/utils/nativeModules.ts` üzerinden guard'lı (try/catch) yüklenir — modül yoksa ekranlar placeholder/fallback davranışını korur. Ek ders: Metro yalnızca string literal `require('paket')` çağrılarını çözebilir; `require(degiskenId)` "Invalid call" hatası verir — her modül ayrı try/catch bloğuyla yüklendi. Gerçek cihaz/emülatörde build doğrulaması yeni sunucu/mac ortamında.

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

**✅ KARAR VERİLDİ (2026-06-10, proje sahibi):** Seçenek 2 — panel girişi Metropol API'lerine gitmez; **kendi API'mizle e-posta+şifre** girişi yapılır, kimlik bilgileri bizde tutulur. Uygulama: `users.password_hash` (yalnızca panel kullanıcılarında dolu), `POST /auth/login` (panel rolleri), PBKDF2 hash, deneme kilidi + rate-limit, davetle şifre belirleme. `API_CONTRACT.md §1` güncellenecek.

---

## Belgesiz Metropol semantikleri

> Metropol sözleşme dosyası (`MetropolModels.cs`) alan adlarını/tiplerini verir ama bazı alanların ANLAMI belgelenmemiştir. Aşağıdaki varsayımlar kodda `MetropolDefaults` (Integration.Metropol) isimli sabitleriyle tek yerden yönetilir; Metropol test ortamında teyit edilince burası ve sabit yorumları güncellenecek.

- **2026-06-10 (Faz 1.4) — `UserRefType`/`UserRefNo` (DeleteUser, BalanceQuery):** Tür sözlüğü belgesiz. VARSAYIM: `UserRefType = 2` "token" referans türüdür; `UserRefNo` alanına **çözülmüş UserAccountToken** konur (AddAccountConfirm'in tek kalıcı çıktısı token olduğundan çıkarıldı). Sabitler: `MetropolDefaults.TokenUserRefType` (int, BalanceQuery) ve `TokenUserRefTypeText` (string, DeleteUser — sözleşmede alan tipi string).
- **2026-06-10 (Faz 1.5) — `BalanceQueryRequest.WalletId = 0` → tüm cüzdanlar:** "tümü" değeri belgesiz; 0'ın atanmamış cüzdan kimliği olmasından çıkarıldı (API_CONTRACT §6 "varsayılan tüm cüzdanlar"). Sabit: `MetropolDefaults.AllWalletsId`.
- **2026-06-10 (Faz 1.5) — `TranTypeId` eşlemesi:** tip tablosu belgesiz. VARSAYIM: `1 = sale` (satış), diğer tüm kodlar `transfer` (bizim sözleşme "sale|transfer"). Eşleme: `MetropolDefaults.MapTranType` — doküman gelince genişletilecek.
- **2026-06-10 (Faz 1.5) — `TransactionDate` biçimi/saat dilimi belgesiz:** string döner. En iyi çaba parse: InvariantCulture → bilinen biçimler → tr-TR; saat dilimi UTC varsayılır. Hiçbiri tutmazsa kayıt ATLANMAZ, `date` alanına ham değer düşer (sessiz veri kaybı yerine görünür değer) — `BalanceService.ParseTransactionDate`.
- **2026-06-10 (Faz 1.5) — işlem tutarı işareti belgesiz:** VARSAYIM: satış (sale) harcamadır → tutar her zaman eksi gönderilir (`-Math.Abs`); transfer benzeri hareketlerde Metropol'ün işareti korunur (yön bilgisi yok) — `BalanceService.MapTransaction`.
- **2026-06-10 (Faz 1.5) — `TransactionHistory` sayfasız:** istekte sayfa parametresi yok (`UserAccountRef` tek alan); bizim sözleşme §0.4 sayfalı zarf ister → bellekte sayfalanır. Hacim büyürse `CustomerDetailReport` (PageIndex'li) değerlendirilebilir; o uç müşteri-numarası bazlı olduğundan kart-bazlı geçmişte şimdilik kullanılmadı.
- **2026-06-10 (Faz 1.6) — `PaymentInfo.PaymentTypeId` ve `BankRefCode` (SaleConfirm):** tür sözlüğü belgesiz. VARSAYIM: `PaymentTypeId = 1` cüzdan (kart bakiyesi) ödemesidir — tek ödeme aracımız kart cüzdanı olduğundan çıkarıldı; `BankRefCode` cüzdan ödemesinde boş (`""`) gönderilir. Sabit: `MetropolDefaults.WalletPaymentTypeId`. SaleConfirm her zaman TEK ödeme kalemiyle gönderilir (kısmi/çoklu ödeme aracı senaryosu sözleşmede tanımsız).
- **2026-06-10 (Faz 1.6) — WalletId kuralı yalnızca ProductId 1 ve 3 için belgeli (CLAUDE.md §6: 1→1 Resto, 3→3 Gift):** ara değerler (örn. ProductId 2 "Resto-Yemek") belgesiz. VARSAYIM: bilinmeyen ProductId güvenli tarafta Resto'ya (WalletId 1) eşlenir — `MetropolDefaults.SuggestedWalletId`; presale yanıtındaki `suggestedWalletId` öneridir, kullanıcı onay ekranında cüzdanı değiştirebilir.
- **2026-06-10 (Faz 1.6) — SaleConfirm yanıtında bakiye YOK → `balanceAfter` sözleşmeden kaldırıldı:** Metropol `SaleConfirmResponse` yalnız MerchantNo/TerminalNo/TransactionAmount döner. Confirm sonrası fazladan BalanceQuery çağrısı YAPILMAZ (gecikme + para ucunda ikinci upstream çağrı); backend bakiye cache'ini geçersiz kılar, istemci güncel bakiyeyi §6 balance ucundan alır. `API_CONTRACT.md §7`'ye not işlendi. `merchantName` de confirm yanıtında dönmez → fişte null, istemci presale ekranından taşır.
- **2026-06-10 (Faz 1.7) — `BalanceTransferRequest.Amount` int = TAM TL varsayımı:** TL mi kuruş mu belgesiz. VARSAYIM: tam sayı TL'dir; bizim decimal-string tutar tam TL değilse istek REDDEDİLİR (`VALIDATION_ERROR` "Transfer tutarı tam TL olmalıdır." — kuruş sessizce yuvarlanmaz). Metropol testinde kuruş çıkarsa yalnız `TransfersService` dönüşümü değişir.
- **2026-06-10 (Faz 1.7) — transfer alıcı QR içeriği belgesiz:** VARSAYIM: `resolve-qr` payload'ı JSON ise bilinen anahtarlardan (token/name/cardNo) maskeli alanlar çekilir, değilse payload'ın TAMAMI opak alıcı kart token'ı kabul edilir (maskeli alanlar `"***"` yer tutucu). Transferde `receiver.type="qr"` value'su da aynı şekilde opak token olarak `ReceiverCardToken` alanına konur. Metropol test ortamında gerçek QR içeriğiyle teyit edilecek.
- **2026-06-10 (Faz 1.7) — kart numarasıyla transfer SÖZLEŞME BOŞLUĞU (`receiver.type="card"` kapalı):** tam kart no bizde TUTULMAZ (yalnız maskeli, CLAUDE.md kural 4) ve Metropol sözleşmesinde kart no → token dönüşüm ucu yok (`BalanceTransferRequest` yalnız token alır). Bu yüzden `type="card"` şimdilik `VALIDATION_ERROR` "Kart numarasıyla transfer henüz desteklenmiyor." döner. Çözüm için Metropol'den no→token ucu veya akış kararı (proje sahibi) gerekiyor; netleşince `TransfersService.ResolveReceiverAsync` güncellenecek. **✅ ÇÖZÜLDÜ (2026-06-11, proje sahibi kararı):** alıcı kartı `AddAccount`/`AddAccountConfirm` OTP akışıyla doğrulanır (`POST /metropol/transfer/verify-card` + `confirm-card`; SMS alıcının karta kayıtlı telefonuna gider, aile içi senaryoda alıcı kodu gönderene söyler). Alıcının kartı `cards` tablosuna YAZILMAZ; confirm'den dönen `UserAccountToken` istemciye OPAK `receiverToken` olarak döner ve transferde `receiver.type="card"` value'su olarak 'qr' tipiyle aynı şekilde işlenir. verify-card SMS bombalamaya karşı kullanıcı başına 5/saat rate-limit'lidir (`rcpverify:` anahtarı, 429).
- **2026-06-11 — MemberId biçimi/uzunluk sınırı belgesiz (otomatik atama kararı):** KARAR 2026-06-11: her kullanıcının bir Metropol MemberId'si olur (önceden nullable + elle atanıyordu). Otomatik atama biçimi: `user.Id.ToString("N")` = **32 hex karakter** — Guid'den türediği için benzersizdir, ek sekans/sayaç altyapısı gerektirmez (`User.EnsureMemberId`; kullanıcı oluşturan servisler + `CardBalancesAndMemberId` migration backfill'i). VARSAYIM: Metropol tarafının MemberId için uzunluk/biçim sınırı (örn. yalnız sayısal, ≤N karakter) BELGESİZ — dökümandaki örnekler kısa sayısal ("3299"). 32 hex reddedilirse yalnız `EnsureMemberId` biçimi değişir (tek nokta); Metropol test ortamında AddAccountConfirm/GetPreSaleInfo ile teyit edilecek. Elle atanmış dolu MemberId'lere DOKUNULMAZ.
- **2026-06-11 (Faz 1.7) — `AddAccountConfirmRequest.MemberId`'nin bağlama etkisi belgesiz ("Başka Karta" alıcı doğrulama):** sözleşmede `MemberId` zorunlu alandır; alıcı doğrulama akışında `CardsService.ConfirmAsync` ile aynı güvenlik kuralıyla **GÖNDERENİN** `users.member_id`'si gönderilir (istemciden alınmaz). VARSAYIM: `Phone`/`Email`/`TCKN` boş gönderildiğinde çağrı yalnız OTP doğrulaması + token üretimi yapar. Metropol tarafında bu çağrının gönderene KALICI kart bağı oluşturup oluşturmadığı (ve oluşturuyorsa `DeleteUser` ile temizlik gerekip gerekmediği) BELGESİZ — Metropol test ortamında teyit edilecek; gerekiyorsa `TransfersService.ConfirmRecipientCardAsync` sonrası temizlik adımı eklenecek.

---

## 2026-06-11 — Merchant geri bildirimi için Metropol ucu yok (Faz 2.1)

**Belirti:** API_CONTRACT §9 `POST /metropol/merchants/{code}/feedback` tanımlar; ancak `MetropolModels.cs > ApiEndpoints` içinde geri bildirim ucu YOK.

**Çözüm:** Geri bildirim YEREL saklanır (`merchant_feedbacks` tablosu, tenant+kullanıcı bağlı). Metropol tarafı uç sağlarsa iletim eklenir; platform admin görünümü Faz 3 raporlama turunda değerlendirilir.

---

## 2026-06-11 — Workflow alt-agent'ları aylık harcama limitine takıldı

**Belirti:** Faz 2 backend workflow'unda iki alt-agent "monthly spend limit" hatasıyla öldü; ilk agent 8 Domain entity dosyasını yazmış hâlde kaldı.

**Çözüm/Ders:** Kalan iş ana oturumda elle tamamlandı (entity'ler devralındı, üzerine config/servis/controller/test yazıldı). Agent ölümünde çalışma ağacını `git status` ile kontrol et — yarım kalan dosyalar derlenebilir durumda olabilir ve devralınabilir.

---

## 2026-06-11 — ResetPin & DeactivateCard kapsam dışı (proje sahibi kararı)

**Karar:** PIN sıfırlama (`ResetPin`) ve kart deaktivasyonu (`DeactivateCard`) IVR akışları BU PROJEDE OLMAYACAK; ihtiyaç doğarsa ileride açılacak.

**Durum:** `IMetropolApiClient`’ta tipli metotlar hazır (sözleşme dosyasından); bizim API’de proxy ucu ve mobil ekran bilinçli olarak YOK. Açmak gerektiğinde: `Application/Cards`’a servis + `MetropolCardsController`’a uç + mobil Güvenlik/Kart Kullanım Ayarları ekranları eklenir (OTP’li IVR akışı: CardNo+MobileNo+OtpRefCode+Otp).

**Not:** Aynı ailedeki `SendOtp`/`UserBalance` IVR uçları da kullanılmıyor (uygulama OTP’si kendi backend’imizde; bakiye `BalanceQuery` ile).
