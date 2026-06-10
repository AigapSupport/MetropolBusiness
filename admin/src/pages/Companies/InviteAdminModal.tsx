import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import type { InviteTenantAdminRequest, InviteTenantAdminResponse, Tenant } from '@shared/panels';
import { api, formatApiError } from '../../api/client';
import { CopyField } from '../../components/CopyField';
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

interface InviteAdminModalProps {
  tenant: Tenant;
  onClose: () => void;
}

/** Backend kuralıyla aynı (PlatformTenantsService): 10-11 hane, yalnız rakam. */
const PHONE_PATTERN = /^\d{10,11}$/;

/**
 * Firma admin daveti (PANELS_SPEC §B.3): ad+telefon(+e-posta) → backend company_admin
 * oluşturur ve YALNIZCA BU YANITTA dönen inviteToken'ı verir (tekrar sorgulanamaz).
 * E-posta entegrasyonu gelene dek token/link buradan kopyalanıp admin'e elden iletilir.
 */
export function InviteAdminModal({ tenant, onClose }: InviteAdminModalProps) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: (request: InviteTenantAdminRequest) =>
      api.post<InviteTenantAdminResponse>(`/platform/tenants/${tenant.id}/admins`, request),
    onSuccess: async () => {
      // userCount değişti; liste önbelleği tazelenir (modal sonuç görünümünde kalır).
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedFirstName = firstName.trim();
    const trimmedPhone = phone.trim();
    if (trimmedFirstName === '') {
      setFormError('Ad zorunludur.');
      return;
    }
    if (!PHONE_PATTERN.test(trimmedPhone)) {
      setFormError('Telefon 10-11 haneli ve yalnızca rakamlardan oluşmalıdır.');
      return;
    }
    setFormError(null);

    const request: InviteTenantAdminRequest = {
      firstName: trimmedFirstName,
      phone: trimmedPhone,
    };
    const trimmedLastName = lastName.trim();
    if (trimmedLastName !== '') {
      request.lastName = trimmedLastName;
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail !== '') {
      request.email = trimmedEmail;
    }
    inviteMutation.mutate(request);
  }

  // Başarı görünümü: inviteToken + set-password URL örneği (kopyalanabilir).
  if (inviteMutation.isSuccess) {
    const inviteToken = inviteMutation.data.inviteToken;
    const setPasswordUrl = `${window.location.origin}/set-password?token=${encodeURIComponent(inviteToken)}`;
    return (
      <Modal title="Davet oluşturuldu" onClose={onClose} width={560}>
        <p style={{ margin: 0, fontSize: theme.font.sizeMd, color: theme.colors.textPrimary }}>
          Firma admin hesabı oluşturuldu. E-posta entegrasyonu gelene dek bu linki admin&apos;e
          iletin.
        </p>
        <CopyField label="Davet token'ı" value={inviteToken} />
        <CopyField label="Şifre belirleme bağlantısı (örnek)" value={setPasswordUrl} />
        <p style={{ ...mutedTextStyle, color: theme.colors.warning }}>
          Bu token yalnızca bu ekranda görüntülenir, tekrar sorgulanamaz. 72 saat geçerlidir ve
          tek kullanımlıktır; pencereyi kapatmadan kopyalayın.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" style={primaryButtonStyle} onClick={onClose}>
            Kapat
          </button>
        </div>
      </Modal>
    );
  }

  const errorMessage =
    formError ?? (inviteMutation.isError ? formatApiError(inviteMutation.error) : null);

  return (
    <Modal title={`Firma Admin Davet Et — ${tenant.name}`} onClose={onClose} width={480}>
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}
      >
        <label style={labelStyle}>
          Ad
          <input
            style={inputStyle}
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </label>
        <label style={labelStyle}>
          Soyad (opsiyonel)
          <input
            style={inputStyle}
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </label>
        <label style={labelStyle}>
          Telefon (panel/mobil girişi için zorunlu)
          <input
            style={inputStyle}
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="5XXXXXXXXX"
          />
        </label>
        <label style={labelStyle}>
          E-posta (opsiyonel)
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {errorMessage !== null && <p style={errorTextStyle}>{errorMessage}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={onClose}
            disabled={inviteMutation.isPending}
          >
            Vazgeç
          </button>
          <button type="submit" style={primaryButtonStyle} disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? 'Gönderiliyor…' : 'Davet Oluştur'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
