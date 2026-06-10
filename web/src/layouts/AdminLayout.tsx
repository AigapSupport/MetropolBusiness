import type { CSSProperties } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import AccessDenied from '../components/AccessDenied';
import { useLogout } from '../hooks/useLogout';
import { useMe } from '../hooks/useMe';
import { colors, layout, radii } from '../theme/tokens';
import { formatFullName } from '../utils/format';

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
  const logout = useLogout();
  const { data: me, isPending, isError } = useMe();

  if (isPending) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.contentBg,
          color: colors.textSecondary,
          fontSize: 14,
        }}
      >
        Oturum bilgisi yükleniyor…
      </div>
    );
  }

  // /me alınamadı (kalıcı hata) — oturumu kapatma seçeneği sun.
  if (isError || me === undefined) {
    return <AccessDenied onLogout={() => void logout()} />;
  }

  // PANELS_SPEC §0.4: yanlış rol ile girişte erişim reddi.
  if (me.role !== 'company_admin') {
    return <AccessDenied onLogout={() => void logout()} />;
  }

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

        {/* Altta kullanıcı kartı + çıkış (PANELS_SPEC §0.1). */}
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: radii.md,
            color: colors.sidebarText,
            fontSize: 13,
          }}
        >
          {formatFullName(me.firstName, me.lastName)}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          style={{
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
          {/* Tenant bağlamı: firma adı + oturum kullanıcısı (GET /me). */}
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            {me.tenant.name} · {formatFullName(me.firstName, me.lastName)}
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
