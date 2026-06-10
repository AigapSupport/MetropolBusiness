/**
 * Basit yerel FormDrawer (PANELS_SPEC §0.2): sağdan açılan çekmece — oluştur/düzenle
 * formları için. Kaydet/iptal düğmeleri; kaydederken disable.
 */

import type { FormEvent, ReactNode } from 'react';
import { colors, radii } from '../../theme/tokens';

interface FormDrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  saving?: boolean;
  submitLabel?: string;
  width?: number;
}

export default function FormDrawer({
  open,
  title,
  children,
  onClose,
  onSubmit,
  saving = false,
  submitLabel = 'Kaydet',
  width = 440,
}: FormDrawerProps) {
  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        backgroundColor: colors.overlay,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width,
          maxWidth: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.surface,
          boxShadow: `-4px 0 16px ${colors.overlay}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, color: colors.textPrimary }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 18,
              color: colors.textSecondary,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '14px 20px',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 16px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              fontSize: 14,
            }}
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '9px 16px',
              borderRadius: radii.md,
              border: 'none',
              backgroundColor: saving ? colors.disabledBg : colors.primary,
              color: saving ? colors.textSecondary : colors.textOnPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {saving ? 'Kaydediliyor…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
