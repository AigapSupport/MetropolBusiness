// screens-metropol-pay.jsx — Harcama Yap flow + Receipt.
(function () {
  const { T, fmt, hexA, Btn, CodeInput, Panel } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  // The simulated transaction once a QR/code is read
  const TXN = { merchant: 'Köfteci Yusuf Levent', product: 'Resto-Yemek', amount: 200, sector: 'resto' };

  // ── Receipt / slip ──────────────────────────────────────────
  function Receipt({ merchant, date, time, type = 'RESTOPAY', amount, balance, cardNo, label = 'HARCAMA İŞLEMİ BAŞARILI', extra }) {
    const row = (k, v) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0' }}>
        <span style={{ color: T.ink2 }}>{k}</span><span style={{ color: T.ink, fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace' }}>{v}</span>
      </div>
    );
    const Dash = () => <div style={{ borderTop: `1.5px dashed ${hexA(T.navy, 0.18)}`, margin: '12px 0' }} />;
    return (
      <div style={{ background: T.card, borderRadius: 18, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>{merchant}</div>
          <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 3 }}>{date} · {time}</div>
        </div>
        <div style={{ padding: '0 20px' }}>
          <Dash />
          <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: T.brand, letterSpacing: 1, marginBottom: 8 }}>{type}</div>
          {row('Üye İş Yeri No', '8290 4471')}
          {row('Terminal No', 'TRM01987')}
          {row('Onay No', '004' + Math.floor(800 + Math.random() * 99))}
          {row('Kart No', cardNo)}
          {extra}
          <Dash />
          <div style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: T.green, letterSpacing: 0.5, marginBottom: 12 }}>{label}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: T.ink2, fontWeight: 600 }}>TUTAR</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{fmt(amount)} ₺</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, color: T.ink2, fontWeight: 600 }}>KALAN BAKİYE</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.ink2 }}>{fmt(balance)} ₺</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '16px 0', marginTop: 14, borderTop: `1px solid ${T.line2}`, background: hexA(T.navy, 0.02) }}>
          <div style={{ width: 16, height: 16, borderRadius: 5, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: 2, background: '#fff' }} /></div>
          <span style={{ fontSize: 12, fontWeight: 800, color: T.navy, letterSpacing: -0.2 }}>metropol<span style={{ fontWeight: 500, opacity: 0.6 }}>kart</span></span>
        </div>
      </div>
    );
  }
  window.Receipt = Receipt;

  // mini card selector row
  function CardPick({ card, idx, selected, onClick }) {
    return (
      <button onClick={onClick} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: 14, textAlign: 'left', fontFamily: T.font,
        background: T.card, border: `2px solid ${selected ? T.brand : T.line}`, borderRadius: 16, cursor: 'pointer',
        boxShadow: selected ? `0 6px 16px ${hexA(T.brand, 0.18)}` : 'none', transition: 'all .15s',
      }}>
        <div style={{ width: 54, height: 36, borderRadius: 8, background: idx % 2 ? `linear-gradient(135deg,${T.brand},${T.brandDark})` : 'linear-gradient(135deg,#34315F,#2D2A5A)', flexShrink: 0, display: 'flex', alignItems: 'flex-end', padding: 5, boxSizing: 'border-box' }}>
          <div style={{ width: 12, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.5)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{card.holder}</div>
          <div style={{ fontSize: 13, color: T.ink2, fontFamily: 'ui-monospace, Menlo, monospace', marginTop: 2 }}>{window.maskNo(card.number)}</div>
        </div>
        <div style={{ width: 24, height: 24, borderRadius: 999, border: `2px solid ${selected ? T.brand : T.line}`, background: selected ? T.brand : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {selected && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
        </div>
      </button>
    );
  }
  window.CardPick = CardPick;

  // ── 1. Choose method ────────────────────────────────────────
  function PayChoose() {
    const app = window.useApp();
    const opt = (icon, title, sub, accent, onClick) => (
      <button onClick={onClick} style={{
        background: T.card, border: 'none', borderRadius: 20, padding: 22, cursor: 'pointer', textAlign: 'left',
        boxShadow: T.shadow, fontFamily: T.font, display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ width: 58, height: 58, borderRadius: 18, background: hexA(accent, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={30} color={accent} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ fontSize: 13.5, color: T.ink2, marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
        </div>
        <Icon name="chevron" size={20} color={T.ink3} strokeWidth={2} />
      </button>
    );
    return (
      <window.Screen>
        <window.TopBar title="Harcama Yap" onBack={app.back} brand />
        <div style={{ padding: '20px 18px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: '0 0 4px 4px', fontSize: 14.5, color: T.ink2 }}>Ödeme yöntemini seçin</p>
          {opt('qr', 'QR ile Ödeme Yap', 'POS cihazındaki QR kodunu okutarak ödeyin.', T.coral, () => app.go('payQR'))}
          {opt('keypad', 'Kısa Kod ile Ödeme Yap', 'POS ekranındaki 6 haneli kodu girin.', T.purple, () => app.go('payCode'))}
        </div>
      </window.Screen>
    );
  }

  // ── 2a. QR camera ───────────────────────────────────────────
  function PayQR() {
    const app = window.useApp();
    React.useEffect(() => { const t = setTimeout(() => app.go('paySelectCard'), 2600); return () => clearTimeout(t); }, []);
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0E0D1A', display: 'flex', flexDirection: 'column' }}>
        {/* faux camera bg */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 50% 40%, #2a2740, #0E0D1A)' }} />
        <div style={{ position: 'relative', paddingTop: window.STATUS_H, background: T.brand, paddingBottom: 14, zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            <button onClick={app.back} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="close" size={24} color="#fff" strokeWidth={2.4} /></button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#fff', marginRight: 40 }}>QR ile Ödeme</div>
          </div>
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: 600, textAlign: 'center', padding: '0 40px', marginBottom: 28 }}>Lütfen POS cihazındaki<br />QR kodu okutunuz</div>
          <div style={{ position: 'relative', width: 232, height: 232 }}>
            {[[0, 0, 'tl'], [1, 0, 'tr'], [0, 1, 'bl'], [1, 1, 'br']].map(([x, y], i) => (
              <div key={i} style={{ position: 'absolute', [y ? 'bottom' : 'top']: 0, [x ? 'right' : 'left']: 0, width: 40, height: 40, borderTop: y ? 'none' : '4px solid #fff', borderBottom: y ? '4px solid #fff' : 'none', borderLeft: x ? 'none' : '4px solid #fff', borderRight: x ? '4px solid #fff' : 'none', borderRadius: `${!x && !y ? 16 : 0}px ${x && !y ? 16 : 0}px ${x && y ? 16 : 0}px ${!x && y ? 16 : 0}px` }} />
            ))}
            <div style={{ position: 'absolute', left: '6%', right: '6%', height: 3, background: T.brand, boxShadow: `0 0 14px 3px ${T.brand}`, borderRadius: 3, animation: 'scanLine 2.2s ease-in-out infinite' }} />
          </div>
          <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            <window.Spinner size={18} color="#fff" /> QR aranıyor…
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 40, zIndex: 2 }}>
          <button onClick={() => app.showToast('Kamera çevrildi')} style={{ width: 54, height: 54, borderRadius: 999, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
            <Icon name="cameraFlip" size={26} color="#fff" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // ── 2b. Short code ──────────────────────────────────────────
  function PayCode() {
    const app = window.useApp();
    const [c, setC] = React.useState('');
    return (
      <window.Screen padBottom={20}>
        <window.TopBar title="Kısa Kod ile Ödeme" onBack={app.back} brand />
        <div style={{ padding: '28px 18px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: hexA(T.purple, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Icon name="keypad" size={30} color={T.purple} strokeWidth={1.9} /></div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>Kısa kodu girin</h2>
            <p style={{ margin: '8px 0 0', fontSize: 14.5, color: T.ink2 }}>POS ekranında görünen 6 haneli kod.</p>
          </div>
          <CodeInput value={c} onChange={setC} autoFocus />
        </div>
        <div style={{ padding: '28px 18px 0' }}>
          <Btn variant="coral" disabled={c.length < 6} onClick={() => app.go('paySelectCard')}>Devam Et</Btn>
        </div>
      </window.Screen>
    );
  }

  // ── 3. Select card ──────────────────────────────────────────
  function PaySelectCard() {
    const app = window.useApp();
    const [sel, setSel] = React.useState(app.activeCard || app.store.cards[0].id);
    return (
      <window.Screen padBottom={20}>
        <window.TopBar title="Kart Seçimi" onBack={app.back} brand />
        <div style={{ padding: '20px 18px 0' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>Ödeme yapılacak kartı seçiniz</h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: T.ink2, lineHeight: 1.5 }}>İşlem bilgileri seçtiğiniz karta göre getirilecektir.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {app.store.cards.map((c, i) => <CardPick key={c.id} card={c} idx={i} selected={sel === c.id} onClick={() => setSel(c.id)} />)}
          </div>
        </div>
        <div style={{ padding: '24px 18px 0' }}>
          <Btn variant="coral" onClick={() => { app.setActiveCard(sel); app.go('payConfirm', { cardId: sel }); }}>Devam Et</Btn>
        </div>
      </window.Screen>
    );
  }

  // ── 4. Amount confirm ───────────────────────────────────────
  function PayConfirm({ cardId }) {
    const app = window.useApp();
    const card = app.cardById(cardId) || app.store.cards[0];
    const [wallet, setWallet] = React.useState('resto');
    const idx = app.store.cards.findIndex(c => c.id === card.id);
    const wallets = [
      { key: 'resto', label: 'RESTORAN', bal: card.w.resto, color: T.coral, icon: 'fork' },
      { key: 'market', label: 'MARKET', bal: card.w.market, color: T.blue, icon: 'basket' },
    ];
    const sel = wallets.find(w => w.key === wallet);
    const insufficient = sel.bal < TXN.amount;
    const pay = () => {
      if (insufficient) { app.go('payFail', { reason: 'insufficient' }); return; }
      app.update(s => {
        const c = s.cards.find(x => x.id === card.id); c.w[wallet] -= TXN.amount;
        s.tx.unshift({ id: 't' + Date.now(), cardId: card.id, type: wallet === 'resto' ? 'RESTOPAY' : 'GIFTPAY', kind: 'SATIŞ', wallet: sel.label, name: 'Köfteci Yusuf', amount: -TXN.amount, date: '10.06.2026', time: '12:42', approvalNo: '004' + Math.floor(800 + Math.random() * 99), merchant: TXN.merchant });
      });
      app.go('paySuccess', { cardId: card.id, wallet, amount: TXN.amount });
    };
    return (
      <window.Screen padBottom={20}>
        <div style={{ paddingTop: window.STATUS_H, background: T.brand, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', height: 48 }}>
            <button onClick={app.back} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="back" size={24} color="#fff" strokeWidth={2.2} /></button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#fff', marginRight: 40 }}>İşlem Bilgisi</div>
          </div>
          <div style={{ textAlign: 'center', color: '#fff', padding: '4px 0 26px' }}>
            <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 600 }}>Ödenecek Tutar</div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1 }}>{fmt(TXN.amount)} ₺</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.18)', padding: '6px 14px', borderRadius: 999, marginTop: 6, fontSize: 13, fontWeight: 600 }}>
              <Icon name="store" size={15} color="#fff" strokeWidth={2} /> {TXN.merchant} · {TXN.product}
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 18px 0', marginTop: -14 }}>
          <CardPick card={card} idx={idx} selected onClick={() => app.back()} />
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '22px 4px 12px', letterSpacing: 0.2 }}>SEKTÖR / CÜZDAN SEÇİNİZ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {wallets.map(w => {
              const active = wallet === w.key; const low = w.bal < TXN.amount;
              return (
                <button key={w.key} onClick={() => setWallet(w.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 13, padding: 14, fontFamily: T.font, textAlign: 'left', cursor: 'pointer',
                  background: T.card, border: `2px solid ${active ? w.color : T.line}`, borderRadius: 14, opacity: 1,
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${active ? w.color : T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {active && <div style={{ width: 11, height: 11, borderRadius: 999, background: w.color }} />}
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: hexA(w.color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={w.icon} size={18} color={w.color} strokeWidth={2} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>{w.label}</div>
                    <div style={{ fontSize: 12.5, color: low ? T.coralDark : T.ink2, marginTop: 1 }}>Kullanılabilir: {fmt(w.bal)} ₺ {low && '· Yetersiz'}</div>
                  </div>
                  <Icon name="info" size={18} color={T.ink3} />
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '24px 18px 0' }}>
          <Btn variant="coral" onClick={pay}>ÖDE · {fmt(TXN.amount)} ₺</Btn>
        </div>
      </window.Screen>
    );
  }

  // ── 5. Success ──────────────────────────────────────────────
  function PaySuccess({ cardId, wallet, amount }) {
    const app = window.useApp();
    const card = app.cardById(cardId) || app.store.cards[0];
    const bal = wallet === 'resto' ? card.w.resto : card.w.market;
    return (
      <window.Screen padBottom={24} bg={T.bg}>
        <div style={{ position: 'relative', paddingTop: window.STATUS_H, background: `linear-gradient(160deg, ${T.green}, ${T.greenDark})`, paddingBottom: 44, borderRadius: '0 0 30px 30px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 30 }}>
            <svg width="100%" height="30" viewBox="0 0 390 30" preserveAspectRatio="none"><path d="M0 30 C 80 6, 160 6, 195 16 C 240 28, 320 6, 390 18 L 390 30 Z" fill={T.bg} /></svg>
          </div>
          <div style={{ textAlign: 'center', color: '#fff', position: 'relative' }}>
            <div style={{ width: 84, height: 84, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 16px', animation: 'pop .5s cubic-bezier(.2,.9,.3,1.4)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={34} color={T.green} strokeWidth={3} /></div>
            </div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Ödeme Başarılı</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.92 }}>İşleminiz başarıyla tamamlandı.</p>
          </div>
        </div>
        <div style={{ padding: '20px 18px 0' }}>
          <Receipt merchant={TXN.merchant} date="10.06.2026" time="12:42" type={wallet === 'resto' ? 'RESTOPAY' : 'GIFTPAY'} amount={amount} balance={bal} cardNo={window.maskNo(card.number)} />
          <div style={{ marginTop: 18 }}><Btn variant="navy" onClick={() => { app.reset(); }}>Tamam</Btn></div>
          <div style={{ height: 10 }} />
          <Btn variant="ghost" icon="share" onClick={() => app.showToast('Fiş paylaşıldı')}>Fişi Paylaş</Btn>
        </div>
      </window.Screen>
    );
  }

  // ── 6. Fail ─────────────────────────────────────────────────
  function PayFail({ reason }) {
    const app = window.useApp();
    return (
      <window.Screen>
        <window.TopBar title="" onBack={app.back} border={false} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 32px' }}>
          <div style={{ width: 96, height: 96, borderRadius: 999, background: hexA(T.coral, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, animation: 'pop .5s cubic-bezier(.2,.9,.3,1.4)' }}>
            <div style={{ width: 64, height: 64, borderRadius: 999, background: T.coral, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" size={34} color="#fff" strokeWidth={3} /></div>
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>Ödeme Başarısız</h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: T.ink2, lineHeight: 1.55, maxWidth: 280 }}>
            {reason === 'insufficient' ? 'Seçtiğiniz cüzdanda yeterli bakiye bulunmuyor. Lütfen farklı bir cüzdan seçin veya bakiye yükleyin.' : 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'}
          </p>
          <div style={{ width: '100%', marginTop: 30 }}>
            <Btn variant="coral" icon="refresh" onClick={app.back}>Tekrar Dene</Btn>
            <div style={{ height: 10 }} />
            <Btn variant="ghost" onClick={() => app.reset()}>İptal Et</Btn>
          </div>
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    payChoose: { C: PayChoose, full: true },
    payQR: { C: PayQR, full: true, dark: true },
    payCode: { C: PayCode, full: true },
    paySelectCard: { C: PaySelectCard, full: true },
    payConfirm: { C: PayConfirm, full: true, dark: true },
    paySuccess: { C: PaySuccess, full: true, dark: true },
    payFail: { C: PayFail, full: true },
  });
})();
