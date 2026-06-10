/**
 * Tarih/saat gösterimi — ISO-8601 UTC değer (API_CONTRACT §0.5) cihaz yerel saatine
 * çevrilip "10.06.2026" / "12:42" biçiminde gösterilir. Hermes'te Intl güvencesi
 * olmadığından elle biçimlenir.
 */
import type { IsoDateString } from '@shared/common';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDate(iso: IsoDateString): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

export function formatTime(iso: IsoDateString): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "10.06.2026 · 12:42" — işlem satırları ve fişler için. */
export function formatDateTime(iso: IsoDateString): string {
  const time = formatTime(iso);
  return time === '' ? formatDate(iso) : `${formatDate(iso)} · ${time}`;
}

/** Bugünden geriye N gün önceki anın ISO-8601 UTC karşılığı (tarih aralığı filtresi). */
export function isoDaysAgo(days: number): IsoDateString {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
