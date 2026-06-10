import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

/** PANELS_SPEC.md §B.6 — Avantajlar Dünyası kampanyaları (tüm firmalarda görünür). */
export function CampaignsPage() {
  return (
    <section>
      <PageHeader
        title="Kampanyalar"
        description="Avantajlar Dünyası kampanya yönetimi. CRUD ve filtreler Faz 2'de eklenecek."
      />
      <p style={{ color: theme.colors.textSecondary, fontSize: theme.font.sizeMd }}>
        İskelet sayfa — marka logosu, başlık, kategori, detay linki ve yayım zamanı alanları gelecek.
      </p>
    </section>
  );
}
