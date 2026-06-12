-- seed-demo.sql — Dev ortamı için zengin demo içeriği (seed.sql'den SONRA çalıştırılır).
-- Idempotent (ON CONFLICT DO NOTHING). Gerçek kişi/kart verisi İÇERMEZ.
-- Sahte kart token'ları Metropol'e GİDEMEZ (decrypt başarısız olur) — yalnız liste/bakiye
-- tablolarını doldurur; gerçek entegrasyon sırları girilince gerçek kart eklenir.

BEGIN;

-- ── Avantajlar Dünyası: kategoriler (platform-global) ────
INSERT INTO campaign_categories (id, code, name, sort_order, created_at, updated_at) VALUES
  ('ca7e0000-0000-0000-0000-000000000001', 'food',   'Yemek',     1, now(), now()),
  ('ca7e0000-0000-0000-0000-000000000002', 'market', 'Market',    2, now(), now()),
  ('ca7e0000-0000-0000-0000-000000000003', 'fuel',   'Akaryakıt', 3, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Kampanyalar (tenant_id NULL = tüm firmalara görünür) ─
INSERT INTO campaigns (id, tenant_id, category_id, brand_logo_url, title, body, detail_url, status, published_at, created_at, updated_at) VALUES
  ('ca300000-0000-0000-0000-000000000001', NULL, 'ca7e0000-0000-0000-0000-000000000001', NULL,
   'Burger King %20 İndirim', 'MetropolCard ile Burger King restoranlarında tüm menülerde %20 indirim. Kasada kartını okutman yeterli.', NULL, 'published', now() - interval '5 days', now(), now()),
  ('ca300000-0000-0000-0000-000000000002', NULL, 'ca7e0000-0000-0000-0000-000000000001', NULL,
   'Simit Sarayı Kahvaltı Fırsatı', 'Hafta içi 09:00 öncesi kahvaltı menülerinde 2 al 1 öde.', NULL, 'published', now() - interval '3 days', now(), now()),
  ('ca300000-0000-0000-0000-000000000003', NULL, 'ca7e0000-0000-0000-0000-000000000002', NULL,
   'Migros Hafta Sonu %10', 'Hafta sonu Migros alışverişlerinde anında %10 bakiye iadesi.', NULL, 'published', now() - interval '2 days', now(), now()),
  ('ca300000-0000-0000-0000-000000000004', NULL, 'ca7e0000-0000-0000-0000-000000000003', NULL,
   'Opet 50 TL Yakıt Puanı', '500 TL ve üzeri yakıt alımında 50 TL puan hediye.', NULL, 'published', now() - interval '1 day', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Kuponlar ve hediye çekleri ───────────────────────────
INSERT INTO coupons (id, tenant_id, title, brand, amount, expires_at, status, created_at, updated_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', NULL, '50 TL Kahve Kuponu', 'Kahve Dünyası', 50.00, now() + interval '30 days', 'published', now(), now()),
  ('c0000000-0000-0000-0000-000000000002', NULL, '100 TL Market Kuponu', 'CarrefourSA', 100.00, now() + interval '45 days', 'published', now(), now()),
  ('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '75 TL Doğum Günü Kuponu', 'AIGAP Demo', 75.00, now() + interval '15 days', 'published', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO gift_cards (id, tenant_id, title, brand, amount, expires_at, status, created_at, updated_at) VALUES
  ('91f70000-0000-0000-0000-000000000001', NULL, '250 TL Hediye Çeki', 'Boyner', 250.00, now() + interval '60 days', 'published', now(), now()),
  ('91f70000-0000-0000-0000-000000000002', NULL, '500 TL Teknoloji Çeki', 'MediaMarkt', 500.00, now() + interval '90 days', 'published', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Duyurular (1 global + 3 AIGAP Demo) ──────────────────
INSERT INTO announcements (id, tenant_id, cover_url, title, body, status, published_at, created_by, created_at, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', NULL, NULL,
   'MetropolBusiness''a Hoş Geldiniz', 'Yan haklarınız, kartlarınız ve şirket içi iletişim artık tek uygulamada. Sorularınız için sohbet sekmesindeki asistanı kullanabilirsiniz.', 'published', now() - interval '7 days',
   'aaaaaaaa-0000-0000-0000-000000000001', now(), now()),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', NULL,
   'Yeni Yemek Kartı Bakiyeleri Yüklendi', 'Haziran ayı yemek kartı bakiyeleri tüm çalışanlarımızın kartlarına yüklenmiştir. Afiyet olsun!', 'published', now() - interval '2 days',
   'aaaaaaaa-0000-0000-0000-000000000001', now(), now()),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL,
   'Cuma Günü Ofis Etkinliği', 'Bu cuma 16:00''da teras katta yaz başlangıcı buluşması yapıyoruz. Tüm ekip davetlidir.', 'published', now() - interval '1 day',
   'aaaaaaaa-0000-0000-0000-000000000001', now(), now()),
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', NULL,
   'İK Sistemine Geçiş Tamamlandı', 'İzin ve masraf talepleri artık uygulamanın Diğer sekmesinden yapılmaktadır. Eski form akışı kapatılmıştır.', 'published', now() - interval '4 days',
   'aaaaaaaa-0000-0000-0000-000000000001', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Anket (AIGAP Demo, 3 soru) ───────────────────────────
INSERT INTO surveys (id, tenant_id, title, status, single_response, published_at, created_at, updated_at) VALUES
  ('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Çalışan Memnuniyeti Anketi', 'published', true, now() - interval '3 days', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO survey_questions (id, survey_id, "order", type, text, options, created_at, updated_at) VALUES
  ('50000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000001', 1, 'single',
   'Yan haklar paketinden ne kadar memnunsunuz?', '["Çok memnunum","Memnunum","Kararsızım","Memnun değilim"]', now(), now()),
  ('50000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000001', 2, 'rating',
   'Uygulamayı 1-5 arası puanlar mısınız?', NULL, now(), now()),
  ('50000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000001', 3, 'text',
   'Eklenmesini istediğiniz bir yan hak var mı?', NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Eğitim videoları (AIGAP Demo; herkese açık örnek mp4) ─
INSERT INTO videos (id, tenant_id, title, description, url, thumbnail_url, duration_seconds, mandatory, created_at, updated_at) VALUES
  ('01de0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Uygulama Tanıtımı', 'MetropolBusiness uygulamasının temel özelliklerini tanıyın.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg', 596, true, now(), now()),
  ('01de0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Bilgi Güvenliği Eğitimi', 'Zorunlu yıllık bilgi güvenliği farkındalık eğitimi.',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
   'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg', 653, false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── AI asistan + sohbetler (AIGAP Demo) ──────────────────
INSERT INTO assistants (id, tenant_id, created_by, name, persona, avatar_url, scope, created_at, updated_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001', 'İK Asistanı',
   'Sen AIGAP Demo firmasının İK asistanısın. İzin, masraf, yan haklar ve şirket politikaları hakkında kısa ve net Türkçe yanıtlar verirsin. Bilmediğin konularda İK departmanına yönlendirirsin.',
   NULL, 'tenant', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Kullanıcılar arası sohbet: Demo Admin <-> Demo Çalışan
INSERT INTO conversations (id, tenant_id, type, assistant_id, created_at, updated_at) VALUES
  ('c0540000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'direct', NULL, now() - interval '1 day', now()),
  ('c0540000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'assistant', 'a1000000-0000-0000-0000-000000000001', now() - interval '2 hours', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id) VALUES
  ('c0540000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('c0540000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003'),
  ('c0540000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

INSERT INTO messages (id, tenant_id, conversation_id, sender_id, sender_type, content, read_by, created_at, updated_at) VALUES
  ('ee000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0540000-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'user', 'Merhaba, yeni dönem yemek kartı bakiyeleri yüklendi. Kontrol edebilir misin?', '["aaaaaaaa-0000-0000-0000-000000000003"]', now() - interval '1 day', now()),
  ('ee000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0540000-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000003', 'user', 'Merhaba, evet geldi. Teşekkürler! 🙏', '["aaaaaaaa-0000-0000-0000-000000000001"]', now() - interval '23 hours', now()),
  ('ee000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0540000-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'user', 'Süper. Cuma günkü etkinliğe de bekliyoruz 👍', '[]', now() - interval '22 hours', now()),
  ('ee000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'c0540000-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000003', 'user', 'Yıllık izin hakkım kaç gün?', '[]', now() - interval '2 hours', now()),
  ('ee000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'c0540000-0000-0000-0000-000000000002',
   NULL, 'assistant', 'Kıdeminize göre yıllık izin hakkınız 14 iş günüdür. Kalan izin gününüzü Diğer > İzin Talebi ekranından görebilirsiniz. Başka bir konuda yardımcı olabilir miyim?', '[]', now() - interval '2 hours' + interval '15 seconds', now())
ON CONFLICT (id) DO NOTHING;

-- ── İK: izin + masraf talepleri (Demo Çalışan) ───────────
INSERT INTO leave_requests (id, tenant_id, user_id, type, start_date, end_date, days, note, status, decided_by, decided_at, decision_note, created_at, updated_at) VALUES
  ('1eaf0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   'Yıllık İzin', current_date + 14, current_date + 18, 5, 'Aile ziyareti', 'approved',
   'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '2 days', 'İyi tatiller', now() - interval '3 days', now()),
  ('1eaf0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   'Mazeret İzni', current_date + 7, current_date + 7, 1, 'Sağlık kontrolü', 'pending',
   NULL, NULL, NULL, now() - interval '1 day', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_requests (id, tenant_id, user_id, type, amount, date, receipt_url, note, status, decided_by, decided_at, decision_note, created_at, updated_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   'Ulaşım', 1250.50, current_date - 5, NULL, 'Müşteri ziyareti - şehir dışı', 'approved',
   'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '3 days', 'Onaylandı', now() - interval '5 days', now()),
  ('e0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   'Yemek', 450.00, current_date - 2, NULL, 'Ekip öğle yemeği', 'pending',
   NULL, NULL, NULL, now() - interval '2 days', now())
ON CONFLICT (id) DO NOTHING;

-- ── Kartlar + bakiyeler (SAHTE token; Metropol işlemi YAPILAMAZ) ─
-- Token PlaceholderFieldCipher biçiminde (enc:base64) ÇÖZÜLEBİLİR ama Metropol'de
-- geçersizdir → bakiye akışı tasarlandığı gibi "erişilemez → stale snapshot" yoluna düşer.
INSERT INTO cards (id, tenant_id, user_id, user_account_token_encrypted, masked_card_no, holder_name, status, deleted_at, created_at, updated_at) VALUES
  ('cad00000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000003',
   'enc:REVNTy1GQUtFLVRPS0VOLTAwMQ==', '637512******4821', 'Demo Çalışan', 'active', NULL, now() - interval '30 days', now()),
  ('cad00000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001',
   'enc:REVNTy1GQUtFLVRPS0VOLTAwMg==', '637512******7733', 'Demo Admin', 'active', NULL, now() - interval '45 days', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO card_balances (id, tenant_id, card_id, wallet_id, wallet_name, balance, created_at, updated_at) VALUES
  ('ba1a0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cad00000-0000-0000-0000-000000000001', 1, 'Resto', 1845.75, now(), now()),
  ('ba1a0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cad00000-0000-0000-0000-000000000001', 3, 'Gift', 500.00, now(), now()),
  ('ba1a0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cad00000-0000-0000-0000-000000000002', 1, 'Resto', 2310.25, now(), now())
ON CONFLICT (id) DO NOTHING;

COMMIT;
