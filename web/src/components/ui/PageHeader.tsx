/** Sayfa başlığı + sağ üst birincil aksiyon (PANELS_SPEC §0.1). */

import type { ReactNode } from 'react';
import { colors } from '../../theme/tokens';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 16,
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: 24, color: colors.textPrimary }}>{title}</h1>
        {description !== undefined && (
          <p style={{ margin: '6px 0 0', fontSize: 14, color: colors.textSecondary }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
