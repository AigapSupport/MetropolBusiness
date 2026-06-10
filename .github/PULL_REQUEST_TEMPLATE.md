# Pull Request

## Ne yapıldı?
<!-- Kısa açıklama. Commit formatı: <alan>: <ne yapıldı> (örn. metropol: token cache eklendi) -->

## İlgili görev / doküman
<!-- docs/TODO.md maddesi, PRD bölümü vb. -->

## Değişiklik tipi
- [ ] Yeni özellik
- [ ] Hata düzeltme
- [ ] Refactor / teknik borç
- [ ] Doküman

## Kontrol listesi (CLAUDE.md kuralları)
- [ ] Tenant izolasyonu korunuyor (tenant scope'suz sorgu yok)
- [ ] Sır / PII log'lanmıyor, istemciye sızmıyor (kart no, TCKN, OTP maskeli)
- [ ] Para alanları `decimal`/`numeric` (float yok)
- [ ] Para uçlarında idempotency korunuyor
- [ ] Backend: `dotnet test` geçti
- [ ] İstemci: `npm run lint` + `npm run typecheck` geçti
- [ ] `docs/API_CONTRACT.md` güncel (yeni/değişen uç varsa)
- [ ] Yıkıcı işlem yok / onaylı

## Test notları
<!-- Nasıl test edildi? Hangi testler eklendi? -->
