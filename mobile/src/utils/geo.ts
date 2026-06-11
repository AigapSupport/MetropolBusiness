/** Konum yardımcıları (PRD §8.5): mesafe (haversine) + basit pin kümeleme. */

export interface LatLng {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

/** İki nokta arası kuş uçuşu mesafe (km) — haversine. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export interface ClusterPoint<T> {
  latitude: number;
  longitude: number;
  items: T[];
}

/**
 * Basit grid kümeleme: ~cellDeg derecelik hücrelere gruplar; harita zoom takibi
 * yapılmaz (v1 — kütüphaneli kümeleme Faz 3 performans turunda). Tek elemanlı
 * hücreler tek pin olarak döner.
 */
export function clusterByGrid<T>(
  points: Array<{ latitude: number; longitude: number; item: T }>,
  cellDeg = 0.02,
): Array<ClusterPoint<T>> {
  const cells = new Map<string, ClusterPoint<T>>();
  for (const point of points) {
    const key = `${Math.round(point.latitude / cellDeg)}:${Math.round(point.longitude / cellDeg)}`;
    const cell = cells.get(key);
    if (cell === undefined) {
      cells.set(key, { latitude: point.latitude, longitude: point.longitude, items: [point.item] });
    } else {
      // Küme merkezi: üyelerin ortalaması (artımlı).
      const n = cell.items.length;
      cell.latitude = (cell.latitude * n + point.latitude) / (n + 1);
      cell.longitude = (cell.longitude * n + point.longitude) / (n + 1);
      cell.items.push(point.item);
    }
  }
  return [...cells.values()];
}
