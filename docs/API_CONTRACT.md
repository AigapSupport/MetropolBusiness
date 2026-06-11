# API_CONTRACT — MetropolBusiness

> Tüm HTTP API uçlarının sözleşmesi. Mimari için `docs/ARCHITECTURE.md`, ürün için `docs/PRD.md`, kurallar için `docs/CLAUDE.md`.
> Versiyon: 0.1 (taslak) · Base path: `/api/v1`

---

## 0. GENEL KURALLAR

### 0.1 Kimlik & başlıklar
- `Authorization: Bearer <accessToken>` — login/otp/refresh hariç tüm uçlarda zorunlu.
- `tenant_id` token claim'inden okunur (header'dan **alınmaz**, sahtelenemez).
- Para hareketi uçlarında: `Idempotency-Key: <uuid>` zorunlu.
- `Accept-Language: tr|en` — yerelleştirilmiş mesajlar için.

### 0.2 Hata zarfı (tüm hatalar)
```json
{
  "code": "string",          // makine-okur kod, örn. "OTP_INVALID"
  "message": "string",       // kullanıcıya gösterilebilir TR/EN mesaj
  "details": { }             // opsiyonel ek bilgi (validation alanları vb.)
}
```

### 0.3 Status kodları
| Kod | Anlam |
|---|---|
| 200/201 | başarı |
| 400 | validation / hatalı istek |
| 401 | kimlik yok/geçersiz token |
| 403 | yetki yok (rol/modül/tenant) |
| 404 | bulunamadı |
| 409 | çakışma (idempotency, tekrar) |
| 422 | iş kuralı reddi (örn. Metropol hata kodu) |
| 429 | rate-limit |
| 502/503 | Metropol/Gemini erişilemiyor |

### 0.4 Sayfalama
Query: `?page=1&pageSize=20`. Yanıt zarfı:
```json
{ "items": [ ], "page": 1, "pageSize": 20, "total": 134 }
```

### 0.5 Genel notlar
- Tüm tarihler ISO-8601 UTC (`2026-06-10T10:18:00Z`).
- Para: string `"500.00"` (decimal kaybı olmadan).
- Maskeleme backend'de; istemciye maskesiz PII gitmez.
- Metropol hata kodları içeride Türkçe mesaja çevrilir; ham kod istemciye verilmez (gerekirse `details.providerCode` opsiyonel).

---

## 1. AUTH

### POST /auth/otp/send
İstek:
```json
{ "phone": "5345030539", "companyCode": "AIGAP" }
```
Yanıt 200:
```json
{ "otpRef": "string", "expiresInSeconds": 180, "resendInSeconds": 60 }
```
Hata: 429 `OTP_RATE_LIMIT`.

### POST /auth/otp/verify
İstek:
```json
{ "otpRef": "string", "code": "123456", "phone": "5345030539" }
```
Yanıt 200:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 900,
  "isNewUser": true,
  "user": { "id": "uuid", "firstName": null, "lastName": null }
}
```
Hata: 400 `OTP_INVALID`, 423 `OTP_LOCKED` (3 deneme).

### POST /auth/refresh
İstek: `{ "refreshToken": "jwt" }`
Yanıt 200: yeni `accessToken` + dönen `refreshToken` (rotasyon). Hata 401 `REFRESH_INVALID`.

### POST /auth/logout
İstek: `{ "refreshToken": "jwt" }` → 204. Refresh geçersiz kılınır.

### POST /auth/login
**Panel girişi** (web/admin — PANELS_SPEC §0.4 kararı: kendi auth, e-posta+şifre). Yalnızca panel rolleri (`company_admin`, `approver`, `platform_admin`); `enduser` panele giremez. `companyCode`, e-posta birden fazla firmada kayıtlıysa zorunludur.
İstek:
```json
{ "email": "admin@firma.com", "password": "string", "companyCode": "AIGAP" }
```
Yanıt 200:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 900,
  "user": { "id": "uuid", "firstName": "Banu", "lastName": "Yönetici", "role": "company_admin" }
}
```
Hata: 400 `VALIDATION_ERROR` (alan eksik / companyCode gerekli), 401 `UNAUTHENTICATED` (e-posta veya şifre hatalı — hangisi olduğu söylenmez), 403 `NOT_AUTHORIZED` (panel rolü değil), 423 `LOGIN_LOCKED` (5 hatalı deneme → 15 dk kilit), 429 `RATE_LIMITED` (e-posta başına 10/dk).

### POST /auth/set-password
Davet token'ı ile şifre belirleme (token, `POST /platform/tenants/{id}/admins` yanıtındaki `inviteToken`; **72 saat geçerli, tek kullanımlık**). Şifre politikası: en az 8 karakter, en az bir harf + bir rakam.
İstek:
```json
{ "inviteToken": "string", "newPassword": "string" }
```
Yanıt: 204. Hata: 400 `VALIDATION_ERROR` (şifre politikası), 404 `NOT_FOUND` (token geçersiz/süresi dolmuş/kullanılmış).

### GET /tenants/{code}/branding
**Anonim** (login öncesi white-label tema yüklemesi; TODO 1.10). Yalnızca **aktif** tenant döner; PII yok.
```json
{ "name": "AIGAP", "logoUrl": "https://...", "primaryColor": "#F2697B", "secondaryColor": "#202833" }
```
Hata: 404 `NOT_FOUND` (pasif/bilinmeyen firma kodu).

---

## 2. PROFİL (ME)

### GET /me
Yanıt 200:
```json
{
  "id": "uuid", "firstName": "AIGAP", "lastName": "Test",
  "phone": "+905345030539", "email": "x@mail.com",
  "tcknMasked": "11*******11", "city": "İstanbul",
  "avatarUrl": null, "role": "enduser",
  "tenant": { "id": "uuid", "name": "AIGAP", "branding": { "logoUrl": "", "primaryColor": "#F2697B" } }
}
```

### PUT /me
İstek: `{ "firstName", "lastName", "email", "city", "avatarUrl" }` → 200 güncel `me`.

### PUT /me/tckn
İstek: `{ "tckn": "11111111111" }` → 200 (maskeli döner). Validation: 11 hane.

### GET /me/preferences · PUT /me/preferences
Bildirim/izin toggle'ları: `{ "campaignNotifications": true, "announcementNotifications": true }`.

### GET /me/modules
Kullanıcının segmentine göre yetkili modüller:
```json
{ "modules": [ { "code": "leave_request", "name": "İzin Talebi" }, { "code": "expense_request", "name": "Masraf Talebi" } ] }
```

---

## 3. HOME (ANA SAYFA)

### GET /home/announcements
Firma + global. `?page&pageSize`. Yalnız yayım zamanı gelmiş duyurular döner (`publishedAt <= şimdi` — ileri tarihli yayım, PANELS_SPEC A.7); detay ucu da aynı kuralı uygular (erken erişim 404).
```json
{ "items": [ { "id": "uuid", "title": "", "body": "", "coverUrl": "", "source": "company|platform", "publishedAt": "" } ], "page":1, "pageSize":20, "total":5 }
```

### GET /home/announcements/{id}
Tek duyuru detayı.

### GET /home/surveys
```json
{ "items": [ { "id":"uuid", "title":"", "questionCount":5, "completed":false, "singleResponse":true } ] }
```

### GET /home/surveys/{id}
Sorularla birlikte:
```json
{ "id":"uuid", "title":"", "questions":[ { "id":"uuid", "order":1, "type":"single|multi|text|rating", "text":"", "options":["A","B"] } ] }
```

### POST /home/surveys/{id}/responses
İstek:
```json
{ "answers": [ { "questionId":"uuid", "value": "A" }, { "questionId":"uuid", "value": ["A","B"] } ] }
```
Yanıt 201. Hata 409 `SURVEY_ALREADY_ANSWERED` (singleResponse).

### GET /home/videos
```json
{ "items": [ { "id":"uuid", "title":"", "description":null, "url":"https://...", "thumbnailUrl":"", "durationSeconds":120, "mandatory":true, "watched":false, "progressSeconds":0 } ] }
```

### POST /home/videos/{id}/watch
İstek: `{ "progressSeconds": 120, "completed": true }` → 200 güncel izleme durumu.

---

## 4. BENEFITS (YAN HAKLAR)

### GET /benefits/categories
`{ "items": [ { "code":"campaigns", "name":"Kampanyalar" }, ... ] }`

### GET /benefits/campaigns
`?categoryCode=campaigns&page&pageSize`
```json
{ "items": [ { "id":"uuid", "title":"", "brandLogoUrl":"", "categoryCode":"campaigns" } ] }
```

### GET /benefits/campaigns/{id}
```json
{ "id":"uuid", "title":"", "body":"", "brandLogoUrl":"", "detailUrl":"", "similar":[ { "id":"uuid", "title":"" } ] }
```

### GET /benefits/coupons · GET /benefits/giftcards
Liste (temel): `{ "items":[ { "id","title","brand","amount":"100.00","expiresAt" } ] }`.

---

## 5. METROPOL — KART

> Hepsi backend proxy; istemci Metropol'e doğrudan gitmez.

### GET /metropol/cards
Kullanıcının kartları:
```json
{ "items": [ { "id":"uuid", "maskedCardNo":"6375 **** **** 2976", "holderName":"AIGAP Test", "status":"active" } ] }
```

### POST /metropol/cards/add
(AddAccount) İstek: `{ "cardNo":"6375...", "mobilePhone":"5345030539" }`
Yanıt 200: `{ "validationGuid":"string" }` (SMS OTP gönderildi). Hata 422 `METROPOL_ERROR` + details.

### POST /metropol/cards/confirm
(AddAccountConfirm) İstek:
```json
{ "validationGuid":"string", "validationCode":123456, "memberId":"3299",
  "name":"Test", "surname":"Deneme", "email":"x@mail.com", "phone":"5345030539", "tckn":"optional" }
```
Yanıt 201: `{ "cardId":"uuid", "maskedCardNo":"637******976", "name":"Test", "surName":"Deneme" }`.

### DELETE /metropol/cards/{cardId}
(DeleteUser) Onay sonrası kart bağı kaldırılır → 204.

---

## 6. METROPOL — BAKİYE & İŞLEM

### GET /metropol/cards/{cardId}/balance
(BalanceQuery) `?walletId=1` opsiyonel; varsayılan tüm cüzdanlar.
```json
{ "wallets": [ { "walletId":1, "walletName":"RESTO", "balance":"30824.00" }, { "walletId":3, "walletName":"GIFT", "balance":"44581.00" } ],
  "totalBalance":"59591.00",
  "asOf":"2026-06-11T08:45:00+00:00", "stale":false }
```
> **Not (sözleşme değişikliği, KARAR 2026-06-11):** `asOf` ve `stale` alanları eklendi (opsiyonel — mevcut istemciler kırılmaz). Başarılı her BalanceQuery yanıtı backend'de `card_balances` snapshot'ına yazılır; `asOf` = son başarılı Metropol senkron zamanı, `stale=false`. Metropol **erişilemezse** (timeout/bağlantı hatası) ve snapshot varsa, son bilinen bakiye **200** + `stale=true` + `asOf=son senkron` ile döner (PROVIDER_UNAVAILABLE yutulur); snapshot yoksa eski hata davranışı korunur. Metropol **iş kuralı** hataları (ResponseCode != 0) snapshot'a düşmez, eskisi gibi 422 `METROPOL_ERROR` döner.

### GET /metropol/cards/{cardId}/transactions
(TransactionHistory / CustomerDetailReport) `?page&pageSize&startDate&endDate`
```json
{ "items": [ { "transactionId":20040736, "type":"sale|transfer", "walletName":"RESTOPAY",
   "title":"Elif Telefon Testi", "maskedName":"Al*** Te**", "approvalNo":"20040736",
   "amount":"-300.00", "date":"2026-04-22T15:28:00Z" } ], "page":1,"pageSize":20,"total":50 }
```

### GET /metropol/cards/{cardId}/recent
Son 5 işlem (ana ekran kısayolu).

---

## 7. METROPOL — HARCAMA (SIRA ÖNEMLİ)

> Akış: QR/kısa kod → **kart seç** → presale-info → onay → sale-confirm.

### POST /metropol/sale/presale-info
(GetPreSaleInfo) İstek:
```json
{ "code":"406...", "codeType":2, "cardId":"uuid" }
```
(`codeType`: 1=QR, 2=QuickCode. Backend, cardId'den UserAccountRef ve token'dan MemberId çözer.)
Yanıt 200:
```json
{
  "transactionId":98598610, "saleRefCode":"2020...",
  "merchantNo":"00000...", "terminalNo":"00000...", "merchantName":"Elif Telefon Testi",
  "cityName":"Antalya", "districtName":"Aksu",
  "requestAmount":"200.00", "productId":2, "productName":"Resto-Yemek",
  "suggestedWalletId":1, "kdv":"1,00", "discountRatio":"0,00",
  "sessionExpireDate":"2026-04-01T08:38:40Z"
}
```
Hata 422 `METROPOL_ERROR` (örn. 7601 süresi geçmiş QR → "Süresi geçmiş QR kod. Tekrar Deneyiniz.").

### POST /metropol/sale/confirm
(SaleConfirm) **Idempotency-Key zorunlu.** İstek:
```json
{
  "transactionId":98598610, "saleRefCode":"2020...",
  "cardId":"uuid", "walletId":1, "amount":"200.00",
  "consumerRefCode":"auto-or-client-uuid"
}
```
Yanıt 200 (başarı fişi):
```json
{
  "success":true, "merchantNo":"0000052485", "terminalNo":"0000063710",
  "approvalNo":"20040736", "maskedCardNo":"637******976",
  "amount":"200.00",
  "merchantName":null, "date":"2026-06-10T13:18:00Z"
}
```
> **Not (sözleşme değişikliği, 2026-06-10):** `balanceAfter` alanı KALDIRILDI — Metropol SaleConfirm yanıtında bakiye dönmez; confirm sonrası fazladan BalanceQuery çağrısı yapılmaz. Backend, başarılı confirm'de kartın bakiye cache'ini geçersiz kılar; **bakiye ayrı uçla alınır** (`GET /metropol/cards/{cardId}/balance`, §6). `merchantName` de Metropol confirm yanıtında dönmediği için `null` olabilir; istemci mağaza adını presale ekranından taşır.

Hata 422 `METROPOL_ERROR` (7085 Alışveriş başarısız vb.), 409 `DUPLICATE_OPERATION` (aynı idempotency-key).

### GET /metropol/sale/info
(GetSaleInfo) `?merchantCode&terminalCode&saleRefCode` → işlem durumu (0/1/2/4).

---

## 8. METROPOL — TRANSFER

### POST /metropol/transfer
(BalanceTransfer) **Idempotency-Key zorunlu.** İstek:
```json
{
  "senderCardId":"uuid",
  "receiver": { "type":"card|qr|phone|saved", "value":"receiverToken-or-phone-or-recipientId" },
  "walletId":1, "amount":"500.00", "note":"",
  "saveRecipient": true, "recipientLabel":"Annem"
}
```
`receiver.type` sözlüğü: `saved` → kayıtlı alıcı id'si · `phone` → aynı tenant'ta telefon · `qr` → `resolve-qr`'dan dönen `receiverToken` · `card` → **`confirm-card` adımından dönen `receiverToken`** (kart numarası DEĞİL — alıcı kartı önce verify-card/confirm-card OTP akışıyla doğrulanır).

Yanıt 200:
```json
{ "success":true, "senderName":"gediz uçar", "receiverMaskedName":"Al*** Te**",
  "receiverMaskedCardNo":"637*****976", "amount":"500.00", "date":"2026-06-10T13:19:00Z" }
```
Hata 422 `METROPOL_ERROR`, 409 `DUPLICATE_OPERATION`.

### POST /metropol/transfer/resolve-qr
QR'dan alıcı çözümleme: `{ "qrPayload":"string" }` → `{ "receiverMaskedName":"", "receiverMaskedCardNo":"", "receiverToken":"opaque" }`.

### POST /metropol/transfer/verify-card
(AddAccount) **"Başka Karta" alıcı doğrulama 1/2:** alıcı kart no + karta kayıtlı telefonla OTP SMS'i başlatılır. SMS **alıcının** telefonuna gider (aile içi senaryoda alıcı kodu gönderene söyler). Alıcının kartı bizim `cards` tablosuna **yazılmaz**; kart no/telefon loglanmaz.
İstek: `{ "cardNo":"6375021912342976", "mobilePhone":"5551112233" }` → Yanıt 200: `{ "validationGuid":"..." }`.
Hata 422 `METROPOL_ERROR`, 429 `RATE_LIMITED` (kullanıcı başına **5/saat** — SMS bombalama engeli).

### POST /metropol/transfer/confirm-card
(AddAccountConfirm) **"Başka Karta" alıcı doğrulama 2/2:** OTP doğrulanır; alıcının kartı **kaydedilmez**, yalnızca transferde kullanılacak opak token döner.
İstek: `{ "validationGuid":"...", "validationCode":123456 }` → Yanıt 200:
```json
{ "receiverMaskedName":"Al*** Te**", "receiverMaskedCardNo":"637******976", "receiverToken":"opaque" }
```
`receiverToken`, transfer isteğinde `receiver: { "type":"card", "value":"<receiverToken>" }` olarak kullanılır. Hata 422 `METROPOL_ERROR` (yanlış/süresi geçmiş OTP dahil).

### GET /metropol/saved-recipients · POST · DELETE
Kayıtlı alıcı yönetimi:
```json
{ "items": [ { "id":"uuid", "label":"Annem", "maskedCardNo":"637*****976" } ] }
```

---

## 9. METROPOL — MERCHANT (KEŞFET)

### GET /metropol/merchants
(MerchantList) `?sectorId=2&listType=1&lastListVersionDate=...&bbox=...`
```json
{
  "listType":1, "lastListVersionDate":"2026-03-07T17:18:38Z",
  "items": [ { "merchantCode":"0000000005", "signboardName":"İstanbul Kokoreç",
    "sector":"Restoran", "subSector":"Büfe", "city":"İstanbul", "district":"Şişli",
    "saleAddress":"...", "telNo":"2122759134", "lat":"41.0619", "lng":"28.9979",
    "activeFlag":1, "campaignCode":0 } ]
}
```
(Artımlı: `lastListVersionDate` ile değişenler. Sektör: 0=Restoran/Market, 1=Giyim, 2=Hepsi.)

### POST /metropol/merchants/{code}/feedback
Geri bildirim: `{ "message":"" }` → 201.

---

## 10. CHAT

> Mesajlaşma SignalR hub üzerinden; aşağıdaki REST uçları geçmiş/oluşturma içindir.

### GET /chat/conversations
```json
{ "items": [ { "id":"uuid", "type":"direct|assistant", "title":"", "avatarUrl":"",
   "lastMessage":"", "lastAt":"", "unreadCount":2, "isAssistant":false } ] }
```

### GET /chat/conversations/{id}/messages
`?page&pageSize` → mesajlar (kronolojik).
```json
{ "items": [ { "id":"uuid", "senderType":"user|assistant", "senderId":"uuid|null",
   "content":"", "createdAt":"", "readByMe":true } ], "page":1,"pageSize":30,"total":120 }
```

### POST /chat/conversations
Yeni birebir veya asistan konuşması: `{ "type":"direct", "participantUserId":"uuid" }` veya `{ "type":"assistant", "assistantId":"uuid" }` → konuşma.

### GET /chat/assistants · POST /chat/assistants
Liste / oluştur: `{ "name":"Asistan", "persona":"", "avatarUrl":"" }` → asistan.

### GET /chat/users
Firma içi kullanıcı arama (yeni sohbet): `?q=isim` → `{ "items":[ { "id","name","avatarUrl" } ] }`.

### SignalR hub `/hubs/chat`
- Bağlantı: `?access_token=<jwt>`; sunucu tenant grubuna ekler.
- İstemci→sunucu: `JoinConversation(convId)`, `SendMessage(convId, content)`, `Typing(convId)`, `MarkRead(convId, messageId)`.
- Sunucu→istemci: `ReceiveMessage(message)`, `Typing(convId, userId)`, `Read(convId, userId, messageId)`, `AssistantTyping(convId)`.
- Asistan akışı: `SendMessage` → backend Gemini → `AssistantTyping` → `ReceiveMessage`.

---

## 11. MODÜLLER (İK)

### GET /modules/leave-requests · POST
Liste / oluştur:
```json
{ "type":"annual", "startDate":"2026-07-01", "endDate":"2026-07-05", "note":"" }
```
Yanıt: talep (`status:"pending"`). Gün sayısı backend hesaplar.

### GET /modules/expense-requests · POST
```json
{ "type":"travel", "amount":"1500.00", "date":"2026-06-10", "receiptUrl":"", "note":"" }
```

### GET /modules/expense-requests/pending  (onaylayan)
Onay bekleyenler (yetki: approver/segment).

### POST /modules/expense-requests/{id}/approve · /reject
`{ "note":"" }` → güncel durum. Hata 403 `NOT_AUTHORIZED_MODULE`.

### (Leave için benzer approve/reject — onay akışı varsa)

---

## 12. WEB — FİRMA ADMIN

> Rol: `company_admin`. Tüm uçlar kendi tenant'ıyla sınırlı.

### Kullanıcılar
- `GET /admin/company/users` `?q&segmentId&status&page`
- `POST /admin/company/users` (davet/ekle)
- `PUT /admin/company/users/{id}` · `DELETE` (pasifleştir)
- `PUT /admin/company/users/{id}/segments` `{ "segmentIds":["uuid"] }`

### Segmentler
- `GET/POST /admin/company/segments`
- `PUT/DELETE /admin/company/segments/{id}`
- `PUT /admin/company/segments/{id}/modules` `{ "moduleCodes":["leave_request"] }`

### İçerik
- Anketler: `GET/POST/PUT/DELETE /admin/company/surveys` (+ sorular), `GET /admin/company/surveys/{id}/results`
- Duyurular: `GET/POST/PUT/DELETE /admin/company/announcements` (+ segment hedefleme); ileri tarihli yayım: istek gövdesinde `publishedAt` (yalnız `status="published"` iken anlamlı; null/gönderilmez = hemen) — home uçları yalnız `publishedAt <= şimdi` olanları listeler (PANELS_SPEC A.7)
- Videolar: `GET/POST/PUT/DELETE /admin/company/videos`, `GET /admin/company/videos/{id}/watch-report`

### Talepler (genel görünüm)
- `GET /admin/company/leave-requests` · `GET /admin/company/expense-requests`
- `PUT /admin/company/approvers` (onaylayıcı atama)

---

## 13. ADMIN — PLATFORM

> Rol: `platform_admin`. Tenant-üstü. **Kişisel kart/bakiye verisine erişemez.**

### Firmalar (Tenants)
- `GET /platform/tenants` `?q&status&page`
- `POST /platform/tenants` (oluştur) `{ "name","code","metropolConsumerId","branding":{...} }`
- `PUT /platform/tenants/{id}` · durum değişimi
- `POST /platform/tenants/{id}/admins` (firma admin daveti) — yanıt `inviteToken` içerir (şifre belirleme: `POST /auth/set-password`, 72 saat, tek kullanımlık; yalnız bu yanıtta döner, log'lanmaz)
- `POST /platform/tenants/{tenantId}/admins/{userId}/reset-invite` (şifre sıfırlama daveti, admin eliyle) — kullanıcı o tenant'ın `company_admin`'i değilse 404; yanıt `{ "inviteToken": "..." }` (YENİ davet, 72 saat, tek kullanımlık; yalnız bu yanıtta döner, log'lanmaz). Mevcut şifre korunur: kullanıcı `set-password` yapana kadar eski şifresiyle girebilir. Self-servis "şifremi unuttum" e-posta (SMTP) altyapısı gelince eklenecek.
- Tenant yanıtlarında `hasMetropolConsumer` (bool): Metropol consumer eşleşmesi VAR/YOK bilgisi — sır referans değerinin kendisi asla dönmez.

### Modül tanımları
- `GET/POST/PUT /platform/modules` `{ "code","name","isActive" }`

### Global içerik
- `GET/POST/PUT/DELETE /platform/announcements` (tenant_id=null)
- Kampanyalar: `GET/POST/PUT/DELETE /platform/campaigns` (+ kategoriler, benzer ilişki)
- `GET/POST/PUT/DELETE /platform/campaign-categories`

### Denetim
- `GET /platform/audit-logs` `?action&entity&from&to&page`

---

## 14. ORTAK HATA KODLARI (SÖZLÜK)

| code | HTTP | anlam |
|---|---|---|
| `VALIDATION_ERROR` | 400 | alan doğrulama (details: alanlar) |
| `UNAUTHENTICATED` | 401 | token yok/geçersiz |
| `NOT_AUTHORIZED` | 403 | rol/tenant yetkisi yok |
| `NOT_AUTHORIZED_MODULE` | 403 | modül yetkisi yok |
| `NOT_FOUND` | 404 | kayıt yok |
| `OTP_INVALID` | 400 | OTP yanlış |
| `OTP_LOCKED` | 423 | OTP deneme kilidi |
| `LOGIN_LOCKED` | 423 | panel girişi deneme kilidi (5 hatalı şifre → 15 dk) |
| `OTP_RATE_LIMIT` | 429 | çok fazla OTP isteği |
| `REFRESH_INVALID` | 401 | refresh token geçersiz/süresi dolmuş/zaten kullanılmış (rotasyon) |
| `SURVEY_ALREADY_ANSWERED` | 409 | tek seferlik anket |
| `DUPLICATE_OPERATION` | 409 | idempotency tekrarı |
| `METROPOL_ERROR` | 422 | Metropol iş kuralı reddi (details.providerCode ops.) |
| `PROVIDER_UNAVAILABLE` | 502/503 | Metropol/Gemini erişilemiyor |
| `RATE_LIMITED` | 429 | genel oran sınırı |

---

> Bu sözleşme canlıdır. Yeni uç eklenince burada tanımlanır; istemci tipleri `shared/types`'tan üretilir. İstemci, burada tanımlı olmayan bir uca çağrı yapmaz.
