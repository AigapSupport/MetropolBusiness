import { useMutation } from '@tanstack/react-query';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SetPasswordRequest } from '@shared/auth';
import { api, formatApiError } from '../../api/client';
import { inputStyle, labelStyle, primaryButtonStyle } from '../../components/ui';
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
    width: 400,
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
  text: {
    margin: 0,
    fontSize: theme.font.sizeMd,
    color: theme.colors.textSecondary,
  },
  error: {
    margin: 0,
    fontSize: theme.font.sizeSm,
    color: theme.colors.danger,
  },
  success: {
    margin: 0,
    fontSize: theme.font.sizeMd,
    color: theme.colors.success,
  },
  link: {
    color: theme.colors.accent,
    fontSize: theme.font.sizeMd,
    fontWeight: 600,
  },
};

/** Şifre politikası (API_CONTRACT §1 /auth/set-password): min 8, en az bir harf + bir rakam. */
function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Şifre en az 8 karakter olmalıdır.';
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Şifre en az bir harf ve bir rakam içermelidir.';
  }
  return null;
}

/**
 * Davet token'ı ile ilk şifre belirleme (?token=...) — POST /auth/set-password.
 * Token 72 saat geçerli ve tek kullanımlıktır; geçersizse backend 404 döner.
 */
export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const setPasswordMutation = useMutation({
    mutationFn: (request: SetPasswordRequest) =>
      api.post<undefined>('/auth/set-password', request),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const policyError = validatePassword(password);
    if (policyError !== null) {
      setFormError(policyError);
      return;
    }
    if (password !== confirm) {
      setFormError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setFormError(null);
    setPasswordMutation.mutate({ inviteToken, newPassword: password });
  }

  if (inviteToken === '') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Geçersiz bağlantı</h1>
          <p style={styles.text}>
            Davet bağlantısında token bulunamadı. Lütfen size iletilen bağlantıyı eksiksiz
            kullanın veya yeni bir davet isteyin.
          </p>
          <Link to="/login" style={styles.link}>
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    );
  }

  if (setPasswordMutation.isSuccess) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.title}>Şifre belirlendi</h1>
          <p style={styles.success}>Şifreniz başarıyla kaydedildi. Artık giriş yapabilirsiniz.</p>
          <Link to="/login" style={styles.link}>
            Giriş sayfasına git
          </Link>
        </div>
      </div>
    );
  }

  const errorMessage =
    formError ??
    (setPasswordMutation.isError ? formatApiError(setPasswordMutation.error) : null);

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Şifre Belirle</h1>
        <p style={styles.text}>
          Davetiniz için bir şifre belirleyin. Şifre en az 8 karakter olmalı, en az bir harf ve
          bir rakam içermelidir.
        </p>
        <label style={labelStyle}>
          Yeni şifre
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label style={labelStyle}>
          Yeni şifre (tekrar)
          <input
            style={inputStyle}
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        {errorMessage !== null && <p style={styles.error}>{errorMessage}</p>}
        <button
          type="submit"
          style={primaryButtonStyle}
          disabled={setPasswordMutation.isPending}
        >
          {setPasswordMutation.isPending ? 'Kaydediliyor…' : 'Şifreyi Kaydet'}
        </button>
      </form>
    </div>
  );
}
