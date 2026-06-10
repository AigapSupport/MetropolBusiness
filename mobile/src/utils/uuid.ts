/**
 * UUID v4 üretimi — Idempotency-Key ve consumerRefCode için (API_CONTRACT §0.1).
 * Anahtar güvenlik amaçlı değil tekrarlanan isteği ayırt etmek içindir; bu yüzden
 * crypto.randomUUID yoksa Math.random tabanlı v4 yeterlidir (çakışma olasılığı ihmal edilir).
 */

interface CryptoLike {
  randomUUID?: () => string;
}

export function createUuid(): string {
  // RN/Hermes sürümüne göre crypto bulunmayabilir — özellik algılama için daraltılmış görünüm.
  const cryptoApi = (globalThis as { crypto?: CryptoLike }).crypto;
  if (cryptoApi?.randomUUID !== undefined) {
    return cryptoApi.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random % 4) + 8; // y ∈ {8,9,a,b} (RFC 4122 variant)
    return value.toString(16);
  });
}
