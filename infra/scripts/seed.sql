-- seed.sql — Örnek tenant + kullanıcı (YALNIZCA local geliştirme)
-- Şema: docs/ARCHITECTURE.md §4.1. EF Core migration'ları uygulandıktan SONRA çalıştırılır.
-- Gerçek kişi/kart verisi İÇERMEZ. Idempotent: tekrar çalıştırılabilir (ON CONFLICT DO NOTHING).

BEGIN;

-- ── Tenant: örnek firma ─────────────────────────────────
INSERT INTO tenants (id, name, code, status, metropol_consumer_id, brand_logo_url,
                     brand_primary_color, brand_secondary_color, settings, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'AIGAP Demo', 'AIGAP', 'active',
   NULL, NULL, '#F2697B', '#2D3142', '{}', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Atlas Enerji Demo', 'ATLAS', 'active',
   NULL, NULL, '#3B82F6', '#1E293B', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Kullanıcılar ────────────────────────────────────────
-- Roller: enduser / company_admin / approver (PRD §17.9)
INSERT INTO users (id, tenant_id, phone, first_name, last_name, email, role, member_id, status, created_at, updated_at)
VALUES
  -- AIGAP Demo firması
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '5550000001', 'Demo', 'Admin', 'admin@demo.local', 'company_admin', 'M-0001', 'active', now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   '5550000002', 'Demo', 'Onaylayan', 'approver@demo.local', 'approver', 'M-0002', 'active', now(), now()),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   '5550000003', 'Demo', 'Çalışan', 'user@demo.local', 'enduser', 'M-0003', 'active', now(), now()),
  -- Atlas Enerji Demo firması (tenant izolasyon testleri için ikinci tenant)
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   '5550000001', 'Atlas', 'Admin', 'admin@atlas.local', 'company_admin', 'M-1001', 'active', now(), now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   '5550000004', 'Atlas', 'Çalışan', 'user@atlas.local', 'enduser', 'M-1002', 'active', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── Segmentler ──────────────────────────────────────────
INSERT INTO segments (id, tenant_id, name, created_at, updated_at)
VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Tüm Çalışanlar', now(), now()),
  ('33333333-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Yöneticiler', now(), now()),
  ('44444444-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Tüm Çalışanlar', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_segments (user_id, segment_id)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ── Modül tanımları (platform seviyesi) ─────────────────
INSERT INTO modules (id, code, name, is_active)
VALUES
  ('55555555-0000-0000-0000-000000000001', 'leave_request', 'İzin Talebi', true),
  ('55555555-0000-0000-0000-000000000002', 'expense_request', 'Masraf Talebi', true),
  ('55555555-0000-0000-0000-000000000003', 'expense_approval', 'Masraf Onay', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO segment_modules (segment_id, module_id)
VALUES
  ('33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001'),
  ('33333333-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002'),
  ('33333333-0000-0000-0000-000000000002', '55555555-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

COMMIT;
