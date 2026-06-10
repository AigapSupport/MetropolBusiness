// screens-benefits.jsx — Yan Haklar grid, campaign list/detail, gift cards.
(function () {
  const { T, fmt, hexA, Btn, Panel, Row, Badge, Ph } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  function TabTitle({ title, sub }) {
    return (
      <div style={{ paddingTop: window.STATUS_H, background: T.card, borderBottom: `1px solid ${T.line2}`, position: 'relative', zIndex: 20 }}>
        <div style={{ padding: '12px 18px 16px' }}>
          {sub && <div style={{ fontSize: 13, color: T.ink2, fontWeight: 600 }}>{sub}</div>}
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: -0.7 }}>{title}</h1>
        </div>
      </div>
    );
  }
  window.TabTitle = TabTitle;

  function brandLogo(brand, accent, size = 48, r = 13) {
    return (
      <div style={{ width: size, height: size, borderRadius: r, background: hexA(accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: size * 0.4, fontWeight: 800, color: accent, letterSpacing: -0.5 }}>{brand[0]}</span>
      </div>
    );
  }
  window.brandLogo = brandLogo;

  function Benefits() {
    const app = window.useApp();
    const tiles = app.store.benefitTiles;
    const route = (t) => {
      if (t.title === 'Kampanyalar') app.go('campaignList');
      else if (t.title === 'Hediye Çekleri') app.go('giftCards');
      else app.go('campaignList', { title: t.title });
    };
    return (
      <window.Screen padBottom={120}>
        <TabTitle title="Yan Haklar" sub="Avantajlar & hediyeler" />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {tiles.map(t => (
              <button key={t.id} onClick={() => route(t)} style={{ background: T.card, border: 'none', borderRadius: 18, overflow: 'hidden', cursor: 'pointer', boxShadow: T.shadowSm, fontFamily: T.font, padding: 0, textAlign: 'left' }}>
                <div style={{ position: 'relative' }}>
                  <Ph h={92} r={0} accent={t.accent} label="" />
                  <div style={{ position: 'absolute', top: 12, left: 12, width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowSm }}>
                    <Icon name={t.icon} size={22} color={t.accent} strokeWidth={2} />
                  </div>
                </div>
                <div style={{ padding: '12px 14px 14px', fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: -0.2 }}>{t.title}</div>
              </button>
            ))}
          </div>
        </div>
      </window.Screen>
    );
  }

  function CampaignList({ title = 'Kampanyalar' }) {
    const app = window.useApp();
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title={title} onBack={app.back} brand />
        <div style={{ padding: 16 }}>
          <Panel pad={0}>
            {app.store.campaigns.map((c, i, arr) => (
              <Row key={c.id} icon={brandLogo(c.brand, c.accent, 44)} title={c.title} sub={`${c.brand} · ${c.cat}`} chevron last={i === arr.length - 1} onClick={() => app.go('campaignDetail', { id: c.id })} />
            ))}
          </Panel>
        </div>
      </window.Screen>
    );
  }

  function CampaignDetail({ id }) {
    const app = window.useApp();
    const c = app.store.campaigns.find(x => x.id === id) || app.store.campaigns[0];
    const similar = app.store.campaigns.filter(x => x.id !== c.id);
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Kampanya" onBack={app.back} brand />
        <Ph h={170} r={0} accent={c.accent} label={`${c.brand.toUpperCase()} · KAMPANYA GÖRSELİ`} style={{ borderRadius: 0, borderLeft: 'none', borderRight: 'none' }} />
        <div style={{ padding: '0 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -28, marginBottom: 16 }}>
            <div style={{ boxShadow: T.shadow, borderRadius: 18 }}>{brandLogo(c.brand, c.accent, 64, 18)}</div>
            <div style={{ paddingTop: 24 }}><Badge color={c.accent}>{c.cat}</Badge></div>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5, lineHeight: 1.25 }}>{c.title}</h1>
          <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.6, marginTop: 12 }}>{c.desc}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {['Metropol Kart geçerli', 'Son: 31.12.2026', 'Tüm şubeler'].map(t => (
              <span key={t} style={{ fontSize: 12.5, fontWeight: 600, color: T.ink2, background: hexA(T.navy, 0.05), padding: '7px 12px', borderRadius: 999 }}>{t}</span>
            ))}
          </div>
          <div style={{ marginTop: 22 }}><Btn variant="coral" onClick={() => app.showToast('Kampanya detayları gönderildi')}>Detaylı Bilgi Al</Btn></div>

          <div style={{ marginTop: 28 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: T.ink }}>Benzer Kampanyalar</h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -18px', padding: '0 18px 4px', scrollbarWidth: 'none' }}>
              {similar.map(s => (
                <button key={s.id} onClick={() => app.go('campaignDetail', { id: s.id })} style={{ flex: '0 0 200px', textAlign: 'left', background: T.card, border: 'none', borderRadius: 16, overflow: 'hidden', boxShadow: T.shadowSm, cursor: 'pointer', fontFamily: T.font, padding: 0 }}>
                  <Ph h={86} r={0} accent={s.accent} label={s.brand.toUpperCase()} />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </window.Screen>
    );
  }

  function GiftCards() {
    const app = window.useApp();
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Hediye Çekleri" onBack={app.back} brand />
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {app.store.giftCards.map(g => (
            <div key={g.id} style={{ background: `linear-gradient(135deg, ${g.accent}, ${window.hexA(g.accent, 0.78)})`, borderRadius: 18, padding: 18, color: '#fff', boxShadow: `0 10px 24px ${hexA(g.accent, 0.32)}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><span style={{ fontSize: 20, fontWeight: 800, color: g.accent }}>{g.brand[0]}</span></div>
                  <div style={{ fontSize: 16, fontWeight: 700, opacity: 0.95 }}>{g.brand} Hediye Çeki</div>
                  <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, marginTop: 2 }}>{fmt(g.amount)} ₺</div>
                </div>
                <Icon name="gift" size={26} color="rgba(255,255,255,0.9)" strokeWidth={1.8} />
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 12.5, opacity: 0.9 }}>Son kullanma: {g.exp}</span>
                <button onClick={() => app.showToast('Hediye çeki kullanıldı')} style={{ background: '#fff', border: 'none', borderRadius: 999, padding: '9px 20px', fontSize: 14, fontWeight: 800, color: g.accent, cursor: 'pointer', fontFamily: T.font }}>Kullan</button>
              </div>
            </div>
          ))}
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    benefits: { C: Benefits },
    campaignList: { C: CampaignList, full: true },
    campaignDetail: { C: CampaignDetail, full: true },
    giftCards: { C: GiftCards, full: true },
  });
})();
