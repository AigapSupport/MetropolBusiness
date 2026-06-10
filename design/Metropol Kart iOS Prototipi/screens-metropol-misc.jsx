// screens-metropol-misc.jsx — Keşfet (map), store detail, transaction history.
(function () {
  const { T, fmt, hexA, Btn, Panel, Row, Segmented } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  const CAT = {
    resto: { color: T.coral, icon: 'fork', label: 'Restoran' },
    market: { color: T.blue, icon: 'basket', label: 'Market' },
    gift: { color: '#D267A8', icon: 'gift', label: 'Hediye' },
  };

  // faux map backdrop
  function MapBg({ small }) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#E8EBE6', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 100% at 30% 20%, #EEF1EA, #DDE3DB)' }} />
        {/* parks */}
        <div style={{ position: 'absolute', left: '8%', top: '12%', width: '34%', height: '26%', borderRadius: 20, background: hexA('#5FA37F', 0.22) }} />
        <div style={{ position: 'absolute', right: '6%', bottom: '20%', width: '30%', height: '24%', borderRadius: 18, background: hexA('#5FA37F', 0.18) }} />
        <div style={{ position: 'absolute', left: '52%', top: '8%', width: '20%', height: '18%', borderRadius: 14, background: hexA(T.blue, 0.13) }} />
        {/* roads */}
        {[['8%', '0', '6px', '100%', '0deg'], ['64%', '0', '5px', '100%', '0deg'], ['0', '34%', '100%', '7px', '0deg'], ['0', '70%', '100%', '5px', '0deg']].map((r, i) => (
          <div key={i} style={{ position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], background: '#fff', opacity: 0.85 }} />
        ))}
        <div style={{ position: 'absolute', left: '-10%', top: '52%', width: '130%', height: '9px', background: '#FBE3A2', transform: 'rotate(-14deg)' }} />
      </div>
    );
  }
  function Pin({ s, active, onClick }) {
    const c = CAT[s.cat];
    return (
      <button onClick={onClick} style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-100%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, zIndex: active ? 10 : 2 }}>
        <div style={{ position: 'relative', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }}>
          <div style={{ width: active ? 44 : 36, height: active ? 44 : 36, borderRadius: '50% 50% 50% 0', background: c.color, transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', border: '2px solid #fff' }}>
            <div style={{ transform: 'rotate(45deg)' }}><Icon name={c.icon} size={active ? 20 : 17} color="#fff" strokeWidth={2.2} /></div>
          </div>
        </div>
      </button>
    );
  }

  // ── Explore (map) ───────────────────────────────────────────
  function Explore() {
    const app = window.useApp();
    const [active, setActive] = React.useState(app.store.stores[0].id);
    const [listView, setListView] = React.useState(false);
    const stores = app.store.stores;
    const sel = stores.find(s => s.id === active);
    const railRef = React.useRef();

    const FilterBar = () => (
      <div style={{ position: 'absolute', top: window.STATUS_H + 4, left: 0, right: 0, zIndex: 20, padding: '0 12px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'none' }}>
          {[['close', 'Temizle'], ['fork', 'Sektör'], ['pin', 'Adres'], ['globe', 'Online'], [listView ? 'map' : 'list', listView ? 'Harita' : 'Listele']].map(([ic, lb], i) => (
            <button key={i} onClick={() => { if (lb === 'Listele' || lb === 'Harita') setListView(!listView); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.96)', boxShadow: T.shadowSm, cursor: 'pointer', fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.ink, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Icon name={ic} size={16} color={T.brand} strokeWidth={2} />{lb}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 14, padding: '0 14px', height: 46, boxShadow: T.shadowSm }}>
            <Icon name="search" size={19} color={T.ink3} />
            <input placeholder="Üye noktalarımızı keşfedin" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14.5, fontFamily: T.font, color: T.ink, background: 'transparent' }} />
          </div>
          <button onClick={() => app.showToast('Aranıyor…')} style={{ width: 46, height: 46, borderRadius: 14, background: T.brand, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowSm }}><Icon name="search" size={20} color="#fff" strokeWidth={2.2} /></button>
        </div>
      </div>
    );

    if (listView) {
      return (
        <window.Screen padBottom={120}>
          <window.TopBar title="Üye İş Yerleri" onBack={app.back} trailing={<button onClick={() => setListView(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="map" size={22} color={T.brand} /></button>} />
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stores.map(s => <StoreCard key={s.id} s={s} onClick={() => app.go('storeDetail', { id: s.id })} full />)}
          </div>
        </window.Screen>
      );
    }

    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapBg />
        <FilterBar />
        {/* locate */}
        <button onClick={() => app.showToast('Konumunuza gidiliyor')} style={{ position: 'absolute', left: 14, bottom: 220, zIndex: 15, width: 46, height: 46, borderRadius: 14, background: '#fff', border: 'none', boxShadow: T.shadow, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="locate" size={22} color={T.navy} strokeWidth={2} />
        </button>
        {/* back */}
        <button onClick={app.back} style={{ position: 'absolute', left: 14, top: window.STATUS_H - 40, zIndex: 25, width: 40, height: 40, borderRadius: 999, background: '#fff', border: 'none', boxShadow: T.shadowSm, cursor: 'pointer', display: 'none' }} />
        {stores.map(s => <Pin key={s.id} s={s} active={active === s.id} onClick={() => { setActive(s.id); }} />)}
        {/* my location dot */}
        <div style={{ position: 'absolute', left: '46%', top: '80%', width: 18, height: 18, borderRadius: 999, background: T.blue, border: '3px solid #fff', boxShadow: '0 0 0 6px rgba(61,139,212,0.25)', zIndex: 5 }} />
        {/* bottom rail */}
        <div ref={railRef} style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 14, display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
          {stores.map(s => (
            <div key={s.id} style={{ flex: '0 0 90%', scrollSnapAlign: 'center' }} onClick={() => setActive(s.id)}>
              <StoreCard s={s} highlight={active === s.id} onClick={() => app.go('storeDetail', { id: s.id })} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  function StoreCard({ s, onClick, highlight, full }) {
    const c = CAT[s.cat];
    return (
      <div style={{ background: '#fff', borderRadius: 18, padding: 14, boxShadow: highlight ? `0 10px 24px ${hexA(c.color, 0.28)}` : T.shadow, border: highlight ? `1.5px solid ${c.color}` : '1.5px solid transparent', transition: 'all .15s' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: hexA(c.color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={c.icon} size={24} color={c.color} strokeWidth={2} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15.5, fontWeight: 800, color: T.ink, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
              <window.Badge color={c.color} style={{ flexShrink: 0, padding: '2px 8px' }}>{s.dist}</window.Badge>
            </div>
            <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.addr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <RailBtn icon="directions" label="Yol Tarifi" onClick={() => onClick()} primary />
          <RailBtn icon="phone" label="Ara" />
          <RailBtn icon="pin" label="Haritada" onClick={onClick} />
        </div>
      </div>
    );
  }
  function RailBtn({ icon, label, onClick, primary }) {
    return (
      <button onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: T.font, fontSize: 12.5, fontWeight: 700, background: primary ? T.brand : hexA(T.navy, 0.06), color: primary ? '#fff' : T.navy }}>
        <Icon name={icon} size={16} color={primary ? '#fff' : T.navy} strokeWidth={2} />{label}
      </button>
    );
  }

  // ── Store detail ────────────────────────────────────────────
  function StoreDetail({ id }) {
    const app = window.useApp();
    const s = app.store.stores.find(x => x.id === id) || app.store.stores[0];
    const c = CAT[s.cat];
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title={s.name} onBack={app.back} brand />
        <div style={{ position: 'relative', height: 180, margin: 0 }}>
          <MapBg small />
          <Pin s={{ ...s, x: 50, y: 62 }} active />
        </div>
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: hexA(c.color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={c.icon} size={23} color={c.color} strokeWidth={2} /></div>
              <div><div style={{ fontSize: 18, fontWeight: 800, color: T.ink }}>{s.name}</div><window.Badge color={c.color}>{c.label} · {s.dist}</window.Badge></div>
            </div>
            <Btn variant="navy" size="sm" full={false} icon="directions" style={{ background: T.blue, boxShadow: 'none' }} onClick={() => app.showToast('Yol tarifi açılıyor')}>Yol Tarifi</Btn>
          </div>
          <Panel pad={0}>
            <Row icon="phone" iconBg={hexA(T.green, 0.13)} iconColor={T.green} title="Telefon" sub={s.phone} />
            <Row icon="pin" iconBg={hexA(T.coral, 0.13)} iconColor={T.coral} title="Adres" sub={s.addr} last />
          </Panel>
          <div style={{ marginTop: 18 }}><Btn variant="outline" icon="chat" onClick={() => app.showToast('Geri bildirim formu açıldı')}>Geri Bildirim Gönder</Btn></div>
        </div>
      </window.Screen>
    );
  }

  // ── Transaction history ─────────────────────────────────────
  function History({ filter }) {
    const app = window.useApp();
    const [f, setF] = React.useState(filter || 'all');
    let tx = app.store.tx;
    if (f === 'in') tx = tx.filter(t => t.amount > 0);
    else if (f === 'out') tx = tx.filter(t => t.amount < 0);
    else if (f === 'TRANSFER') tx = tx.filter(t => t.kind === 'TRANSFER');
    // group by date
    const groups = {};
    tx.forEach(t => { (groups[t.date] = groups[t.date] || []).push(t); });
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="İşlem Geçmişi" onBack={app.back} brand trailing={<button onClick={() => app.showToast('Tarih aralığı seçildi')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="calendar" size={21} color={T.brand} /></button>} />
        <div style={{ padding: '14px 18px 0' }}>
          <Segmented value={f === 'TRANSFER' ? 'all' : f} onChange={setF} options={[{ value: 'all', label: 'Tümü' }, { value: 'in', label: 'Gelen' }, { value: 'out', label: 'Giden' }]} />
        </div>
        <div style={{ padding: '8px 18px 0' }}>
          {Object.keys(groups).length === 0 && <window.Empty icon="history" title="İşlem bulunamadı" sub="Seçilen filtreye uygun hareket yok." />}
          {Object.entries(groups).map(([date, items]) => (
            <div key={date} style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink2, margin: '0 4px 8px', letterSpacing: 0.2 }}>{date}</div>
              <Panel pad={0}>
                {items.map((t, i) => {
                  const pos = t.amount > 0;
                  const w = window.WALLETS.find(x => x.label === t.wallet) || window.WALLETS[1];
                  return (
                    <Row key={t.id} last={i === items.length - 1}
                      icon={t.kind === 'TRANSFER' ? 'transfer' : t.kind === 'YÜKLEME' ? 'arrowDown' : w.icon}
                      iconBg={hexA(pos ? T.green : w.color, 0.13)} iconColor={pos ? T.green : w.color}
                      title={`${t.type} · ${t.kind}`} sub={`${t.name} · Onay No: ${t.approvalNo}`}
                      right={<div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15.5, fontWeight: 800, color: pos ? T.green : T.ink, letterSpacing: -0.3 }}>{pos ? '+' : '−'}{fmt(Math.abs(t.amount))} ₺</div>
                        <div style={{ fontSize: 11.5, color: T.ink3, marginTop: 1 }}>{t.time}</div>
                      </div>} />
                  );
                })}
              </Panel>
            </div>
          ))}
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    explore: { C: Explore, full: true },
    storeDetail: { C: StoreDetail, full: true },
    history: { C: History, full: true },
  });
})();
