/**
 * Erişim reddi ekranı (PANELS_SPEC §0.4): panel rolü `company_admin` olmayan
 * kullanıcı giriş yapabilse bile bu panele erişemez.
 */

import { colors, radii } from '../theme/tokens';

interface AccessDeniedProps {
  onLogout: () => void;
}

export default function AccessDenied({ onLogout }: AccessDeniedProps) {
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
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: 32,
          textAlign: 'center',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 20, color: colors.textPrimary }}>
          Erişim reddedildi
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: colors.textSecondary }}>
          Bu panel yalnızca firma yöneticileri (company_admin) içindir. Hesabınızın
          rolü bu panele erişime izin vermiyor.
        </p>
        <button
          type="button"
          onClick={onLogout}
          style={{
            padding: '10px 16px',
            borderRadius: radii.md,
            border: 'none',
            backgroundColor: colors.primary,
            color: colors.textOnPrimary,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
