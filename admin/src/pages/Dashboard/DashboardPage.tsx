import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

/** PANELS_SPEC.md §B.2 — KPI kartları ve son hareketler Faz 1'de doldurulacak. */
export function DashboardPage() {
  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="Toplam firma, kullanıcı, yayındaki içerik ve kampanya KPI'ları burada görünecek."
      />
      <p style={{ color: theme.colors.textSecondary, fontSize: theme.font.sizeMd }}>
        İskelet sayfa — KPI kartları, son hareketler ve hızlı aksiyonlar Faz 1'de eklenecek.
      </p>
    </section>
  );
}
