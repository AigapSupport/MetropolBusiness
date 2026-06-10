// screens-other.jsx — Diğer tab: İK modules (izin, masraf, masraf onay).
(function () {
  const { T, fmt, hexA, Btn, Field, Input, Panel, Row, Badge, Ph } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  const STATUS = { 'Onaylandı': T.green, 'Beklemede': '#E0883B', 'Reddedildi': T.coral };
  const StatusBadge = ({ s }) => <Badge color={STATUS[s]} style={{ padding: '4px 10px' }}>{s}</Badge>;

  // mini calendar sheet
  function CalendarSheet({ open, onClose, onPick, value }) {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const lead = 0; // June 1 2026 is Monday
    return (
      <window.Sheet title="Tarih Seçin" open={open} onClose={onClose}>
        <div style={{ padding: '0 8px 8px' }}>
          <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Haziran 2026</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
            {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'].map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.ink3 }}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
            {Array.from({ length: lead }).map((_, i) => <div key={'x' + i} />)}
            {days.map(d => {
              const label = `${String(d).padStart(2, '0')}.06.2026`;
              const sel = value === label;
              return <button key={d} onClick={() => { onPick(label); onClose(); }} style={{ aspectRatio: '1', borderRadius: 10, border: 'none', background: sel ? T.brand : 'transparent', color: sel ? '#fff' : T.ink, fontSize: 14, fontWeight: sel ? 800 : 600, cursor: 'pointer', fontFamily: T.font }}>{d}</button>;
            })}
          </div>
        </div>
      </window.Sheet>
    );
  }

  function Other() {
    const app = window.useApp();
    const isManager = app.store.profile.role === 'manager';
    const mods = [
      { id: 'leave', title: 'İzin Talebi', sub: 'İzin oluştur & takip et', icon: 'calendar', accent: T.blue, go: 'leave' },
      { id: 'expense', title: 'Masraf Talebi', sub: 'Harcama girişi', icon: 'receipt', accent: T.green, go: 'expense' },
      ...(isManager ? [{ id: 'approve', title: 'Masraf Onay', sub: 'Onay bekleyenler', icon: 'check', accent: T.coral, go: 'expenseApprove', badge: app.store.approvals.length }] : []),
      { id: 'card', title: 'Kartvizitim', sub: 'Dijital kartvizit', icon: 'user', accent: T.purple, go: 'businessCard' },
    ];
    return (
      <window.Screen padBottom={120}>
        <window.TabTitle title="Diğer" sub="İK & kurumsal modüller" />
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {mods.map(m => (
              <button key={m.id} onClick={() => app.go(m.go)} style={{ position: 'relative', background: T.card, border: 'none', borderRadius: 18, padding: 18, cursor: 'pointer', boxShadow: T.shadowSm, fontFamily: T.font, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 15, background: hexA(m.accent, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={m.icon} size={25} color={m.accent} strokeWidth={1.9} /></div>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: T.ink, letterSpacing: -0.2 }}>{m.title}</div>
                  <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 2 }}>{m.sub}</div>
                </div>
                {m.badge ? <span style={{ position: 'absolute', top: 14, right: 14, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, background: m.accent, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{m.badge}</span> : null}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: 16, background: hexA(T.navy, 0.04), borderRadius: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon name="info" size={20} color={T.ink3} />
            <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>Modüller, firma içindeki yetki segmentinize göre görüntülenir. Yeni modüller İK tarafından tanımlanabilir.</div>
          </div>
        </div>
      </window.Screen>
    );
  }

  // ── Leave request ───────────────────────────────────────────
  function Leave() {
    const app = window.useApp();
    const [type, setType] = React.useState('Yıllık İzin');
    const [start, setStart] = React.useState('');
    const [end, setEnd] = React.useState('');
    const [desc, setDesc] = React.useState('');
    const [sheet, setSheet] = React.useState(null);
    const days = (start && end) ? Math.max(1, (parseInt(end) - parseInt(start)) + 1) : (start ? 1 : 0);
    const submit = () => {
      app.update(s => s.leaveRequests.unshift({ id: 'l' + Date.now(), type, start, end: end || start, days: days || 1, status: 'Beklemede' }));
      setStart(''); setEnd(''); setDesc(''); app.showToast('İzin talebi gönderildi');
    };
    return (
      <React.Fragment>
        <window.Screen padBottom={28}>
          <window.TopBar title="İzin Talebi" onBack={app.back} brand />
          <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <window.PickerField label="İzin Tipi" icon="calendar" accent={T.blue} value={type} onClick={() => setSheet('type')} />
            <div style={{ display: 'flex', gap: 12 }}>
              <window.PickerField label="Başlangıç" icon="calendar" accent={T.green} value={start} onClick={() => setSheet('start')} />
              <window.PickerField label="Bitiş" icon="calendar" accent={T.coral} value={end} onClick={() => setSheet('end')} />
            </div>
            {days > 0 && <div style={{ background: hexA(T.blue, 0.08), borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.ink2 }}>Toplam Gün</span><span style={{ fontSize: 18, fontWeight: 800, color: T.blue }}>{days} gün</span>
            </div>}
            <Field label="Açıklama"><Input value={desc} onChange={setDesc} placeholder="İzin nedeni (opsiyonel)" /></Field>
            <Btn variant="navy" disabled={!start} onClick={submit} style={{ background: T.blue, boxShadow: `0 8px 20px ${hexA(T.blue, 0.3)}` }}>Talep Gönder</Btn>
          </div>
          <div style={{ padding: '26px 18px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '0 4px 10px', letterSpacing: 0.2 }}>GEÇMİŞ TALEPLER</div>
            <Panel pad={0}>
              {app.store.leaveRequests.map((r, i, arr) => (
                <Row key={r.id} icon="calendar" iconBg={hexA(T.blue, 0.13)} iconColor={T.blue} title={r.type} sub={`${r.start} – ${r.end} · ${r.days} gün`} right={<StatusBadge s={r.status} />} last={i === arr.length - 1} />
              ))}
            </Panel>
          </div>
        </window.Screen>
        <window.Sheet title="İzin Tipi" open={sheet === 'type'} onClose={() => setSheet(null)}>
          <Panel pad={0}>
            {['Yıllık İzin', 'Mazeret İzni', 'Hastalık İzni', 'Ücretsiz İzin'].map((t, i, a) => (
              <Row key={t} title={t} last={i === a.length - 1} right={type === t ? <Icon name="check" size={20} color={T.brand} strokeWidth={2.6} /> : null} onClick={() => { setType(t); setSheet(null); }} />
            ))}
          </Panel>
        </window.Sheet>
        <CalendarSheet open={sheet === 'start'} value={start} onPick={setStart} onClose={() => setSheet(null)} />
        <CalendarSheet open={sheet === 'end'} value={end} onPick={setEnd} onClose={() => setSheet(null)} />
      </React.Fragment>
    );
  }

  // ── Expense request ─────────────────────────────────────────
  function Expense() {
    const app = window.useApp();
    const [type, setType] = React.useState('Ulaşım');
    const [amount, setAmount] = React.useState('');
    const [date, setDate] = React.useState('');
    const [uploaded, setUploaded] = React.useState(false);
    const [desc, setDesc] = React.useState('');
    const [sheet, setSheet] = React.useState(null);
    const submit = () => {
      app.update(s => s.expenseRequests.unshift({ id: 'e' + Date.now(), type, amount: parseFloat(amount) || 0, date: date || '10.06.2026', status: 'Beklemede' }));
      setAmount(''); setDate(''); setUploaded(false); setDesc(''); app.showToast('Masraf talebi gönderildi');
    };
    return (
      <React.Fragment>
        <window.Screen padBottom={28}>
          <window.TopBar title="Masraf Talebi" onBack={app.back} brand />
          <div style={{ padding: '18px 18px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <window.PickerField label="Masraf Tipi" icon="receipt" accent={T.green} value={type} onClick={() => setSheet('type')} />
            <Field label="Tutar"><Input value={amount} onChange={v => setAmount(v.replace(/[^\d.]/g, ''))} placeholder="0,00" prefix="₺" inputMode="decimal" align="right" big /></Field>
            <window.PickerField label="Tarih" icon="calendar" accent={T.blue} value={date} onClick={() => setSheet('date')} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 7, marginLeft: 4 }}>Fiş / Fotoğraf</div>
              <button onClick={() => setUploaded(true)} style={{ width: '100%', border: `2px dashed ${uploaded ? T.green : T.line}`, borderRadius: 14, padding: uploaded ? 0 : '24px 16px', background: uploaded ? T.card : hexA(T.navy, 0.02), cursor: 'pointer', fontFamily: T.font, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' }}>
                {uploaded
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12 }}><Ph h={56} accent={T.navy} label="FİŞ" style={{ width: 56, flexShrink: 0 }} /><div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>fis_10062026.jpg</div><div style={{ fontSize: 12, color: T.green, fontWeight: 600, marginTop: 2 }}>Yüklendi ✓</div></div></div>
                  : <React.Fragment><Icon name="upload" size={22} color={T.ink3} /><span style={{ fontSize: 14, fontWeight: 600, color: T.ink2 }}>Fiş fotoğrafı yükle</span></React.Fragment>}
              </button>
            </div>
            <Field label="Açıklama"><Input value={desc} onChange={setDesc} placeholder="Açıklama (opsiyonel)" /></Field>
            <Btn variant="green" disabled={!amount} onClick={submit}>Masraf Gönder</Btn>
          </div>
          <div style={{ padding: '26px 18px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '0 4px 10px', letterSpacing: 0.2 }}>GEÇMİŞ TALEPLER</div>
            <Panel pad={0}>
              {app.store.expenseRequests.map((r, i, arr) => (
                <Row key={r.id} icon="receipt" iconBg={hexA(T.green, 0.13)} iconColor={T.green} title={r.type} sub={r.date} right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 14.5, fontWeight: 800, color: T.ink }}>{fmt(r.amount)} ₺</span><StatusBadge s={r.status} /></div>} last={i === arr.length - 1} />
              ))}
            </Panel>
          </div>
        </window.Screen>
        <window.Sheet title="Masraf Tipi" open={sheet === 'type'} onClose={() => setSheet(null)}>
          <Panel pad={0}>
            {['Ulaşım', 'Yemek', 'Konaklama', 'Kırtasiye', 'Diğer'].map((t, i, a) => (
              <Row key={t} title={t} last={i === a.length - 1} right={type === t ? <Icon name="check" size={20} color={T.brand} strokeWidth={2.6} /> : null} onClick={() => { setType(t); setSheet(null); }} />
            ))}
          </Panel>
        </window.Sheet>
        <CalendarSheet open={sheet === 'date'} value={date} onPick={setDate} onClose={() => setSheet(null)} />
      </React.Fragment>
    );
  }

  // ── Expense approval (manager) ──────────────────────────────
  function ExpenseApprove() {
    const app = window.useApp();
    const items = app.store.approvals;
    const act = (id, ok) => { app.update(s => s.approvals = s.approvals.filter(x => x.id !== id)); app.showToast(ok ? 'Masraf onaylandı' : 'Masraf reddedildi', ok ? 'ok' : 'err'); };
    return (
      <window.Screen padBottom={28}>
        <window.TopBar title="Masraf Onay" onBack={app.back} brand />
        {items.length === 0
          ? <window.Empty icon="check" title="Bekleyen talep yok" sub="Onay bekleyen tüm masraflar işlendi." />
          : <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map(r => (
              <Panel key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 999, background: hexA(T.navy, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 15, fontWeight: 800, color: T.navy }}>{r.who.split(' ').map(w => w[0]).join('')}</span></div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{r.who}</div><div style={{ fontSize: 12.5, color: T.ink2 }}>{r.type} · {r.date}</div></div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{fmt(r.amount)} ₺</div>
                </div>
                <Ph h={88} accent={T.navy} label="FİŞ ÖNİZLEMESİ" style={{ marginBottom: 12 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <Btn variant="green" size="md" icon="check" onClick={() => act(r.id, true)}>Onayla</Btn>
                  <Btn variant="outline" size="md" onClick={() => act(r.id, false)} style={{ color: T.coralDark, borderColor: hexA(T.coral, 0.4) }}>Reddet</Btn>
                </div>
              </Panel>
            ))}
          </div>}
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    other: { C: Other },
    leave: { C: Leave, full: true },
    expense: { C: Expense, full: true },
    expenseApprove: { C: ExpenseApprove, full: true },
  });
})();
