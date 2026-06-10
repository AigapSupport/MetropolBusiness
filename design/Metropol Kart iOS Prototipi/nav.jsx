// nav.jsx — navigation context, global store, tab bar.
(function () {
  const { T, hexA } = window;
  const Icon = window.Icon;
  const NavCtx = React.createContext(null);
  window.useApp = () => React.useContext(NavCtx);

  const TABS = [
    { id: 'home', label: 'Ana Sayfa', icon: 'home', root: 'home' },
    { id: 'benefits', label: 'Yan Haklar', icon: 'gift', root: 'benefits' },
    { id: 'metropol', label: 'Metropol', icon: 'card', root: 'metropol', fab: true },
    { id: 'chat', label: 'Sohbet', icon: 'chat', root: 'chatList' },
    { id: 'other', label: 'Diğer', icon: 'grid', root: 'other' },
  ];
  window.TABS = TABS;

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function NavProvider({ children }) {
    const [authed, setAuthed] = React.useState(false);
    const [tab, setTab] = React.useState('metropol');
    const [stacks, setStacks] = React.useState({ home: [], benefits: [], metropol: [], chat: [], other: [] });
    const [dir, setDir] = React.useState('fwd'); // fwd | back | tab
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [toast, setToast] = React.useState(null);
    const [activeCard, setActiveCard] = React.useState('c1');
    const [homeVariant, setHomeVariant] = React.useState(1);

    // mutable app data
    const [store, setStore] = React.useState(() => Object.assign(clone(window.SEED), { brandKey: 'coral' }));
    const update = (fn) => setStore(s => { const n = clone(s); fn(n); return n; });
    const setBrandKey = (k) => update(s => { s.brandKey = k; });

    const go = (name, props = {}) => { setDir('fwd'); setStacks(s => ({ ...s, [tab]: [...s[tab], { name, props }] })); };
    const back = () => {
      setDir('back');
      setStacks(s => {
        if (s[tab].length === 0) return s;
        return { ...s, [tab]: s[tab].slice(0, -1) };
      });
    };
    const popTo = (n) => { setDir('back'); setStacks(s => ({ ...s, [tab]: s[tab].slice(0, n) })); };
    const reset = () => { setDir('back'); setStacks(s => ({ ...s, [tab]: [] })); };
    const switchTab = (t) => {
      setDir('tab');
      if (t === tab) { setStacks(s => ({ ...s, [t]: [] })); }
      else setTab(t);
    };
    const showToast = (msg, kind = 'ok') => { setToast({ msg, kind, id: Date.now() }); setTimeout(() => setToast(null), 2200); };

    const stack = stacks[tab];
    const depth = stack.length;

    const value = {
      authed, setAuthed, tab, switchTab, stack, depth, dir, go, back, popTo, reset,
      menuOpen, setMenuOpen, toast, showToast, store, update, setBrandKey,
      activeCard, setActiveCard, homeVariant, setHomeVariant,
      cardById: (id) => store.cards.find(c => c.id === id),
    };
    return <NavCtx.Provider value={value}>{children}</NavCtx.Provider>;
  }

  // ── Tab bar with raised center FAB ──────────────────────────
  function TabBar() {
    const app = window.useApp();
    return (
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40 }}>
        <div style={{
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(18px) saturate(180%)',
          WebkitBackdropFilter: 'blur(18px) saturate(180%)', boxShadow: T.shadowUp,
          borderTop: `1px solid ${T.line2}`, paddingBottom: 22, paddingTop: 8, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 6px' }}>
            {TABS.map(t => {
              const active = app.tab === t.id;
              if (t.fab) {
                return (
                  <button key={t.id} onClick={() => app.switchTab(t.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    transform: 'translateY(-18px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 22, background: `linear-gradient(160deg, ${T.brand}, ${T.brandDark})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 10px 24px ${hexA(T.brand, 0.5)}, 0 0 0 5px rgba(255,255,255,0.95)`,
                      transition: 'transform .15s', transform: active ? 'scale(1.04)' : 'scale(1)',
                    }}>
                      <Icon name="card" size={28} color="#fff" strokeWidth={2} />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? T.brandDark : T.ink2, transform: 'translateY(2px)' }}>{t.label}</span>
                  </button>
                );
              }
              return (
                <button key={t.id} onClick={() => app.switchTab(t.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', flex: 1, maxWidth: 70,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0',
                }}>
                  <Icon name={t.icon} size={25} color={active ? T.brandDark : T.ink3} strokeWidth={active ? 2.2 : 1.8} />
                  <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 600, color: active ? T.brandDark : T.ink3, letterSpacing: -0.2 }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Toast ───────────────────────────────────────────────────
  function Toast() {
    const app = window.useApp();
    if (!app.toast) return null;
    const ok = app.toast.kind === 'ok';
    return (
      <div style={{
        position: 'absolute', top: 70, left: 16, right: 16, zIndex: 100,
        background: T.navy, color: '#fff', borderRadius: 16, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 12px 30px rgba(28,27,46,0.4)',
        animation: 'toastIn .3s cubic-bezier(.2,.9,.3,1.2)', fontSize: 14, fontWeight: 600,
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 999, background: ok ? T.green : T.coral, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={ok ? 'check' : 'close'} size={16} color="#fff" strokeWidth={2.6} />
        </div>
        {app.toast.msg}
      </div>
    );
  }

  Object.assign(window, { NavProvider, TabBar, Toast });
})();
