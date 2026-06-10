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
- [ ] Mobile: RN init (TS), navigasyon, tema/token altyapısı, localization (TR/EN), API client, React Query
- [ ] Web: React (TS) init, routing, auth guard, API client
- [ ] Admin: React (TS) init, routing, auth guard, API client
- [ ] `shared/types`: ortak DTO tipleri + üretim/paylaşım yöntemi

---

## FAZ 1 — MVP

### 1.1 Çok-kiracılılık & kimlik (BACKEND — ÖNCE BU)
- [ ] Entity: Tenant, User, Role, Segment, UserSegment
- [ ] EF Core + PostgreSQL, ilk migration
- [ ] `ITenantContext` + JWT'den tenant_id okuma
- [ ] EF global query filter (TenantId) + manuel filtre disiplini
- [ ] **Test:** A firması kullanıcısı B firması verisine erişemez
- [ ] JWT access+refresh, rol+tenant claim
- [ ] Rol/yetki attribute'ları (endpoint guard)

### 1.2 Auth (BACKEND + MOBILE)
- [ ] `POST /auth/otp/send` (rate-limit, Redis)
- [ ] `POST /auth/otp/verify` (3 deneme kilidi)
- [ ] `POST /auth/refresh`, `POST /auth/logout`
- [ ] Mobile: splash, telefon girişi, OTP ekranı, profil tamamlama, biyometrik
- [ ] Mobile: token saklama (secure storage), sessiz yenileme, login'e düşme

### 1.3 Metropol entegrasyon katmanı (BACKEND — KRİTİK)
- [ ] `MetropolModels.cs` taşı + namespace düzenle
- [ ] AES helper (CBC/PKCS7/IV=16 sıfır/128-bit) + Base64 — **unit test**
- [ ] `GenerateToken` + `getdate` ile saat farkı çözümü
- [ ] Token cache (Redis) + single-flight yenileme (4 dk eşik)
- [ ] İki base URL (auth/api) konfigürasyonu
- [ ] `MetropolApiClient` (tüm endpoint'ler için tipli metotlar)
- [ ] Hata kodu → Türkçe mesaj eşleme tablosu
- [ ] Maskeleme yardımcıları (kart no, isim, TCKN)
- [ ] **Sır yönetimi:** AccessKey/AESKey/ConsumerId env/secret'tan

### 1.4 Kart yönetimi (BACKEND + MOBILE)
- [ ] Entity: Card (user-kart bağı, UserAccountToken, maskeli no)
- [ ] `AddAccount` → ValidationGuid akışı (proxy)
- [ ] `AddAccountConfirm` → UserAccountToken sakla
- [ ] Kart listeleme (kullanıcının kartları)
- [ ] `DeleteUser` (kart bağını kaldır)
- [ ] Mobile: kart slider, Kart Ekle 3 adım (no+tel / OTP / bilgiler), silme onayı

### 1.5 Bakiye & işlem (BACKEND + MOBILE)
- [ ] `BalanceQuery` proxy (Resto/Gift; sunum: Toplam/Restoran/Market)
- [ ] Bakiye kısa cache + manuel yenileme
- [ ] `TransactionHistory` / `CustomerDetailReport` proxy + sayfalama
- [ ] Mobile: bakiye kartları, son 5 işlem, işlem geçmişi ekranı (filtre/sayfalama)

### 1.6 Harcama akışı (BACKEND + MOBILE — SIRA KRİTİK)
- [ ] `GetPreSaleInfo` proxy (Code+CodeType+MemberId+UserAccountRef)
- [ ] `SaleConfirm` proxy + **idempotency** (SaleRefCode/ConsumerRefCode tekrar engeli)
- [ ] `GetSaleInfo` proxy (durum sorgu)
- [ ] WalletId belirleme (ProductId 1→1, 3→3)
- [ ] Mobile: QR okuma, kısa kod girişi
- [ ] Mobile: **kart seçim+onay (preinfo'dan ÖNCE)**
- [ ] Mobile: tutar/onay ekranı (cüzdan seçimi), ÖDE
- [ ] Mobile: başarılı fiş ekranı + başarısız/tekrar dene
- [ ] **Test:** çift harcama engellenir

### 1.7 Bakiye transferi (BACKEND + MOBILE)
- [ ] `BalanceTransfer` proxy + idempotency
- [ ] Entity: SavedRecipient (kayıtlı alıcı)
- [ ] Mobile: transfer ana menü
- [ ] Mobile: Kartlar Arası (gönderen/alıcı/cüzdan/tutar/açıklama)
- [ ] Mobile: QR Kod Alıcı (okut→token)
- [ ] Mobile: işlem onay (maskeli alıcı, tanımlı alıcı ekle)
- [ ] Mobile: başarılı/başarısız sonuç
- [ ] **Test:** transfer idempotent

### 1.8 Ana Sayfa içerik (BACKEND + WEB + MOBILE)
- [ ] Entity: Announcement, Survey, SurveyQuestion, SurveyResponse, Video, VideoWatch
- [ ] Backend: home announcements/surveys/videos uçları (firma+global ayrımı)
- [ ] Backend: anket yanıt + tek seferlik kontrol
- [ ] Backend: video izleme durumu (kullanıcı bazlı)
- [ ] Web (firma admin): anket CRUD, duyuru CRUD, video ekleme + segment hedefleme
- [ ] Mobile: duyuru carousel + detay
- [ ] Mobile: anket listesi + doldurma (soru tipleri, ilerleme)
- [ ] Mobile: video listesi + oynatıcı + izlendi işaretleme

### 1.9 Temel paneller (WEB + ADMIN)
- [ ] Web: login, dashboard, kullanıcı listesi/ekle, segment yönetimi
- [ ] Web: segment→modül yetki ekranı
- [ ] Admin: login, firma (tenant) oluştur/onayla, firma admin ata, tenant marka ayarı
- [ ] Admin: modül tanımları
- [ ] **Test:** firma admin sadece kendi tenant; platform admin PII'ye erişemez

### 1.10 White-label tema
- [ ] Backend: tenant marka (logo, renk) endpoint
- [ ] Mobile: tema token runtime yükleme (hardcode renk yok)

---

## FAZ 2 — GENİŞLEME

### 2.1 Keşfet (harita)
- [ ] `MerchantList` proxy + liste sürümleme (artımlı) + cache
- [ ] Mobile: harita + pin (sektör ikonları) + kümeleme
- [ ] Mobile: filtre barı (Temizle/Sektör/Adres/Online/Listele), arama, konumum
- [ ] Mobile: mağaza kartları (mesafe/tel/adres + yol tarifi/ara/harita)
- [ ] Mobile: pin detayı (Yol Tarifi, bilgiler, Geri Bildirim Gönder)

### 2.2 Yan Haklar
- [ ] Entity: CampaignCategory, Campaign, Coupon, GiftCard
- [ ] Admin: kampanya kategori + kampanya CRUD (benzer kampanya ilişkisi)
- [ ] Backend: benefits uçları
- [ ] Mobile: grid, kampanya liste+detay, kupon, hediye çeki (listeleme)

### 2.3 Sohbet
- [ ] SignalR hub (join/send/receive/typing/read) + tenant izolasyonu
- [ ] Entity: Conversation, Message, Assistant
- [ ] Backend: conversations/messages/assistants uçları
- [ ] Gemini entegrasyonu (backend; anahtar backend'de; PII'siz prompt)
- [ ] Mobile: sohbet listesi, birebir sohbet, AI sohbet (yazıyor...), AI asistan oluştur, kullanıcı arama
- [ ] Offline mesaj kuyruğu

### 2.4 İK modülleri
- [ ] Entity: LeaveRequest, ExpenseRequest (+durum/onay geçmişi)
- [ ] Backend: leave/expense uçları + approve/reject + modül yetki kontrolü
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
