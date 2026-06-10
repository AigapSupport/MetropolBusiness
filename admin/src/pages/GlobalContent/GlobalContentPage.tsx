import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

/** PANELS_SPEC.md §B.5 — Global duyurular (tenant_id = null, tüm firmalarda görünür). */
export function GlobalContentPage() {
  return (
    <section>
      <PageHeader
        title="Global İçerik"
        description="Tüm firmalarda görünen duyurular. CRUD ekranları Faz 1'de eklenecek."
      />
      <p style={{ color: theme.colors.textSecondary, fontSize: theme.font.sizeMd }}>
        İskelet sayfa — kapak, başlık, gövde ve yayım zamanı alanlarıyla duyuru yönetimi gelecek.
      </p>
    </section>
  );
}
