# PROTOTYPE_MAP — Prototip ↔ Doküman Eşlemesi & Yol Verme

> Bu dosya, `design/prototype/` içindeki React prototipini projedeki dökümanlara (PRD, API_CONTRACT, ARCHITECTURE) bağlar ve geliştirmenin prototipe uygun ilerlemesi için referanstır.
> Prototip = görsel/layout/akış için **tek doğru kaynak (source of truth)**. İş kuralı/veri için dökümanlar esas.

---

## 1. PROTOTİP NASIL KURULU (mimari notlar)

- **Tek sayfa React (Babel/JSX), `window` global'leri üzerinden modüler.** Her dosya bir IIFE; bileşenleri `window.SCREENS`, `window.Screen`, `window.TopBar` vb. ile paylaşır.
- **Navigasyon (`nav.jsx`):** Tab başına ayrı stack (iOS tarzı). `app.go(name, props)`, `app.back()`, `app.switchTab(t)`. 5 tab: `home, benefits, metropol(fab), chat, other`. Açılış tab'ı `metropol`.
- **Global store (`data.jsx > SEED`):** cards, transactions, campaigns, chats, colleagues, leaveRequests, expenseRequests, approvals, notifications, profile. `app.update(fn)` ile mutasyon. **Bu, backend API'sinin yerini tutan mock'tur** — gerçek geliştirmede API_CONTRACT uçlarıyla değişecek.
- **White-label (`app.jsx > PALETTES`):** coral/blue/green/purple = 4 örnek firma (Nova Holding / Atlas Enerji / Vera Sağlık / Lumen Teknoloji). `app.setBrandKey(k)`. **Bu yapı, white-label theme token mimarisinin birebir prototipi** — ARCHITECTURE'daki tenant branding ile eşleşir.
- **Tema (`theme.jsx > T`):** renk, font, gölge, çizgi token'ları. RN'e taşırken StyleSheet'e dönüşür.
- **iOS çerçeve (`ios-frame.jsx`):** sadece önizleme kabuğu (status bar, dynamic island, glass nav). RN'de gerçek cihaz; bu dosya taşınmaz.

---

## 2. EKRAN ENVANTERİ ↔ EŞLEME

> Kaynak dosya · prototip ekran adı (app.go ismi) · PRD bölümü · ilgili API uçları

### Auth (`screens-auth.jsx`)
| Prototip | PRD | API |
|---|---|---|
| phone (telefon girişi) | 5.2 | `POST /auth/otp/send` |
| otp (6 hane + sayaç) | 5.2 | `POST /auth/otp/verify` |
| register (ad/soyad/email) | 5.1 | (verify sonrası profil) |

### Home (`screens-home.jsx`)
| home (duyuru/anket/video akışı) | 6 | `GET /home/announcements|surveys|videos` |
| anket doldurma | 6.2 | `POST /home/surveys/{id}/responses` |
| video oynatma | 6.3 | `POST /home/videos/{id}/watch` |
| duyuru detayı | 6.1 | `GET /home/announcements/{id}` |
| Notifications (bildirimler) | — | (notifications) |

### Benefits (`screens-benefits.jsx`)
| benefits (grid) | 7.1 | `GET /benefits/categories` |
| kampanya listesi | 7.2 | `GET /benefits/campaigns` |
| kampanya detayı | 7.2 | `GET /benefits/campaigns/{id}` |
| kupon / hediye çeki | 7.3 | `GET /benefits/coupons|giftcards` |

### Metropol — Home (`screens-metropol-home.jsx`)
| metropol (kart slider + bakiye + aksiyon + son 5) | 8.1 | `GET /metropol/cards`, `/balance`, `/recent` |
| kart detay (2 sekme) | 8.3 | `/balance`, `/transactions` |

### Metropol — Cards (`screens-metropol-cards.jsx`)
| kart ekle: no+tel | 8.2 | `POST /metropol/cards/add` |
| kart ekle: OTP | 8.2 | (validationGuid akışı) |
| kart ekle: bilgiler | 8.2 | `POST /metropol/cards/confirm` |
| kart silme onayı | 8.8 | `DELETE /metropol/cards/{id}` |

### Metropol — Pay (`screens-metropol-pay.jsx`) — SIRA KRİTİK ✓ prototip doğru
| payChoose (QR / kısa kod) | 8.4 | — |
| payQR (kamera) | 8.4 | — |
| payCode (6 hane) | 8.4 | — |
| **paySelectCard (kart seç+onay)** | 8.4 | — (presale'den ÖNCE ✓) |
| presale/onay (tutar+cüzdan) | 8.4 | `POST /metropol/sale/presale-info` |
| ÖDE | 8.4 | `POST /metropol/sale/confirm` (Idempotency-Key) |
| başarılı fiş / başarısız | 8.4 | — |

### Metropol — Transfer (`screens-metropol-transfer.jsx`)
| transfer ana menü | 8.7 | — |
| kartlar arası / başka karta / cep no / yardım kartı | 8.7 | `POST /metropol/transfer` |
| QR kod alıcı | 8.7 | `POST /metropol/transfer/resolve-qr` |
| kayıtlı alıcı | 8.7 | `GET /metropol/saved-recipients` |
| işlem onay → başarılı | 8.7 | `POST /metropol/transfer` (Idempotency-Key) |

### Metropol — Misc (`screens-metropol-misc.jsx`)
| keşfet (harita + pin + filtre) | 8.5 | `GET /metropol/merchants` |
| mağaza detay (yol tarifi/geri bildirim) | 8.5 | `POST /metropol/merchants/{code}/feedback` |
| işlem geçmişi | 8.6 | `GET /metropol/cards/{id}/transactions` |

### Chat (`screens-chat.jsx`)
| chatList (sohbet listesi) | 9.1 | `GET /chat/conversations` |
| chat (birebir / AI) | 9.1 | SignalR `/hubs/chat`, `GET .../messages` |
| AI asistan oluştur | 9.1 | `POST /chat/assistants` |
| yeni sohbet (kullanıcı arama) | 9.1 | `GET /chat/users` |

### Other (`screens-other.jsx`)
| other (modül grid, yetkiye göre) | 10.1 | `GET /me/modules` |
| izin talebi + geçmiş | 10.1 | `POST/GET /modules/leave-requests` |
| masraf talebi + geçmiş | 10.1 | `POST/GET /modules/expense-requests` |
| masraf onay (yönetici) | 10.1 | `.../approve|reject` |

### Profile (`screens-profile.jsx`)
| hesabım menü | 11.1 | — |
| profilim | 11.2 | `GET/PUT /me` |
| kartvizitim (QR) | 11.2 | — |
| güvenlik / izinler / dil / hesap sil | 11.2 | `/me/preferences` vb. |

---

## 3. PROTOTİPİN ZATEN ÇÖZDÜĞÜ AÇIK KARARLAR (PRD §17)

Prototip bazı açık kararları örnekleriyle çözmüş; bunları doküman kararı olarak kabul edebiliriz:

1. **White-label = runtime brand switch** (build-time değil). `PALETTES` + `setBrandKey` ile tek uygulama, çok marka. → PRD §17.1 için güçlü öneri: **tek app + firma teması runtime**.
2. **Modül görünürlüğü segmente/role göre** — `Other` ekranında `profile.role === 'manager'` ise "Masraf Onay" görünür. → modül yetki mantığı doğru.
3. **AI asistan = chat içinde ayrı "kind: ai"** (Gider Botu örneği) — asistanlar kullanıcı sohbetiyle aynı listede, rozetle ayrılır.

> Bu kararları kesinleştirmek istersen PRD §17 ve ARCHITECTURE §13 güncellenir.

---

## 4. PROTOTİP ↔ DOKÜMAN FARKLARI / DİKKAT

- Prototipte **web (firma admin)** ve **admin (platform)** panelleri **yok** — sadece mobil. Bu iki panelin tasarımı ayrı bir tur gerektirir (prototip referansı yalnız mobil için geçerli).
- Prototip verisi mock (`SEED`); gerçek entegrasyonda her ekran ilgili API ucuna bağlanır, maskeleme/idempotency/tenant kuralları backend'de uygulanır.
- Prototipte renkler `T` token'larından geliyor ama bazı ekranlarda accent sabit (`T.coral` vb.) — RN'e taşırken tüm renkler tema token'ından okunmalı, hardcode bırakılmamalı.

---

## 5. GELİŞTİRMEYE NASIL YOL VERİLİR (özet talimat)

Bir mobil ekran geliştirilirken sıra:
1. İlgili `design/prototype/screens-*.jsx` dosyasını **oku** — layout, bileşen, akış oradan alınır.
2. PRD'de ilgili bölümü oku — iş kuralı/validasyon/durumlar.
3. API_CONTRACT'ta ilgili ucu oku — request/response.
4. RN'e taşı: `div→View`, metin→`Text`, `img→Image`, CSS→StyleSheet; **görsel hiyerarşi korunur**.
5. Renk/marka: tema token'ından (white-label), hardcode yok.
6. Mock `SEED` yerine gerçek API + React Query; maskeleme/idempotency backend'de.
7. Prototip ile doküman çelişirse: **görsel için prototip, iş kuralı için doküman**; çözülmezse sor.
