import { useMutation } from '@tanstack/react-query';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PanelLoginRequest } from '@shared/auth';
import { formatApiError } from '../../api/client';
import { inputStyle, labelStyle, primaryButtonStyle } from '../../components/ui';
import { login } from '../../store/auth';
import { theme } from '../../theme/tokens';

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.colors.sidebarBg,
    fontFamily: theme.font.family,
  },
  card: {
    width: 360,
    background: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  title: {
    margin: 0,
    fontSize: theme.font.sizeXl,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    margin: 0,
    fontSize: theme.font.sizeSm,
    color: theme.colors.textSecondary,
  },
  error: {
    margin: 0,
    fontSize: theme.font.sizeSm,
    color: theme.colors.danger,
  },
};

/**
 * Platform admin girişi (TODO 1.9) — POST /auth/login (e-posta+şifre).
 * Yalnızca platform_admin kabul edilir; diğer roller store'da reddedilir (token saklanmaz).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: (request: PanelLoginRequest) => login(request),
    onSuccess: () => {
      navigate('/dashboard', { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (email.trim() === '' || password === '') {
      setFormError('E-posta ve şifre zorunludur.');
      return;
    }
    setFormError(null);
    loginMutation.mutate({ email: email.trim(), password });
  }

  const errorMessage =
    formError ?? (loginMutation.isError ? formatApiError(loginMutation.error) : null);

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Metropol Platform</h1>
        <p style={styles.subtitle}>Platform yönetici girişi</p>
        <label style={labelStyle}>
          E-posta
          <input
            style={inputStyle}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label style={labelStyle}>
          Şifre
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {errorMessage !== null && <p style={styles.error}>{errorMessage}</p>}
        <button type="submit" style={primaryButtonStyle} disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
