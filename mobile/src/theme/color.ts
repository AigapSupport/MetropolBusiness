/**
 * Tema türetme için küçük renk yardımcıları — tenant branding'inden (primaryColor)
 * brandDark/brandSoft tonları runtime üretilir (TODO 1.10). Ekranlarda kullanılmaz;
 * yalnızca ThemeProvider'ın palet kurulumu içindir.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): Rgb | null {
  const value = hex.trim().replace(/^#/, '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return null;
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex(rgb: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`.toUpperCase();
}

/** İki rengi karıştırır; ratio=0 → base, ratio=1 → target. Geçersiz hex'te base döner. */
export function mixHex(baseHex: string, targetHex: string, ratio: number): string {
  const base = parseHex(baseHex);
  const target = parseHex(targetHex);
  if (base === null || target === null) {
    return baseHex;
  }
  const clamped = Math.max(0, Math.min(1, ratio));
  return toHex({
    r: base.r + (target.r - base.r) * clamped,
    g: base.g + (target.g - base.g) * clamped,
    b: base.b + (target.b - base.b) * clamped,
  });
}

/** Koyulaştır — brandDark türetimi (basılı buton durumu vb.). */
export function darkenHex(hex: string, amount: number): string {
  return mixHex(hex, '#000000', amount);
}

/** Açıklaştır — brandSoft türetimi (yumuşak zeminler). */
export function lightenHex(hex: string, amount: number): string {
  return mixHex(hex, '#FFFFFF', amount);
}
