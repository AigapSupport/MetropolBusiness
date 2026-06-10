// screens-auth.jsx — onboarding / login / register (outside tab nav).
(function () {
  const { T, hexA, Btn, Field, Input, CodeInput, Ph } = window;
  const Icon = window.Icon;

  function AuthHost() {
    const app = window.useApp();
    const [step, setStep] = React.useState('welcome');
    const [code, setCode] = React.useState('');
    const [phone, setPhone] = React.useState('');
    const [otp, setOtp] = React.useState('');
    const [kvkk, setKvkk] = React.useState(false);
    const [r, setR] = React.useState({ first: '', last: '', email: '' });
    const [sec, setSec] = React.useState(0);
    React.useEffect(() => { if (sec > 0) { const t = setTimeout(() => setSec(sec - 1), 1000); return () => clearTimeout(t); } }, [sec]);

    const go = (s, opts = {}) => { setStep(s); if (opts.timer) setSec(58); };

    const Wrap = ({ children, back }) => (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.bg }}>
        <div style={{ paddingTop: window.STATUS_H }} />
        {back && <div style={{ padding: '6px 8px' }}><button onClick={back} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="back" size={24} color={T.ink} strokeWidth={2.2} /></button></div>}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 24px 28px', display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    );

    if (step === 'welcome') {
      return (
        <Wrap>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
              <div style={{ width: 76, height: 76, borderRadius: 24, background: `linear-gradient(160deg, ${T.brand}, ${T.brandDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 16px 32px ${hexA(T.brand, 0.4)}`, marginBottom: 20 }}>
                <Icon name="card" size={38} color="#fff" strokeWidth={1.8} />
              </div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: -0.8 }}>Hoş geldiniz</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, color: T.ink2, textAlign: 'center', lineHeight: 1.5 }}>Firma kodunuzu girerek kurumsal<br />yan haklar uygulamanıza başlayın.</p>
            </div>
            <Field label="Firma Kodu" style={{ marginBottom: 16 }}>
              <Input value={code} onChange={v => setCode(v.toUpperCase())} placeholder="Örn. NOVA" icon="briefcase" />
            </Field>
            <Btn variant="coral" onClick={() => go('phone')} disabled={code.length < 2}>Devam Et</Btn>
            <button onClick={() => go('phone')} style={{ background: 'none', border: 'none', color: T.ink2, fontSize: 13.5, fontWeight: 600, marginTop: 18, cursor: 'pointer', fontFamily: T.font }}>Firma kodunuz yok mu? <span style={{ color: T.brand, fontWeight: 700 }}>Yardım alın</span></button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11.5, color: T.ink3, marginTop: 20 }}>Powered by metropolkart · v3.2</div>
        </Wrap>
      );
    }

    if (step === 'phone') {
      return (
        <Wrap back={() => go('welcome')}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>Telefon numaranız</h1>
            <p style={{ margin: '8px 0 0', fontSize: 15, color: T.ink2, lineHeight: 1.5 }}>Doğrulama kodu göndereceğiz. Numaranız firma kaydınızla eşleşmeli.</p>
          </div>
          <Field label="Cep Telefonu" style={{ marginBottom: 18 }}>
            <Input value={phone} onChange={setPhone} placeholder="5XX XXX XX XX" prefix="+90" inputMode="tel" icon="phone" />
          </Field>
          <button onClick={() => setKvkk(!kvkk)} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, marginBottom: 24 }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1, background: kvkk ? T.green : 'transparent', border: `2px solid ${kvkk ? T.green : T.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {kvkk && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}><b style={{ color: T.ink }}>KVKK Aydınlatma Metni</b>’ni ve <b style={{ color: T.ink }}>Kullanım Koşulları</b>’nı okudum, onaylıyorum.</span>
          </button>
          <div style={{ flex: 1 }} />
          <Btn variant="coral" onClick={() => go('otp', { timer: true })} disabled={phone.length < 10 || !kvkk}>Kod Gönder</Btn>
          <button onClick={() => go('register')} style={{ background: 'none', border: 'none', color: T.ink2, fontSize: 13.5, fontWeight: 600, marginTop: 16, cursor: 'pointer', fontFamily: T.font, textAlign: 'center' }}>Hesabınız yok mu? <span style={{ color: T.brand, fontWeight: 700 }}>Kayıt Olun</span></button>
        </Wrap>
      );
    }

    if (step === 'otp') {
      return (
        <Wrap back={() => go('phone')}>
          <div style={{ marginBottom: 30 }}>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>Doğrulama kodu</h1>
            <p style={{ margin: '8px 0 0', fontSize: 15, color: T.ink2, lineHeight: 1.5 }}><b style={{ color: T.ink }}>+90 {phone}</b> numarasına gönderilen 6 haneli kodu girin.</p>
          </div>
          <CodeInput value={otp} onChange={setOtp} autoFocus />
          <div style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: T.ink2 }}>
            {sec > 0 ? <span>Kodu tekrar gönder · <b style={{ color: T.ink }}>0:{String(sec).padStart(2, '0')}</b></span>
              : <button onClick={() => setSec(58)} style={{ background: 'none', border: 'none', color: T.brand, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: T.font }}>Kodu tekrar gönder</button>}
          </div>
          <div style={{ flex: 1 }} />
          <Btn variant="coral" onClick={() => app.setAuthed(true)} disabled={otp.length < 6}>Doğrula ve Giriş Yap</Btn>
        </Wrap>
      );
    }

    // register
    return (
      <Wrap back={() => go('phone')}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>Kayıt Ol</h1>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: T.ink2, lineHeight: 1.5 }}>Firma kaydınızı tamamlamak için bilgilerinizi girin.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Ad"><Input value={r.first} onChange={v => setR({ ...r, first: v })} placeholder="Adınız" icon="user" /></Field>
          <Field label="Soyad"><Input value={r.last} onChange={v => setR({ ...r, last: v })} placeholder="Soyadınız" /></Field>
          <Field label="Kurumsal E-posta"><Input value={r.email} onChange={v => setR({ ...r, email: v })} placeholder="ad@firma.com" icon="mail" inputMode="email" /></Field>
        </div>
        <div style={{ flex: 1 }} />
        <Btn variant="coral" onClick={() => go('otp', { timer: true })} disabled={!r.first || !r.last || !r.email}>Devam Et</Btn>
      </Wrap>
    );
  }

  // ── Notifications screen (registered in tab nav) ────────────
  function Notifications() {
    const app = window.useApp();
    const items = app.store.notifications;
    return (
      <window.Screen>
        <window.TopBar title="Bildirimler" onBack={app.back} trailing={items.length ? <button onClick={() => app.update(s => s.notifications = [])} style={{ background: 'none', border: 'none', color: T.brand, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, padding: 8 }}>Temizle</button> : null} />
        {items.length === 0
          ? <window.Empty icon="bell" title="Bildirim yok" sub="Yeni bildirimleriniz burada görünecek." />
          : <div style={{ padding: 16 }}>
            <window.Panel pad={0}>
              {items.map((n, i) => (
                <window.Row key={n.id} icon={n.icon} iconBg={hexA(n.accent, 0.14)} iconColor={n.accent} title={n.title} sub={n.body}
                  right={<span style={{ fontSize: 12, color: T.ink3, fontWeight: 600 }}>{n.time}</span>} last={i === items.length - 1} />
              ))}
            </window.Panel>
          </div>}
      </window.Screen>
    );
  }

  window.AuthHost = AuthHost;
  window.SCREENS = window.SCREENS || {};
  window.SCREENS.notifications = { C: Notifications };
})();
