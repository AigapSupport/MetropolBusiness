import type { CSSProperties } from 'react';
import { theme } from '../../theme/tokens';

interface BrandPreviewProps {
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

/**
 * Marka CANLI ÖNİZLEME (PANELS_SPEC §B.3): seçilen tenant renkleriyle mini
 * kart/buton mockup'ı. Buradaki primaryColor/secondaryColor TENANT VERİSİDİR
 * (form state'i), hardcode hex değildir; çerçeve renkleri tema token'larından gelir.
 */
export function BrandPreview({ name, logoUrl, primaryColor, secondaryColor }: BrandPreviewProps) {
  const styles: Record<string, CSSProperties> = {
    frame: {
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
    },
    header: {
      background: primaryColor,
      padding: theme.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    brandName: {
      color: theme.colors.surface,
      fontWeight: 700,
      fontSize: theme.font.sizeMd,
    },
    body: {
      padding: theme.spacing.md,
      background: theme.colors.background,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
    },
    card: {
      background: theme.colors.surface,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderLeft: `4px solid ${primaryColor}`,
    },
    cardLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.font.sizeMd,
    },
    cardAmount: {
      color: secondaryColor,
      fontWeight: 700,
      fontSize: theme.font.sizeMd,
    },
    primaryButton: {
      border: 'none',
      borderRadius: theme.radius.sm,
      padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
      background: primaryColor,
      color: theme.colors.surface,
      fontWeight: 600,
      fontSize: theme.font.sizeSm,
      cursor: 'default',
    },
    secondaryChip: {
      alignSelf: 'flex-start',
      borderRadius: theme.radius.sm,
      padding: `2px ${theme.spacing.sm}px`,
      background: secondaryColor,
      color: theme.colors.surface,
      fontSize: theme.font.sizeSm,
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.frame} aria-label="Marka önizlemesi">
      <div style={styles.header}>
        {logoUrl !== '' && (
          <img src={logoUrl} alt="Firma logosu" style={{ height: 28, maxWidth: 120 }} />
        )}
        <span style={styles.brandName}>{name !== '' ? name : 'Firma Adı'}</span>
      </div>
      <div style={styles.body}>
        <div style={styles.card}>
          <span style={styles.cardLabel}>Yemek Kartı</span>
          <span style={styles.cardAmount}>•••• 976</span>
        </div>
        <button type="button" style={styles.primaryButton} tabIndex={-1}>
          Birincil Buton
        </button>
        <span style={styles.secondaryChip}>İkincil Vurgu</span>
      </div>
    </div>
  );
}
