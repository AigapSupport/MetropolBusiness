/** Basit yerel ConfirmDialog (PANELS_SPEC §0.2) — yıkıcı işlemler onaydan geçer. */

import { colors, radii } from '../../theme/tokens';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Onayla',
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        backgroundColor: colors.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-label={title}
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: 24,
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: 16, color: colors.textPrimary }}>{title}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: colors.textSecondary }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: '9px 16px',
              borderRadius: radii.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              color: colors.textPrimary,
              fontSize: 14,
            }}
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{
              padding: '9px 16px',
              borderRadius: radii.md,
              border: 'none',
              backgroundColor: busy ? colors.disabledBg : colors.danger,
              color: busy ? colors.textSecondary : colors.textOnPrimary,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {busy ? 'İşleniyor…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
