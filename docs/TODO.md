# TODO — MetropolBusiness

> Faz bazlı görev listesi. Kaynak: `docs/PRD.md`, kurallar: `docs/CLAUDE.md`.
> Durum: `[ ]` yapılacak · `[~]` devam · `[x]` bitti · `[!]` engelli/karar bekliyor

## VARSAYIMLAR (PRD Bölüm 17 — netleşince güncelle)
- Tenant: build-time (her firma kendi build'i) + firma kodu fallback.
- Web ve Admin: ayrı React app'leri.
- AI asistan kişiliği: firma admin tanımlar + kullanıcı isim verir (varsayım).
- Masraf onayı: tek aşamalı.
- Bakiye: kısa cache + manuel yenileme.
- Push: FCM (Android) + APNs (iOS), Faz 3.

---

## FAZ 0 — KURULUM & ALTYAPI

### 0.1 Repo & araçlar
- [x] Git init, branch stratejisi (main + feature), PR şablonu (`.github/`)
- [x] `.gitignore` (.NET, node, .env, build çıktıları) — kök + alt klasörler
- [x] `.editorconfig` + format kuralları (C# + TS)
- [x] `.env.example` dosyaları (backend/mobile/web/admin) — gerçek sır yok

### 0.2 Altyapı (infra)
- [x] docker-compose: PostgreSQL + Redis (sözdizimi doğrulandı; bu sunucuda Docker çalıştırılamıyor — bkz. `LESSONS.md`)
- [x] Local geliştirme README (kurulum adımları) — `infra/README.md`
- [x] Seed script (örnek tenant + kullanıcı) — `infra/scripts/seed.sql` (migration sonrası çalıştırılır)

### 0.3 Backend iskelet
- [x] `dotnet new` solution + projeler (Api, Application, Domain, Infrastructure, Integration.Metropol, Integration.Gemini, tests) — net8.0
- [x] Katman bağımlılık referansları (Api→Application→Domain; Infra/Integration içe bağlı değil)
- [x] DI, configuration, options pattern (Metropol/Gemini/Jwt/Redis options + DI uzantıları)
- [x] Sağlık kontrolü `GET /health` (entegrasyon testi + canlı Kestrel'de doğrulandı: 200 Healthy)
- [x] Yapısal logging (PII'siz JSON console), global exception middleware, hata zarfı `{code,message,details}`

### 0.4 İstemci iskeletleri
- [x] Mobile: RN 0.74 (TS), navigasyon (5 sekme + AuthStack), tema/token altyapısı (runtime palet), localization (TR/EN, i18next), API client, React Query — typecheck+lint ✓ (native android/ios klasörleri bu ortamda üretilemedi, bkz. `LESSONS.md`)
- [x] Web: React (TS, Vite) init, routing (PANELS_SPEC A), auth guard, API client — typecheck+lint+build ✓
- [x] Admin: React (TS, Vite) init, routing (PANELS_SPEC B), auth guard, API client — typecheck+lint+build ✓
- [x] `shared/types`: ortak DTO tipleri (API_CONTRACT §1–13) + paylaşım yöntemi (`@shared/*` path alias; bkz. `shared/types/README.md`)

---

## FAZ 1 — MVP

### 1.1 Çok-kiracılılık & kimlik (BACKEND — ÖNCE BU)
- [x] Entity: Tenant, User (rol enum), Segment, UserSegment (+Module, SegmentModule)
- [x] EF Core + PostgreSQL (Npgsql, snake_case), ilk migration `InitialIdentity` üretildi (DB'ye uygulama Docker engeli çözülünce — bkz. `LESSONS.md`)
- [x] `ITenantContext` + JWT'den tenant_id okuma (`HttpTenantContext`, claim'den; header'dan alınmaz)
- [x] EF global query filter (TenantId + soft-delete + join tabloları) + TenantId otomatik atama (SaveChanges)
- [x] **Test:** A firması kullanıcısı B firması verisine erişemez — 9 izolasyon testi (SQLite in-memory; gerçek Postgres entegrasyon testi Docker sonrası)
- [x] JWT access+refresh üretimi, rol+tenant claim (`JwtTokenService`; refresh saklama/rotasyon 1.2'de)
- [x] Rol/yetki attribute'ları (endpoint guard) — `PolicyNames`: PlatformAdmin/CompanyAdmin/Approver/TenantUser

### 1.2 Auth (BACKEND + MOBILE)
- [x] `POST /auth/otp/send` (rate-limit, Redis) — AuthService + IDistributedCache store'lar (`Redis.Enabled=true` → Redis, değilse in-memory); telefon başına 60 sn resend penceresi, OTP yalnızca SHA256 hash saklanır, Dev'de `Auth:DevFixedOtp=123456`
- [x] `POST /auth/otp/verify` (3 deneme kilidi) — 3 hatalı denemede `OTP_LOCKED` (423); refresh hash'i store'a yazılır, `isNewUser` = ad boş
- [x] `POST /auth/refresh`, `POST /auth/logout` — rotasyon: TakeAsync (oku+sil), eski refresh ikinci kullanımda `REFRESH_INVALID` (401); logout her durumda 204 — 12 unit test (AuthServiceTests)
- [x] Mobile: splash, telefon girişi, OTP ekranı, profil tamamlama — prototipten (screens-auth.jsx) taşındı; otp/send+verify React Query hook'larıyla bağlı, OTP_INVALID/OTP_LOCKED/OTP_RATE_LIMIT mesajları localization'dan; profil tamamlama şimdilik lokal (PUT /me ucu gelince bağlanacak)
- [x] Mobile: biyometrik giriş — react-native-biometrics sarmalı (`utils/biometrics.ts`, guard'lı: modül yoksa sensör yok kabul edilir); `biometricEnabled` kalıcı (Keychain/fallback, `tokenStorage.ts`); açılış restore'unda tercih açık + sensör varsa `simplePrompt` — başarısızsa oturum AÇILMAZ (token silinmez, tekrar dene/iptal=login'e düşer); OTP doğrulama sonrası bir kerelik "Biyometrik girişi aç?" önerisi + Hesabım ekranında toggle. NOT: JS entegrasyonu + izinler (USE_BIOMETRIC, NSFaceIDUsageDescription) hazır; cihaz doğrulaması native build ile
- [x] Mobile: token saklama (secure storage), sessiz yenileme, login'e düşme — `tokenStorage.ts` (Keychain/Keystore + bu ortamda in-memory fallback), 401'de tek uçuş refresh + istek tekrarı, refresh geçersizse logout → RootNavigator login'e düşer

### 1.3 Metropol entegrasyon katmanı (BACKEND — KRİTİK)
- [x] `MetropolModels.cs` taşı + namespace düzenle — kaynak dosya 2026-06-10'da sağlandı; `Models/MetropolModels.cs`'e taşındı (alan adları/tipleri birebir; yalnız namespace + Newtonsoft bağımlılığı temizliği)
- [x] AES helper (CBC/PKCS7/IV=16 sıfır/128-bit) + Base64 — **unit test** (`AesEncryptionHelper` + roundtrip/determinizm/anahtar testleri)
- [x] `GenerateToken` + `getdate` ile saat farkı çözümü — `MetropolTokenService` gerçek sözleşmeye bağlandı (ConsumerId/ConsumerName/RefNo; TTL = expiration − getdate); `MetropolAuthClient` HTTP implementasyonu yazıldı
- [x] Token cache (Redis) + single-flight yenileme (4 dk eşik) — IDistributedCache + process-içi kilit (dağıtık kilit ileride), 6 test
- [x] İki base URL (auth/api) konfigürasyonu — `MetropolOptions.AuthBaseUrl/ApiBaseUrl`, DI'da iki ayrı HttpClient
- [x] `MetropolApiClient` (tüm endpoint'ler için tipli metotlar) — 16 uç (`IMetropolApiClient`), Bearer token'lı, retry'sız (para uçlarında idempotency uygulama katmanında)
- [x] Hata kodu → Türkçe mesaj eşleme tablosu — `MetropolErrorCatalog` KISMİ (7601/7085 + genel mesaj); tam tablo doküman gelince
- [x] Maskeleme yardımcıları (kart no, isim, TCKN) — `Application/Common/Masking` (+telefon), unit testli
- [x] **Sır yönetimi:** AccessKey/AESKey/ConsumerId env/secret'tan — `MetropolOptions` configuration'dan bağlanır, repoda gerçek değer yok

### 1.4 Kart yönetimi (BACKEND + MOBILE)
- [x] Entity: Card (user-kart bağı, UserAccountToken, maskeli no) — `Domain/Entities/Card.cs` (token IFieldCipher ile ŞİFRELİ, düz kolon yok) + `CardsAndPayments` migration'ı (Faz 1.6–1.7 için `PaymentIdempotency` UNIQUE(tenant_id, idempotency_key) ve `SavedRecipient` tabloları da eklendi)
- [x] `AddAccount` → ValidationGuid akışı (proxy) — `CardsService.AddAsync`: bu adımda DB'ye kayıt yok, kart no log'lanmaz; ResponseCode!=0 → 422 METROPOL_ERROR + katalog mesajı
- [x] `AddAccountConfirm` → UserAccountToken sakla — `CardsService.ConfirmAsync`: MemberId istekten DEĞİL users.member_id'den; token şifreli saklanır, maskeli no yanıttan (maskesizse backend maskeler)
- [x] Kart listeleme (kullanıcının kartları) — `GET /metropol/cards` (`MetropolCardsController`), tenant + kullanıcı + soft-delete filtreli
- [x] `DeleteUser` (kart bağını kaldır) — önce sahiplik, sonra Metropol (UserRefNo=çözülmüş token, UserRefType=2 VARSAYIM — `MetropolDefaults` + LESSONS.md), başarıda soft-delete
- [x] Mobile: kart slider, Kart Ekle 3 adım (no+tel / OTP / bilgiler), silme onayı — `MetropolHomeScreen` (yatay FlatList slider: yenile/kopyala/sil ikonları + sonda Kart Ekle boş kartı; hiç kart yoksa CTA) + `AddCard/` 3 ekran (OTP kodu confirm isteğinde `validationCode` olarak gider, memberId backend'de users.member_id'den) + Alert onay diyaloğu → DELETE → kart listesi invalidate; METROPOL_ERROR mesajları aynen gösterilir. Kopyalama maskeli no ile (maskesiz no istemciye gelmez; core Clipboard → TODO native @react-native-clipboard)
- [x] Mobile: kart detay ekranı (PRD §8.3, 2026-06-11) — `CardDetail/CardDetailScreen` (MetropolStack `CardDetail`, param: cardId; giriş: ana ekran slider'ında karta dokunma — içteki yenile/kopyala/sil ikonları çalışmaya devam eder): üstte CardVisual, iki YEREL sekme (kütüphanesiz): "Bakiyeler" = TOPLAM/RESTORAN/MARKET bakiye kartları (useBalance; yanıt `stale=true` ise "Son güncelleme: {asOf}" uyarı satırı — shared BalanceResponse.asOf/stale) + son 5 işlem (useRecentTransactions + TxRow, Tümü → History); "İşlemler" = Bakiye Transferi → TransferMenu, İşlem Geçmişi → History(cardId), Kart Kullanım Ayarları (pasif satır, "Faz 2.5" rozeti), Kartı Sil (mevcut Alert onayı `deleteCard`, başarıda geri dön). Metinler tr/en `metropol.cardDetail`, renkler tema token'larından

### 1.5 Bakiye & işlem (BACKEND + MOBILE)
- [x] `BalanceQuery` proxy (Resto/Gift; sunum: Toplam/Restoran/Market) — `BalanceService.GetBalanceAsync`: wallets[] + totalBalance (para string "0.00"); WalletId=0 tüm cüzdanlar (VARSAYIM, LESSONS.md)
- [x] Bakiye kısa cache + manuel yenileme — ~30 sn IDistributedCache (`balance:{cardId}`), `?refresh=true` atlar (PRD §17.7). **Güncelleme (KARAR 2026-06-11):** başarılı her BalanceQuery `card_balances` snapshot'ına UPSERT edilir (Metropol kaynak-otorite, DB son-bilinen kopya); Metropol erişilemezse snapshot `stale=true` + `asOf=son senkron` ile 200 döner (snapshot yoksa eski hata davranışı; iş kuralı hataları 422 kalır) — `CardBalancesAndMemberId` migration'ı + users.member_id backfill (boş MemberId'lere Id 32 hex, `User.EnsureMemberId` kullanıcı oluşturma noktalarında otomatik atar)
- [x] `TransactionHistory` / `CustomerDetailReport` proxy + sayfalama — `TransactionHistory` kullanıldı (sayfasız döner → bellekte sayfalama); `CustomerDetailReport` müşteri-numarası bazlı olduğundan bu uçta gerekmedi. Tip eşleme TranTypeId=1→sale/diğer→transfer (VARSAYIM), maskedName backend'de maskeli, tarih en iyi çaba ISO parse + `/recent` son 5 işlem
- [x] Mobile: bakiye kartları, son 5 işlem, işlem geçmişi ekranı (filtre/sayfalama) — TOPLAM/RESTORAN/MARKET wallets'tan türetilir (walletId 1=Restoran, 3=Market), yenile ikonu `?refresh=true` (sonuç query cache'ine yazılır); son 5 `/recent`; `History/HistoryScreen`: tarih aralığı çipleri (7/30/90 gün/tümü) + useInfiniteQuery sayfalama, satırda tip ikonu + maskeli isim + onay no + tutar yeşil/kırmızı + tarih-saat

### 1.6 Harcama akışı (BACKEND + MOBILE — SIRA KRİTİK)
- [x] `GetPreSaleInfo` proxy (Code+CodeType+MemberId+UserAccountRef) — `PaymentsService.PresaleAsync` (`POST /metropol/sale/presale-info`, `MetropolSaleController`): kart sahipliği tenant+kullanıcı filtreli, MemberId istekten DEĞİL users.member_id'den, UserAccountRef karttan çözülür; ResponseCode!=0 → 422 METROPOL_ERROR + katalog
- [x] `SaleConfirm` proxy + **idempotency** (SaleRefCode/ConsumerRefCode tekrar engeli) — `ConfirmSaleAsync`: Idempotency-Key başlığı ZORUNLU (yoksa VALIDATION_ERROR); payment_idempotency akışı (`IdempotencyGuard`, ARCHITECTURE §5.3): success→kayıtlı yanıt AYNEN, failed→kayıtlı hata AYNEN (aynı SaleRefCode tekrar gönderilmez), pending→409, UNIQUE yarışı→409; PaymentTypeId=1 cüzdan VARSAYIMI (`MetropolDefaults.WalletPaymentTypeId`, LESSONS.md); başarıda bakiye cache invalidate (balanceAfter sözleşmeden kaldırıldı — API_CONTRACT §7 notu)
- [x] `GetSaleInfo` proxy (durum sorgu) — `GET /metropol/sale/info`; CardNo backend'de maskelenir
- [x] WalletId belirleme (ProductId 1→1, 3→3) — `MetropolDefaults.SuggestedWalletId` (bilinmeyen ProductId güvenli tarafta 1/Resto — VARSAYIM, LESSONS.md); presale yanıtında `suggestedWalletId`
- [x] Mobile: QR okuma, kısa kod girişi — kısa kod [x] (`PayCodeScreen`, 6 hane); QR kamera [x] react-native-vision-camera v4 ile gerçek tarama (`QrScannerBox`: qr + code-128, izin akışı `requestCameraPermission`; izin reddedilirse/modül yüklenemezse placeholder + manuel kod girişi fallback'i görünür kalır), okunan kod aynı akışla `PaySelectCard`'a codeType=1 ile gider. NOT: JS entegrasyonu + izinler (CAMERA, NSCameraUsageDescription, minSdk 26) hazır; cihaz doğrulaması native build ile
- [x] Mobile: **kart seçim+onay (preinfo'dan ÖNCE)** — `PaySelectCardScreen`: kod → kart seç → Devam; presale ancak `PayConfirmScreen`'de çağrılır (CLAUDE.md §6 sırası korunur)
- [x] Mobile: tutar/onay ekranı (cüzdan seçimi), ÖDE — `PayConfirmScreen`: banner (tutar+mağaza+ürün), seçili kart, cüzdan seçimi `suggestedWalletId` ön-seçili (bakiyelerle), ÖDE → sale/confirm (Idempotency-Key zorunlu; anahtar + consumerRefCode akış başına bir kez üretilir, başarıya kadar saklanır — `useSaleConfirm`/`useIdempotentMutation`)
- [x] Mobile: başarılı fiş ekranı + başarısız/tekrar dene — `PaySuccessScreen` (maskeli kart, onay no, tutar, tarih; mağaza adı presale'den taşınır — API_CONTRACT §7 notu; bakiye/işlem listeleri invalidate) + başarısız görünüm `PayConfirmScreen`'de inline (METROPOL_ERROR mesajı + "Tekrar Dene" AYNI idempotency key ile)
- [x] **Test:** çift harcama engellenir — `PaymentsServiceTests` (14 test): aynı anahtar ikinci confirm Metropol'e GİTMEZ + ilk yanıt döner, pending 409, farklı anahtar normal, failed tekrar gönderilmez, WalletId kuralı (3→3/1→1/2→1), başka kullanıcının kartı NOT_FOUND, katalog mesajı, cache invalidation

### 1.7 Bakiye transferi (BACKEND + MOBILE)
- [x] `BalanceTransfer` proxy + idempotency — `TransfersService.TransferAsync` (`POST /metropol/transfer`, `MetropolTransferController`; Idempotency-Key ZORUNLU, operation=balance_transfer, harcamayla aynı `IdempotencyGuard` akışı). Alıcı çözümleme: saved→kendi kaydından şifreli token, phone→AYNI tenant'ta aktif kullanıcının aktif kartı (izolasyon; yoksa NOT_FOUND), qr→opak token (VARSAYIM, LESSONS.md), card→[x] AddAccount OTP akışıyla çözüldü (2026-06-11): value = `confirm-card` adımından dönen doğrulanmış opak receiverToken — 'qr' ile aynı şekilde işlenir (alttaki 'Başka Karta' maddesi; LESSONS.md). Amount int → tam-TL doğrulaması; başarıda saveRecipient kaydı (token şifreli) + bakiye cache invalidate; `POST /metropol/transfer/resolve-qr` + saved-recipients GET/POST/DELETE de hazır
- [x] Entity: SavedRecipient (kayıtlı alıcı) — 1.4'teki `CardsAndPayments` migration'ında oluşturulmuştu; Faz 1.7'de transfer + CRUD uçlarına bağlandı (token at-rest şifreli, kart no yalnız maskeli)
- [x] 'Başka Karta' alıcı doğrulama (AddAccount OTP akışı, 2026-06-11) — `TransfersService.VerifyRecipientCardAsync`/`ConfirmRecipientCardAsync` (`POST /metropol/transfer/verify-card` + `confirm-card`, API_CONTRACT §8): SMS alıcının karta kayıtlı telefonuna gider (kullanıcı başına 5/saat rate-limit `rcpverify:` — 429 RATE_LIMITED), confirm YALNIZ doğrular (Phone/Email/TCKN boş; MemberId = gönderenin users.member_id — VARSAYIM, LESSONS.md), alıcının kartı `cards` tablosuna YAZILMAZ; dönen opak receiverToken transferde `receiver.type='card'` value'su olur. +7 test (`TransfersServiceTests` 20: verify→confirm maskeli alanlar + kart kaydı yok, token'la transfer başarılı/idempotent, yanlış OTP 422 katalog, 6. verify 429, kota kullanıcı bazlı + confirm kendi MemberId'siyle, MemberId'siz 400, geçersiz istek kota yakmaz)
- [x] Mobile: transfer ana menü — `TransferMenuScreen`: Kartlarım Arası / **Başka Karta (AKTİF, 2026-06-11)** / Cep Numarasına / Kayıtlı Alıcı / QR Kod Alıcı / İşlem Geçmişi. "Başka Karta" 2 adımlı alıcı doğrulama: `TransferCardRecipientScreen` (alıcı kart no 16 hane gruplu + karta kayıtlı telefon 10-11 hane → `POST /metropol/transfer/verify-card`, SMS ALICININ telefonuna gider) → `TransferCardOtpScreen` (`OtpCodeInput` 6 hane; tekrar gönder = verify-card yeniden, rate-limit'e tabi — 429 RATE_LIMITED/422 METROPOL_ERROR mesajları `getMetropolErrorMessage` ile) → `confirm-card` başarısında maskeli ad/kart no + opak receiverToken mevcut `TransferForm` (mode 'fixed') üzerinden `TransferConfirm`'e bağlanır (receiver { type:'card', value: receiverToken }; "Tanımlı alıcı ekle" çalışır — backend saveRecipient destekli). Alıcının kartı cards'a YAZILMAZ; tipler `shared/types/src/metropol.ts`'e (Verify/ConfirmRecipientCard Request/Response), uçlar `mobile/src/api/metropol.ts` + `useVerifyRecipientCard`/`useConfirmRecipientCard` hook'ları
- [x] Mobile: Kartlar Arası (gönderen/alıcı/cüzdan/tutar/açıklama) — `TransferFormScreen`: gönderen/alıcı kart seçimi (bottom sheet), cüzdan (RESTORAN/MARKET), hızlı tutar 500/1000/2500/5000, tutar TAM TL (rakam dışı girişler engellenir; "500"→"500.00"), açıklama. Backend tarafı AÇILDI (2026-06-11): `receiver.type='card'` + value=kendi `cardId` → backend sahipliği doğrulayıp şifreli token'ı çözer (`ResolveCardReceiverAsync`; sahip olunmayan GUID kendi kartı gibi ÇÖZÜLMEZ, opak token muamelesi görür — sızıntı testi dahil +2 test). Ekran değişmeden uçtan uca çalışır
- [x] Mobile: QR Kod Alıcı (okut→token) — resolve-qr çağrısı + maskeli alıcı → forma aktarım [x] (`TransferQrScreen`); QR kamera [x] react-native-vision-camera ile gerçek tarama (`QrScannerBox` ortak bileşeni; okunan yük aynı resolve-qr akışına girer, izin reddi/modül yoksa manuel QR yükü girişi fallback'i kalır). NOT: JS entegrasyonu + izinler hazır; cihaz doğrulaması native build ile
- [x] Mobile: işlem onay (maskeli alıcı, tanımlı alıcı ekle) — `TransferConfirmScreen`: maskeli alıcı + tutar özeti, "Tanımlı alıcı olarak ekle" + kayıt adı (kayıtlı alıcıdan gelende gizli); `SavedRecipientsScreen` liste/seç/sil de hazır
- [x] Mobile: başarılı/başarısız sonuç — `TransferSuccessScreen` fişi (maskeli alıcı ad/no, gönderen, tutar, tarih) + başarısız görünüm `TransferConfirmScreen`'de inline ("Tekrar Dene" AYNI Idempotency-Key ile — `useTransfer` anahtarı başarıya kadar saklar)
- [x] **Test:** transfer idempotent — `TransfersServiceTests` (14 test): aynı anahtar Metropol'e ikinci kez GİTMEZ + ilk fiş döner, pending 409, tam-TL olmayan tutar VALIDATION_ERROR, telefon alıcı yalnız aynı tenant'ta (izolasyon), saveRecipient şifreli token kaydı, saved/card/qr türleri, katalog mesajı, saved-recipients CRUD sahiplik

### 1.8 Ana Sayfa içerik (BACKEND + WEB + MOBILE)
- [x] Entity: Announcement, Survey, SurveyQuestion, SurveyResponse, Video, VideoWatch — Announcement.TenantId nullable (null=global), migration `ContentEntities`, UNIQUE(survey_id,user_id) + UNIQUE(video_id,user_id)
- [x] Backend: home announcements/surveys/videos uçları (firma+global ayrımı) — `HomeController` (API_CONTRACT §3), duyuru filtresi `tenant_id IS NULL OR = aktif` + segment hedefleme; firma admin CRUD da hazır: `CompanyContentController` (§12 İçerik: anket/duyuru/video CRUD + results + watch-report)
- [x] Backend: anket yanıt + tek seferlik kontrol — ikinci yanıt 409 `SURVEY_ALREADY_ANSWERED`; tek seferlik olmayanda upsert; soru id doğrulaması (14 yeni test, `ContentServiceTests`)
- [x] Backend: duyuruda ileri tarihli yayım (PANELS_SPEC A.7, 2026-06-11) — `AnnouncementUpsertRequest.publishedAt` (DateTimeOffset?, null=hemen; yalnız published'da anlamlı); home duyuru liste+detay uçları YALNIZ `publishedAt <= şimdi` olanları döndürür (TimeProvider ile test edilebilir; sabit saatli 2 test, `ContentServiceTests`); `shared/content-admin.AnnouncementUpsertRequest.publishedAt` eklendi — web duyuru formuna tarih seçici UI ayrı iş
- [x] Backend: video izleme durumu (kullanıcı bazlı) — `POST /home/videos/{id}/watch` upsert, completed→Watched+WatchedAt
- [x] Web (firma admin): anket CRUD, duyuru CRUD, video ekleme + segment hedefleme — `web/src/pages/{Surveys,Announcements,Videos}`: anket liste + editör sayfası (4 soru tipi, yukarı/aşağı sıralama, taslak/yayımla, sil, sonuçlar sayfası: soru bazında sayım tablosu + basit bar div'leri) + duyuru FormDrawer (başlık/gövde/kapak URL/segment hedefleme checkbox + yayımla/yayımdan kaldır) + video FormDrawer (başlık/açıklama/url/thumbnail/süre/zorunlu) + izlenme raporu tablosu (watch-report); tipler `shared/types/src/content-admin.ts` (YENİ — ContentAdminDtos.cs + CompanyAdminDtos.cs birebir karşılıkları, index.ts'e export eklendi); grafik kütüphanesi eklenmedi
- [x] Mobile: duyuru carousel + detay — HomeScreen yatay carousel (kapak+başlık+kısa metin) + AnnouncementDetailScreen (kaynak rozeti firma/platform); yükleniyor/boş/hata + pull-to-refresh
- [x] Mobile: anket listesi + doldurma (soru tipleri, ilerleme) — SurveyFillScreen tek soru/sayfa (single/multi/text/rating), ilerleme çubuğu, 409 SURVEY_ALREADY_ANSWERED özel mesaj, başarıda geri dön + liste yenileme
- [x] Mobile: video listesi + oynatıcı + izlendi işaretleme — oynatıcı [x] react-native-video v6 (`VideoPlayerScreen`: controls + paused başlangıç, guard'lı — modül yoksa thumbnail placeholder kalır); onProgress ile ilerleme, %90 eşiği geçilince otomatik completed=true (bir kez, PRD §6.3) + manuel "İzlendi olarak işaretle" butonu korunur, çıkışta son ilerleme completed=false ile gönderilir; izlendi işaretleme [x] (POST /home/videos/{id}/watch, kullanıcı bazlı). NOT: JS entegrasyonu hazır; cihaz doğrulaması native build ile

### 1.9 Temel paneller (WEB + ADMIN)
- [x] Backend: /me uçları (GET/PUT /me, PUT /me/tckn, GET/PUT /me/preferences, GET /me/modules) — `MeController`+`MeService` (API_CONTRACT §2); TCKN at-rest şimdilik placeholder şifreleme (`IFieldCipher`+`PlaceholderFieldCipher`, "enc:"+Base64 — gerçek DataProtection/KMS Faz sonrası); users tablosuna `preferences` jsonb kolonu (migration `MeAndAdminEndpoints`)
- [x] Backend: firma admin kullanıcı/segment uçları (API_CONTRACT §12) — `CompanyUsersController`+`CompanySegmentsController`; kullanıcı liste `?q&segmentId&status&page`, telefon tenant içinde benzersiz (ihlal VALIDATION_ERROR), DELETE pasifleştirir (hard delete yok), segment silme kullanıcı varsa engelli (details.userCount), segment→modül atamasında tanımsız/pasif kod VALIDATION_ERROR
- [x] Backend: platform admin uçları (API_CONTRACT §13) — `PlatformTenantsController`+`PlatformModulesController`; tenant liste/oluştur/güncelle+durum (code benzersiz), yanıtlar PII'siz (yalnız userCount), firma admin daveti (telefon zorunlu, company_admin), modül tanımları CRUD; kritik işlemlere PII'siz ILogger izi (AuditLog entity Faz 3)
- [x] Web: login, dashboard, kullanıcı listesi/ekle, segment yönetimi — gerçek panel girişi (`POST /auth/login`: e-posta+şifre+ops. firma kodu; LOGIN_LOCKED/RATE_LIMITED/VALIDATION_ERROR mesajları; token çifti localStorage, 401'de tek-uçuş refresh + istek tekrarı `web/src/api/client.ts`, çıkış `POST /auth/logout`) + `/auth/set-password?token=` davet sayfası (politika: min 8, harf+rakam); `GET /me` ile üst barda firma adı + kullanıcı adı, rol `company_admin` değilse erişim reddi ekranı; Kullanıcılar A.3 sadeleştirilmiş: server-side sayfalı tablo (`?q&segmentId&status&page`), arama+segment+durum filtresi, ekle/düzenle FormDrawer (ad/soyad/telefon/e-posta/rol/segmentler), pasifleştir onay diyaloğu + aktifleştir, segment atama (PUT users/{id}/segments); Segmentler A.4: liste+oluştur/düzenle/sil (kullanıcı varsa details.userCount ile hata mesajı); Dashboard KPI mevcut uçlardan (kullanıcı total, yayındaki anket/duyuru, video sayısı; bekleyen talep '—' Faz 2.4); Talepler placeholder; ortak bileşenler basit-yerel (DataTable/FormDrawer/ConfirmDialog/StatusBadge/Toast/Pagination, `web/src/components/ui`, kütüphane yok, renkler tema token'larından) — typecheck+lint+build ✓
- [x] Web: segment→modül yetki ekranı — A.5 alternatif görünüm: segment seçilir, modül toggle listesi + Kaydet (`PUT /admin/company/segments/{id}/modules`). Not: firma admin için modül kataloğu ucu yok (GET /platform/modules yalnız platform_admin); katalog bilinen modül kodları (seed) ∪ segmentlerde atanmış kodlardan derlenir, backend tanımsız/pasif kodu zaten reddeder
- [x] Admin: login, firma (tenant) oluştur/onayla, firma admin ata, tenant marka ayarı — gerçek panel girişi (`POST /auth/login`, yalnız platform_admin kabul; 401'de tek-uçuş refresh + retry, `/set-password?token=` sayfası, çıkışta `POST /auth/logout`); Firmalar B.3: server-side sayfalı/filtreli liste (`?q&status&page`; durum rozeti, kullanıcı sayısı) + oluştur/düzenle (marka: logo URL + renk seçici + canlı önizleme mockup) + durum değişimi onay diyaloğu + firma admin daveti (telefon zorunlu; `inviteToken` kopyalanabilir alan + set-password URL örneği — e-posta entegrasyonu gelene dek link elden iletilir); Dashboard KPI (aktif/pasif/bekleyen, tenants'tan türetildi) + son eklenen firmalar. [x] Listedeki "Metropol eşleşmesi" kolonu ÇÖZÜLDÜ (2026-06-11): backend `PlatformTenantDto.HasMetropolConsumer` (bool — sır ref değeri asla dönmez) liste+tekil yanıtlarda dolu; `shared/panels.Tenant.hasMetropolConsumer` zorunlu boolean yapıldı, kolon Var/Yok gösterir
- [x] Admin: modül tanımları — B.4 liste (kod/ad/aktif rozeti) + oluştur/düzenle (slug doğrulama, aktif toggle); `GET/POST/PUT /platform/modules` (`ModuleUpsertRequest` shared/panels'a eklendi)
- [x] Backend: şifre sıfırlama daveti (admin eliyle, 2026-06-11) — `POST /platform/tenants/{tenantId}/admins/{userId}/reset-invite` (PlatformAdmin policy): hedef kullanıcı o tenant'ın company_admin'i değilse 404 (izolasyon, varlık sızdırmaz); `IPanelAuthService.CreateInviteAsync` ile YENİ `inviteToken` döner (yalnız yanıtta, log'lanmaz); mevcut şifre set-password yapılana kadar çalışır; PII'siz ILogger izi — +2 test (`AdminServicesTests`), API_CONTRACT §13
- [~] Self-servis "şifremi unuttum" — SMTP/e-posta altyapısı gelince; şimdilik platform admin reset-invite ile yeni davet token üretip elden iletir
- [x] Panel girişi (e-posta+şifre, PANELS_SPEC §0.4) — karar: kendi auth (LESSONS.md). `users.password_hash` (yalnız panel kullanıcıları, migration `PanelAuth`), `POST /auth/login` (panel rolleri; enduser 403; 5 hatalı denemede 15 dk `LOGIN_LOCKED`; e-posta başına 10/dk rate-limit) + `POST /auth/set-password` (davet token'ı 72 saat/tek kullanımlık; politika: min 8, harf+rakam); PBKDF2-SHA256 100k (`Pbkdf2PasswordHasher`, paketsiz); platform admin daveti yanıtına `inviteToken` eklendi (e-posta gönderimi TODO, token log'lanmaz) — 11 test (`PanelAuthServiceTests`)
- [x] **Test:** firma admin sadece kendi tenant; platform admin PII'ye erişemez — backend servis testleriyle karşılandı (`AdminServicesTests` 13 + `MeServiceTests` 6, SQLite in-memory); panel UI testleri panel geliştirilince ayrıca

### 1.10 White-label tema
- [x] Backend: tenant marka (logo, renk) endpoint — `GET /api/v1/tenants/{code}/branding` (anonim, mobil login öncesi tema; yalnız aktif tenant, PII yok; `TenantBrandingController`)
- [x] Mobile: tema token runtime yükleme (hardcode renk yok) — login sonrası `GET /me` → `tenant.branding` (primaryColor/secondaryColor/logoUrl) ThemeProvider'a uygulanır (`setServerBranding`; brandDark/brandSoft primaryColor'dan türetilir — `theme/color.ts`, secondaryColor→navy, logoUrl→BrandLogo); statik PALETTES yalnızca fallback. `api/me.ts` + `useMe` hook'u eklendi. Login ÖNCESİ tema: `GET /tenants/{code}/branding` ucu hazır, firma kodu girişi Faz sonrası — App.tsx/api/me.ts'te TODO yorumu

---

## FAZ 2 — GENİŞLEME

### 2.1 Keşfet (harita)
- [x] `MerchantList` proxy + liste sürümleme (artımlı) + cache — `MerchantsService` (`GET /metropol/merchants`): IDistributedCache 6 saat (anahtar: sektör+listType+sürüm), `lastListVersionDate` Metropol'e aynen geçer (sürümleme Metropol'ün); geri bildirim `merchant_feedbacks` tablosunda YEREL (Metropol sözleşmesinde uç yok — LESSONS.md); 4 test
- [ ] Mobile: harita + pin (sektör ikonları) + kümeleme
- [ ] Mobile: filtre barı (Temizle/Sektör/Adres/Online/Listele), arama, konumum
- [ ] Mobile: mağaza kartları (mesafe/tel/adres + yol tarifi/ara/harita)
- [ ] Mobile: pin detayı (Yol Tarifi, bilgiler, Geri Bildirim Gönder)

### 2.2 Yan Haklar
- [x] Entity: CampaignCategory (platform tanımı, filtresiz), Campaign/Coupon/GiftCard (TenantId null=global — Announcement deseni) + `BenefitsAndHrModules` migration
- [x] Admin: kampanya kategori + kampanya CRUD (benzer kampanya ilişkisi) — `PlatformBenefitsService` + `PlatformBenefitsController` (`/platform/campaign-categories` + `/platform/campaigns`; global yazılır, kategori silmede kampanya engeli; benzer = aynı kategori otomatik)
- [x] Backend: benefits uçları — `BenefitsService` + `BenefitsController` (§4 birebir: categories/campaigns(+detay+similar)/coupons/giftcards; yalnız yayında + zamanı gelmiş içerik); 5 test
- [ ] Mobile: grid, kampanya liste+detay, kupon, hediye çeki (listeleme)

### 2.3 Sohbet
- [ ] SignalR hub (join/send/receive/typing/read) + tenant izolasyonu
- [ ] Entity: Conversation, Message, Assistant
- [ ] Backend: conversations/messages/assistants uçları
- [ ] Gemini entegrasyonu (backend; anahtar backend'de; PII'siz prompt)
- [ ] Mobile: sohbet listesi, birebir sohbet, AI sohbet (yazıyor...), AI asistan oluştur, kullanıcı arama
- [ ] Offline mesaj kuyruğu

### 2.4 İK modülleri
- [x] Entity: LeaveRequest, ExpenseRequest (+durum/onay alanları: DecidedBy/DecidedAt/DecisionNote; tutar numeric(18,2))
- [x] Backend: leave/expense uçları + approve/reject + modül yetki kontrolü — `IModuleAccessChecker` (segment→segment_modules→aktif modül; NOT_AUTHORIZED_MODULE 403) + `HrService` (gün sayısı backend'de, yalnız pending'ten karar, kendi talebini onaylayamama, onay ekranında talep eden adı) + `HrModulesController` + `CompanyRequestsController` (firma görünümü). NOT: `expense_approval` yetkisi izin onayını da kapsar (ayrı leave_approval modülü ilk sürümde yok); onaylayıcı atama (PUT approvers) ilk sürümde yok — PRD §17.6 tek aşamalı. 9 test
- [ ] Mobile: Diğer sekmesi modül grid (yetkiye göre)
- [ ] Mobile: izin talebi + geçmiş
- [ ] Mobile: masraf talebi (fiş yükleme) + geçmiş
- [ ] Mobile: masraf onay (yönetici)
- [ ] Web: firma masraf/izin genel görünüm + onaylayıcı atama

### 2.5 Hesabım/Profil tamamlama
- [ ] Mobile: profil düzenle/güncelle, kartvizit (vCard QR), güvenlik (PIN/biyometrik/ResetPin), kart kullanım ayarları (DeactivateCard), izinler, dil, hesap silme

---

## FAZ 3 — OLGUNLAŞTIRMA
- [ ] Push bildirim (FCM/APNs) + bildirim merkezi
- [ ] Raporlama (web: anket sonuç, video izleme; admin: kullanım)
- [ ] Gelişmiş white-label (tema önizleme, çoklu marka varlığı)
- [ ] Audit log görünümü (admin)
- [ ] Performans optimizasyonu (harita, liste sanallaştırma, cache ayarı)
- [ ] Erişilebilirlik geçişi
- [ ] Mağaza yayını hazırlığı (App Store / Play; white-label dağıtım stratejisi)

---

## SÜREKLİ / KESİŞEN GÖREVLER
- [ ] Her para uçunda idempotency + test
- [ ] Her tenant uçunda izolasyon testi
- [ ] PII maskeleme/log yasağı denetimi
- [ ] API sözleşmesi (`API_CONTRACT.md`) güncel tutma
- [ ] CLAUDE.md komut bölümünü gerçek script'lerle güncelle
- [ ] CI: backend test + istemci lint/typecheck

---

## KARARLAR (PRD §17 — kesinleşti)
- [x] Tenant: runtime, tek uygulama, tema tenant'a göre
- [x] AI asistan: firma admin tanımlar (scope=tenant)
- [x] Web + Admin: ayrı app'ler
- [x] Hediye çeki: ilk sürüm listeleme (itfa sonra)
- [x] Önerdikçe Kazan: Faz 2+ basit referans
- [x] Masraf onay: tek aşamalı
- [x] Bakiye: canlı + ~30 sn opsiyonel cache + manuel yenileme
- [x] Push: FCM+APNs, Faz 3 (ilk sürüm uygulama içi bildirim)
- [x] RBAC: basit rol enum (ilk sürüm)
