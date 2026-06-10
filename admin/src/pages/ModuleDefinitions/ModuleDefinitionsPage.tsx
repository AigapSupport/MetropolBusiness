import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ItemList } from '@shared/common';
import type { ModuleDefinition } from '@shared/panels';
import { api } from '../../api/client';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import {
  errorTextStyle,
  linkButtonStyle,
  mutedTextStyle,
  primaryButtonStyle,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../components/ui';
import { ModuleFormModal } from './ModuleFormModal';

/**
 * Modül Tanımları (PANELS_SPEC §B.4) — üç seviyeli kontrolün ilk halkası:
 * burada tanımlanır → firmaya açılır (B.3) → firma admin segmente atar (A.5).
 */
export function ModuleDefinitionsPage() {
  const [formState, setFormState] = useState<{ open: boolean; module: ModuleDefinition | null }>(
    { open: false, module: null },
  );

  const { data, isPending, isError } = useQuery({
    queryKey: ['platform', 'modules'],
    queryFn: () => api.get<ItemList<ModuleDefinition>>('/platform/modules'),
  });

  return (
    <section>
      <PageHeader
        title="Modül Tanımları"
        description="Modüller burada tanımlanır, firmalara açılır, firma admin segmentlere atar."
      >
        <button
          type="button"
          style={primaryButtonStyle}
          onClick={() => setFormState({ open: true, module: null })}
        >
          Modül Tanımla
        </button>
      </PageHeader>

      {isPending && <p style={mutedTextStyle}>Modüller yükleniyor…</p>}
      {isError && <p style={errorTextStyle}>Modül listesi alınamadı; lütfen tekrar deneyin.</p>}

      {data !== undefined && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Kod</th>
              <th style={thStyle}>Ad</th>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={4}>
                  <span style={mutedTextStyle}>Tanımlı modül yok. İlk modülü oluşturun.</span>
                </td>
              </tr>
            )}
            {data.items.map((module) => (
              <tr key={module.id}>
                <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{module.code}</td>
                <td style={tdStyle}>{module.name}</td>
                <td style={tdStyle}>
                  <Badge tone={module.isActive ? 'success' : 'neutral'}>
                    {module.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    style={linkButtonStyle}
                    onClick={() => setFormState({ open: true, module })}
                  >
                    Düzenle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formState.open && (
        <ModuleFormModal
          key={formState.module?.id ?? 'new'}
          module={formState.module}
          onClose={() => setFormState({ open: false, module: null })}
        />
      )}
    </section>
  );
}
