import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { CreateTenantRequest, Tenant, UpdateTenantRequest } from '@shared/panels';
import { api, formatApiError } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  errorTextStyle,
  inputStyle,
  labelStyle,
  mutedTextStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
} from '../../components/ui';
import { theme } from '../../theme/tokens';
import { BrandPreview } from './BrandPreview';

interface TenantFormModalProps {
  /** null → oluşturma; dolu → düzenleme. */
  tenant: Tenant | null;
  onClose: () => void;
}

// Renk seçici boş başlayamaz; öneri olarak platform token'ları kullanılır
// (hardcode hex değil — kullanıcı formda değiştirir, değer tenant verisi olur).
const DEFAULT_PRIMARY = theme.colors.primary;
const DEFAULT_SECONDARY = theme.colors.accent;

/**
 * Firma oluştur/düzenle formu (PANELS_SPEC §B.3): temel bilgiler + Metropol eşleme +
 * marka (logo URL, birincil/ikincil renk) ve canlı önizleme. Kod düzenlemede
 * DEĞİŞTİRİLEMEZ (backend TenantUpdateRequest'te bilinçli yok — login fallback anahtarı).
 */
export function TenantFormModal({ tenant, onClose }: TenantFormModalProps) {
  const isEdit = tenant !== null;
  const queryClient = useQueryClient();

  const [name, setName] = useState(tenant?.name ?? '');
  const [code, setCode] = useState(tenant?.code ?? '');
  // Secret REFERANSI: mevcut değer backend'den asla geri dönmez; boş = değiştirme.
  const [metropolConsumerId, setMetropolConsumerId] = useState('');
  const [logoUrl, setLogoUrl] = useState(tenant?.branding.logoUrl ?? '');
  const [primaryColor, setPrimaryColor] = useState(
    tenant?.branding.primaryColor ?? DEFAULT_PRIMARY,
  );
  const [secondaryColor, setSecondaryColor] = useState(
    tenant?.branding.secondaryColor ?? DEFAULT_SECONDARY,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const invalidateAndClose = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: (request: CreateTenantRequest) => api.post<Tenant>('/platform/tenants', request),
    onSuccess: invalidateAndClose,
  });

  const updateMutation = useMutation({
    mutationFn: (request: UpdateTenantRequest) =>
      api.put<Tenant>(`/platform/tenants/${tenant?.id ?? ''}`, request),
    onSuccess: invalidateAndClose,
  });

  const isBusy = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    if (trimmedName === '') {
      setFormError('Firma adı zorunludur.');
      return;
    }
    if (!isEdit && trimmedCode === '') {
      setFormError('Firma kodu zorunludur.');
      return;
    }
    setFormError(null);

    const branding = {
      logoUrl: logoUrl.trim(),
      primaryColor,
      secondaryColor,
    };
    const consumerRef = metropolConsumerId.trim();

    if (isEdit) {
      const request: UpdateTenantRequest = { name: trimmedName, branding };
      // Boş bırakılırsa gönderilmez → backend mevcut referansı korur (null alan = değiştirme).
      if (consumerRef !== '') {
        request.metropolConsumerId = consumerRef;
      }
      updateMutation.mutate(request);
      return;
    }

    const request: CreateTenantRequest = {
      name: trimmedName,
      code: trimmedCode,
      branding,
    };
    if (consumerRef !== '') {
      request.metropolConsumerId = consumerRef;
    }
    createMutation.mutate(request);
  }

  const errorMessage =
    formError ?? (mutationError !== null ? formatApiError(mutationError) : null);

  return (
    <Modal title={isEdit ? 'Firma Düzenle' : 'Firma Oluştur'} onClose={onClose} width={720}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
      >
        <div style={{ display: 'flex', gap: theme.spacing.lg }}>
          {/* Sol sütun: form alanları */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.md,
            }}
          >
            <label style={labelStyle}>
              Firma adı
              <input
                style={inputStyle}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label style={labelStyle}>
              Firma kodu {isEdit && '(değiştirilemez — login fallback anahtarı)'}
              <input
                style={inputStyle}
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={isEdit}
              />
            </label>
            <label style={labelStyle}>
              Metropol ConsumerId (secret referansı)
              <input
                style={inputStyle}
                type="text"
                value={metropolConsumerId}
                onChange={(event) => setMetropolConsumerId(event.target.value)}
                placeholder={isEdit ? 'Boş bırakılırsa mevcut değer korunur' : 'Opsiyonel'}
              />
            </label>
            <label style={labelStyle}>
              Logo URL
              <input
                style={inputStyle}
                type="url"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <div style={{ display: 'flex', gap: theme.spacing.md }}>
              <label style={{ ...labelStyle, flex: 1 }}>
                Birincil renk
                <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                    aria-label="Birincil renk seçici"
                  />
                  <input
                    style={{ ...inputStyle, width: 90 }}
                    type="text"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                  />
                </div>
              </label>
              <label style={{ ...labelStyle, flex: 1 }}>
                İkincil renk
                <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(event) => setSecondaryColor(event.target.value)}
                    aria-label="İkincil renk seçici"
                  />
                  <input
                    style={{ ...inputStyle, width: 90 }}
                    type="text"
                    value={secondaryColor}
                    onChange={(event) => setSecondaryColor(event.target.value)}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Sağ sütun: canlı marka önizlemesi */}
          <div
            style={{
              width: 260,
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing.sm,
            }}
          >
            <span style={mutedTextStyle}>Canlı önizleme (mobil tema)</span>
            <BrandPreview
              name={name}
              logoUrl={logoUrl.trim()}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          </div>
        </div>

        {errorMessage !== null && <p style={errorTextStyle}>{errorMessage}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <button type="button" style={secondaryButtonStyle} onClick={onClose} disabled={isBusy}>
            Vazgeç
          </button>
          <button type="submit" style={primaryButtonStyle} disabled={isBusy}>
            {isBusy ? 'Kaydediliyor…' : isEdit ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
