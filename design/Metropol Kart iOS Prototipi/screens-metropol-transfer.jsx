// screens-metropol-transfer.jsx — Bakiye Transferi flow.
(function () {
  const { T, fmt, hexA, Btn, Field, Input, Panel, Row, Receipt } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  // ── bottom sheet picker ─────────────────────────────────────
  function Sheet({ title, open, onClose, children }) {
    if (!open) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(28,27,46,0.5)', animation: 'fadeBg .2s' }} />
        <div style={{ position: 'relative', background: T.bg, borderRadius: '26px 26px 0 0', padding: '14px 16px calc(env(safe-area-inset-bottom) + 26px)', animation: 'sheetUp .3s cubic-bezier(.2,.8,.3,1)', maxHeight: '74%', overflowY: 'auto' }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: hexA(T.navy, 0.15), margin: '0 auto 14px' }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, textAlign: 'center', marginBottom: 14 }}>{title}</div>
          {children}
        </div>
      </div>
    );
  }

  function PickerField({ label, value, sub, icon, accent = T.brand, onClick }) {
    return (
      <Field label={label}>
        <button onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, height: 60, padding: '0 14px', background: T.card, border: `1.5px solid ${T.line}`, borderRadius: 12, cursor: 'pointer', fontFamily: T.font, textAlign: 'left' }}>
          {icon && <div style={{ width: 38, height: 38, borderRadius: 11, background: hexA(accent, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={20} color={accent} strokeWidth={2} /></div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: value ? T.ink : T.ink3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || 'Seçiniz'}</div>
            {sub && <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 1 }}>{sub}</div>}
          </div>
          <Icon name="chevronDown" size={18} color={T.ink3} strokeWidth={2} />
        </button>
      </Field>
    );
  }

  // ── transfer menu ───────────────────────────────────────────
  function TransferMenu() {
    const app = window.useApp();
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Bakiye Transferi" onBack={app.back} brand />
        <div style={{ padding: '18px 18px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '0 4px 10px', letterSpacing: 0.2 }}>GÖNDEREN</div>
          <Panel pad={0}>
            <Row icon="swap" iconBg={hexA(T.green, 0.14)} iconColor={T.green} title="Kartlarım Arası" sub="Kendi kartların arasında aktar" chevron onClick={() => app.go('transferBetween', { mode: 'self' })} />
            <Row icon="card" iconBg={hexA(T.blue, 0.14)} iconColor={T.blue} title="Başka Karta" sub="Kart numarası ile gönder" chevron onClick={() => app.go('transferBetween', { mode: 'other' })} />
            <Row icon="phone" iconBg={hexA(T.purple, 0.14)} iconColor={T.purple} title="Cep Numarasına" sub="Telefon numarasına bakiye gönder" chevron onClick={() => app.go('transferBetween', { mode: 'phone' })} />
            <Row icon="heart" iconBg={hexA(T.coral, 0.14)} iconColor={T.coral} title="Yardım Kartına" sub="Bağış ve yardım kartlarına" chevron last onClick={() => app.go('transferBetween', { mode: 'aid' })} />
          </Panel>

          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '22px 4px 10px', letterSpacing: 0.2 }}>ALICI</div>
          <Panel pad={0}>
            <Row icon="users" iconBg={hexA(T.navy, 0.1)} iconColor={T.navy} title="Kayıtlı Alıcı" sub="Tanımlı alıcılarına hızlı gönder" chevron onClick={() => app.showToast('Kayıtlı alıcı bulunamadı')} />
            <Row icon="qr" iconBg={hexA(T.navy, 0.1)} iconColor={T.navy} title="QR Kod Alıcı" sub="Alıcının QR kodunu okut" chevron last onClick={() => app.go('transferQR')} />
          </Panel>

          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '22px 4px 10px', letterSpacing: 0.2 }}>GEÇMİŞ TRANSFERLER</div>
          <Panel pad={0}>
            <Row icon="history" iconBg={hexA(T.purple, 0.14)} iconColor={T.purple} title="İşlem Geçmişi" sub="Tüm transfer hareketleri" chevron last onClick={() => app.go('history', { filter: 'TRANSFER' })} />
          </Panel>
        </div>
      </window.Screen>
    );
  }

  // ── between cards ───────────────────────────────────────────
  const QUICK = [500, 1000, 2500, 5000];
  function TransferBetween({ mode = 'self' }) {
    const app = window.useApp();
    const cards = app.store.cards;
    const [from, setFrom] = React.useState(cards[0].id);
    const [to, setTo] = React.useState(cards[1] ? cards[1].id : cards[0].id);
    const [wallet, setWallet] = React.useState('resto');
    const [amount, setAmount] = React.useState('');
    const [note, setNote] = React.useState('');
    const [sheet, setSheet] = React.useState(null);
    const fromCard = app.cardById(from); const toCard = app.cardById(to);
    const wLabel = { resto: 'RESTOPAY', market: 'MARKET', gift: 'GIFTPAY' }[wallet];
    const amt = parseFloat(amount) || 0;
    const valid = amt > 0 && (mode !== 'self' || from !== to);

    const title = { self: 'Kartlarım Arası', other: 'Başka Karta', phone: 'Cep Numarasına', aid: 'Yardım Kartına' }[mode];

    return (
      <React.Fragment>
        <window.Screen padBottom={24}>
          <window.TopBar title={title} onBack={app.back} brand />
          <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PickerField label="Gönderen Kart" icon="card" accent={T.navy} value={fromCard.holder} sub={window.maskNo(fromCard.number)} onClick={() => setSheet('from')} />
            {mode === 'self'
              ? <PickerField label="Alıcı Kart" icon="card" accent={T.brand} value={toCard.holder} sub={window.maskNo(toCard.number)} onClick={() => setSheet('to')} />
              : <Field label={mode === 'phone' ? 'Alıcı Telefon' : 'Alıcı Kart Numarası'}><Input value={note === '__' ? '' : ''} onChange={() => { }} placeholder={mode === 'phone' ? '5XX XXX XX XX' : '6375 •••• •••• ••••'} icon={mode === 'phone' ? 'phone' : 'card'} inputMode="numeric" /></Field>}
            <PickerField label="Cüzdanlarım" icon="wallet" accent={T.coral} value={wLabel} sub={`Kullanılabilir: ${fmt(fromCard.w[wallet])} ₺`} onClick={() => setSheet('wallet')} />

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 7, marginLeft: 4 }}>Tutar</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {QUICK.map(q => (
                  <button key={q} onClick={() => setAmount(String(q))} style={{ flex: 1, height: 38, borderRadius: 999, border: `1.5px solid ${amt === q ? T.green : T.line}`, background: amt === q ? hexA(T.green, 0.1) : T.card, color: amt === q ? T.greenDark : T.ink, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: T.font }}>{q} ₺</button>
                ))}
              </div>
              <Input value={amount} onChange={v => setAmount(v.replace(/[^\d.]/g, ''))} placeholder="0,00" prefix="₺" inputMode="decimal" align="right" big />
            </div>
            <Field label="Açıklama (İsteğe Bağlı)"><Input value={note} onChange={setNote} placeholder="Örn. Yemek bütçesi" /></Field>
          </div>
          <div style={{ padding: '22px 18px 0' }}>
            <Btn variant="green" icon="send" disabled={!valid} onClick={() => app.go('transferConfirm', { from, to, wallet, amount: amt, note, mode })}>Gönder</Btn>
          </div>
        </window.Screen>

        <Sheet title="Kart Seçin" open={sheet === 'from' || sheet === 'to'} onClose={() => setSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cards.map((c, i) => <window.CardPick key={c.id} card={c} idx={i} selected={(sheet === 'from' ? from : to) === c.id} onClick={() => { sheet === 'from' ? setFrom(c.id) : setTo(c.id); setSheet(null); }} />)}
          </div>
        </Sheet>
        <Sheet title="Cüzdan Seçin" open={sheet === 'wallet'} onClose={() => setSheet(null)}>
          <Panel pad={0}>
            {[['resto', 'RESTOPAY', T.coral, 'fork'], ['market', 'MARKET', T.blue, 'basket'], ['gift', 'GIFTPAY', '#E0883B', 'gift']].map(([k, l, c, ic], i, arr) => (
              <Row key={k} icon={ic} iconBg={hexA(c, 0.14)} iconColor={c} title={l} sub={`Kullanılabilir: ${fmt(fromCard.w[k])} ₺`} last={i === arr.length - 1}
                right={wallet === k ? <Icon name="check" size={20} color={T.green} strokeWidth={2.6} /> : null} onClick={() => { setWallet(k); setSheet(null); }} />
            ))}
          </Panel>
        </Sheet>
      </React.Fragment>
    );
  }

  // ── QR recipient ────────────────────────────────────────────
  function TransferQR() {
    const app = window.useApp();
    React.useEffect(() => { const t = setTimeout(() => app.go('transferBetween', { mode: 'other' }), 2400); return () => clearTimeout(t); }, []);
    return (
      <div style={{ position: 'absolute', inset: 0, background: '#0E0D1A' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 50% 40%, #2a2740, #0E0D1A)' }} />
        <div style={{ position: 'relative', paddingTop: window.STATUS_H, background: T.green, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            <button onClick={app.back} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="close" size={24} color="#fff" strokeWidth={2.4} /></button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#fff', marginRight: 40 }}>Alıcı QR Kodu</div>
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: 600, marginBottom: 26, textAlign: 'center', padding: '0 40px' }}>Alıcının QR kodunu<br />çerçeveye hizalayın</div>
          <div style={{ position: 'relative', width: 224, height: 224, borderRadius: 24, border: '3px solid rgba(255,255,255,0.4)' }}>
            <div style={{ position: 'absolute', left: '6%', right: '6%', height: 3, background: T.green, boxShadow: `0 0 14px 3px ${T.green}`, borderRadius: 3, animation: 'scanLine 2.2s ease-in-out infinite' }} />
          </div>
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}><window.Spinner size={18} color="#fff" /> QR aranıyor…</div>
        </div>
      </div>
    );
  }

  // ── confirm ─────────────────────────────────────────────────
  function TransferConfirm({ from, to, wallet, amount, note, mode }) {
    const app = window.useApp();
    const fromCard = app.cardById(from); const toCard = app.cardById(to) || fromCard;
    const [save, setSave] = React.useState(false);
    const [saveName, setSaveName] = React.useState('');
    const wLabel = { resto: 'RESTOPAY', market: 'MARKET', gift: 'GIFTPAY' }[wallet];
    const recipName = mode === 'self' ? toCard.holder : 'M*** Y***';
    const recipNo = mode === 'self' ? window.maskNo(toCard.number) : '6375 •••• •••• 4418';
    const line = (k, v) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.line2}` }}>
        <span style={{ fontSize: 13.5, color: T.ink2 }}>{k}</span>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, textAlign: 'right', maxWidth: 200 }}>{v}</span>
      </div>
    );
    const confirm = () => {
      app.update(s => {
        const f = s.cards.find(x => x.id === from); if (f) f.w[wallet] = Math.max(0, f.w[wallet] - amount);
        if (mode === 'self') { const t = s.cards.find(x => x.id === to); if (t) t.w[wallet] += amount; }
        s.tx.unshift({ id: 't' + Date.now(), cardId: from, type: wLabel, kind: 'TRANSFER', wallet: wLabel, name: recipName, amount: -amount, date: '10.06.2026', time: '12:50', approvalNo: '004' + Math.floor(800 + Math.random() * 99), merchant: 'Bakiye transferi' });
      });
      app.go('transferSuccess', { amount, wallet, from, recipName });
    };
    return (
      <window.Screen padBottom={24}>
        <window.TopBar title="İşlem Onayı" onBack={app.back} brand />
        <div style={{ padding: '20px 18px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: T.ink2, fontWeight: 600 }}>Transfer Tutarı</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: T.green, letterSpacing: -1.2, marginTop: 2 }}>{fmt(amount)} ₺</div>
          </div>
          <Panel style={{ marginTop: 12 }}>
            {line('Gönderen Kartım', `${fromCard.holder} · ${window.maskNo(fromCard.number)}`)}
            {line('Alıcı', recipName)}
            {line('Alıcı Numarası', recipNo)}
            {line('Cüzdan', wLabel)}
            {note && line('Açıklama', note)}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0 0' }}><span style={{ fontSize: 13.5, color: T.ink2 }}>Tarih</span><span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>10.06.2026 · 12:50</span></div>
          </Panel>
          <button onClick={() => setSave(!save)} style={{ display: 'flex', gap: 11, alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 4px 0', textAlign: 'left' }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, background: save ? T.green : 'transparent', border: `2px solid ${save ? T.green : T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{save && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}</div>
            <span style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>Tanımlı alıcı olarak ekle</span>
          </button>
          {save && <div style={{ marginTop: 14 }}><Field label="Kayıt Adı"><Input value={saveName} onChange={setSaveName} placeholder="Örn. Eşim" icon="user" /></Field></div>}
        </div>
        <div style={{ padding: '24px 18px 0' }}>
          <Btn variant="green" icon="check" onClick={confirm}>Onayla</Btn>
        </div>
      </window.Screen>
    );
  }

  // ── success ─────────────────────────────────────────────────
  function TransferSuccess({ amount, wallet, from, recipName }) {
    const app = window.useApp();
    const card = app.cardById(from) || app.store.cards[0];
    const bal = card.w[wallet];
    return (
      <window.Screen padBottom={24}>
        <div style={{ position: 'relative', paddingTop: window.STATUS_H, background: `linear-gradient(160deg, ${T.green}, ${T.greenDark})`, paddingBottom: 44, borderRadius: '0 0 30px 30px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 30 }}>
            <svg width="100%" height="30" viewBox="0 0 390 30" preserveAspectRatio="none"><path d="M0 30 C 80 6, 160 6, 195 16 C 240 28, 320 6, 390 18 L 390 30 Z" fill={T.bg} /></svg>
          </div>
          <div style={{ textAlign: 'center', color: '#fff', position: 'relative' }}>
            <div style={{ width: 84, height: 84, borderRadius: 999, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px auto 16px', animation: 'pop .5s cubic-bezier(.2,.9,.3,1.4)' }}>
              <div style={{ width: 60, height: 60, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={34} color={T.green} strokeWidth={3} /></div>
            </div>
            <h1 style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: -0.5 }}>Transfer Başarılı</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.92 }}>{fmt(amount)} ₺ başarıyla gönderildi.</p>
          </div>
        </div>
        <div style={{ padding: '20px 18px 0' }}>
          <Receipt merchant={recipName} date="10.06.2026" time="12:50" type={{ resto: 'RESTOPAY', market: 'MARKET', gift: 'GIFTPAY' }[wallet]} amount={amount} balance={bal} cardNo={window.maskNo(card.number)} label="TRANSFER İŞLEMİ BAŞARILI" />
          <div style={{ marginTop: 18 }}><Btn variant="navy" onClick={() => app.reset()}>Tamam</Btn></div>
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    transferMenu: { C: TransferMenu, full: true },
    transferBetween: { C: TransferBetween, full: true },
    transferQR: { C: TransferQR, full: true, dark: true },
    transferConfirm: { C: TransferConfirm, full: true },
    transferSuccess: { C: TransferSuccess, full: true, dark: true },
  });
  window.Sheet = Sheet; window.PickerField = PickerField;
})();
