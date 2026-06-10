import type { CSSProperties } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../store/auth';
import { colors, layout, radii } from '../theme/tokens';

interface MenuItem {
  to: string;
  label: string;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

/** PANELS_SPEC §A.1 — firma admin sidebar menüsü. */
const menuSections: MenuSection[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/users', label: 'Kullanıcılar' },
      { to: '/segments', label: 'Segmentler' },
      { to: '/module-permissions', label: 'Modül Yetkileri' },
    ],
  },
  {
    title: 'İçerik',
    items: [
      { to: '/content/surveys', label: 'Anketler' },
      { to: '/content/announcements', label: 'Duyurular' },
      { to: '/content/videos', label: 'Videolar' },
    ],
  },
  {
    items: [{ to: '/requests', label: 'Talepler' }],
  },
];

function navLinkStyle({ isActive }: { isActive: boolean }): CSSProperties {
  return {
    display: 'block',
    padding: '10px 14px',
    borderRadius: radii.md,
    textDecoration: 'none',
    fontSize: 14,
    color: isActive ? colors.sidebarActiveText : colors.sidebarText,
    backgroundColor: isActive ? colors.sidebarActiveBg : 'transparent',
  };
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.contentBg }}>
      {/* Sol sidebar */}
      <aside
        style={{
          width: layout.sidebarWidth,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.sidebarBg,
          padding: 16,
        }}
      >
        <div
          style={{
            color: colors.sidebarActiveText,
            fontSize: 18,
            fontWeight: 700,
            padding: '8px 14px 20px',
          }}
        >
          MetropolBusiness
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {section.title !== undefined && (
                <div
                  style={{
                    padding: '14px 14px 4px',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: colors.sidebarSectionTitle,
                  }}
                >
                  {section.title}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} style={navLinkStyle}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: radii.md,
            border: 'none',
            backgroundColor: 'transparent',
            color: colors.sidebarText,
            textAlign: 'left',
            fontSize: 14,
          }}
        >
          Çıkış Yap
        </button>
      </aside>

      {/* Sağ alan: üst bar + içerik */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            height: layout.topbarHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backgroundColor: colors.topbarBg,
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
            Firma Admin Paneli
          </span>
          {/* Tenant bağlamı: firma adı (Faz 1'de /me'den dolacak). */}
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            {user?.tenant.name ?? 'Firma'}
          </span>
        </header>

        <main style={{ flex: 1, padding: 24 }}>
          <div style={{ maxWidth: layout.contentMaxWidth, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
