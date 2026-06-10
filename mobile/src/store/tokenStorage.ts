/**
 * Token saklama katmanı (ITokenStorage).
 *
 * Gerçek cihazda token çifti Keychain (iOS) / Keystore (Android) içinde saklanır
 * (react-native-keychain). Bu geliştirme ortamında native klasörler üretilemediği
 * için (bkz. LESSONS.md — RN native kaydı) native modül yüklenemez/çağrılamazsa
 * bellek-içi fallback'e düşülür: oturum yalnızca uygulama açıkken yaşar.
 * AsyncStorage BİLEREK kullanılmaz — refresh token diske düz metin yazılmaz.
 */
import type { OtpVerifyResponse } from '@shared/auth';

/** Saklanan oturum token çifti (POST /auth/otp/verify yanıtından). */
export type StoredTokens = Pick<OtpVerifyResponse, 'accessToken' | 'refreshToken'>;

/** Token deposu sözleşmesi — implementasyon (Keychain / in-memory) değişebilir. */
export interface ITokenStorage {
  save(tokens: StoredTokens): Promise<void>;
  load(): Promise<StoredTokens | null>;
  clear(): Promise<void>;
}

/** Bellek-içi depo — Keychain kullanılamadığında devreye giren fallback. */
class InMemoryTokenStorage implements ITokenStorage {
  private tokens: StoredTokens | null = null;

  save(tokens: StoredTokens): Promise<void> {
    this.tokens = tokens;
    return Promise.resolve();
  }

  load(): Promise<StoredTokens | null> {
    return Promise.resolve(this.tokens);
  }

  clear(): Promise<void> {
    this.tokens = null;
    return Promise.resolve();
  }
}

type KeychainModule = typeof import('react-native-keychain');

/** Keychain kayıt servisi adı — tek oturum kaydı için sabit. */
const KEYCHAIN_SERVICE = 'com.metropolbusiness.session';
/** Keychain "username" alanı — tekil kayıt anahtarıdır, PII içermez. */
const KEYCHAIN_USERNAME = 'session-tokens';

/**
 * Keychain/Keystore tabanlı depo. Her çağrı try/catch ile sarılıdır:
 * native modül linkli değilse (bu ortam) çağrı anında hata fırlar ve
 * aynı davranışı koruyarak bellek-içi fallback'e düşülür.
 */
class KeychainTokenStorage implements ITokenStorage {
  /** Native çağrı başarısız olursa oturum bu fallback'te yaşar. */
  private readonly fallback = new InMemoryTokenStorage();

  constructor(private readonly keychain: KeychainModule) {}

  async save(tokens: StoredTokens): Promise<void> {
    try {
      await this.keychain.setGenericPassword(KEYCHAIN_USERNAME, JSON.stringify(tokens), {
        service: KEYCHAIN_SERVICE,
      });
    } catch {
      await this.fallback.save(tokens);
    }
  }

  async load(): Promise<StoredTokens | null> {
    try {
      const credentials = await this.keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      if (credentials === false) {
        return null;
      }
      return parseStoredTokens(credentials.password);
    } catch {
      return this.fallback.load();
    }
  }

  async clear(): Promise<void> {
    try {
      await this.keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    } catch {
      // Native modül yoksa silinecek Keychain kaydı da yoktur — yoksay.
    }
    await this.fallback.clear();
  }
}

/** Keychain'den okunan ham veriyi doğrulayarak token çiftine çevirir. */
function parseStoredTokens(raw: string): StoredTokens | null {
  try {
    const data = JSON.parse(raw) as Partial<StoredTokens>;
    if (typeof data.accessToken === 'string' && typeof data.refreshToken === 'string') {
      return { accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
  } catch {
    // Bozuk kayıt — oturumsuz devam edilir.
  }
  return null;
}

// Metro runtime'ı global `require` sağlar; node tipleri eklenmediği için yerel bildirim.
declare const require: (moduleId: string) => unknown;

/** react-native-keychain JS modülünü koşullu yükler; yüklenemezse null döner. */
function loadKeychainModule(): KeychainModule | null {
  try {
    // Koşullu require şart: modül çözülemezse import zinciri tüm uygulamayı düşürürdü.
    return require('react-native-keychain') as KeychainModule;
  } catch {
    return null;
  }
}

function createTokenStorage(): ITokenStorage {
  const keychain = loadKeychainModule();
  return keychain !== null ? new KeychainTokenStorage(keychain) : new InMemoryTokenStorage();
}

/** Uygulama genelinde tek token deposu. */
export const tokenStorage: ITokenStorage = createTokenStorage();
