# CLAUDE.md

> Bu dosya, bu repoda çalışan herhangi bir AI kodlama asistanının (Claude Code vb.) **her oturumda okuması gereken** kalıcı talimat dosyasıdır. Projenin *ne* yaptığını değil, *nasıl geliştirileceğini* tanımlar. Ürün gereksinimleri için `docs/PRD.md`, mimari detay için `docs/ARCHITECTURE.md`, görev listesi için `docs/TODO.md` dosyalarına bak.

---

## 1. PROJE ÖZETİ (TEK PARAGRAF)

MetropolBusiness, firmalara white-label olarak dağıtılan kurumsal bir yan-haklar ve ödeme platformudur. Her firma (tenant) uygulamayı kendi markası ve kendi kullanıcılarıyla kullanır. Platformun kalbinde **MetropolCard** yemek/market kartı entegrasyonu vardır (kart ekleme, bakiye sorgu, QR/kısa kod ile harcama, kartlar arası ve kişiler arası bakiye transferi, işlem geçmişi, üye işyeri haritası). Bunun etrafında firma içi iletişim (anket, duyuru, eğitim videoları), yan haklar (kampanya, kupon, hediye çeki), WebSocket tabanlı sohbet (kullanıcı-kullanıcı ve AI asistan), ve modüler İK araçları (izin, masraf talebi/onayı) bulunur. Sistem üç istemciden oluşur: **mobil** (React Native, son kullanıcı), **web** (React, firma yöneticisi), **admin** (React, Metropol platform yöneticisi). Tek bir **ASP.NET Core** backend ve **PostgreSQL** veritabanı vardır.

---

## 2. MUTLAK KURALLAR (BUNLARI ASLA İHLAL ETME)

Bu kurallar her şeyin üstündedir. Bir görev bunlardan biriyle çelişiyorsa, kodu yazma; önce durup sor.

1. **Tenant izolasyonu kutsaldır.** Hiçbir sorgu, hiçbir endpoint, hiçbir cache anahtarı bir firmanın verisini başka bir firmaya sızdıramaz. Her veri erişimi tenant (firma) bağlamıyla filtrelenmek zorundadır. Tenant scope olmayan bir DB sorgusu yazma.
2. **Metropol kimlik bilgileri (AccessKey, AES Key, ConsumerId) asla repoya, log'a, response'a veya istemciye gitmez.** Sadece backend'de, environment/secret store'dan okunur. Bu değerleri içeren örnek dahi commit etme.
3. **Metropol API'sine istemciden (mobil/web) doğrudan çağrı yapılmaz.** Tüm Metropol çağrıları backend üzerinden proxy'lenir. İstemci yalnızca kendi backend'imizle konuşur.
4. **Kart numarası, T.C. Kimlik No, OTP, tam kart token'ı gibi hassas veriler log'lanmaz.** İşlem geçmişi ve fişlerde kart numarası maskelenir (637\*\*\*\*\*\*976 formatı). Maskeleme backend'de yapılır, istemciye maskesiz veri gönderilmez.
5. **Para/tutar değerleri asla `float`/`double` ile tutulmaz.** Backend'de `decimal`, DB'de `numeric`, istemcide string/integer-minor-unit ile taşınır. Para aritmetiğinde yuvarlama hatası kabul edilemez.
6. **Mevcut `MetropolModels.cs` sözleşmesini (DTO alan adları, tipleri) kendi başına değiştirme.** Bu Metropol'ün API kontratıdır; alan eklemek/çıkarmak Metropol tarafıyla uyumsuzluk yaratır. Değişiklik gerekiyorsa önce sor.
7. **Yıkıcı işlemleri (DB migration drop, kullanıcı/kart silme, toplu güncelleme) onay almadan üretime yönelik çalıştırma.** Silme işlemleri mümkünse soft-delete olmalı.

---

## 3. TEKNOLOJİ YIĞINI

| Katman | Teknoloji | Not |
|---|---|---|
| Backend | ASP.NET Core (.NET 8+), C# | Tek API. Clean Architecture katmanları. |
| Veritabanı | PostgreSQL | EF Core ile. Migration'lar `Infrastructure/Persistence/Migrations`. |
| Cache | Redis | Metropol token cache + oturum + rate-limit. |
| Realtime | SignalR | Sohbet ve canlı bildirim. |
| Mobil | React Native + TypeScript | iOS öncelikli, Android uyumlu. |
| Web (firma) | React + TypeScript | Firma yönetim paneli. |
| Admin (platform) | React + TypeScript | Metropol platform yönetimi. |
| AI | Google Gemini (REST) | Backend üzerinden çağrılır; anahtar backend'de. |
| Auth | JWT (access + refresh) | Rol + tenant claim'leri token içinde. |

**Dil tercihi notu:** Backend C# olarak sabittir; Metropol entegrasyonu zaten C# (`MetropolModels.cs`) hazır olduğu için Python'a taşınmaz. AI tarafı büyürse Gemini için ayrı servis düşünülebilir ama varsayılan: her şey tek .NET API içinde.

---

## 4. REPO YAPISI VE SINIRLAR

```
MetropolBusiness/
├── docs/                  # PRD, CLAUDE.md, TODO, ARCHITECTURE, API_CONTRACT
├── backend/               # ASP.NET Core (tek API)
│   └── src/
│       ├── *.Api/            # Controller, middleware, DI, program entry
│       ├── *.Application/    # Use-case'ler, servis arayüzleri, CQRS handler'ları
│       ├── *.Domain/         # Entity, enum, domain interface (saf, bağımlılıksız)
│       ├── *.Infrastructure/ # EF Core, Redis, SignalR, Identity implementasyonları
│       ├── *.Integration.Metropol/  # Metropol API client + AES + token + modeller
│       └── *.Integration.Gemini/    # Gemini client
├── mobile/                # React Native
├── web/                   # React (firma admin)
├── admin/                 # React (platform admin)
├── shared/types/          # Web+admin+mobile ortak TS tipleri
├── design/prototype/      # Claude Design React prototipi (mobil UI referansı)
└── infra/                 # docker-compose (postgres, redis), scriptler
```

**Katman bağımlılık yönü (backend):** `Api → Application → Domain`. `Infrastructure` ve `Integration.*` projeleri `Application`/`Domain`'deki arayüzleri implemente eder; içe doğru bağımlılık yoktur. **Domain hiçbir şeye bağımlı değildir** (EF, Metropol, framework yok). Bu yönü asla ters çevirme.

**Sınır:** Bir istemci klasöründe çalışırken backend kodunu, backend'de çalışırken istemci kodunu aynı görevde değiştirme — değişiklik her iki tarafı da gerektiriyorsa önce API sözleşmesini (`docs/API_CONTRACT.md`) güncelle, sonra iki tarafı ayrı ayrı.

---

## 4B. TASARIM REFERANSI (MOBİL UI) — PROTOTİPE UYULUR

Mobil arayüz, `design/prototype/` içindeki React (JSX) prototipine göre geliştirilir. Bu prototip **görsel düzen, bileşen yerleşimi, ekranlar arası akış ve navigasyon yapısı için tek doğru kaynaktır (source of truth).** Ekran ↔ doküman ↔ API eşlemesi için `docs/PROTOTYPE_MAP.md`'ye bak.

**Bir mobil ekran geliştirirken sıra (zorunlu):**
1. İlgili `design/prototype/screens-*.jsx` dosyasını **oku** — layout/bileşen/akış oradan alınır.
2. `docs/PRD.md`'de ilgili bölümü oku — iş kuralı, validasyon, boş/yükleniyor/hata durumları.
3. `docs/API_CONTRACT.md`'de ilgili ucu oku — request/response.
4. React Native'e taşı: `div→View`, metin→`Text`, `img→Image`, CSS→`StyleSheet`. **Görsel hiyerarşi ve akış korunur.**
5. Renk/marka değerleri **tema token'ından** (white-label) okunur; hardcode hex yok. Prototipteki `theme.jsx > T` ve `PALETTES` yapısı, runtime tenant teması mimarisinin referansıdır.
6. Prototipteki mock veri (`data.jsx > SEED`) yerine gerçek API + veri-fetch katmanı (React Query) kullanılır. Maskeleme, idempotency ve tenant kuralları backend'de uygulanır.

**Prototipin sabitlediği kararlar (doküman kararı kabul edilir):**
- **White-label = runtime brand switch, tek uygulama.** (Prototip `PALETTES` + `setBrandKey` ile çoklu marka.) Build-time ayrı uygulama değil.
- **Harcama akışında kart, presale'den ÖNCE seçilir** (`payQR → paySelectCard → presale`). Prototip bunu zaten uygular; bozma.
- **Modül görünürlüğü role/segmente göre** (yönetici "Masraf Onay" görür). Yine de yetki **backend'de** doğrulanır.
- **AI asistan, sohbet listesinde ayrı tür** (`kind: 'ai'`), rozetle ayrılır.

**Sınırlar:**
- Prototip **yalnızca mobil** içindir. **Web (firma admin) ve admin (platform) panelleri prototipte yoktur**; onların tasarımı ayrı yürütülür, bu referans onları kapsamaz.
- Prototip ile doküman çelişirse: **görsel/akış için prototip, iş kuralı/veri için doküman** esastır. Çelişki çözülemiyorsa dur ve sor.
- `ios-frame.jsx` yalnız önizleme kabuğudur (status bar, dynamic island); RN'e taşınmaz.

---

## 5. ÇOK-KİRACILILIK (MULTI-TENANCY) — EN KRİTİK KONU

- Her kullanıcı **bir firmaya (tenant)** aittir. Platform admin (Metropol) tenant-üstü tek istisnadır.
- Tenant kimliği JWT içinde `tenant_id` claim'i olarak taşınır ve her istekte bir `ITenantContext` aracılığıyla okunur.
- Tüm tenant'a ait entity'ler `TenantId` kolonu taşır. EF Core'da **global query filter** ile otomatik filtrelenir; yine de manuel sorgularda bunu varsaymak yerine açıkça filtrele.
- **Üç içerik kaynağı seviyesi vardır, karıştırma:**
  1. **Platform (Metropol admin):** tüm firmalarda ortak görünen içerik (Avantajlar Dünyası/kampanyalar, global duyurular). `TenantId = null` veya özel "global" işaretiyle.
  2. **Firma (tenant admin):** sadece o firmanın kullanıcılarına görünen içerik (anketler, şirket duyuruları, eğitim videoları, segment/modül yetkileri).
  3. **Metropol API (canlı):** kart, bakiye, işlem verileri — Metropol servisinden anlık.
- **Modül yetkilendirme:** Firma admin, kullanıcıları **segment**'lere atar; her segmente hangi modüllerin (izin, masraf vb.) açık olduğunu tanımlar. Mobilde kullanıcı yalnızca yetkili olduğu modülleri görür. Yetki kontrolü **backend'de** yapılır; istemcide gizlemek tek başına yeterli güvenlik değildir.

---

## 6. METROPOL ENTEGRASYONU — DİKKAT EDİLECEKLER

- **Token akışı:** `GenerateToken` → AES (CBC / PKCS7 / IV = 16 byte sıfır dizi / 128-bit key / BlockSize 128) ile şifrelenip Base64'lenen `AccessData` (AccessKey + CreateDate) `SecureAccessData` olarak gönderilir. Dönen token **5 dakika** geçerlidir ve sonraki çağrılarda `Bearer` header'da kullanılır.
- **Saat farkı tuzağı:** İstemci/sunucu saat farkı token'ı erken geçersiz kılabilir. Bu durumda `GenerateToken/getdate` servisinden dönen zamanı `CreateDate` olarak kullan.
- **Token cache:** Token'ı her istekte yeniden üretme. Redis'te merkezi olarak cache'le, süresi dolmadan (örn. 4 dk) yenile. Eşzamanlı yenileme yarışını engelle (lock / single-flight).
- **İki ayrı base URL var:** auth (`testauth.metropolodeme.com`) ve api (`testapi.metropolcard.com`). Bunları ayrı yapılandır. Endpoint sabitleri `MetropolModels.cs > ApiEndpoints` içindedir; **kod dökümandan daha günceldir** (bazıları v3 `.../limited`).
- **Harcama akışı sırası (ÖNEMLİ, ekranlardaki sıradan farklı):**
  1. QR / kısa kod okunur,
  2. **kullanıcı önce kartı seçer ve onaylar**,
  3. `GetPreSaleInfo` çağrılır (Code + CodeType + MemberId + UserAccountRef),
  4. dönen tutar/mağaza/ürün bilgisi gösterilir,
  5. kullanıcı onaylar,
  6. `SaleConfirm` çağrılır,
  7. başarılı/başarısız ekranı.
  - `CodeType`: 1 = QRCode, 2 = QuickCode.
  - **WalletId**, `GetPreSaleInfo` dönüşündeki `ProductId`'ye göre belirlenir: ProductId 1 → WalletId 1 (Resto), 3 → 3 (Gift).
- **Hata kodları:** Metropol `ResponseCode = 0` başarı demektir; 0 dışı kodlar hata. Hata mesajları dökümandaki tablolarda (GetPreSaleInfo / SaleConfirm metotları). Bu kodları kullanıcıya anlamlı Türkçe mesaja çevir; ham kodu istemciye gösterme.
- Metropol çağrıları idempotent değildir; **özellikle `SaleConfirm` ve transfer işlemlerinde** retry mantığını dikkatli kur (çift harcama riski). Aynı `SaleRefCode`/`ConsumerRefCode` ile tekrar gönderme.

---

## 7. KOD STANDARTLARI

### Genel
- Anlamlı isimlendirme; tek harfli değişkenlerden kaçın (döngü indeksi hariç).
- Erken return ile karmaşık iç içe if'lerden kaçın.
- Sihirli sabit yerine isimlendirilmiş sabit/enum.
- Yorum *neden*'i açıklar, *ne*'yi değil. Kendini açıklayan kod tercih edilir.
- Bir fonksiyon tek iş yapar. 40+ satır olunca böl.

### Backend (C#)
- `async/await` her I/O işleminde; `async void` yok (event handler hariç).
- DTO ↔ Entity ayrımı net; entity'leri doğrudan API'den döndürme.
- Controller ince; iş mantığı Application katmanında.
- Exception ile akış kontrolü yapma; beklenen hatalar için Result/Either tipi tercih et.
- Nullable reference types açık; `null` durumları açıkça ele alınır.
- Para = `decimal`. Tarih = `DateTimeOffset` (UTC sakla, sunumda yerelleştir).

### İstemci (TypeScript — mobile/web/admin)
- `strict` TypeScript; `any` kullanma, gerekçesiz `as` cast yok.
- API tipleri `shared/types`'tan gelir; istemcide elle yeniden tanımlama.
- Bileşenler küçük ve tek sorumlu; iş mantığı hook'lara taşınır.
- Sunucu state için tek bir veri-fetch yaklaşımı (örn. React Query) — bileşen içinde dağınık fetch yok.
- Mobilde tüm metinler `localization` üzerinden (TR/EN). String'leri hardcode etme.

### White-label (mobil)
- Renk, logo, marka adı **theme token**'larından okunur (`mobile/src/theme`). Hiçbir ekranda renk hex'i hardcode edilmez. Tenant'a göre tema runtime'da yüklenir.

---

## 8. GÜVENLİK & GİZLİLİK

- **Sırlar:** Tüm anahtarlar/şifreler environment değişkeni veya secret manager'dan. `.env` dosyaları `.gitignore`'da. Repoda örnek için `.env.example` (gerçek değer yok).
- **Yetkilendirme:** Her endpoint'te rol + tenant kontrolü. "İstemci zaten gizliyor" gerekçesiyle backend kontrolünü atlamak yasak.
- **PII:** Kart no, TCKN, telefon, e-posta minimum tutulur, log'lanmaz, gerektiğinde maskelenir.
- **Rate limiting:** OTP gönderme, login, harcama gibi uçlarda rate-limit (Redis).
- **Idempotency:** Para hareketi yaratan uçlarda idempotency anahtarı.
- **Input validation:** Tüm girişler backend'de doğrulanır (FluentValidation vb.). İstemci doğrulaması yalnızca UX içindir.

---

## 9. KOMUTLAR (PLACEHOLDER — proje generate edilince güncellenecek)

> Aşağıdakiler beklenen komut kalıplarıdır; gerçek script'ler kurulunca bu bölümü güncelle.

```bash
# Altyapı (Postgres + Redis)
docker compose -f infra/docker/docker-compose.yml up -d

# Backend
cd backend && dotnet restore && dotnet build
dotnet run --project src/MetropolBusiness.Api
dotnet ef migrations add <Ad> --project src/MetropolBusiness.Infrastructure --startup-project src/MetropolBusiness.Api
dotnet ef database update --startup-project src/MetropolBusiness.Api
dotnet test

# Mobil
cd mobile && npm install
npm run ios        # veya: npm run android
npm run lint && npm run typecheck

# Web / Admin
cd web && npm install && npm run dev
cd admin && npm install && npm run dev
```

---

## 10. TEST & KALİTE

- **Yazılması zorunlu testler:** para hareketi (transfer, harcama), tenant izolasyonu, modül yetkilendirme, Metropol AES token üretimi, maskeleme.
- Yeni bir use-case eklerken en az mutlu yol + bir hata yolu testi yaz.
- PR/commit öncesi: backend `dotnet test`, istemci `lint` + `typecheck` geçmeli.
- Tenant izolasyonu için özel test: "A firmasının kullanıcısı B firmasının verisine erişemez".

---

## 11. GIT & COMMIT

- Küçük, odaklı commit'ler. Bir commit tek mantıksal değişiklik.
- Commit mesajı: `<alan>: <ne yapıldı>` (örn. `metropol: token cache eklendi`, `mobile: harcama kart seçim ekranı`).
- `main`'e doğrudan push yok; feature branch + PR.
- Sır, anahtar, `.env`, gerçek kart/kullanıcı verisi **asla** commit edilmez. Şüpheliysen commit etme, sor.

---

## 12. AI ASİSTANIN ÇALIŞMA BİÇİMİ (BU REPODA)

- **Önce oku, sonra yaz:** İlgili `docs/` dosyalarını ve dokunacağın mevcut kodu okumadan değişiklik yapma.
- **Belirsizlikte dur ve sor.** Özellikle: para akışı, Metropol sözleşmesi, tenant izolasyonu, silme işlemleri, şema değişikliği. Tahminle ilerleme.
- **Kapsam dışına çıkma.** Verilen görevle ilgisiz "iyileştirme" / büyük refactor yapma; öneriysen önce belirt.
- **Mevcut desenleri taklit et.** Yeni bir kütüphane/desen getirmeden önce repoda zaten kullanılanı kontrol et.
- **Değişiklikten sonra:** etkilenen testleri/lint'i çalıştır, ne değiştirdiğini kısaca özetle.
- **Yıkıcı veya geri alınamaz hiçbir şeyi onaysız yapma.**
- Türkçe iletişim; kod/yorum İngilizce ya da Türkçe olabilir ama bir dosyada tutarlı ol.

---

## 13. SÖZLÜK (PROJE TERİMLERİ)

- **Tenant / Firma:** Uygulamayı kullanan müşteri şirket. İzolasyon birimi.
- **Platform admin:** Metropol'ün yönetim kullanıcısı; tenant-üstü, global içerik girer.
- **Firma admin:** Bir firmanın yöneticisi; kendi kullanıcı/segment/modül/içeriğini yönetir.
- **Segment:** Firma içindeki kullanıcı grubu; modül yetkileri segment bazında verilir.
- **Modül:** Diğer sekmesindeki İK aracı (izin, masraf talebi, masraf onay...).
- **Cüzdan (Wallet):** Kart içindeki bakiye tipi. WalletId 1 = Resto, 3 = Gift.
- **UserAccountToken / UserAccountRef:** Metropol'de bir kartı temsil eden token.
- **SaleRefCode:** Bir satış işlemini temsil eden benzersiz referans.
- **MemberId:** Kullanıcının ödeme kuruluşundaki (bizim) benzersiz numarası.
- **PreSaleInfo:** Harcama onayı öncesi tutar/mağaza/ürün bilgisini getiren adım.
- **White-label:** Uygulamanın her firma için kendi markasıyla görünmesi.

---

> Bu dosya canlıdır. Mimari/karar değiştikçe güncel tutulur. Bir kural artık geçerli değilse sil; eskimiş talimat yanlış koddan tehlikelidir.
