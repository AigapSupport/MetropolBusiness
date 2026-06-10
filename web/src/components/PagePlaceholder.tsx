import { colors, radii } from '../theme/tokens';

interface PagePlaceholderProps {
  title: string;
  description?: string;
}

/** Faz 0 iskelet sayfası: başlık + "Faz 1'de gelecek" notu. */
export default function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <section>
      <h1 style={{ margin: '0 0 12px', fontSize: 24, color: colors.textPrimary }}>{title}</h1>
      <div
        style={{
          padding: 24,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          color: colors.textSecondary,
          fontSize: 14,
        }}
      >
        {description ?? "Bu ekran Faz 1'de gelecek."}
      </div>
    </section>
  );
}
