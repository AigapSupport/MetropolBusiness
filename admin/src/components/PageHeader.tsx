import type { ReactNode } from 'react';
import { theme } from '../theme/tokens';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

/** Sayfa başlığı + opsiyonel açıklama ve aksiyon alanı. */
export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.lg,
        gap: theme.spacing.md,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: theme.font.sizeXl, color: theme.colors.textPrimary }}>
          {title}
        </h1>
        {description !== undefined && (
          <p
            style={{
              margin: `${theme.spacing.sm}px 0 0`,
              fontSize: theme.font.sizeMd,
              color: theme.colors.textSecondary,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </header>
  );
}
