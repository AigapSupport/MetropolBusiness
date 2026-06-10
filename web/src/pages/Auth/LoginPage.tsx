import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../store/auth';
import { colors, radii } from '../../theme/tokens';

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

/** PANELS_SPEC §0.4 — panel girişi e-posta + şifre iledir. */
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (email.trim() === '' || password === '') {
      setError('E-posta ve şifre zorunludur.');
      return;
    }

    // TODO(Faz 1): gerçek panel auth ucu bağlanacak; şimdilik sahte token ile giriş.
    login('dev-fake-access-token');
    navigate('/dashboard', { replace: true });
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

        {error !== null && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: colors.danger }}>{error}</p>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: radii.md,
            border: 'none',
            backgroundColor: colors.primary,
            color: colors.textOnPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Giriş Yap
        </button>
      </form>
    </div>
  );
}
