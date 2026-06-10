import { useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import type { SetPasswordRequest } from '@shared/auth';
import { authApi } from '../../api/authApi';
import { colors, radii } from '../../theme/tokens';
import { apiErrorCode, apiErrorMessage } from '../../utils/apiErrorMessage';

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: radii.md,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  color: colors.textPrimary,
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: colors.textPrimary,
};

/** Şifre politikası (API_CONTRACT §1 /auth/set-password): min 8, en az bir harf + bir rakam. */
function passwordPolicyError(password: string): string | null {
  if (password.length < 8) {
    return 'Şifre en az 8 karakter olmalıdır.';
  }
  if (!/[A-Za-zğüşöçıİĞÜŞÖÇ]/.test(password)) {
    return 'Şifre en az bir harf içermelidir.';
  }
  if (!/\d/.test(password)) {
    return 'Şifre en az bir rakam içermelidir.';
  }
  return null;
}

/**
 * Davet linkiyle ilk şifre belirleme: /auth/set-password?token=...
 * Token 72 saat geçerli ve tek kullanımlıktır (platform admin davet yanıtından).
 */
export default function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setPasswordMutation = useMutation<void, unknown, SetPasswordRequest>({
    mutationFn: (request) => authApi.setPassword(request),
    onSuccess: () => {
      setDone(true);
    },
    onError: (error) => {
      const code = apiErrorCode(error);
      if (code === 'NOT_FOUND') {
        setFormError('Davet linki geçersiz, süresi dolmuş veya daha önce kullanılmış.');
        return;
      }
      setFormError(apiErrorMessage(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (inviteToken === '') {
      setFormError('Davet linki eksik veya hatalı; lütfen e-postanızdaki bağlantıyı kullanın.');
      return;
    }
    const policyError = passwordPolicyError(password);
    if (policyError !== null) {
      setFormError(policyError);
      return;
    }
    if (password !== passwordRepeat) {
      setFormError('Şifreler aynı değil.');
      return;
    }

    setPasswordMutation.mutate({ inviteToken, newPassword: password });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.contentBg,
        padding: 16,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 380,
          padding: 32,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
        }}
      >
        <h1 style={{ margin: '0 0 4px', fontSize: 20, color: colors.textPrimary }}>
          Şifre belirle
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: colors.textSecondary }}>
          Davet linkinizle panel hesabınız için şifre oluşturun. Şifre en az 8 karakter
          olmalı, bir harf ve bir rakam içermelidir.
        </p>

        {done ? (
          <div>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.success }}>
              Şifreniz belirlendi. Artık e-posta ve şifrenizle giriş yapabilirsiniz.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-block',
                padding: '10px 16px',
                borderRadius: radii.md,
                backgroundColor: colors.primary,
                color: colors.textOnPrimary,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Girişe git
            </Link>
          </div>
        ) : (
          <>
            {inviteToken === '' && (
              <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.warning }}>
                Bu sayfa davet e-postasındaki bağlantı (?token=...) ile açılmalıdır.
              </p>
            )}

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="newPassword" style={labelStyle}>
                Yeni şifre
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="newPasswordRepeat" style={labelStyle}>
                Yeni şifre (tekrar)
              </label>
              <input
                id="newPasswordRepeat"
                type="password"
                autoComplete="new-password"
                value={passwordRepeat}
                onChange={(event) => setPasswordRepeat(event.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            {formError !== null && (
              <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.danger }}>{formError}</p>
            )}

            <button
              type="submit"
              disabled={setPasswordMutation.isPending}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: radii.md,
                border: 'none',
                backgroundColor: setPasswordMutation.isPending
                  ? colors.disabledBg
                  : colors.primary,
                color: setPasswordMutation.isPending ? colors.textSecondary : colors.textOnPrimary,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {setPasswordMutation.isPending ? 'Kaydediliyor…' : 'Şifreyi Belirle'}
            </button>

            <p style={{ margin: '16px 0 0', fontSize: 13, color: colors.textSecondary }}>
              <Link to="/login" style={{ color: colors.primary }}>
                Girişe dön
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}
