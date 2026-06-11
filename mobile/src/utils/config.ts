/**
 * Uygulama yapılandırması.
 * TODO(Faz 3): react-native-config ile .env'den okunacak (mobile/.env.example'a bak).
 * Şimdilik sabit; istemcide sır tutulmaz (CLAUDE.md §8).
 *
 * Dev sunucusu (yedibella) varsayılan. Yerel backend'e karşı çalışmak için:
 *   apiBaseUrl: 'http://localhost:5000/api/v1', signalRHubUrl: 'http://localhost:5000/hubs/chat'
 * (Android emülatörde localhost yerine 10.0.2.2 kullan.)
 */
export const config = {
  apiBaseUrl: 'https://metropolapi.yedibella.com/api/v1',
  signalRHubUrl: 'https://metropolapi.yedibella.com/hubs/chat',
  defaultLocale: 'tr',
} as const;
