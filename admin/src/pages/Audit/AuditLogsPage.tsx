import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

/** PANELS_SPEC.md §B.8 — Denetim kaydı (salt-okunur, PII'siz). Liste Faz 3'te. */
export function AuditLogsPage() {
  return (
    <section>
      <PageHeader
        title="Denetim Kaydı"
        description="Kritik platform olaylarının salt-okunur kaydı (PII içermez)."
      />
      <p style={{ color: theme.colors.textSecondary, fontSize: theme.font.sizeMd }}>
        İskelet sayfa — zaman, aktör, aksiyon, varlık ve detay kolonlu liste ile filtreler gelecek.
      </p>
    </section>
  );
}
