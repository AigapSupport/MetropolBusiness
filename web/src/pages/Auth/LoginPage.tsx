import { useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import type { PanelLoginRequest, PanelLoginResponse } from '@shared/auth';
import { authApi } from '../../api/authApi';
import { setSessionTokens } from '../../store/auth';
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

/**
 * Hata kodu → giriş ekranı mesajı (API_CONTRACT §1 /auth/login).
 * Backend zaten TR mesaj döner; kritik kodlar için sabit metin garanti edilir.
 */
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  LOGIN_LOCKED:
    'Çok fazla hatalı deneme yapıldı; hesap 15 dakika kilitlendi. Lütfen daha sonra tekrar deneyin.',
  RATE_LIMITED: 'Çok sık deneme yapıldı. Lütfen bir dakika bekleyip tekrar deneyin.',
  UNAUTHENTICATED: 'E-posta veya şifre hatalı.',
  NOT_AUTHORIZED: 'Bu hesap panel girişine yetkili değil.',
};

/** PANELS_SPEC §0.4 — panel girişi e-posta + şifre (+ ops. firma kodu) iledir. */
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation<PanelLoginResponse, unknown, PanelLoginRequest>({
    mutationFn: (request) => authApi.login(request),
    onSuccess: (response) => {
      setSessionTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      navigate('/dashboard', { replace: true });
    },
    onError: (error) => {
      const code = apiErrorCode(error);
      const known = code !== null ? LOGIN_ERROR_MESSAGES[code] : undefined;
      // VALIDATION_ERROR dahil diğer kodlarda backend'in TR mesajı gösterilir.
      setFormError(known ?? apiErrorMessage(error));
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (email.trim() === '' || password === '') {
      setFormError('E-posta ve şifre zorunludur.');
      return;
    }

    const trimmedCompanyCode = companyCode.trim();
    loginMutation.mutate({
      email: email.trim(),
      password,
      ...(trimmedCompanyCode !== '' ? { companyCode: trimmedCompanyCode } : {}),
    });
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
          MetropolBusiness
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: colors.textSecondary }}>
          Firma admin paneline giriş yapın.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={labelStyle}>
            E-posta
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@firma.com"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password" style={labelStyle}>
            Şifre
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="companyCode" style={labelStyle}>
            Firma kodu (opsiyonel)
          </label>
          <input
            id="companyCode"
            type="text"
            autoComplete="organization"
            value={companyCode}
            onChange={(event) => setCompanyCode(event.target.value)}
            placeholder="Aynı e-posta birden çok firmadaysa zorunlu"
            style={inputStyle}
          />
        </div>

        {formError !== null && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.danger }}>{formError}</p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: radii.md,
            border: 'none',
            backgroundColor: loginMutation.isPending ? colors.disabledBg : colors.primary,
            color: loginMutation.isPending ? colors.textSecondary : colors.textOnPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {loginMutation.isPending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>

        <p style={{ margin: '16px 0 0', fontSize: 13, color: colors.textSecondary }}>
          Davet linkiniz mi var?{' '}
          <Link to="/auth/set-password" style={{ color: colors.primary }}>
            Şifre belirleyin
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
