import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { ModuleDefinition, ModuleUpsertRequest } from '@shared/panels';
import { api, formatApiError } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  errorTextStyle,
  inputStyle,
  labelStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../../components/ui';
import { theme } from '../../theme/tokens';

interface ModuleFormModalProps {
  /** null → oluşturma; dolu → düzenleme. */
  module: ModuleDefinition | null;
  onClose: () => void;
}

/** Kod slug biçimi: küçük harf + rakam + alt çizgi, harfle başlar (örn. leave_request). */
const SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Modül oluştur/düzenle (PANELS_SPEC §B.4): kod (slug), ad, aktif toggle. */
export function ModuleFormModal({ module, onClose }: ModuleFormModalProps) {
  const isEdit = module !== null;
  const queryClient = useQueryClient();

  const [code, setCode] = useState(module?.code ?? '');
  const [name, setName] = useState(module?.name ?? '');
  const [isActive, setIsActive] = useState(module?.isActive ?? true);
  const [formError, setFormError] = useState<string | null>(null);

  const upsertMutation = useMutation({
    mutationFn: (request: ModuleUpsertRequest) =>
      isEdit
        ? api.put<ModuleDefinition>(`/platform/modules/${module.id}`, request)
        : api.post<ModuleDefinition>('/platform/modules', request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'modules'] });
      onClose();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!SLUG_PATTERN.test(trimmedCode)) {
      setFormError(
        'Kod slug biçiminde olmalıdır: küçük harfle başlar; küçük harf, rakam ve alt çizgi içerir (örn. leave_request).',
      );
      return;
    }
    if (trimmedName === '') {
      setFormError('Modül adı zorunludur.');
      return;
    }
    setFormError(null);
    upsertMutation.mutate({ code: trimmedCode, name: trimmedName, isActive });
  }

  const errorMessage =
    formError ?? (upsertMutation.isError ? formatApiError(upsertMutation.error) : null);

  return (
    <Modal title={isEdit ? 'Modül Düzenle' : 'Modül Tanımla'} onClose={onClose} width={440}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
      >
        <label style={labelStyle}>
          Kod (slug, benzersiz)
          <input
            style={inputStyle}
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="leave_request"
          />
        </label>
        <label style={labelStyle}>
          Görünen ad
          <input
            style={inputStyle}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="İzin Talebi"
          />
        </label>
        <label
          style={{
            ...labelStyle,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Aktif (pasif modül segmentlere atanamaz, /me/modules listesinde görünmez)
        </label>
        {errorMessage !== null && <p style={errorTextStyle}>{errorMessage}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={onClose}
            disabled={upsertMutation.isPending}
          >
            Vazgeç
          </button>
          <button type="submit" style={primaryButtonStyle} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? 'Kaydediliyor…' : isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
