# Katkı Rehberi — Branch Stratejisi

## Dallar
- **`main`** — korumalı; doğrudan push yok. Her zaman derlenebilir/test geçer durumda.
- **`feature/<alan>-<kısa-ad>`** — her iş için ayrı dal (örn. `feature/metropol-token-cache`).
- **`fix/<alan>-<kısa-ad>`** — hata düzeltmeleri.

## Akış
1. `main`'den dal aç: `git checkout -b feature/metropol-token-cache main`
2. Küçük, odaklı commit'ler: `<alan>: <ne yapıldı>` (örn. `mobile: harcama kart seçim ekranı`)
3. PR aç (şablon otomatik gelir), kontrol listesini doldur.
4. PR öncesi yerelde: backend `dotnet test`, istemci `npm run lint && npm run typecheck`.
5. Review + merge (squash tercih edilir).

## Alan önekleri
`backend` · `metropol` · `mobile` · `web` · `admin` · `shared` · `infra` · `docs`

## Yasaklar
- Sır, anahtar, `.env`, gerçek kart/kullanıcı verisi commit edilmez.
- `main`'e doğrudan push yapılmaz.
- Metropol DTO sözleşmesi (`MetropolModels.cs`) tek taraflı değiştirilmez.
