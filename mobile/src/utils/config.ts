/**
 * Uygulama yapılandırması.
 * TODO(Faz 1): react-native-config ile .env'den okunacak (mobile/.env.example'a bak).
 * Şimdilik sabit; istemcide sır tutulmaz (CLAUDE.md §8).
 */
export const config = {
  apiBaseUrl: 'http://localhost:5000/api/v1',
  signalRHubUrl: 'http://localhost:5000/hubs/chat',
  defaultLocale: 'tr',
} as const;
