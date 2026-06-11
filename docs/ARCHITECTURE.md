# ARCHITECTURE — MetropolBusiness

> Sistem mimarisi, veri şeması ve kesişen teknik kararlar. Ürün için `docs/PRD.md`, kurallar için `docs/CLAUDE.md`, API detayı için `docs/API_CONTRACT.md`.
> Versiyon: 0.1 (taslak)

---

## 1. SİSTEM GENEL GÖRÜNÜMÜ

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Mobile    │   │     Web     │   │    Admin    │
│ (RN/son k.) │   │ (firma adm.)│   │ (platform)  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │ HTTPS/JWT       │                 │
       └────────────┬────┴─────────────────┘
                    ▼
         ┌──────────────────────┐
         │   ASP.NET Core API    │  (tek backend)
         │  Api → Application →  │
         │  Domain ; Infra impl. │
         └───────┬───────┬───────┘
        ┌────────┘       └─────────┐
        ▼        ▼        ▼         ▼
   PostgreSQL  Redis   Metropol   Gemini
   (kalıcı)   (cache/  API (proxy) (AI)
              token/   ↑ sadece backend çağırır
              signalr) 
```

- İstemciler **yalnızca** kendi backend'imizle konuşur. Metropol ve Gemini'ye doğrudan erişmez.
- SignalR (WebSocket) sohbet ve canlı bildirim için; Redis backplane ile ölçeklenebilir.

---

## 2. BACKEND KATMAN MİMARİSİ (Clean Architecture)

Bağımlılık yönü **içe doğru**: `Api → Application → Domain`. Infrastructure ve Integration projeleri Application/Domain arayüzlerini implemente eder.

| Proje | Sorumluluk | Bağımlılık |
|---|---|---|
| `*.Domain` | Entity, enum, value object, domain arayüzleri. Saf C#. | Hiçbiri (framework yok) |
| `*.Application` | Use-case'ler, servis arayüzleri, DTO, validation, CQRS handler. | Domain |
| `*.Infrastructure` | EF Core (Postgres), Redis, SignalR, Identity, repository impl. | Application, Domain |
| `*.Integration.Metropol` | Metropol API client, AES, token servisi, modeller. | Application (arayüz), Domain |
| `*.Integration.Gemini` | Gemini REST client. | Application (arayüz) |
| `*.Api` | Controller, middleware, DI, auth, program entry. | Application (+ Infra'yı DI'da bağlar) |

**Kurallar:**
- Domain hiçbir dış kütüphaneye bağımlı değildir. EF attribute'ları Domain'e konmaz (konfigürasyon Infrastructure'da Fluent API ile).
- Controller ince; iş mantığı Application'da.
- Entity'ler API'den dönmez; DTO/response model kullanılır.
- Beklenen hatalar için `Result<T>` deseni; exception akış kontrolü için değil.

---

## 3. ÇOK-KİRACILILIK (MULTI-TENANCY)

### 3.1 Model
- **Tek veritabanı, paylaşımlı şema, satır bazlı izolasyon.** Her tenant verisi `tenant_id` kolonu taşır.
- Platform admin tenant-üstü tek istisna.

### 3.2 Tenant bağlamı
- JWT içinde `tenant_id` ve `role` claim'leri.
- `ITenantContext` her istekte token'dan `tenant_id` okur (request scoped).
- Platform admin token'ında özel claim (`platform_admin = true`), `tenant_id` yok.

### 3.3 İzolasyon mekaniği
- EF Core **global query filter**: tenant'a ait her entity için `e => e.TenantId == _tenantContext.TenantId`.
- Insert/update'te `TenantId` otomatik atanır (SaveChanges interceptor).
- **Manuel sorgularda filtreye güvenme:** global filter'ı bypass eden sorgu (IgnoreQueryFilters) yalnızca platform admin senaryolarında ve açık gerekçeyle.
- **Test zorunlu:** "A tenant kullanıcısı B tenant verisine erişemez" her veri uçunda.

### 3.4 İçerik kaynağı seviyeleri
| Seviye | TenantId | Görünürlük |
|---|---|---|
| Platform (global) | `NULL` | tüm tenant'lar |
| Firma | dolu | yalnızca o tenant |
| Metropol API | — | canlı, saklanmaz |

Global içerik sorgusu: `WHERE tenant_id = @current OR tenant_id IS NULL`.

---

## 4. POSTGRESQL ŞEMASI

> Konvansiyon: tablo adları `snake_case`, çoğul. PK `id uuid` (gen_random_uuid()). Zaman `timestamptz` (UTC). Para `numeric(18,2)`. Tüm tenant tablolarında `tenant_id uuid` + indeks. Soft-delete `deleted_at timestamptz NULL`. Ortak: `created_at`, `updated_at`.

### 4.1 Kimlik & kiracı

**tenants**
| kolon | tip | not |
|---|---|---|
| id | uuid PK | |
| name | text | firma adı |
| code | text UNIQUE | firma kodu (login fallback) |
| status | text | active/passive/pending |
| metropol_consumer_id | text | Metropol ConsumerId eşleme (şifreli/secret ref) |
| brand_logo_url | text | white-label |
| brand_primary_color | text | white-label |
| brand_secondary_color | text | |
| settings | jsonb | esnek tenant ayarları |
| created_at / updated_at | timestamptz | |

**users**
| id | uuid PK |
| tenant_id | uuid FK→tenants |
| phone | text | login anahtarı (tenant içinde unique) |
| first_name / last_name | text |
| email | text |
| tckn | text NULL | şifreli saklama |
| city | text NULL |
| avatar_url | text NULL |
| role | text | enduser/company_admin/approver |
| member_id | text | Metropol MemberId (KARAR 2026-06-11: otomatik atanır — boşsa Id'nin 32 hex hali, migration backfill dahil) |
| status | text | active/passive |
| deleted_at | timestamptz NULL |
- UNIQUE(tenant_id, phone)

**roles / permissions** — basit tutuluyorsa `users.role` enum yeterli; genişlerse ayrı RBAC tabloları.

**segments**
| id | uuid PK |
| tenant_id | uuid FK |
| name | text |
- UNIQUE(tenant_id, name)

**user_segments** (n-n)
| user_id | uuid FK |
| segment_id | uuid FK |
- PK(user_id, segment_id)

**modules** (platform tanımı)
| id | uuid PK |
| code | text UNIQUE | leave_request / expense_request / expense_approval ... |
| name | text |
| is_active | bool |

**segment_modules** (segment → modül yetki)
| segment_id | uuid FK |
| module_id | uuid FK |
- PK(segment_id, module_id)

### 4.2 Kart & Metropol bağı

> **İşlem verisi saklanmaz**, Metropol'den canlı çekilir. **KARAR (2026-06-11, proje sahibi):** kartların güncel bakiyeleri `card_balances` tablosunda **snapshot** olarak da tutulur — Metropol kaynak-otorite kalır, DB son-bilinen kopyadır (kesinti dayanıklılığı): başarılı her BalanceQuery yanıtı upsert edilir; Metropol erişilemezse son bilinen bakiye `stale=true` + `asOf=son senkron` ile döner (iş kuralı hataları 422 olarak kalır). Önceki "bakiye saklanmaz, canlı çekilir" kuralı bu kararla değişti.

**cards**
| id | uuid PK |
| tenant_id | uuid FK |
| user_id | uuid FK |
| user_account_token | text | Metropol UserAccountToken (şifreli saklama) |
| masked_card_no | text | 637******976 |
| holder_name | text |
| status | text | active/passive |
| deleted_at | timestamptz NULL |
- INDEX(user_id)

**card_balances** (son bilinen bakiye snapshot'ı — KARAR 2026-06-11)
| id | uuid PK |
| tenant_id | uuid FK |
| card_id | uuid FK→cards |
| wallet_id | int | Metropol cüzdan (1=Resto, 3=Gift) |
| wallet_name | text |
| balance | numeric(18,2) | son bilinen bakiye |
| created_at / updated_at | timestamptz | updated_at = son başarılı senkron (asOf) |
- UNIQUE(card_id, wallet_id), INDEX(card_id)

**saved_recipients** (kayıtlı transfer alıcısı)
| id | uuid PK |
| tenant_id | uuid FK |
| user_id | uuid FK |
| label | text | kayıt adı |
| masked_card_no | text |
| recipient_token | text | şifreli |

**payment_idempotency** (çift harcama/transfer engeli)
| id | uuid PK |
| tenant_id | uuid FK |
| user_id | uuid FK |
| idempotency_key | text |
| operation | text | sale_confirm / balance_transfer |
| ref_code | text | SaleRefCode/ConsumerRefCode |
| status | text | pending/success/failed |
| response_snapshot | jsonb |
| created_at | timestamptz |
- UNIQUE(tenant_id, idempotency_key)

### 4.3 Ana Sayfa içeriği

**announcements**
| id | uuid PK |
| tenant_id | uuid NULL | NULL = global (platform) |
| cover_url | text |
| title | text |
| body | text |
| status | text | draft/published |
| published_at | timestamptz NULL |
| created_by | uuid |

**announcement_segments** (hedefleme; boşsa tüm tenant)
| announcement_id | uuid FK |
| segment_id | uuid FK |

**surveys**
| id | uuid PK |
| tenant_id | uuid FK |
| title | text |
| status | text |
| single_response | bool | tek seferlik mi |
| published_at | timestamptz NULL |

**survey_questions**
| id | uuid PK |
| survey_id | uuid FK |
| order | int |
| type | text | single/multi/text/rating |
| text | text |
| options | jsonb | seçenekler |

**survey_responses**
| id | uuid PK |
| survey_id | uuid FK |
| user_id | uuid FK |
| answers | jsonb |
| created_at | timestamptz |
- UNIQUE(survey_id, user_id) (single_response ise)

**videos**
| id | uuid PK |
| tenant_id | uuid FK |
| title | text |
| description | text |
| url | text |
| thumbnail_url | text |
| duration_seconds | int |
| mandatory | bool |

**video_watches**
| id | uuid PK |
| video_id | uuid FK |
| user_id | uuid FK |
| watched | bool |
| progress_seconds | int |
| watched_at | timestamptz NULL |
- UNIQUE(video_id, user_id)

### 4.4 Yan Haklar

**campaign_categories**
| id | uuid PK | code, name |

**campaigns**
| id | uuid PK |
| tenant_id | uuid NULL | NULL = global |
| category_id | uuid FK |
| brand_logo_url | text |
| title | text |
| body | text |
| detail_url | text |
| status | text |
| published_at | timestamptz NULL |

**coupons / gift_cards** (ilk sürüm temel)
| id, tenant_id(NULL=global), title, brand, amount numeric, expires_at, status |

### 4.5 Sohbet

**assistants** (AI asistan)
| id | uuid PK |
| tenant_id | uuid FK |
| created_by | uuid |
| name | text |
| persona | text | sistem prompt/kişilik |
| avatar_url | text |
| scope | text | tenant/personal (karar) |

**conversations**
| id | uuid PK |
| tenant_id | uuid FK |
| type | text | direct/assistant |
| assistant_id | uuid NULL FK |

**conversation_participants**
| conversation_id | uuid FK |
| user_id | uuid FK |
- PK(conversation_id, user_id)

**messages**
| id | uuid PK |
| tenant_id | uuid FK |
| conversation_id | uuid FK |
| sender_id | uuid NULL | NULL/özel = AI |
| sender_type | text | user/assistant |
| content | text |
| read_by | jsonb |
| created_at | timestamptz |
- INDEX(conversation_id, created_at)

### 4.6 İK modülleri

**leave_requests**
| id | uuid PK |
| tenant_id | uuid FK |
| user_id | uuid FK |
| type | text |
| start_date / end_date | date |
| days | int |
| note | text |
| status | text | pending/approved/rejected |
| decided_by | uuid NULL |
| decided_at | timestamptz NULL |

**expense_requests**
| id | uuid PK |
| tenant_id | uuid FK |
| user_id | uuid FK |
| type | text |
| amount | numeric |
| date | date |
| receipt_url | text |
| note | text |
| status | text | pending/approved/rejected |
| decided_by | uuid NULL |
| decided_at | timestamptz NULL |

### 4.7 Denetim & sistem

**audit_logs**
| id | uuid PK |
| tenant_id | uuid NULL |
| actor_id | uuid NULL |
| action | text |
| entity | text |
| entity_id | text |
| metadata | jsonb | (PII'siz) |
| created_at | timestamptz |

**notifications** (Faz 3)
| id, tenant_id, user_id, title, body, type, read_at, created_at |

### 4.8 İndeks stratejisi
- Tüm `tenant_id` kolonları indeksli.
- Sık sorgulanan FK'ler (`user_id`, `conversation_id`, `survey_id`) indeksli.
- Zaman bazlı listeler için (messages, transactions cache) bileşik indeks.
- UNIQUE kısıtlar yukarıda belirtildi (idempotency, user-survey, video-watch).

---

## 5. METROPOL ENTEGRASYON MİMARİSİ

### 5.1 Token akışı
```
İstek gelir → MetropolTokenService.GetToken()
  ├─ Redis'te geçerli token var mı? (TTL > eşik) → kullan
  └─ Yok/eşik altı:
       ├─ distributed lock al (single-flight)
       ├─ getdate'ten CreateDate (saat farkı çözümü)
       ├─ AccessData{AccessKey,CreateDate} → AES(CBC/PKCS7/IV=0x16/128) → Base64 = SecureAccessData
       ├─ GenerateToken çağrısı → token + expiration
       ├─ Redis'e yaz (TTL = expiration - guard)
       └─ lock bırak
→ token Bearer header ile api çağrısında kullanılır
```
- Token **5 dk** geçerli; **4 dk** eşikte yenile.
- Lock ile eşzamanlı yenileme yarışı engellenir (gereksiz token üretimi/yük).
- AccessKey/AESKey/ConsumerId **secret store**'dan; asla log/response.

### 5.2 API client
- Tipli metotlar (her endpoint için), `MetropolModels.cs` DTO'ları.
- `ResponseCode == 0` başarı; diğer kodlar hata → Türkçe mesaj eşleme.
- Timeout + retry politikası; **para uçlarında (SaleConfirm, BalanceTransfer) retry yok / idempotency ile**.

### 5.3 İdempotency (para hareketi)
- İstemci `Idempotency-Key` header gönderir.
- Backend `payment_idempotency` tablosunda anahtarı kontrol eder:
  - varsa ve success → kayıtlı sonucu döner (tekrar Metropol'e gitmez).
  - varsa ve pending → çakışma/bekleme yanıtı.
  - yoksa → pending yaz, Metropol'e gönder, sonucu güncelle.
- Aynı `SaleRefCode`/`ConsumerRefCode` tekrar gönderilmez.

### 5.4 Maskeleme
- Kart no `637******976`, isim `Al*** Te**`, TCKN maskeli — backend'de, istemciye maskesiz gitmez.

---

## 6. KİMLİK DOĞRULAMA & YETKİ

- **OTP login:** telefon → OTP (Redis, TTL + deneme sayacı + rate-limit) → doğrulama → JWT.
- **JWT:** access (kısa ömür) + refresh (uzun ömür, rotasyon). Claim: `sub`, `tenant_id`, `role`, `member_id`.
- **Refresh rotasyonu:** her yenilemede yeni refresh; eski geçersiz (replay engeli).
- **Yetki:** endpoint guard'ları rol + (gerekirse) modül yetkisi kontrol eder. Modül yetkisi `segment_modules` üzerinden.
- **Biyometrik:** cihazda secure storage'daki refresh ile sessiz giriş.

---

## 7. REALTIME (SOHBET)

- SignalR hub `chat`. Bağlantıda JWT doğrulanır, `tenant_id` gruba bağlanır.
- Kullanıcı yalnızca kendi tenant'ı içindeki konuşmalara katılır.
- Olaylar: `JoinConversation`, `SendMessage`, `ReceiveMessage`, `Typing`, `Read`.
- AI asistan: mesaj backend'e gelir → Gemini çağrılır → cevap mesaj olarak yayınlanır. "typing" göstergesi cevap beklerken.
- Ölçek: Redis backplane (çok sunuculu dağıtımda mesaj dağıtımı).
- Offline: istemci kuyruğu; yeniden bağlanınca gönderim + okunmamış senkronu.

---

## 8. AI (GEMINI)

- Çağrı **yalnızca backend**; API anahtarı backend secret.
- Sistem prompt asistan `persona` + sınırlı bağlam; **PII paylaşılmaz**.
- Cevaplar `messages` tablosuna yazılır (denetlenebilir).
- Hız/maliyet: gerekiyorsa cevap uzunluğu ve oran sınırı.

---

## 9. CACHE STRATEJİSİ (REDIS)

| Veri | TTL | Not |
|---|---|---|
| Metropol token | ~4 dk | merkezi, single-flight |
| OTP kodu | kısa (örn. 3 dk) | deneme sayacı ile |
| Rate-limit sayaçları | pencere bazlı | login/otp/harcama |
| Bakiye (opsiyonel kısa cache) | çok kısa (örn. 30 sn) | manuel yenileme önceliği |
| Merchant list | uzun + sürüm | artımlı güncelleme |
| SignalR backplane | — | mesaj dağıtımı |

---

## 10. GÜVENLİK MİMARİSİ

- Sırlar: environment/secret manager; `.env` git-ignore; repoda yalnız `.env.example`.
- TLS her yerde; istemci↔backend ve backend↔Metropol/Gemini.
- Hassas alanların at-rest şifrelemesi (tckn, user_account_token, recipient_token).
- Input validation backend (FluentValidation); istemci validasyonu yalnız UX.
- Rate-limit + idempotency + audit (kritik işlemler).
- PII log yasağı; yapısal log filtresi.

---

## 11. GÖZLEMLENEBİLİRLİK & DAYANIKLILIK

- Yapısal logging (PII'siz), correlation id (istek izleme).
- Hata izleme (ör. Sentry tarzı), sağlık ucu `/health`.
- Metropol kesintisinde: anlamlı hata + (para dışı) retry; devre kesici (circuit breaker) opsiyon.
- Migration'lar versiyonlu (EF Core); geri alınabilir tasarım.

---

## 12. DAĞITIM / ORTAMLAR

- Ortamlar: local (docker-compose), test/staging, prod.
- Metropol test ortamı: `testauth.metropolodeme.com` / `testapi.metropolcard.com`. Prod URL'leri ortam değişkeni.
- White-label dağıtım: build-time tenant + firma kodu fallback (PRD 17 kararına bağlı).
- CI: backend test + istemci lint/typecheck; CD ayrı ele alınır.

---

## 13. KESİNLEŞEN MİMARİ KARARLAR (PRD §17 ile uyumlu)
1. **Tenant belirleme:** runtime, tek uygulama; tema tenant'a göre yüklenir (`tenants.branding`). Build-time ayrı uygulama yok.
2. **AI asistan scope:** `assistants.scope = tenant` (firma admin tanımlar). Kişisel scope Faz 2'de değerlendirilir.
3. **Web + Admin:** ayrı app'ler; ortak bileşen/tip `shared/`. Platform admin tenant-üstü, PII'siz.
4. **Bakiye cache:** canlı öncelik + opsiyonel ~30 sn Redis cache; kullanıcı yenile ile zorlar.
5. **RBAC:** basit rol enum (`enduser/company_admin/approver` + `platform_admin`). İnce taneli izin sonradan eklenir.
6. **Masraf onay:** tek aşamalı; çok aşamalı onay ilk sürümde yok.
7. **Push:** FCM + APNs, Faz 3; ilk sürümde uygulama içi bildirim.

---

> Bu doküman canlıdır; şema ve kararlar netleştikçe güncellenir. Şema değişikliği migration ile yapılır, doğrudan elle DB düzenlenmez.
