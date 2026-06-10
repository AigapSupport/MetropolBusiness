/** Durum rozeti (PANELS_SPEC §0.2) — renkler tema token'larından. */

import { colors } from '../../theme/tokens';

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
  neutral: { bg: colors.neutralBg, fg: colors.neutralText },
};

/** Bilinen durum kodları → ton + Türkçe etiket. */
const KNOWN_STATUSES: Record<string, { tone: BadgeTone; label: string }> = {
  active: { tone: 'success', label: 'Aktif' },
  passive: { tone: 'neutral', label: 'Pasif' },
  published: { tone: 'success', label: 'Yayında' },
  draft: { tone: 'warning', label: 'Taslak' },
  mandatory: { tone: 'danger', label: 'Zorunlu' },
  watched: { tone: 'success', label: 'İzledi' },
  notWatched: { tone: 'neutral', label: 'İzlemedi' },
};

interface StatusBadgeProps {
  status: string;
  /** Bilinmeyen durumlar için açık etiket/ton. */
  label?: string;
  tone?: BadgeTone;
}

export default function StatusBadge({ status, label, tone }: StatusBadgeProps) {
  const known = KNOWN_STATUSES[status];
  const resolvedTone = tone ?? known?.tone ?? 'neutral';
  const resolvedLabel = label ?? known?.label ?? status;
  const style = TONE_STYLES[resolvedTone];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {resolvedLabel}
    </span>
  );
}
