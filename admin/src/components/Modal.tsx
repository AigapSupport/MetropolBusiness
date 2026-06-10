import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../theme/tokens';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: theme.colors.overlay,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    overflowY: 'auto',
    zIndex: 10,
  },
  panel: {
    background: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
    maxWidth: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  title: {
    margin: 0,
    fontSize: theme.font.sizeLg,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    color: theme.colors.textSecondary,
    fontSize: theme.font.sizeXl,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
};

/** Basit-yerel modal: form ve onay diyalogları için ortak çatı (kütüphanesiz). */
export function Modal({ title, onClose, children, width = 560 }: ModalProps) {
  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div style={{ ...styles.panel, width }}>
        <header style={styles.header}>
          <h2 style={styles.title}>{title}</h2>
          <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
