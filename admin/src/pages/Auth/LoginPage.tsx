import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
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
  label: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.textSecondary,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  input: {
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.colors.border}`,
    fontSize: theme.font.sizeMd,
  },
  button: {
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.radius.sm,
    border: 'none',
    background: theme.colors.primary,
    color: theme.colors.surface,
    fontSize: theme.font.sizeMd,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    fontSize: theme.font.sizeSm,
    color: theme.colors.danger,
  },
};

/** Platform admin girişi — iskelet: sahte token yazar, Faz 1'de gerçek auth gelecek. */
export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (email.trim() === '' || password.trim() === '') {
      setError('E-posta ve şifre zorunludur.');
      return;
    }
    login();
    navigate('/dashboard', { replace: true });
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Metropol Platform</h1>
        <p style={styles.subtitle}>Platform yönetici girişi</p>
        <label style={styles.label}>
          E-posta
          <input
            style={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label style={styles.label}>
          Şifre
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error !== null && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button}>
          Giriş Yap
        </button>
      </form>
    </div>
  );
}
