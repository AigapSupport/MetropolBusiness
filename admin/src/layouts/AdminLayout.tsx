import { useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { currentUser, logout } from '../store/auth';
import { theme } from '../theme/tokens';

/** Sidebar menüsü — PANELS_SPEC.md §B.1. */
const MENU_ITEMS: Array<{ to: string; label: string }> = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tenants', label: 'Firmalar' },
  { to: '/module-definitions', label: 'Modül Tanımları' },
  { to: '/global-content', label: 'Global İçerik' },
  { to: '/campaigns', label: 'Kampanyalar' },
  { to: '/campaign-categories', label: 'Kategoriler' },
  { to: '/audit-logs', label: 'Denetim Kaydı' },
];

const styles: Record<string, CSSProperties> = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: theme.colors.background,
    fontFamily: theme.font.family,
    color: theme.colors.textPrimary,
  },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: theme.colors.sidebarBg,
    color: theme.colors.sidebarText,
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  brand: {
    color: theme.colors.sidebarActiveText,
    fontSize: theme.font.sizeLg,
    fontWeight: 700,
    padding: `${theme.spacing.sm}px ${theme.spacing.sm}px ${theme.spacing.lg}px`,
  },
  link: {
    display: 'block',
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.radius.sm,
    color: theme.colors.sidebarText,
    textDecoration: 'none',
    fontSize: theme.font.sizeMd,
  },
  linkActive: {
    background: theme.colors.sidebarActiveBg,
    color: theme.colors.sidebarActiveText,
    fontWeight: 600,
  },
  userInfo: {
    marginTop: 'auto',
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px 0`,
    fontSize: theme.font.sizeSm,
    color: theme.colors.sidebarText,
  },
  logoutButton: {
    padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
    borderRadius: theme.radius.sm,
    border: `1px solid ${theme.colors.sidebarActiveBg}`,
    background: 'transparent',
    color: theme.colors.sidebarText,
    fontSize: theme.font.sizeMd,
    cursor: 'pointer',
    textAlign: 'left',
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing.xl,
  },
};

/** Korumalı sayfaların ortak çatısı: sol menü + içerik alanı. */
export function AdminLayout() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const user = currentUser();

  function handleLogout(): void {
    setLoggingOut(true);
    // logout() refresh token'ı sunucuda iptal eder; hata olsa da yerel oturum kapanır.
    void logout().finally(() => {
      navigate('/login', { replace: true });
    });
  }

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Metropol Platform</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.xs }}>
          {MENU_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) =>
                isActive ? { ...styles.link, ...styles.linkActive } : styles.link
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.userInfo}>
          {user !== null
            ? [user.firstName, user.lastName].filter((part) => part !== null).join(' ') ||
              'Platform Yöneticisi'
            : ''}
        </div>
        <button
          type="button"
          style={styles.logoutButton}
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Çıkış yapılıyor…' : 'Çıkış Yap'}
        </button>
      </aside>
      <main style={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
