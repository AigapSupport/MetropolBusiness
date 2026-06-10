// screens-profile.jsx — account drawer + profile, business card, security, language, delete.
(function () {
  const { T, hexA, Btn, Field, Input, Panel, Row, Toggle, BrandMark } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  function AvatarBig({ profile, size = 84, camera }) {
    return (
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ width: size, height: size, borderRadius: 999, background: `linear-gradient(140deg, ${profile.avatar}, ${hexA(profile.avatar, 0.65)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.36, fontWeight: 800 }}>
          {profile.first[0]}{profile.last[0]}
        </div>
        {camera && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderRadius: 999, background: T.brand, border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="camera" size={15} color="#fff" strokeWidth={2} /></div>}
      </div>
    );
  }

  // ── Account drawer ──────────────────────────────────────────
  function AccountDrawer() {
    const app = window.useApp();
    const open = app.menuOpen;
    const p = app.store.profile;
    const nav = (screen) => { app.setMenuOpen(false); setTimeout(() => app.go(screen), 60); };
    const items = [
      ['user', 'Profilim', 'profile'], ['shield', 'Güvenlik', 'security'], ['bell', 'Kampanya/Duyuru İzinleri', 'permissions'],
      ['document', 'Kartvizitim', 'businessCard'], ['card', 'Kart Kullanım Ayarları', 'cardSettings'], ['language', 'Dil Seçeneği', 'language'],
    ];
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: open ? 'auto' : 'none' }}>
        <div onClick={() => app.setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(28,27,46,0.5)', opacity: open ? 1 : 0, transition: 'opacity .25s' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 312, background: T.bg, transform: open ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .3s cubic-bezier(.3,.8,.35,1)', display: 'flex', flexDirection: 'column', boxShadow: '8px 0 30px rgba(28,27,46,0.2)' }}>
          {/* header */}
          <div style={{ paddingTop: window.STATUS_H + 8, padding: `${window.STATUS_H + 8}px 20px 20px`, background: T.card, borderBottom: `1px solid ${T.line2}` }}>
            <div onClick={() => nav('profile')} style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <AvatarBig profile={p} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: T.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
              </div>
              <Icon name="chevron" size={18} color={T.ink3} strokeWidth={2} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <Panel pad={0}>
              {items.map(([ic, t, sc], i) => (
                <Row key={sc} icon={ic} title={t} chevron last={i === items.length - 1} onClick={() => nav(sc)} />
              ))}
            </Panel>
            {/* white-label demo */}
            <div style={{ fontSize: 11.5, fontWeight: 700, color: T.ink3, margin: '22px 4px 10px', letterSpacing: 0.3 }}>BEYAZ ETİKET DEMO · MARKA</div>
            <div style={{ display: 'flex', gap: 10, padding: '0 2px' }}>
              {Object.entries(window.PALETTES).map(([k, v]) => (
                <button key={k} onClick={() => app.setBrandKey(k)} style={{ flex: 1, height: 46, borderRadius: 14, border: `2px solid ${app.store.brandKey === k ? v.brand : T.line}`, background: T.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 7, background: v.brand }} />
                  {app.store.brandKey === k && <div style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: 999, background: v.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}><Icon name="check" size={10} color="#fff" strokeWidth={3} /></div>}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: T.ink3, margin: '8px 6px 0', lineHeight: 1.4 }}>Aktif firma: <b style={{ color: T.ink2 }}>{window.PALETTES[app.store.brandKey].name}</b>. Renk ve logo token bazlı; düzen sabit kalır.</div>
            <div style={{ marginTop: 22 }}>
              <Panel pad={0}>
                <Row icon="trash" iconColor={T.coral} iconBg={hexA(T.coral, 0.13)} title="Hesabımı Sil" danger last onClick={() => nav('deleteAccount')} />
              </Panel>
            </div>
            <button onClick={() => { app.setMenuOpen(false); app.setAuthed(false); }} style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, border: 'none', background: 'transparent', color: T.ink2, fontWeight: 700, fontSize: 14.5, cursor: 'pointer', fontFamily: T.font }}>
              <Icon name="logout" size={20} color={T.ink2} strokeWidth={2} /> Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    );
  }
  window.AccountDrawer = AccountDrawer;

  // ── Profile ─────────────────────────────────────────────────
  function Profile() {
    const app = window.useApp();
    const p = app.store.profile;
    const [f, setF] = React.useState({ phone: p.phone, email: p.email, tc: p.tc, city: p.city });
    const [sheet, setSheet] = React.useState(false);
    const EditRow = ({ label, value, onChange, icon, locked }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${T.line2}` }}>
        <Icon name={icon} size={20} color={T.ink3} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: T.ink2, fontWeight: 600, marginBottom: 2 }}>{label}</div>
          <input value={value} onChange={e => onChange && onChange(e.target.value)} readOnly={locked} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: T.ink, fontFamily: T.font, width: '100%' }} />
        </div>
        {!locked && <Icon name="edit" size={17} color={T.ink3} />}
      </div>
    );
    return (
      <React.Fragment>
        <window.Screen padBottom={28}>
          <window.TopBar title="Profilim" onBack={app.back} brand />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 8px' }}>
            <AvatarBig profile={p} camera />
            <div style={{ fontSize: 20, fontWeight: 800, color: T.ink, marginTop: 14, letterSpacing: -0.4 }}>{p.name}</div>
            <div style={{ fontSize: 13.5, color: T.ink2, marginTop: 2 }}>{p.title} · {p.company}</div>
          </div>
          <div style={{ padding: '16px 18px 0' }}>
            <Panel pad={0}>
              <EditRow label="Cep Telefonu" icon="phone" value={f.phone} onChange={v => setF({ ...f, phone: v })} />
              <EditRow label="Mail Adresi" icon="mail" value={f.email} onChange={v => setF({ ...f, email: v })} />
              <EditRow label="T.C. Kimlik No" icon="document" value={f.tc} onChange={v => setF({ ...f, tc: v })} />
              <button onClick={() => setSheet(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: T.font, textAlign: 'left' }}>
                <Icon name="pin" size={20} color={T.ink3} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 12, color: T.ink2, fontWeight: 600, marginBottom: 2 }}>Şehir</div><div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{f.city}</div></div>
                <Icon name="chevronDown" size={18} color={T.ink3} strokeWidth={2} />
              </button>
            </Panel>
            <div style={{ marginTop: 22 }}><Btn variant="green" icon="check" onClick={() => { app.update(s => Object.assign(s.profile, f)); app.showToast('Profil güncellendi'); }}>Güncelle</Btn></div>
          </div>
        </window.Screen>
        <window.Sheet title="Şehir Seçin" open={sheet} onClose={() => setSheet(false)}>
          <Panel pad={0}>
            {['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya'].map((c, i, a) => (
              <Row key={c} title={c} last={i === a.length - 1} right={f.city === c ? <Icon name="check" size={20} color={T.brand} strokeWidth={2.6} /> : null} onClick={() => { setF({ ...f, city: c }); setSheet(false); }} />
            ))}
          </Panel>
        </window.Sheet>
      </React.Fragment>
    );
  }

  // ── Business card ───────────────────────────────────────────
  function BusinessCard() {
    const app = window.useApp();
    const p = app.store.profile;
    const [f, setF] = React.useState({ first: p.first, last: p.last, company: p.company, role: p.title, phone: p.phone, email: p.email });
    const [extra, setExtra] = React.useState(false);
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Kartvizitim" onBack={app.back} brand />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 18px' }}><AvatarBig profile={p} camera /></div>
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Ad" style={{ flex: 1 }}><Input value={f.first} onChange={v => setF({ ...f, first: v })} /></Field>
            <Field label="Soyad" style={{ flex: 1 }}><Input value={f.last} onChange={v => setF({ ...f, last: v })} /></Field>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Field label="Şirket İsmi" style={{ flex: 1 }}><Input value={f.company} onChange={v => setF({ ...f, company: v })} /></Field>
            <Field label="Mesleğiniz" style={{ flex: 1 }}><Input value={f.role} onChange={v => setF({ ...f, role: v })} /></Field>
          </div>
          <Field label="Telefon"><Input value={f.phone} onChange={v => setF({ ...f, phone: v })} icon="phone" /></Field>
          <Field label="E-Mail"><Input value={f.email} onChange={v => setF({ ...f, email: v })} icon="mail" /></Field>
          <button onClick={() => setExtra(!extra)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 4px', fontFamily: T.font }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: T.ink }}>Ek Bilgiler</span>
            <Icon name={extra ? 'chevronUp' : 'chevronDown'} size={18} color={T.ink3} strokeWidth={2} />
          </button>
          {extra && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Web Sitesi"><Input value="" onChange={() => { }} placeholder="www.firma.com" icon="globe" /></Field>
            <Field label="Adres"><Input value="" onChange={() => { }} placeholder="Ofis adresi" icon="pin" /></Field>
          </div>}
          <div style={{ marginTop: 8 }}><Btn variant="coral" icon="qr" onClick={() => app.showToast('Dijital kartvizit QR’ı oluşturuldu')}>QR Oluştur</Btn></div>
        </div>
      </window.Screen>
    );
  }

  // ── Security ────────────────────────────────────────────────
  function Security() {
    const app = window.useApp();
    const [bio, setBio] = React.useState(true);
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Güvenlik" onBack={app.back} brand />
        <div style={{ padding: '18px 18px 0' }}>
          <Panel pad={0}>
            <Row icon="lock" iconBg={hexA(T.navy, 0.1)} iconColor={T.navy} title="Şifre Değiştir" sub="Son değişiklik: 2 ay önce" chevron onClick={() => app.showToast('Şifre değiştirme açıldı')} />
            <Row icon="fingerprint" iconBg={hexA(T.green, 0.13)} iconColor={T.green} title="Biyometrik Giriş" sub="Face ID / parmak izi ile giriş" right={<Toggle on={bio} onChange={setBio} />} />
            <Row icon="keypad" iconBg={hexA(T.purple, 0.13)} iconColor={T.purple} title="PIN Sıfırlama" sub="6 haneli işlem PIN’i" chevron last onClick={() => app.showToast('PIN sıfırlama açıldı')} />
          </Panel>
        </div>
      </window.Screen>
    );
  }

  // ── Permissions ─────────────────────────────────────────────
  function Permissions() {
    const app = window.useApp();
    const [p, setP] = React.useState({ camp: true, ann: true, sms: false, email: true });
    const rows = [['camp', 'Kampanya Bildirimleri', 'percent'], ['ann', 'Duyuru Bildirimleri', 'megaphone'], ['sms', 'SMS ile Bilgilendirme', 'chat'], ['email', 'E-posta Bülteni', 'mail']];
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="İzinler" onBack={app.back} brand />
        <div style={{ padding: '18px 18px 0' }}>
          <Panel pad={0}>
            {rows.map(([k, t, ic], i) => <Row key={k} icon={ic} iconBg={hexA(T.brand, 0.12)} iconColor={T.brand} title={t} right={<Toggle on={p[k]} onChange={v => setP({ ...p, [k]: v })} />} last={i === rows.length - 1} />)}
          </Panel>
        </div>
      </window.Screen>
    );
  }

  // ── Card usage settings ─────────────────────────────────────
  function CardSettings() {
    const app = window.useApp();
    const [s, setS] = React.useState({ online: true, nfc: true, abroad: false });
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Kart Kullanım Ayarları" onBack={app.back} brand />
        <div style={{ padding: '18px 18px 0' }}>
          <Panel pad={0}>
            <Row icon="globe" iconBg={hexA(T.blue, 0.13)} iconColor={T.blue} title="Online Ödeme" sub="İnternetten alışverişe izin ver" right={<Toggle on={s.online} onChange={v => setS({ ...s, online: v })} />} />
            <Row icon="nfc" iconBg={hexA(T.green, 0.13)} iconColor={T.green} title="Temassız (NFC)" sub="Temassız ödeme" right={<Toggle on={s.nfc} onChange={v => setS({ ...s, nfc: v })} />} />
            <Row icon="pin" iconBg={hexA(T.purple, 0.13)} iconColor={T.purple} title="Yurt Dışı Kullanım" right={<Toggle on={s.abroad} onChange={v => setS({ ...s, abroad: v })} />} last />
          </Panel>
        </div>
      </window.Screen>
    );
  }

  // ── Language ────────────────────────────────────────────────
  function Language() {
    const app = window.useApp();
    const [lang, setLang] = React.useState('Türkçe');
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Dil Seçeneği" onBack={app.back} brand />
        <div style={{ padding: '18px 18px 0' }}>
          <Panel pad={0}>
            {[['Türkçe', '🇹🇷'], ['English', '🇬🇧'], ['Deutsch', '🇩🇪'], ['العربية', '🇸🇦']].map(([l, fl], i, a) => (
              <Row key={l} icon={<div style={{ width: 40, height: 40, borderRadius: 12, background: hexA(T.navy, 0.06), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{fl}</div>} title={l} last={i === a.length - 1} right={lang === l ? <Icon name="check" size={20} color={T.brand} strokeWidth={2.6} /> : null} onClick={() => { setLang(l); app.showToast('Dil güncellendi'); }} />
            ))}
          </Panel>
        </div>
      </window.Screen>
    );
  }

  // ── Delete account ──────────────────────────────────────────
  function DeleteAccount() {
    const app = window.useApp();
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Hesabımı Sil" onBack={app.back} brand />
        <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: 24, background: hexA(T.coral, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}><Icon name="trash" size={34} color={T.coral} strokeWidth={1.7} /></div>
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>Hesabınızı silmek üzeresiniz</h2>
          <p style={{ margin: '12px 0 0', fontSize: 14.5, color: T.ink2, lineHeight: 1.6 }}>Bu işlem geri alınamaz. Tüm kart bilgileriniz, işlem geçmişiniz ve yan hak kayıtlarınız kalıcı olarak silinecektir.</p>
        </div>
        <div style={{ padding: '24px 18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: hexA(T.coral, 0.06), borderRadius: 14, padding: 16, fontSize: 13, color: T.coralDark, lineHeight: 1.5, fontWeight: 500 }}>
            ⚠️ Aktif bakiyesi bulunan kartınız var. Silmeden önce bakiyenizi transfer etmeniz önerilir.
          </div>
          <Btn variant="coral" icon="trash" onClick={() => app.showToast('Hesap silme talebi alındı', 'err')}>Hesabımı Kalıcı Olarak Sil</Btn>
          <Btn variant="ghost" onClick={app.back}>Vazgeç</Btn>
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    profile: { C: Profile, full: true },
    businessCard: { C: BusinessCard, full: true },
    security: { C: Security, full: true },
    permissions: { C: Permissions, full: true },
    cardSettings: { C: CardSettings, full: true },
    language: { C: Language, full: true },
    deleteAccount: { C: DeleteAccount, full: true },
  });
})();
