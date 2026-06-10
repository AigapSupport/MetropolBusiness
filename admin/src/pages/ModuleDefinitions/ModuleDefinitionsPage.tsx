import { useQuery } from '@tanstack/react-query';
import type { ItemList } from '@shared/common';
import type { ModuleDefinition } from '@shared/panels';
import { api } from '../../api/client';
import { PageHeader } from '../../components/PageHeader';
import { theme } from '../../theme/tokens';

/** PANELS_SPEC.md §B.4 — Modül tanımları (üç seviyeli kontrolün ilk halkası). */
export function ModuleDefinitionsPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'modules'],
    queryFn: () => api.get<ItemList<ModuleDefinition>>('/platform/modules'),
  });

  return (
    <section>
      <PageHeader
        title="Modül Tanımları"
        description="Modüller burada tanımlanır, firmalara açılır, firma admin segmentlere atar."
      />
      {isPending && (
        <p style={{ color: theme.colors.textSecondary }}>Modüller yükleniyor…</p>
      )}
      {isError && (
        <p style={{ color: theme.colors.danger }}>
          Modül listesi alınamadı. Backend hazır olduğunda bu liste dolacak.
        </p>
      )}
      {data !== undefined && (
        <ul style={{ paddingLeft: theme.spacing.lg, color: theme.colors.textPrimary }}>
          {data.items.map((module) => (
            <li key={module.id}>
              {module.name} ({module.code}) — {module.isActive ? 'aktif' : 'pasif'}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
