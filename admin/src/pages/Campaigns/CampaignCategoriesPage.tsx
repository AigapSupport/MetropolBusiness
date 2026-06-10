import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

/** PANELS_SPEC.md §B.7 — Kampanya kategorileri (Kuponlar, Sosyal Sorumluluk, Taraftar Kart...). */
export function CampaignCategoriesPage() {
  return (
    <section>
      <PageHeader
        title="Kategoriler"
        description="Kampanya kategorileri ve sıralama yönetimi. CRUD Faz 2'de eklenecek."
      />
      <p style={{ color: theme.colors.textSecondary, fontSize: theme.font.sizeMd }}>
        İskelet sayfa — kod, ad, ikon/kapak ve sıra alanlarıyla kategori yönetimi gelecek.
      </p>
    </section>
  );
}
