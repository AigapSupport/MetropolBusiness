# PRD — MetropolBusiness

> Ürün Gereksinim Dokümanı. *Ne* yapılacağını tanımlar. Geliştirme kuralları için `docs/CLAUDE.md`, mimari için `docs/ARCHITECTURE.md`, görevler için `docs/TODO.md`.
> Versiyon: 0.1 (taslak) · Dil: TR

---

## 1. GENEL BAKIŞ

### 1.1 Vizyon
Firmalara white-label olarak dağıtılan kurumsal bir yan-haklar ve dijital ödeme platformu. Her firma uygulamayı kendi markası ve kullanıcılarıyla kullanır. Çalışanlar MetropolCard yemek/market kartlarını yönetir, harcama yapar, bakiye transfer eder; firma içi duyuru/anket/eğitim içeriklerine erişir; firma içi ve AI asistanlarla sohbet eder; izin/masraf gibi İK süreçlerini yürütür.

### 1.2 Üç İstemci
1. **Mobil (React Native):** Son kullanıcı (firma çalışanı). 5 sekmeli yapı.
2. **Web (React):** Firma yöneticisi paneli. Kullanıcı/segment/modül/içerik yönetimi.
3. **Admin (React):** Metropol platform yöneticisi. Firma onayı, modül tanımı, global içerik/kampanya.

### 1.3 Tek Backend
ASP.NET Core (.NET 8+), PostgreSQL, Redis, SignalR. Tüm Metropol çağrıları backend üzerinden proxy'lenir.

### 1.4 Hedefler
- Çalışan kart/bakiye/harcama deneyimini tek mobil uygulamada toplamak.
- Firmalara kendi kullanıcı tabanını, segmentlerini ve modüllerini yönetebilecekleri bir panel sunmak.
- Metropol'e tüm firmalarda ortak içerik/kampanya yayımlayabileceği merkezi bir yönetim vermek.

### 1.5 Kapsam Dışı (ilk sürüm)
- Fiziksel kart basımı/sipariş süreci.
- Metropol dışı ödeme sağlayıcı entegrasyonu.
- Çok dilli içerik dışında lokalizasyon (ilk sürüm TR + EN arayüz).
- Web/admin'de gelişmiş raporlama/BI (temel listeler yeterli).

---

## 2. ROLLER VE YETKİLER

| Rol | Nerede | Kapsam |
|---|---|---|
| **Platform Admin** | Admin paneli | Tenant-üstü. Firmaları yönetir, modül tanımlar, global içerik/kampanya girer, denetim kaydı görür. |
| **Firma Admin** | Web paneli | Tek firma (tenant). Kendi kullanıcılarını, segmentlerini, modül atamalarını, firma içeriğini (anket/duyuru/video) yönetir. Masraf onaylayıcı atayabilir. |
| **Firma Yönetici (Onaylayan)** | Mobil + (ops. Web) | Kendi segmentindeki masraf/izin taleplerini onaylar/reddeder. |
| **Son Kullanıcı (Çalışan)** | Mobil | Kart, harcama, transfer, içerik, sohbet, yetkili olduğu İK modülleri. |

### 2.1 Yetki Kuralları
- Yetki kontrolü **her zaman backend'de**. İstemci yalnızca UI gizler.
- Modül görünürlüğü: kullanıcının **segment**'ine atanmış modüllere göre.
- Platform admin hiçbir firmanın **kişisel kart/bakiye** verisine erişemez (yalnızca firma/sistem yönetimi). PII erişimi denetlenir.

---

## 3. ÇOK-KİRACILILIK VE İÇERİK KAYNAKLARI

Üç içerik/veri kaynağı seviyesi (karıştırılmamalı):

1. **Platform seviyesi (Metropol admin):** Tüm firmalarda ortak görünen içerik — Avantajlar Dünyası kampanyaları, global duyurular, modül tanımları.
2. **Firma seviyesi (tenant admin):** Yalnızca o firmanın kullanıcılarına görünen içerik — anketler, şirket duyuruları, eğitim videoları, segment/modül yetkileri.
3. **Metropol API (canlı):** Kart, bakiye, işlem verileri — anlık Metropol servisinden.

Her tenant verisi `TenantId` taşır; platform içeriği global işaretlidir. Çakışma durumunda firma içeriği kendi kullanıcılarına, platform içeriği herkese gösterilir; ikisi ayrı bölümlerde sunulabilir.

---

## 4. MOBİL UYGULAMA — NAVİGASYON

Alt tab bar, 5 sekme + ortada yükseltilmiş FAB:
1. **Ana Sayfa** (Home)
2. **Yan Haklar** (Benefits)
3. **Metropol** (orta FAB) — ana sekme
4. **Sohbet** (Chat)
5. **Diğer** (Other / İK modülleri)

Hamburger menü (sol üst) → Hesabım ve alt ekranlar. Sağ üst → sohbet kısayolu + bildirim.

---

## 5. MOBİL — GİRİŞ & ONBOARDING

### 5.1 Akış
1. **Firma/uygulama bağlamı:** White-label dağıtım — her firmanın build'i kendi tenant'ına bağlı gelir VEYA ilk açılışta firma kodu girilir (karar: build-time tenant; firma kodu fallback).
2. **Telefon ile giriş:** Telefon numarası → OTP gönder → 6 haneli kod doğrula.
3. **Yeni kullanıcı:** Profil tamamlama (ad, soyad, e-posta, opsiyonel TCKN).
4. **Oturum:** JWT access + refresh. Biyometrik (Face ID / parmak izi) ile tekrar giriş opsiyonu.

### 5.2 Ekranlar
- Splash / firma logosu
- Telefon girişi
- OTP doğrulama (kod kutuları + "Tekrar gönder" sayacı, rate-limit)
- Profil tamamlama (yeni kullanıcı)
- Biyometrik açma izni

### 5.3 Kabul Kriterleri
- Yanlış OTP 3 denemeden sonra geçici kilit + sayaç.
- OTP gönderimi rate-limit'li (örn. 60 sn).
- Oturum süresi dolunca refresh ile sessiz yenileme; refresh geçersizse login'e döner.

---

## 6. MOBİL — SEKME 1: ANA SAYFA

Firma içeriğinin aktığı dikey akış.

### 6.1 Bölümler
- **Üst bar:** hamburger menü, firma logosu (ortada), sohbet ikonu + bildirim zili (sağ).
- **Duyurular:** yatay carousel kartları (kapak görseli + başlık + kısa metin). Tıkla → duyuru detayı.
- **Anketler:** dikey kart listesi (başlık, soru sayısı, durum). Tıkla → anket doldurma. Tamamlanan anket "tamamlandı" rozetiyle.
- **İzlenecek Videolar:** video kartları (thumbnail, süre, başlık, izlendi/izlenmedi durumu — **kullanıcı bazında**). Tıkla → video oynatma.

### 6.2 Anket Doldurma Ekranı
- Tek/çok soru, ilerleme çubuğu, soru tipleri: tekli seçim, çoklu seçim, açık metin, derecelendirme.
- Gönder → tamamlandı işareti. Tekrar dolduramaz (firma ayarına göre tek seferlik).

### 6.3 Video Oynatma Ekranı
- Oynatıcı + başlık + açıklama. **İzleme tamamlanınca** (veya eşik % izleyince) "izlendi" olarak işaretlenir (kullanıcı bazında, backend'e yazılır).

### 6.4 Veri / API
- `GET /home/announcements` (firma + global)
- `GET /home/surveys`, `POST /home/surveys/{id}/responses`
- `GET /home/videos`, `POST /home/videos/{id}/watch` (izleme durumu)

### 6.5 Kabul Kriterleri
- Video izleme durumu cihazdan bağımsız (backend'de) tutulur; kullanıcı başka cihazda aynı durumu görür.
- Anket tekrar gönderimi engellenir.
- Global ve firma duyuruları aynı akışta ama kaynak ayrımı korunur.

---

## 7. MOBİL — SEKME 2: YAN HAKLAR

Avantaj ve hediye dünyası.

### 7.1 Ana Grid (2'li)
Kartlar: **Kampanyalar, Sosyal Sorumluluk, Kuponlar, Önerdikçe Kazan, Taraftar Kart, Hediye Çekleri**. (İçerik platform admin'den ortak gelir; firma bazlı ek olabilir.)

### 7.2 Kampanyalar
- Liste: marka logosu + başlık + ok (satır kartları).
- Detay: büyük marka logosu, başlık, açıklama, "Detaylı Bilgi Al" butonu, "Benzer Kampanyalar" yatay scroll.

### 7.3 Hediye Çekleri (detay sonraya bırakıldı — placeholder)
- Çek kartları (marka, tutar, son kullanma, "Kullan"). İlk sürümde liste + statik gösterim; kullanım akışı sonra netleşecek.

### 7.4 Önerdikçe Kazan
- Referans/davet kodu paylaşımı, kazanım takibi (sonraki sürümde detaylandırılacak).

### 7.5 Veri / API
- `GET /benefits/categories`
- `GET /benefits/campaigns`, `GET /benefits/campaigns/{id}`
- `GET /benefits/coupons`, `GET /benefits/giftcards`

### 7.6 Kabul Kriterleri
- Platform kampanyaları tüm firmalarda görünür.
- Kampanya detayında benzer kampanyalar aynı kategoriden gelir.

---

## 8. MOBİL — SEKME 3: METROPOL (ÇEKİRDEK)

### 8.1 Ana Ekran
- **Kart slider'ı** (yatay): her kart — MetropolCard logosu, yenile ikonu, kart sahibi adı, kart numarası (gruplu), NFC ikonu, kopyala ikonu, **silme (çöp) ikonu**. Slider başında/sonunda **"Kart Ekle"** boş kartı.
- **Bakiye kartları** (yatay scroll): TOPLAM, RESTORAN, MARKET — tutar + "Kullanılabilir Bakiye". (Cüzdan: Resto/Gift; sunumda Restoran/Market/Toplam.)
- **Aksiyon listesi:** Harcama Yap, Keşfet, İşlem Geçmişi, Bakiye Transferi. (Ek: Bakiye Yükle, Avantajlar kısayolu opsiyonel.)
- **Son 5 İşlem:** seçili karta ait (ikon, tip, maskeli isim, tutar yeşil/kırmızı, tarih-saat).

### 8.2 Kart Ekleme Akışı
1. Kart numarası + telefon girişi → `AddAccount` → `ValidationGuid` döner, SMS OTP gider.
2. OTP doğrulama ekranı (6 hane + tekrar gönder).
3. Kullanıcı bilgileri (ad, soyad, e-posta, telefon, MemberId, TCKN opsiyonel) → `AddAccountConfirm` → `UserAccountToken` döner ve saklanır.

**Kabul:** Hatalı OTP'de anlamlı mesaj; ValidationGuid geçici saklanır; başarıda kart slider'a eklenir.

### 8.3 Kart Detay Ekranı (2 sekmeli)
- **Sekme 1 "Bakiyeler":** cüzdan bazında bakiye (`BalanceQuery` — Resto/Gift) + son 5 işlem.
- **Sekme 2:** karta ait tüm aksiyonlar (transfer, geçmiş, kart kullanım ayarları, kart silme).

### 8.4 Harcama Yap Akışı (SIRA ÖNEMLİ)
1. **Seçim:** "QR ile Ödeme Yap" / "Kısa Kod ile Ödeme Yap".
2. **QR okuma** (kamera) veya **kısa kod girişi** (6 hane).
3. **Kart seçimi + onay** (preinfo'dan ÖNCE): "Ödeme yapılacak kartı seçiniz" → kart seç → devam.
4. `GetPreSaleInfo` (Code + CodeType + MemberId + UserAccountRef).
5. **Tutar/onay ekranı:** banner'da tutar + mağaza adı + ürün adı; seçili kart; "Sektör" altında cüzdan seçimi (RESTORAN — kullanılabilir bakiye / Cüzdan seçiniz). WalletId, dönen ProductId'ye göre (1→Resto, 3→Gift).
6. **ÖDE** → `SaleConfirm`.
7. **Sonuç:** Başarılı (fiş: mağaza, tarih, saat, üye işyeri no, terminal no, onay no, kart no maskeli, tutar, bakiye, logo) / Başarısız (hata mesajı + tekrar dene).

**Kabul:**
- Kart preinfo'dan önce seçilir.
- Çift harcama engeli: aynı SaleRefCode/ConsumerRefCode ile tekrar confirm gönderilmez (idempotency).
- Hata kodları Türkçe anlamlı mesaja çevrilir.

### 8.5 Keşfet (Harita)
- Tam ekran harita + `MerchantList` pinleri (sektöre göre ikonlu: restoran/market/hediye).
- Filtre barı: Temizle, Sektör (dropdown), Adres, Online, Listele.
- Arama kutusu ("Üye noktalarımızı keşfedin" + Ara), konumum butonu.
- Altta yatay mağaza kartları (mesafe, telefon, adres + yol tarifi/ara/harita ikonları).
- **Pin detayı:** küçük harita, Yol Tarifi, işletme bilgileri (telefon, adres), Geri Bildirim Gönder.

**Veri:** `MerchantList` (SectorId, ListType, LastListVersionDate). Liste sürümleme ile artımlı güncelleme; mağaza listesi cache'lenir.

**Kabul:** Pin yoğunluğunda kümeleme (clustering); harita performanslı; offline'da son cache gösterilir.

### 8.6 İşlem Geçmişi
- Liste: ikon + tip (RESTOPAY/GIFTPAY – TRANSFER/SATIŞ) + maskeli isim + Onay No + tutar (yeşil +/kırmızı −) + tarih-saat. Tarih aralığı filtresi, sayfalama.
- **Veri:** `TransactionHistory` (UserAccountRef) ve/veya `CustomerDetailReport` (sayfalı).

### 8.7 Bakiye Transferi
- **Ana menü:** Gönderen (Kartlarım Arası / Başka Karta / Cep Numarasına / Yardım Kartına), Kayıtlı Alıcı, QR Kod Alıcı, Geçmiş Transferler (İşlem Geçmişi).
- **Kartlar Arası:** Gönderen Kart, Alıcı Kart, Cüzdan (RESTOPAY), hızlı tutar (500/1000/2500/5000), tutar input, açıklama, Gönder.
- **QR Kod Alıcı:** alıcının QR'ını okut → alıcı token'ı çözülür.
- **İşlem Onay:** gönderen kart, alıcı (maskeli isim + maskeli no), tutar, tarih, "Tanımlı alıcı olarak ekle" + kayıt adı, Onay → `BalanceTransfer`.
- **Sonuç:** başarılı fiş / başarısız.

**Veri:** `BalanceTransferRequest` (SenderCardToken, ReceiverCardToken, WalletId, Amount).

**Kabul:** Transfer idempotent (çift gönderim engeli); maskeli alıcı gösterimi; kayıtlı alıcı saklanırsa tekrar kullanılabilir.

### 8.8 Kart Silme
- Slider'daki çöp ikonu → onay diyaloğu → `DeleteUser` (UserRefType, UserRefNo) → karttan kaldırma. Soft yaklaşım: yalnızca kullanıcının kart bağı kaldırılır.

---

## 9. MOBİL — SEKME 4: SOHBET

WebSocket (SignalR) tabanlı.

### 9.1 Özellikler
- **Sohbet listesi:** kişi/AI asistan satırları (avatar, isim, son mesaj, saat, okunmamış rozeti). AI asistanlar ayırt edici rozetle.
- **Birebir sohbet:** firma içinde kayıtlı kullanıcılar arası. Mesaj balonları, online durumu, okundu bilgisi, gönder.
- **AI asistan sohbeti:** kullanıcı isim verilmiş AI asistanlarla konuşur. Backend Gemini'yi çağırır. "yazıyor..." göstergesi.
- **AI asistan oluşturma:** isim, avatar/kişilik, kısa açıklama → oluştur. (Kişilik/prompt firma veya kullanıcı seviyesinde — karar gerekiyor.)
- **Yeni sohbet:** firma içi kullanıcı arama/listeleme.

### 9.2 Veri / API
- SignalR hub: `chat` (join, send, receive, typing, read).
- `GET /chat/conversations`, `GET /chat/conversations/{id}/messages`
- `POST /chat/assistants` (AI asistan oluştur), `GET /chat/assistants`
- AI mesajı: backend → Gemini REST → cevap stream/segment.

### 9.3 Kısıt ve Kabul
- Sohbet **yalnızca aynı firma** kullanıcıları arasında (tenant izolasyonu).
- AI asistan cevapları firma bağlamına uygun; sistem prompt'unda firma/kullanıcı PII'si paylaşılmaz.
- Mesajlar kalıcı saklanır; offline'da kuyruğa alınıp bağlanınca gönderilir.

---

## 10. MOBİL — SEKME 5: DİĞER (İK MODÜLLERİ)

Kullanıcının segmentine atanmış modüller görünür.

### 10.1 Modüller (ilk sürüm)
- **İzin Talebi:** izin tipi, başlangıç/bitiş tarihi, gün sayısı (otomatik), açıklama, gönder + geçmiş talepler (durum rozetli).
- **Masraf Talebi:** masraf tipi, tutar, tarih, fiş/foto yükleme, açıklama, gönder + geçmiş.
- **Masraf Onay (yönetici):** onay bekleyen talepler (talep eden, tutar, tarih, fiş önizleme, Onayla/Reddet).

### 10.2 Veri / API
- `GET /modules` (kullanıcının yetkili modülleri)
- `POST /leave-requests`, `GET /leave-requests`
- `POST /expense-requests`, `GET /expense-requests`, `POST /expense-requests/{id}/approve|reject`

### 10.3 Kabul
- Yetkisiz modül istemcide görünmez **ve** backend reddeder.
- Onay akışı: talep → beklemede → onay/ret → bildirim.
- Modül seti genişletilebilir (yeni modül ekleme platform/firma seviyesinde).

---

## 11. MOBİL — HESABIM / PROFİL (hamburger)

### 11.1 Menü
Profilim, Güvenlik, Kampanya/Duyuru İzinleri, Kartvizitim, Kart Kullanım Ayarları, Dil Seçeneği, Hesabımı Sil.

### 11.2 Ekranlar
- **Profilim:** avatar (+kamera), ad-soyad, cep telefonu, mail, TCKN (düzenlenebilir), şehir (dropdown), Güncelle.
- **Kartvizitim:** dijital kartvizit — avatar, ad/soyad, şirket, meslek, telefon, e-posta, "Ek Bilgiler", "QR Oluştur" (vCard QR üretir).
- **Güvenlik:** şifre/PIN değiştir, biyometrik toggle, PIN sıfırlama (`ResetPin` IVR).
- **Kampanya/Duyuru İzinleri:** bildirim/izin toggle'ları.
- **Kart Kullanım Ayarları:** kart bazlı ayarlar (kart deaktivasyon `DeactivateCard` vb.).
- **Dil:** TR/EN.
- **Hesabımı Sil:** uyarı + onay → hesap silme akışı.

---

## 12. WEB — FİRMA YÖNETİM PANELİ

### 12.1 Modüller
- **Dashboard:** özet (kullanıcı sayısı, aktif kart, son içerikler).
- **Kullanıcılar:** liste, davet/ekle, segment atama, aktif/pasif.
- **Segmentler:** oluştur/düzenle, kullanıcı atama.
- **Modül Yetkileri:** segment → modül eşlemesi (izin, masraf vb.).
- **İçerik Yönetimi:**
  - **Anketler:** oluştur (sorular, tipler), yayımla, sonuçları gör.
  - **Duyurular:** oluştur (kapak, başlık, metin), yayımla, segment hedefleme.
  - **Videolar:** yükle/bağla (URL), başlık/açıklama, zorunlu izleme işareti, izleme raporu.
- **Masraf/İzin yönetimi (ops.):** firma genel görünümü, onaylayıcı atama.

### 12.2 Kabul
- Firma admin yalnızca kendi tenant verisini görür.
- İçerik segment hedeflenebilir.
- Video izleme/anket sonuç raporları kullanıcı bazında.

---

## 13. ADMIN — METROPOL PLATFORM PANELİ

### 13.1 Modüller
- **Firmalar (Tenants):** yeni firma onayı/oluşturma, aktif/pasif, firma admin atama, tenant ayarları (marka, logo, renk, Metropol consumer eşlemesi).
- **Modül Tanımları:** platform genelinde hangi modüllerin var olduğu; firmalara hangi modüllerin açılabileceği.
- **Global İçerik:** tüm firmalarda görünen duyurular.
- **Kampanyalar (Avantajlar Dünyası):** kategori + kampanya CRUD (logo, başlık, açıklama, detay linki, benzer kampanya ilişkisi).
- **Denetim (Audit):** kritik işlemler log'u.

### 13.2 Kabul
- Platform admin global içerik yayımlar; tüm tenant'larda görünür.
- Modül tanımı/firma açma platform seviyesinde.
- Firma oluşturma → firma admin daveti.

---

## 14. VERİ MODELİ (ÜST DÜZEY)

> Detay şema `ARCHITECTURE.md`'de. Burada varlıklar ve ilişkiler.

- **Tenant** (firma): id, ad, marka (logo, renk), Metropol consumer eşleme, durum.
- **User:** id, tenant_id, ad, soyad, telefon, e-posta, tckn(ops.), rol, durum, MemberId (Metropol).
- **Segment:** id, tenant_id, ad. **UserSegment** (n-n).
- **Module:** id, kod, ad (platform tanımı). **SegmentModule** (segment → modül yetki).
- **Card (kullanıcı-kart bağı):** id, user_id, UserAccountToken, maskeli kart no, ad-soyad, durum. (Bakiye/işlem **saklanmaz**, Metropol'den canlı çekilir; gerekirse kısa cache.)
- **SavedRecipient (kayıtlı alıcı):** id, user_id, ad, maskeli kart no/token.
- **Announcement:** id, tenant_id(null=global), kapak, başlık, metin, hedef segmentler, durum, tarih.
- **Survey / SurveyQuestion / SurveyResponse:** anket, sorular, kullanıcı yanıtları.
- **Video / VideoWatch:** video, kullanıcı bazlı izleme durumu.
- **Campaign / CampaignCategory:** platform kampanyaları.
- **GiftCard / Coupon:** yan hak öğeleri (ilk sürüm temel).
- **Conversation / Message / Assistant:** sohbet, mesaj, AI asistan.
- **LeaveRequest / ExpenseRequest:** İK talepleri + durum + onay geçmişi.
- **AuditLog:** kritik işlem kaydı.

**Kural:** Tenant'a ait her tabloda `tenant_id`. Para alanları `numeric`. Tarihler UTC.

---

## 15. API SÖZLEŞMESİ (ÖZET)

> Tam sözleşme `API_CONTRACT.md`'de. Tüm uçlar JWT korumalı (login/otp hariç). Tenant claim'i zorunlu.

**Auth:** `POST /auth/otp/send`, `POST /auth/otp/verify`, `POST /auth/refresh`, `POST /auth/logout`
**Profil:** `GET/PUT /me`, `PUT /me/tckn`, `GET/PUT /me/preferences`
**Home:** announcements, surveys (+responses), videos (+watch)
**Benefits:** categories, campaigns, coupons, giftcards
**Metropol (proxy):** cards (list/add/confirm/delete), balance, presale-info, sale-confirm, sale-info, transactions, transfer, merchants
**Chat:** conversations, messages, assistants + SignalR hub
**Modules:** modules, leave-requests, expense-requests (+approve/reject)
**Web (firma admin):** users, segments, segment-modules, content (surveys/announcements/videos)
**Admin (platform):** tenants, module-definitions, global-content, campaigns, audit

**Genel kurallar:** Sayfalama (`page`, `pageSize`), tutarlı hata zarfı (`{ code, message, details }`), idempotency anahtarı para uçlarında, maskeleme backend'de.

---

## 16. FONKSİYONEL OLMAYAN GEREKSİNİMLER

- **Güvenlik:** Metropol sırları backend'de; PII maskeleme/log yasağı; rate-limit (OTP/login/harcama); idempotency; input validation backend'de.
- **Performans:** Ana ekran < 2 sn; harita pin kümeleme; Metropol token cache; bakiye için kısa cache + manuel yenileme.
- **Erişilebilirlik:** dokunma alanları ≥ 44px; kontrast; ekran okuyucu etiketleri.
- **Dayanıklılık:** Metropol kesintisinde anlamlı hata + retry politikası (para uçlarında dikkatli).
- **Gözlemlenebilirlik:** yapısal log (PII'siz), hata izleme, kritik işlem audit.
- **Lokalizasyon:** TR/EN arayüz; tüm string'ler kaynak dosyadan.
- **White-label:** tema (renk/logo/marka) tenant'a göre runtime.

---

## 17. KESİNLEŞEN KARARLAR

> Bu kararlar netleştirilmiştir. Bir kısmı Claude Design prototipi (`design/prototype/`) tarafından örneklenip doğrulanmıştır. Değişirse ilgili dökümanlar güncellenir.

1. **Tenant belirleme — runtime, tek uygulama.** Tek bir mobil uygulama; firma teması (renk/logo/marka) runtime'da tenant'a göre yüklenir. Prototip bunu `PALETTES` + `setBrandKey` ile uygular. İlk açılışta firma kodu/seçimi veya kullanıcının firmasından otomatik tenant. *Gerekçe: her firmaya ayrı build/yayın bakım yükü; runtime tema tek yayınla çok firma sağlar.* (Build-time ayrı uygulama seçeneği ileride kurumsal talep gelirse değerlendirilir.)

2. **AI asistan kişiliği — firma admin tanımlar, kullanıcı kullanır.** Asistanın `persona`/sistem prompt'u ve adı firma admin (veya yetkili) tarafından tanımlanır; son kullanıcı bu asistanlarla sohbet eder. Kullanıcının kendi kişisel asistanını adlandırması opsiyonel (Faz 2'de netleşir). *Gerekçe: kurumsal tutarlılık ve içerik kontrolü.* (`assistants.scope = tenant` varsayılan.)

3. **Web ve Admin — ayrı uygulamalar.** İki ayrı React app (`web/`, `admin/`), ortak bileşen/tip paylaşımı `shared/`. *Gerekçe: farklı rol, farklı güvenlik sınırı (platform admin tenant-üstü, PII'siz); ayrı dağıtım/erişim.*

4. **Hediye çeki — ilk sürümde listeleme.** Faz 2'de yalnız liste + statik gösterim. Kullanım/itfa (redemption) akışı sonraki sürümde Metropol/iş tarafı netleşince eklenir.

5. **Önerdikçe Kazan — Faz 2+ basit referans.** Davet/referans kodu paylaşımı + kazanım takibi (temel). Detaylı kazanım mekaniği (ödül kuralları) iş tarafıyla netleştikçe genişler. İlk sürümde kapsam dışı.

6. **Masraf onay — tek aşamalı.** Talep → tek onaylayıcı (approver) → onay/ret. Çok aşamalı (zincirli) onay ilk sürümde yok; ihtiyaç olursa `expense_requests` akışına aşama alanları eklenir.

7. **Bakiye gösterimi — canlı + kısa cache + manuel yenileme.** Varsayılan: Metropol'den canlı çekilir; performans için çok kısa Redis cache (~30 sn) opsiyonel. Kullanıcı kart üzerindeki yenile ikonuyla zorlayabilir (prototipte mevcut). *Gerekçe: para verisinde tazelik önceliği.*
   **Güncelleme (KARAR 2026-06-11):** güncel bakiyeler ayrıca `card_balances` snapshot'ında saklanır — Metropol kaynak-otorite kalır; kesintide son bilinen bakiye `stale=true` + `asOf` ile gösterilir (ARCHITECTURE §4.2, API_CONTRACT §6).

8. **Push bildirim — FCM + APNs, Faz 3.** Android FCM, iOS APNs. İlk sürümde uygulama içi bildirim listesi (prototipte var); push altyapısı Faz 3.

9. **RBAC — basit rol enum (ilk sürüm).** `users.role`: enduser / company_admin / approver; platform_admin ayrı. İnce taneli izin (permission tabloları) ihtiyaç doğarsa sonradan eklenir. *Gerekçe: ilk sürüm ihtiyacı için yeterli, erken karmaşıklıktan kaçınma.*

---

## 18. SÜRÜM YOL HARİTASI (ÖNERİ)

- **MVP (Faz 1):** Auth, Metropol kart ekleme/bakiye/harcama (QR+kısa kod)/işlem geçmişi/transfer, Ana Sayfa (duyuru/anket/video), temel firma + platform paneli, tenant izolasyonu.
- **Faz 2:** Keşfet haritası, Yan Haklar (kampanya/kupon/hediye çeki), Sohbet (birebir + AI), İK modülleri (izin/masraf).
- **Faz 3:** Raporlama, push bildirim, gelişmiş white-label, ek modüller.

---

> Bu PRD canlıdır; kararlar netleştikçe (Bölüm 17) güncellenir.
