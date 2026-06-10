// app.jsx — shell: scaling, screen registry, transitions, drawer, tab bar.
(function () {
  const { T, Btn } = window;

  const PALETTES = {
    coral: { brand: '#F2697B', brandDark: '#E04E63', brandSoft: '#FDEEF1', name: 'Nova Holding' },
    blue: { brand: '#2F7DD6', brandDark: '#2367B8', brandSoft: '#EAF2FC', name: 'Atlas Enerji' },
    green: { brand: '#2E9E6B', brandDark: '#248255', brandSoft: '#E7F5EE', name: 'Vera Sağlık' },
    purple: { brand: '#6E54C8', brandDark: '#5B43AD', brandSoft: '#EFEBFA', name: 'Lumen Teknoloji' },
  };
  window.PALETTES = PALETTES;

  function Stub({ name }) {
    const app = window.useApp();
    return (
      <window.Screen>
        <window.TopBar title="Yakında" onBack={app.depth ? app.back : undefined} />
        <window.Empty icon="bolt" title="Bu ekran hazırlanıyor" sub={`"${name}" ekranı bu önizlemede henüz bağlı değil.`} />
      </window.Screen>
    );
  }

  function AnimatedScreen({ animKey, anim, children }) {
    const [run, setRun] = React.useState(true);
    React.useEffect(() => {
      setRun(true);
      const t = setTimeout(() => setRun(false), 420);
      return () => clearTimeout(t);
    }, [animKey]);
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: T.bg, animation: run ? `${anim} .32s cubic-bezier(.3,.8,.35,1)` : 'none' }}>
        {children}
      </div>
    );
  }

  function ScreenHost() {
    const app = window.useApp();
    const TABS = window.TABS;
    const rootName = TABS.find(t => t.id === app.tab).root;
    const top = app.stack[app.stack.length - 1];
    const name = top ? top.name : rootName;
    const props = top ? top.props : {};
    const reg = (window.SCREENS && window.SCREENS[name]) || null;
    const C = reg ? reg.C : null;
    const full = reg ? reg.full : false;

    const anim = app.dir === 'fwd' ? 'pushIn' : app.dir === 'back' ? 'popIn' : 'fadeIn';
    const key = `${app.tab}:${app.stack.length}:${name}`;

    return (
      <React.Fragment>
        <AnimatedScreen key={key} animKey={key} anim={anim}>
          {C ? <C {...props} /> : <Stub name={name} />}
        </AnimatedScreen>
        {!full && <window.TabBar />}
      </React.Fragment>
    );
  }

  function App() {
    const app = window.useApp();
    // apply brand palette before children read T.*
    const pal = PALETTES[app.store.brandKey || 'coral'];
    T.brand = pal.brand; T.brandDark = pal.brandDark; T.brandSoft = pal.brandSoft;

    const [scale, setScale] = React.useState(1);
    React.useEffect(() => {
      const fit = () => {
        const s = Math.min((window.innerHeight - 36) / 844, (window.innerWidth - 24) / 390, 1.15);
        setScale(s);
      };
      fit(); window.addEventListener('resize', fit);
      return () => window.removeEventListener('resize', fit);
    }, []);

    const TABS = window.TABS;
    const rootName = TABS.find(t => t.id === app.tab).root;
    const top = app.stack[app.stack.length - 1];
    const curName = top ? top.name : rootName;
    const curReg = (window.SCREENS && window.SCREENS[curName]) || null;
    const statusDark = app.authed && curReg ? !!curReg.dark : false;

    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E7E7EC', padding: 12, boxSizing: 'border-box' }}>
        <window.Phone scale={scale} statusDark={!!statusDark}>
          {!app.authed
            ? <window.AuthHost />
            : <ScreenHost />}
          <window.Toast />
          {app.authed && window.AccountDrawer && <window.AccountDrawer />}
        </window.Phone>
      </div>
    );
  }

  function Root() {
    return (
      <window.NavProvider>
        <App />
      </window.NavProvider>
    );
  }

  window.MetropolApp = Root;
})();
