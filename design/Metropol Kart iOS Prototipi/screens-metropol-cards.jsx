// screens-metropol-cards.jsx — add card flow (3 steps), card detail, delete.
(function () {
  const { T, fmt, hexA, Btn, Field, Input, CodeInput, Panel, Row, SectionTitle, Segmented } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  const Flow = ({ title, step, total, onBack, children, footer }) => (
    <window.Screen padBottom={20}>
      <window.TopBar title={title} onBack={onBack} brand />
      <div style={{ padding: '4px 18px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i < step ? T.brand : hexA(T.navy, 0.12), transition: 'background .3s' }} />
          ))}
        </div>
        {children}
      </div>
      <div style={{ padding: '20px 18px 0' }}>{footer}</div>
    </window.Screen>
  );

  // Step 1 — number + phone
  function CardAdd1() {
    const app = window.useApp();
    const [no, setNo] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const fmtNo = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    return (
      <Flow title="Kart Ekle" step={1} total={3} onBack={app.back}
        footer={<Btn variant="coral" disabled={no.replace(/\s/g, '').length < 16 || phone.length < 10} onClick={() => app.go('cardAdd2', { no, phone })}>Devam Et</Btn>}>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>Kart bilgileriniz</h2>
        <p style={{ margin: '0 0 22px', fontSize: 14.5, color: T.ink2, lineHeight: 1.5 }}>Metropol Kart numaranızı ve karta tanımlı telefon numaranızı girin.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Kart Numarası"><Input value={fmtNo(no)} onChange={v => setNo(v.replace(/\D/g, '').slice(0, 16))} placeholder="6375 •••• •••• ••••" inputMode="numeric" icon="card" /></Field>
          <Field label="Telefon Numarası" hint="Kart sahibine ait, kayıtlı GSM numarası."><Input value={phone} onChange={setPhone} placeholder="5XX XXX XX XX" prefix="+90" inputMode="tel" icon="phone" /></Field>
        </div>
      </Flow>
    );
  }

  // Step 2 — OTP
  function CardAdd2({ no, phone }) {
    const app = window.useApp();
    const [otp, setOtp] = React.useState('');
    const [sec, setSec] = React.useState(54);
    React.useEffect(() => { if (sec > 0) { const t = setTimeout(() => setSec(sec - 1), 1000); return () => clearTimeout(t); } }, [sec]);
    return (
      <Flow title="Kart Ekle" step={2} total={3} onBack={app.back}
        footer={<Btn variant="coral" disabled={otp.length < 6} onClick={() => app.go('cardAdd3', { no, phone })}>Doğrula</Btn>}>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>SMS doğrulama</h2>
        <p style={{ margin: '0 0 26px', fontSize: 14.5, color: T.ink2, lineHeight: 1.5 }}><b style={{ color: T.ink }}>+90 {phone || '5XX XXX XX XX'}</b> numarasına gönderilen kodu girin.</p>
        <CodeInput value={otp} onChange={setOtp} autoFocus />
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: T.ink2 }}>
          {sec > 0 ? <span>Tekrar gönder · <b style={{ color: T.ink }}>0:{String(sec).padStart(2, '0')}</b></span>
            : <button onClick={() => setSec(54)} style={{ background: 'none', border: 'none', color: T.brand, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: T.font }}>Kodu tekrar gönder</button>}
        </div>
      </Flow>
    );
  }

  // Step 3 — user info + confirm
  function CardAdd3({ no, phone }) {
    const app = window.useApp();
    const [f, setF] = React.useState({ first: 'Elif', last: 'Yıldırım', email: 'elif.yildirim@firma.com', tc: '' });
    const finish = () => {
      const id = 'c' + (app.store.cards.length + 1);
      app.update(s => s.cards.push({ id, holder: `${f.first.toUpperCase()} ${f.last.toUpperCase()}`, number: (no.replace(/\D/g, '') || '6375000011112222'), w: { resto: 0, market: 0, gift: 0 } }));
      app.setActiveCard(id);
      app.reset();
      app.showToast('Kart başarıyla eklendi 🎉');
    };
    return (
      <Flow title="Kart Ekle" step={3} total={3} onBack={app.back}
        footer={<Btn variant="green" icon="check" onClick={finish} disabled={!f.first || !f.last || !f.email}>Onayla ve Ekle</Btn>}>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>Kullanıcı bilgileri</h2>
        <p style={{ margin: '0 0 22px', fontSize: 14.5, color: T.ink2, lineHeight: 1.5 }}>Kart sahibine ait bilgileri doğrulayın.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Ad" style={{ flex: 1 }}><Input value={f.first} onChange={v => setF({ ...f, first: v })} /></Field>
            <Field label="Soyad" style={{ flex: 1 }}><Input value={f.last} onChange={v => setF({ ...f, last: v })} /></Field>
          </div>
          <Field label="E-posta"><Input value={f.email} onChange={v => setF({ ...f, email: v })} icon="mail" inputMode="email" /></Field>
          <Field label="T.C. Kimlik No (opsiyonel)"><Input value={f.tc} onChange={v => setF({ ...f, tc: v.replace(/\D/g, '').slice(0, 11) })} placeholder="•••••••••••" inputMode="numeric" /></Field>
        </div>
      </Flow>
    );
  }

  // Card detail — 2 tabs
  function CardDetail({ cardId }) {
    const app = window.useApp();
    const card = app.cardById(cardId) || app.store.cards[0];
    const [tab, setTab] = React.useState('balances');
    const idx = app.store.cards.findIndex(c => c.id === card.id);
    const recent = app.store.tx.filter(t => t.cardId === card.id).slice(0, 5);
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Kart Detayı" onBack={app.back} brand />
        <div style={{ padding: '14px 18px 0' }}>
          <window.CardVisual card={card} idx={idx} mask onCopy={() => app.showToast('Kart numarası kopyalandı')} />
          <div style={{ marginTop: 18 }}>
            <Segmented value={tab} onChange={setTab} options={[{ value: 'balances', label: 'Bakiyeler' }, { value: 'actions', label: 'İşlemler' }]} />
          </div>
        </div>
        {tab === 'balances' ? (
          <div style={{ padding: '20px 18px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
              {[['resto', 'RESTOPAY', T.coral, 'fork'], ['gift', 'GIFTPAY', '#E0883B', 'gift']].map(([k, lbl, c, ic]) => (
                <div key={k} style={{ background: T.card, borderRadius: 16, padding: 16, boxShadow: T.shadowSm, borderTop: `3px solid ${c}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: hexA(c, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={16} color={c} strokeWidth={2} /></div>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: c }}>{lbl}</span>
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>{fmt(k === 'resto' ? card.w.resto + card.w.market : card.w.gift)} <span style={{ fontSize: 14 }}>₺</span></div>
                  <div style={{ fontSize: 11.5, color: T.ink2, marginTop: 2 }}>Kullanılabilir Bakiye</div>
                </div>
              ))}
            </div>
            <SectionTitle action="Tümü" onAction={() => app.go('history')}>Son 5 İşlem</SectionTitle>
            <Panel pad={0}>{recent.length ? recent.map((t, i) => <window.TxRow key={t.id} tx={t} last={i === recent.length - 1} />) : <window.Empty icon="history" title="İşlem yok" />}</Panel>
          </div>
        ) : (
          <div style={{ padding: '20px 18px 0' }}>
            <Panel pad={0}>
              <Row icon="transfer" iconBg={hexA(T.green, 0.14)} iconColor={T.green} title="Bakiye Transferi" sub="Karta veya cebe gönder" chevron onClick={() => { app.switchTab('metropol'); app.go('transferMenu'); }} />
              <Row icon="history" iconBg={hexA(T.purple, 0.14)} iconColor={T.purple} title="İşlem Geçmişi" sub="Tüm hareketler" chevron onClick={() => app.go('history')} />
              <Row icon="settings" iconBg={hexA(T.blue, 0.14)} iconColor={T.blue} title="Kullanım Ayarları" sub="Limit, online ödeme, NFC" chevron onClick={() => app.showToast('Kullanım ayarları açıldı')} last />
            </Panel>
            <div style={{ marginTop: 16 }}>
              <Panel pad={0}>
                <Row icon="trash" iconBg={hexA(T.coral, 0.14)} iconColor={T.coral} title="Kartı Sil" sub="Bu kartı hesabınızdan kaldır" danger chevron last onClick={() => app.go('cardDelete', { cardId: card.id })} />
              </Panel>
            </div>
          </div>
        )}
      </window.Screen>
    );
  }

  // Delete confirm — full screen dialog
  function CardDelete({ cardId }) {
    const app = window.useApp();
    const card = app.cardById(cardId) || app.store.cards[0];
    const del = () => {
      app.update(s => s.cards = s.cards.filter(c => c.id !== cardId));
      const left = app.store.cards.filter(c => c.id !== cardId);
      app.setActiveCard(left[0] ? left[0].id : null);
      app.reset();
      app.showToast('Kart silindi');
    };
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,27,46,0.55)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', zIndex: 1, animation: 'fadeBg .25s' }}>
        <div onClick={app.back} style={{ flex: 1 }} />
        <div style={{ background: T.card, borderRadius: '28px 28px 0 0', padding: '28px 24px calc(env(safe-area-inset-bottom) + 32px)', animation: 'sheetUp .3s cubic-bezier(.2,.8,.3,1)' }}>
          <div style={{ width: 40, height: 5, borderRadius: 999, background: hexA(T.navy, 0.15), margin: '0 auto 22px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: hexA(T.coral, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="trash" size={30} color={T.coral} strokeWidth={1.8} />
            </div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>Kartı silmek istiyor musunuz?</h2>
            <p style={{ margin: '8px 0 0', fontSize: 14.5, color: T.ink2, lineHeight: 1.5 }}>{window.maskNo(card.number)} numaralı kart hesabınızdan kaldırılacak. Bu işlem geri alınamaz.</p>
          </div>
          <Btn variant="coral" icon="trash" onClick={del}>Evet, Kartı Sil</Btn>
          <div style={{ height: 10 }} />
          <Btn variant="ghost" onClick={app.back}>Vazgeç</Btn>
        </div>
      </div>
    );
  }

  Object.assign(window.SCREENS, {
    cardAdd1: { C: CardAdd1, full: true },
    cardAdd2: { C: CardAdd2, full: true },
    cardAdd3: { C: CardAdd3, full: true },
    cardDetail: { C: CardDetail, full: true },
    cardDelete: { C: CardDelete, full: true },
  });
})();
