/** Sunum yardımcıları — veride UTC, gösterimde tr-TR (PANELS_SPEC §0.3). */

/** ISO tarihi yerel kısa biçimde gösterir; null/parse hatasında '—'. */
export function formatDate(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Saniyeyi mm:ss / h:mm:ss olarak gösterir. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Ad-soyadı tek metin yapar; ikisi de boşsa '—'. */
export function formatFullName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string {
  const name = [firstName, lastName].filter((part) => part != null && part !== '').join(' ');
  return name === '' ? '—' : name;
}
