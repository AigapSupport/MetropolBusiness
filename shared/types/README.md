# @metropolbusiness/shared-types

Web + admin + mobile istemcilerin ortak DTO tipleri. **Tek kaynak: `docs/API_CONTRACT.md`** — yeni uç eklenince önce sözleşme, sonra buradaki tip güncellenir. İstemcide elle tip yeniden tanımlanmaz (CLAUDE.md §7).

## Paylaşım yöntemi
Paket yayınlanmaz; istemciler TS kaynaklarını **path alias** ile doğrudan tüketir:

- `web/tsconfig.json` ve `admin/tsconfig.json` → `"paths": { "@shared/*": ["../shared/types/src/*"] }` + Vite `resolve.alias`.
- `mobile/tsconfig.json` → aynı paths + `babel-plugin-module-resolver` (runtime çözümleme).

Kullanım:
```ts
import type { MeResponse, Paged, ErrorResponse } from '@shared/index';
```

## Kurallar
- Para alanları **string** taşınır (`"500.00"`) — decimal kaybı olmaz (CLAUDE.md kural 5).
- Tarihler ISO-8601 UTC string.
- Maskeli alanlar (`maskedCardNo`, `tcknMasked`...) backend'den maskeli gelir; istemci maskeleme yapmaz.
