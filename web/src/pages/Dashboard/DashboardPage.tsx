/**
 * PANELS_SPEC §A.2 (sadeleştirilmiş) — KPI kartları mevcut uçlardan türetilir:
 * toplam kullanıcı (users total), yayındaki anket/duyuru, video sayısı.
 * Bekleyen talep metriği Faz 2.4 backend'i olmadığı için '—'.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import { colors, radii } from '../../theme/tokens';

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <div
      style={{
        flex: '1 1 200px',
        minWidth: 200,
        padding: 20,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
      }}
    >
      <div style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors.textPrimary }}>{value}</div>
      {hint !== undefined && (
        <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>{hint}</div>
      )}
    </div>
  );
}

const quickActionStyle = {
  display: 'inline-block',
  padding: '10px 16px',
  borderRadius: radii.md,
  backgroundColor: colors.primary,
  color: colors.textOnPrimary,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
} as const;

export default function DashboardPage() {
  // Toplam kullanıcı: liste ucundan yalnızca total okunur (pageSize=1).
  const usersQuery = useQuery({
    queryKey: ['company-users', { q: '', status: '', segmentId: '', page: 1, pageSize: 1 }],
    queryFn: () => adminApi.getUsers({ page: 1, pageSize: 1 }),
  });

  const surveysQuery = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => adminApi.getSurveys(),
  });

  const announcementsQuery = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => adminApi.getAnnouncements(),
  });

  const videosQuery = useQuery({
    queryKey: ['admin-videos'],
    queryFn: () => adminApi.getVideos(),
  });

  const totalUsers = usersQuery.data?.total;
  const publishedSurveys = surveysQuery.data?.items.filter(
    (survey) => survey.status === 'published',
  ).length;
  const publishedAnnouncements = announcementsQuery.data?.items.filter(
    (announcement) => announcement.status === 'published',
  ).length;
  const videoCount = videosQuery.data?.items.length;

  const asValue = (value: number | undefined, loading: boolean): string => {
    if (loading) {
      return '…';
    }
    return value === undefined ? '—' : String(value);
  };

  return (
    <section>
      <PageHeader title="Dashboard" description="Firma geneli özet." />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <KpiCard
          label="Toplam Kullanıcı"
          value={asValue(totalUsers, usersQuery.isPending)}
        />
        <KpiCard
          label="Yayındaki Anket"
          value={asValue(publishedSurveys, surveysQuery.isPending)}
        />
        <KpiCard
          label="Yayındaki Duyuru"
          value={asValue(publishedAnnouncements, announcementsQuery.isPending)}
        />
        <KpiCard label="Eğitim Videosu" value={asValue(videoCount, videosQuery.isPending)} />
        <KpiCard label="Bekleyen Talep" value="—" hint="İzin/masraf modülü Faz 2'de." />
      </div>

      {/* Hızlı aksiyonlar (A.2). */}
      <h2 style={{ margin: '28px 0 12px', fontSize: 16, color: colors.textPrimary }}>
        Hızlı aksiyonlar
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/users" style={quickActionStyle}>
          Kullanıcı Ekle
        </Link>
        <Link to="/content/announcements" style={quickActionStyle}>
          Duyuru Yayımla
        </Link>
        <Link to="/content/surveys/new" style={quickActionStyle}>
          Anket Oluştur
        </Link>
      </div>
    </section>
  );
}
