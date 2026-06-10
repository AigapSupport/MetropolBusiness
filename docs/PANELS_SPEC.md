# PANELS_SPEC — Web (Firma Admin) & Admin (Platform) Panel Spesifikasyonu

> Bu iki panel prototipte yoktur; bu doküman onların ekran-ekran tasarım ve davranış spesifikasyonudur. Ürün için `docs/PRD.md` §12–13, uçlar için `docs/API_CONTRACT.md` §12–13, mimari için `docs/ARCHITECTURE.md`.
> İkisi de React + TypeScript. Ayrı app'ler (web/ ve admin/). Masaüstü öncelikli, responsive.

---

## 0. ORTAK TASARIM & DAVRANIŞ

### 0.1 Layout iskeleti (her iki panel)
- **Sol sidebar:** logo (üstte), menü öğeleri (ikon + etiket), altta kullanıcı kartı + çıkış.
- **Üst bar:** sayfa başlığı (sol), arama (orta, opsiyonel), bildirim + profil menüsü (sağ). Web panelinde ayrıca firma adı/logosu görünür (tenant bağlamı).
- **İçerik alanı:** başlık + birincil aksiyon butonu (sağ üst) + filtre satırı + tablo/form/grid.
- **Genişlik:** içerik max ~1280px, ortalı; sidebar sabit ~240px.

### 0.2 Ortak bileşenler
- **DataTable:** sıralama, sayfalama (server-side, `page/pageSize`), satır aksiyonları (… menü), boş durum, yükleniyor (skeleton), seçim (checkbox, toplu işlem).
- **FilterBar:** arama input + dropdown filtreler + "Temizle". URL query ile senkron (paylaşılabilir/geri tuşu çalışır).
- **FormDrawer / Modal:** oluştur/düzenle için yan çekmece veya modal. Alan validasyonu (anlık + submit), kaydet/iptal, kaydederken disable + spinner.
- **ConfirmDialog:** yıkıcı işlemler için (sil, pasifleştir) — açık metin + onay.
- **StatusBadge:** durum renkleri (aktif/pasif, onaylandı/beklemede/reddedildi, yayında/taslak).
- **Toast:** başarı/hata bildirimleri.
- **EmptyState:** ikon + başlık + açıklama + (varsa) birincil aksiyon.

### 0.3 Ortak davranış kuralları
- Tüm listeler **server-side** filtre/sayfalama (büyük veri).
- Tüm yıkıcı işlemler ConfirmDialog'dan geçer; silmeler mümkünse pasifleştirme (soft).
- Form validasyonu istemcide (UX) **ve** backend'de.
- Yetki: kullanıcı yetkisi olmayan menü/aksiyonu görmez **ve** backend reddeder.
- Tarih/saat yerelleştirilmiş gösterim; veride UTC.
- Para `numeric` string, yerel format gösterim (1.250,00 ₺).

### 0.4 Auth (her iki panel)
- Karar: kendi auth — e-posta+şifre, OTP yok (LESSONS.md 'Panel girişi' kararı; API_CONTRACT §1 `/auth/login` + `/auth/set-password`).
- E-posta + şifre ile giriş (mobilden farklı — panel kullanıcıları kurumsal hesap). 2FA opsiyonel (Faz sonrası).
- Şifremi unuttum akışı.
- Oturum: JWT access+refresh; rol kontrolü (`company_admin` / `platform_admin`).
- Yanlış rol ile girişte erişim reddi.

---

# A. WEB — FİRMA ADMIN PANELİ

> Rol: `company_admin`. Tüm veriler **kendi tenant'ı** ile sınırlı (backend zorlar). Üst barda firma adı/logosu.

## A.1 Sidebar menüsü
Dashboard · Kullanıcılar · Segmentler · Modül Yetkileri · İçerik (Anketler / Duyurular / Videolar) · Talepler (İzin / Masraf) · Ayarlar

---

## A.2 Dashboard
**Amaç:** firma geneli özet.
- **Üst kartlar (KPI):** Toplam kullanıcı, Aktif kart sayısı, Bekleyen talep (izin+masraf), Yayındaki içerik.
- **Grafik/özet:** son 30 gün kullanıcı aktivitesi (opsiyonel, Faz 2), anket katılım oranı.
- **Son hareketler listesi:** son eklenen kullanıcılar, son yayımlanan içerik, son talepler.
- **Hızlı aksiyonlar:** "Kullanıcı ekle", "Duyuru yayımla", "Anket oluştur".

## A.3 Kullanıcılar
**Liste (DataTable):** ad-soyad, telefon (maskeli ops.), e-posta, segment(ler) (etiketler), rol, durum (badge), son giriş. 
- **FilterBar:** arama (ad/telefon/e-posta), segment filtresi, durum filtresi, rol filtresi.
- **Satır aksiyonları:** Düzenle, Segment ata, Pasifleştir/Aktifleştir, (gerekiyorsa) Sil.
- **Toplu işlem:** seçili kullanıcılara segment atama.
- **Birincil aksiyon:** "Kullanıcı Ekle" / "Toplu İçe Aktar (CSV)".

**Kullanıcı ekle/düzenle (FormDrawer):** ad, soyad, telefon, e-posta, rol (enduser/approver), segment seçimi (çoklu). Davet yöntemi: SMS/e-posta ile davet linki.
**API:** `GET/POST/PUT/DELETE /admin/company/users`, `PUT /admin/company/users/{id}/segments`.

**Kabul:** Telefon tenant içinde benzersiz. Davet edilen kullanıcı ilk girişte profilini tamamlar. Pasif kullanıcı mobile giremez.

## A.4 Segmentler
**Liste:** segment adı, kullanıcı sayısı, atanmış modül sayısı, oluşturma tarihi.
- **Birincil aksiyon:** "Segment Oluştur".
- **Satır aksiyonları:** Düzenle, Kullanıcıları gör, Modül yetkileri, Sil (kullanıcı varsa uyarı).

**Segment detay/düzenle:** ad; bu segmentteki kullanıcılar (ekle/çıkar); modül yetkileri (toggle listesi — A.5 ile aynı).
**API:** `GET/POST/PUT/DELETE /admin/company/segments`, `PUT .../segments/{id}/modules`.

## A.5 Modül Yetkileri
**Amaç:** segment → modül eşlemesi (matris).
- **Görünüm:** satırlar = segmentler, sütunlar = modüller (İzin Talebi, Masraf Talebi, Masraf Onay, Kartvizit...), hücreler = toggle.
- Alternatif: segment seçilir, o segmentin modülleri toggle listesi.
- Platform'un firmaya **açtığı** modüller görünür; kapalı modüller görünmez/disabled.
**API:** `PUT /admin/company/segments/{id}/modules` (`moduleCodes`).
**Kabul:** Değişiklik anında mobilde yansır (kullanıcı bir sonraki `GET /me/modules`'te görür).

## A.6 İçerik — Anketler
**Liste:** başlık, soru sayısı, durum (taslak/yayında), katılım sayısı, oluşturma/yayım tarihi, hedef segment(ler).
- **Birincil aksiyon:** "Anket Oluştur".
- **Satır aksiyonları:** Düzenle, Yayımla/Yayından kaldır, Sonuçları gör, Kopyala, Sil.

**Anket oluştur/düzenle (sayfa):**
- Başlık, açıklama, hedef segment(ler) (boş = tüm firma), tek-seferlik mi toggle.
- **Soru editörü:** soru ekle/sil/sırala (drag). Soru tipleri: tekli seçim, çoklu seçim, açık metin, derecelendirme (1-5). Her soru için metin + seçenekler.
- Önizleme + Kaydet (taslak) / Yayımla.

**Sonuçlar ekranı:** soru bazında dağılım (bar/pasta), açık metin yanıt listesi, katılımcı sayısı, dışa aktar (CSV).
**API:** `GET/POST/PUT/DELETE /admin/company/surveys`, `GET .../surveys/{id}/results`.

## A.7 İçerik — Duyurular
**Liste:** kapak (küçük), başlık, durum, hedef segment, yayım tarihi.
- **Birincil aksiyon:** "Duyuru Oluştur".
**Oluştur/düzenle (FormDrawer/sayfa):** kapak görseli yükle, başlık, gövde (zengin metin), hedef segment(ler), yayım zamanı (şimdi/ileri tarih).
**API:** `GET/POST/PUT/DELETE /admin/company/announcements`.
**Kabul:** Segment hedefliyse yalnız o segment görür. İleri tarihli yayım desteklenir.

## A.8 İçerik — Videolar
**Liste:** thumbnail, başlık, süre, zorunlu mu (badge), izlenme oranı (%), durum.
- **Birincil aksiyon:** "Video Ekle".
**Ekle/düzenle:** başlık, açıklama, video URL (veya yükleme), thumbnail, süre, zorunlu izleme toggle, hedef segment.
**İzlenme raporu:** kullanıcı bazında izledi/izlemedi listesi, tamamlama %, filtre (segment), dışa aktar.
**API:** `GET/POST/PUT/DELETE /admin/company/videos`, `GET .../videos/{id}/watch-report`.

## A.9 Talepler — İzin & Masraf (firma görünümü)
**İzin listesi:** talep eden, tip, tarih aralığı, gün, durum (badge), karar veren.
**Masraf listesi:** talep eden, tip, tutar, tarih, durum, fiş (önizleme linki), karar veren.
- **FilterBar:** durum, tarih aralığı, segment/kişi.
- Firma admin geneli görür; onay yetkisi **approver**'da (mobil veya panelde).
- **Onaylayıcı atama:** hangi segment/kişi hangi segmentin taleplerini onaylar.
**API:** `GET /admin/company/leave-requests`, `GET /admin/company/expense-requests`, `PUT /admin/company/approvers`.

## A.10 Ayarlar
- Firma profili (görüntüleme; marka/logo platform tarafından yönetiliyorsa salt-okunur ya da sınırlı).
- Bildirim tercihleri, dil.
- Panel kullanıcıları (firma admin ekibi) yönetimi (opsiyonel, Faz 2).

---

# B. ADMIN — PLATFORM PANELİ (METROPOL)

> Rol: `platform_admin`. Tenant-üstü. **Hiçbir firmanın kişisel kart/bakiye/işlem verisine erişemez** — yalnızca firma ve sistem yönetimi. Kritik işlemler audit'lenir.

## B.1 Sidebar menüsü
Dashboard · Firmalar · Modül Tanımları · Global İçerik (Duyurular) · Kampanyalar (Avantajlar Dünyası) · Kategoriler · Denetim Kaydı · Ayarlar

## B.2 Dashboard
- **KPI kartları:** toplam firma (aktif/pasif/bekleyen), toplam kullanıcı (firma kırılımı), yayındaki global içerik, yayındaki kampanya.
- **Son hareketler:** yeni firma başvuruları, son yayımlanan kampanya/duyuru, son denetim olayları.
- **Hızlı aksiyonlar:** "Firma ekle", "Kampanya yayımla", "Global duyuru".

## B.3 Firmalar (Tenants)
**Liste (DataTable):** firma adı, firma kodu, durum (active/passive/pending), kullanıcı sayısı, oluşturma tarihi, Metropol consumer eşleşmesi (var/yok).
- **FilterBar:** arama (ad/kod), durum.
- **Birincil aksiyon:** "Firma Ekle".
- **Satır aksiyonları:** Detay/Düzenle, Aktifleştir/Pasifleştir, Firma admin davet et.

**Firma oluştur/düzenle (sayfa):**
- **Temel:** firma adı, firma kodu (benzersiz, login fallback), durum.
- **Metropol eşleme:** ConsumerId (secret referansı — değer maskeli, audit'li).
- **Marka (white-label):** logo yükle, birincil renk, ikincil renk — mobil tema bu değerlerden türer (PALETTES yapısının prod karşılığı). Canlı önizleme (kart/buton/tab).
- **Modül erişimi:** bu firmaya hangi modüllerin açılabileceği (firma admin yalnız bunları segmentlere atayabilir).
- **Firma admin daveti:** ad, e-posta → davet linki.
**API:** `GET/POST/PUT /platform/tenants`, `POST /platform/tenants/{id}/admins`.
**Kabul:** Firma kodu benzersiz. Pasif firma → tüm kullanıcıları erişemez. Marka değişimi mobilde tema olarak yansır.

## B.4 Modül Tanımları
**Liste:** modül kodu, ad, açıklama, aktif mi, kaç firmada açık.
- **Birincil aksiyon:** "Modül Tanımla".
**Oluştur/düzenle:** kod (slug, benzersiz: `leave_request`...), görünen ad, açıklama, ikon, aktif toggle.
**API:** `GET/POST/PUT /platform/modules`.
**Kabul:** Modül burada tanımlanır; firmalara B.3'te açılır; firma segmentlere A.5'te atar. Üç seviyeli kontrol.

## B.5 Global İçerik — Duyurular
Tüm firmalarda görünen duyurular (`tenant_id = null`).
**Liste:** kapak, başlık, durum, yayım tarihi.
**Oluştur/düzenle:** kapak, başlık, gövde, yayım zamanı. (Segment hedefleme yok — global.)
**API:** `GET/POST/PUT/DELETE /platform/announcements`.

## B.6 Kampanyalar (Avantajlar Dünyası)
Tüm firmalarda görünen kampanyalar.
**Liste:** marka logosu, başlık, kategori, durum, yayım tarihi.
- **FilterBar:** kategori, durum, arama.
- **Birincil aksiyon:** "Kampanya Oluştur".
**Oluştur/düzenle:** marka logosu, başlık, gövde (zengin metin), kategori, detay linki (Detaylı Bilgi Al), benzer kampanya ilişkisi (aynı kategori öneri), yayım zamanı.
**API:** `GET/POST/PUT/DELETE /platform/campaigns`.

## B.7 Kategoriler
Kampanya kategorileri (Kampanyalar, Sosyal Sorumluluk, Kuponlar, Önerdikçe Kazan, Taraftar Kart...).
**Liste:** kod, ad, kampanya sayısı, sıra.
**Oluştur/düzenle:** kod, ad, ikon/kapak, sıra.
**API:** `GET/POST/PUT/DELETE /platform/campaign-categories`.

## B.8 Denetim Kaydı (Audit)
**Liste:** zaman, aktör (admin), aksiyon, varlık, varlık id, (PII'siz) detay.
- **FilterBar:** aksiyon, varlık tipi, tarih aralığı, aktör.
- Salt-okunur. Dışa aktar.
**API:** `GET /platform/audit-logs`.
**Kabul:** Firma oluşturma/pasifleştirme, modül değişikliği, marka değişikliği, ConsumerId erişimi gibi kritik olaylar otomatik kaydedilir.

## B.9 Ayarlar
- Platform admin ekibi yönetimi (kullanıcı/rol).
- Sistem ayarları, ortam bilgisi (salt-okunur).

---

## C. ÜÇ SEVİYELİ KONTROL ÖZETİ (kritik akış)

```
Platform Admin (B.4)        Platform Admin (B.3)         Firma Admin (A.5)          Son Kullanıcı
modülü TANIMLAR      →      firmaya AÇAR          →      segmente ATAR        →     mobilde GÖRÜR
(modules)                   (tenant module access)       (segment_modules)          (GET /me/modules)
```
Bu zincir bozulmamalı: bir modül tanımlı değilse firmaya açılamaz; firmaya açık değilse segmente atanamaz; segmente atalı değilse kullanıcı göremez. Her aşama backend'de doğrulanır.

---

## D. PANEL GELİŞTİRME SIRASI (öneri)
1. Ortak iskelet (auth, sidebar, DataTable, FormDrawer, FilterBar, ConfirmDialog).
2. Admin: Firmalar (B.3) + Modül Tanımları (B.4) — çünkü firma/modül olmadan firma paneli boş.
3. Web: Kullanıcılar (A.3) + Segmentler (A.4) + Modül Yetkileri (A.5).
4. İçerik (Web A.6–A.8) + Global içerik/Kampanya (Admin B.5–B.7).
5. Talepler (A.9) + Denetim (B.8) + Dashboard'lar.

> Bu panellerin görsel dili mobil prototiple aynı marka kimliğini taşır ama ayrı (masaüstü) düzendir. Mobil prototip bu panelleri kapsamaz.
