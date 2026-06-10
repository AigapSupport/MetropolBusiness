import { theme } from '../theme/tokens';
import { Modal } from './Modal';
import {
  dangerButtonStyle,
  errorTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from './ui';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  /** true ise onay butonu tehlike renginde (pasifleştirme vb.). */
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Onay diyaloğu — durum değişimi gibi geri alınabilir ama etkili işlemler için. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} width={440}>
      <p
        style={{
          margin: 0,
          fontSize: theme.font.sizeMd,
          color: theme.colors.textPrimary,
        }}
      >
        {message}
      </p>
      {error !== null && <p style={errorTextStyle}>{error}</p>}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: theme.spacing.sm,
        }}
      >
        <button type="button" style={secondaryButtonStyle} onClick={onCancel} disabled={busy}>
          Vazgeç
        </button>
        <button
          type="button"
          style={danger ? dangerButtonStyle : primaryButtonStyle}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'İşleniyor…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
