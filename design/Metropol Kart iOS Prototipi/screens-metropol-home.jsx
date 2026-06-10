// screens-metropol-home.jsx — card visual + Metropol main screen (3 variants)
(function () {
  const { T, fmt, hexA, Btn, Row, Panel, SectionTitle, Ph } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  const groupNo = (n) => n.replace(/(.{4})/g, '$1 ').trim();
  const maskNo = (n) => '•••• •••• •••• ' + n.slice(-4);
  const cardTotal = (c) => c.w.resto + c.w.market + c.w.gift;

  // gradients per card
  const GRAD = [
    `linear-gradient(135deg, #34315F 0%, #2D2A5A 45%, ${T.brand} 140%)`,
    `linear-gradient(135deg, ${T.brand} 0%, ${T.brandDark} 60%, #34315F 150%)`,
  ];

  // ── The card ────────────────────────────────────────────────
  function CardVisual({ card, idx = 0, onRefresh, onCopy, onDelete, mask = false, compact = false }) {
    return (
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '1.58 / 1', borderRadius: 20, overflow: 'hidden',
        background: GRAD[idx % GRAD.length], color: '#fff', padding: compact ? 16 : 20, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: '0 14px 30px rgba(45,42,90,0.34)',
      }}>
        {/* sheen */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 85% 0%, rgba(255,255,255,0.16), transparent 55%)', pointerEvents: 'none' }} />
        {/* top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {onRefresh && <CircBtn icon="refresh" onClick={onRefresh} />}
            {onDelete && <CircBtn icon="trash" onClick={onDelete} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.96 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, background: T.brand }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.3 }}>metropol<span style={{ fontWeight: 500, opacity: 0.7 }}>kart</span></span>
          </div>
        </div>
        {/* chip */}
        {!compact && (
          <div style={{ position: 'relative', width: 38, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#F4D58A,#D9B25C)', marginTop: -2,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)' }}>
            <div style={{ position: 'absolute', inset: 5, borderRadius: 3, border: '1px solid rgba(0,0,0,0.18)' }} />
          </div>
        )}
        {/* number + holder + nfc */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: compact ? 15 : 18, fontWeight: 600, letterSpacing: 1.5, marginBottom: 10, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            {mask ? maskNo(card.number) : groupNo(card.number)}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, opacity: 0.6, letterSpacing: 0.5, marginBottom: 2 }}>KART SAHİBİ</div>
              <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>{card.holder}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {onCopy && <button onClick={onCopy} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}><Icon name="copy" size={20} color="rgba(255,255,255,0.85)" /></button>}
              <Icon name="nfc" size={22} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  function CircBtn({ icon, onClick }) {
    return (
      <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
        <Icon name={icon} size={16} color="#fff" strokeWidth={2} />
      </button>
    );
  }

  function AddCardTile({ onClick }) {
    return (
      <button onClick={onClick} style={{
        width: '100%', aspectRatio: '1.58 / 1', borderRadius: 20, cursor: 'pointer',
        border: `2px dashed ${hexA(T.navy, 0.25)}`, background: hexA(T.navy, 0.03), color: T.navy,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: T.font,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 999, background: T.brandSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={26} color={T.brand} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Kart Ekle</span>
      </button>
    );
  }

  // horizontal snap slider for cards
  function CardSlider({ children, onIndex, count }) {
    const ref = React.useRef();
    const [i, setI] = React.useState(0);
    const onScroll = () => {
      if (!ref.current) return;
      const w = ref.current.clientWidth;
      const idx = Math.round(ref.current.scrollLeft / w);
      if (idx !== i) { setI(idx); onIndex && onIndex(idx); }
    };
    return (
      <div>
        <div ref={ref} onScroll={onScroll} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 0, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {React.Children.map(children, (ch, k) => (
            <div style={{ flex: '0 0 100%', scrollSnapAlign: 'center', padding: '0 18px', boxSizing: 'border-box' }}>{ch}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {Array.from({ length: count }).map((_, k) => (
            <div key={k} style={{ width: k === i ? 18 : 6, height: 6, borderRadius: 999, background: k === i ? T.brand : hexA(T.navy, 0.2), transition: 'all .2s' }} />
          ))}
        </div>
      </div>
    );
  }
  window.CardVisual = CardVisual; window.cardTotal = cardTotal; window.groupNo = groupNo; window.maskNo = maskNo;

  // ── balance pills ───────────────────────────────────────────
  const WALLETS = [
    { key: 'total', label: 'TOPLAM', color: T.purple, icon: 'wallet' },
    { key: 'resto', label: 'RESTORAN', color: T.coral, icon: 'fork' },
    { key: 'market', label: 'MARKET', color: T.blue, icon: 'basket' },
    { key: 'gift', label: 'HEDİYE', color: '#E0883B', icon: 'gift' },
  ];
  window.WALLETS = WALLETS;
  function balOf(card, key) { return key === 'total' ? cardTotal(card) : card.w[key]; }

  function BalanceCards({ card }) {
    return (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 18px 4px', scrollbarWidth: 'none' }}>
        {WALLETS.map(w => (
          <div key={w.key} style={{ flex: '0 0 158px', background: T.card, borderRadius: 16, padding: 15, boxShadow: T.shadowSm, borderTop: `3px solid ${w.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: hexA(w.color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={w.icon} size={15} color={w.color} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: w.color, letterSpacing: 0.3 }}>{w.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{fmt(balOf(card, w.key))} <span style={{ fontSize: 15 }}>₺</span></div>
            <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>Kullanılabilir Bakiye</div>
          </div>
        ))}
      </div>
    );
  }

  // ── action grid ─────────────────────────────────────────────
  const ACTIONS = [
    { id: 'pay', title: 'Harcama Yap', sub: 'QR veya kısa kod', icon: 'qr', accent: T.coral, go: 'payChoose' },
    { id: 'explore', title: 'Keşfet', sub: 'Üye iş yerleri', icon: 'pin', accent: T.blue, go: 'explore' },
    { id: 'history', title: 'İşlem Geçmişi', sub: 'Tüm hareketler', icon: 'history', accent: T.purple, go: 'history' },
    { id: 'transfer', title: 'Bakiye Transferi', sub: 'Karta / cebe gönder', icon: 'transfer', accent: T.green, go: 'transferMenu' },
  ];

  function ActionGrid({ app }) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ACTIONS.map(a => (
          <button key={a.id} onClick={() => app.go(a.go)} style={{
            background: T.card, borderRadius: 16, border: 'none', cursor: 'pointer', padding: 15, textAlign: 'left',
            boxShadow: T.shadowSm, fontFamily: T.font, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: hexA(a.accent, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={22} color={a.accent} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: -0.2 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: T.ink2, marginTop: 1 }}>{a.sub}</div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ── recent transactions ─────────────────────────────────────
  function TxRow({ tx, last }) {
    const pos = tx.amount > 0;
    const w = WALLETS.find(x => x.label === tx.wallet) || WALLETS[1];
    return (
      <Row last={last}
        icon={tx.kind === 'TRANSFER' ? 'transfer' : tx.kind === 'YÜKLEME' ? 'arrowDown' : w.icon}
        iconBg={hexA(w.color, 0.13)} iconColor={w.color}
        title={tx.name}
        sub={`${tx.type} · ${tx.kind} · ${tx.date} ${tx.time}`}
        right={<div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: pos ? T.green : T.ink, letterSpacing: -0.3 }}>{pos ? '+' : '−'}{fmt(Math.abs(tx.amount))} ₺</div>
        </div>} />
    );
  }
  window.TxRow = TxRow;

  // ── MAIN SCREEN ─────────────────────────────────────────────
  function Metropol() {
    const app = window.useApp();
    const cards = app.store.cards;
    const activeIdx = Math.max(0, cards.findIndex(c => c.id === app.activeCard));
    const card = cards[activeIdx] || cards[0];
    const recent = app.store.tx.filter(t => t.cardId === (card && card.id)).slice(0, 5);
    const v = app.homeVariant;

    return (
      <window.Screen padBottom={120}>
        {/* header */}
        <div style={{ paddingTop: window.STATUS_H, background: T.card, paddingBottom: 14, borderBottom: `1px solid ${T.line2}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 12px' }}>
            <div>
              <div style={{ fontSize: 13, color: T.ink2, fontWeight: 600 }}>Cüzdanım</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>Metropol Kart</div>
            </div>
            <button onClick={() => app.go('cardDetail', { cardId: card.id })} style={{ width: 42, height: 42, borderRadius: 999, background: T.brandSoft, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="settings" size={22} color={T.brand} strokeWidth={1.9} />
            </button>
          </div>
          <div style={{ padding: '0 18px' }}>
            <window.Segmented value={v} onChange={app.setHomeVariant}
              options={[{ value: 1, label: 'Klasik' }, { value: 2, label: 'Tek Bakiye' }, { value: 3, label: 'Cüzdanlar' }]} />
          </div>
        </div>

        <div style={{ paddingTop: 18 }}>
          {/* card slider */}
          <CardSlider count={cards.length + 1} onIndex={(i) => { if (cards[i]) app.setActiveCard(cards[i].id); }}>
            {cards.map((c, i) => (
              <CardVisual key={c.id} card={c} idx={i}
                onRefresh={() => app.showToast('Bakiye güncellendi')}
                onCopy={() => app.showToast('Kart numarası kopyalandı')}
                onDelete={() => app.go('cardDelete', { cardId: c.id })} />
            ))}
            <AddCardTile onClick={() => app.go('cardAdd1')} />
          </CardSlider>

          {/* variant body */}
          <div style={{ padding: '22px 18px 0' }}>
            {v === 1 && <VariantClassic app={app} card={card} />}
            {v === 2 && <VariantUnified app={app} card={card} />}
            {v === 3 && <VariantWallets app={app} card={card} />}
          </div>

          {/* recent */}
          <div style={{ padding: '24px 18px 0' }}>
            <SectionTitle action="Tümü" onAction={() => app.go('history')}>Son 5 İşlem</SectionTitle>
            <Panel pad={0}>
              {recent.length ? recent.map((t, i) => <TxRow key={t.id} tx={t} last={i === recent.length - 1} />)
                : <window.Empty icon="history" title="Henüz işlem yok" sub="Bu karta ait işlemler burada görünecek." />}
            </Panel>
          </div>
        </div>
      </window.Screen>
    );
  }

  // Variant 1 — classic: balance cards + 2x2 action grid
  function VariantClassic({ app, card }) {
    return (
      <div>
        <div style={{ margin: '0 -18px 20px' }}><BalanceCards card={card} /></div>
        <ActionGrid app={app} />
      </div>
    );
  }

  // Variant 2 — unified hero: one big balance card with wallet split, circular actions
  function VariantUnified({ app, card }) {
    const total = cardTotal(card);
    const segs = [['resto', T.coral], ['market', T.blue], ['gift', '#E0883B']];
    return (
      <div>
        <div style={{ background: T.navy, borderRadius: 22, padding: 20, color: '#fff', boxShadow: '0 12px 30px rgba(45,42,90,0.28)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, letterSpacing: 0.3 }}>TOPLAM KULLANILABİLİR BAKİYE</div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, marginTop: 4 }}>{fmt(total)} <span style={{ fontSize: 22 }}>₺</span></div>
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 16, gap: 2 }}>
            {segs.map(([k, c]) => <div key={k} style={{ flex: card.w[k] || 0.001, background: c }} />)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
            {segs.map(([k, c]) => {
              const w = window.WALLETS.find(x => x.key === k);
              return (
                <div key={k} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: c }} /><span style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.75 }}>{w.label}</span></div>
                  <div style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{fmt(card.w[k])} ₺</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, padding: '0 4px' }}>
          {ACTIONS.map(a => (
            <button key={a.id} onClick={() => app.go(a.go)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontFamily: T.font, flex: 1 }}>
              <div style={{ width: 54, height: 54, borderRadius: 18, background: hexA(a.accent, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={a.icon} size={24} color={a.accent} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.ink, textAlign: 'center', lineHeight: 1.2 }}>{a.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Variant 3 — stacked wallet rows + action list
  function VariantWallets({ app, card }) {
    const total = cardTotal(card);
    return (
      <div>
        {window.WALLETS.filter(w => w.key !== 'total').map(w => {
          const val = card.w[w.key];
          return (
            <div key={w.key} style={{ background: T.card, borderRadius: 16, boxShadow: T.shadowSm, padding: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: hexA(w.color, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={w.icon} size={24} color={w.color} strokeWidth={1.9} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{w.label} Cüzdanı</div>
                <div style={{ height: 6, borderRadius: 999, background: hexA(w.color, 0.12), marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (val / (total || 1)) * 100)}%`, background: w.color, borderRadius: 999 }} />
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{fmt(val)} <span style={{ fontSize: 13 }}>₺</span></div>
            </div>
          );
        })}
        <Panel pad={0} style={{ marginTop: 16 }}>
          {ACTIONS.map((a, i) => (
            <Row key={a.id} icon={a.icon} iconBg={hexA(a.accent, 0.13)} iconColor={a.accent} title={a.title} sub={a.sub} chevron last={i === ACTIONS.length - 1} onClick={() => app.go(a.go)} />
          ))}
        </Panel>
      </div>
    );
  }

  window.SCREENS.metropol = { C: Metropol, full: false };
})();
