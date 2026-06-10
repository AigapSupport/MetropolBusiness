# MetropolBusiness — Mobile (React Native + TypeScript)

Son kullanıcı mobil uygulaması (PRD §4–11). Faz 0.4 iskeleti: navigasyon, tema/token altyapısı,
localization (TR/EN), fetch tabanlı API client ve React Query kurulumu.

> **ÖNEMLİ:** Native projeler (android/ios) RN CLI şablonundan ayrıca üretilecek; bkz `LESSONS.md`
> (repo kökü). Bu ortam Windows Server olduğu için `npx react-native init` çalıştırılmadı
> (iOS projesi yalnızca macOS'ta üretilir/derlenir; klasör de boş değildi). `index.js` AppRegistry
> kaydı hazırdır; `android/` ve `ios/` eklendiğinde uygulama kodu değişmeden çalışır.
> Şablon app adı `app.json > name: MetropolBusiness` ile eşleşmelidir.

## Komutlar

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm start           # Metro (native projeler eklendikten sonra)
npm run android     # native klasörler eklendikten sonra
npm run ios         # yalnızca macOS
```

## Yapı

```
src/
├── App.tsx            # SafeArea + QueryClient + Theme + Auth + NavigationContainer
├── api/               # client.ts (fetch sarmalayıcı), queryClient.ts (React Query)
├── components/        # PlaceholderScreen, PrimaryButton (Faz 0 ortak bileşenler)
├── localization/      # i18next kurulumu + tr.json / en.json (varsayılan TR)
├── navigation/        # RootNavigator (auth ayrımı), AuthStack, MainTabs (5 sekme, PRD §4)
├── screens/           # Home / Benefits / Metropol / Chat / Other / Account / Auth
├── store/             # authStore (context; secure storage Faz 1.2'de)
├── theme/             # tokens.ts, palettes.ts, ThemeProvider (white-label runtime tema)
└── utils/             # config.ts (API base URL; .env entegrasyonu Faz 1'de)
```

## Notlar

- **Alias'lar:** `@/* → src/*`, `@shared/* → ../shared/types/src/*` (tsconfig `paths` +
  babel `module-resolver`). DTO tipleri yalnızca `@shared`'dan gelir, elle yeniden tanımlanmaz.
- **Tema:** Renk hex'i ekranlarda hardcode edilmez; `useTheme()` token'larından okunur.
  Tenant teması Faz 1.10'da backend'den runtime yüklenecek (`src/theme/palettes.ts` örnektir).
- **Metinler:** Tüm UI metinleri `src/localization` üzerinden (TR varsayılan, EN yedek).
- **Tasarım referansı:** `design/` içindeki prototip + `design/PROTOTYPE_MAP.md`.
