/** Saniyeyi m:ss biçimine çevirir (video süre rozeti — prototip v.dur karşılığı). */
export function formatDurationMmSs(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
