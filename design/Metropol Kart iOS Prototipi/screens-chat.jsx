// screens-chat.jsx — chat list, conversation, new AI assistant, new chat.
(function () {
  const { T, hexA, Btn, Field, Input, Panel, Row, Badge } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  function Avatar({ name, color, kind, size = 46 }) {
    const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
    return (
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: size, height: size, borderRadius: 999, background: kind === 'ai' ? `linear-gradient(140deg, ${color}, ${hexA(color, 0.65)})` : hexA(color, 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {kind === 'ai' ? <Icon name="sparkle" size={size * 0.5} color="#fff" /> : <span style={{ fontSize: size * 0.36, fontWeight: 800, color }}>{initials}</span>}
        </div>
        {kind === 'ai' && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowSm }}><Icon name="star" size={10} color={color} fill={color} /></div>}
      </div>
    );
  }

  function ChatList() {
    const app = window.useApp();
    return (
      <window.Screen padBottom={120}>
        <div style={{ paddingTop: window.STATUS_H, background: T.card, borderBottom: `1px solid ${T.line2}`, position: 'relative', zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 16px' }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: T.ink, letterSpacing: -0.7 }}>Sohbet</h1>
            <button onClick={() => app.go('newChat')} style={{ width: 40, height: 40, borderRadius: 999, background: T.brandSoft, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} color={T.brand} strokeWidth={2.2} /></button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <button onClick={() => app.go('newAI')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: 14, marginBottom: 14, borderRadius: 16, border: `1.5px dashed ${hexA(T.purple, 0.4)}`, background: hexA(T.purple, 0.05), cursor: 'pointer', fontFamily: T.font, textAlign: 'left' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: `linear-gradient(140deg, ${T.purple}, ${hexA(T.purple, 0.6)})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="sparkle" size={22} color="#fff" /></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Yeni AI Asistan Oluştur</div><div style={{ fontSize: 12.5, color: T.ink2, marginTop: 1 }}>Kendi yapay zeka asistanını tasarla</div></div>
            <Icon name="chevron" size={18} color={T.ink3} strokeWidth={2} />
          </button>
          <Panel pad={0}>
            {app.store.chats.map((c, i, arr) => (
              <div key={c.id} onClick={() => app.go('chat', { id: c.id })} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: 'pointer', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${T.line2}` }}>
                <Avatar name={c.name} color={c.avatar} kind={c.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, letterSpacing: -0.2 }}>{c.name}</span>
                    {c.kind === 'ai' && <Badge color={T.purple} style={{ padding: '1px 6px', fontSize: 9.5 }}>AI</Badge>}
                  </div>
                  <div style={{ fontSize: 13.5, color: c.unread ? T.ink : T.ink2, fontWeight: c.unread ? 600 : 400, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.last}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <span style={{ fontSize: 12, color: c.unread ? T.brand : T.ink3, fontWeight: c.unread ? 700 : 500 }}>{c.time}</span>
                  {c.unread > 0 && <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: T.brand, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.unread}</span>}
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </window.Screen>
    );
  }

  function Chat({ id }) {
    const app = window.useApp();
    const chat = app.store.chats.find(c => c.id === id) || app.store.chats[0];
    const [msgs, setMsgs] = React.useState(chat.messages);
    const [text, setText] = React.useState('');
    const [typing, setTyping] = React.useState(false);
    const bodyRef = React.useRef();
    React.useEffect(() => { app.update(s => { const c = s.chats.find(x => x.id === id); if (c) c.unread = 0; }); }, []);
    React.useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, typing]);
    const send = () => {
      if (!text.trim()) return;
      const t = text.trim(); setText('');
      setMsgs(m => [...m, { from: 'me', text: t, time: '12:55' }]);
      if (chat.kind === 'ai') {
        setTyping(true);
        setTimeout(() => { setTyping(false); setMsgs(m => [...m, { from: 'them', text: 'Anladım! Bunu senin için hallediyorum ✨ Birkaç saniye içinde hazır olacak.', time: '12:55' }]); }, 1600);
      }
    };
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: T.bg }}>
        {/* header */}
        <div style={{ paddingTop: window.STATUS_H, background: T.card, borderBottom: `1px solid ${T.line2}`, zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
            <button onClick={app.back} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}><Icon name="back" size={24} color={T.ink} strokeWidth={2.2} /></button>
            <Avatar name={chat.name} color={chat.avatar} kind={chat.kind} size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: T.ink }}>{chat.name}</div>
              <div style={{ fontSize: 12, color: chat.online ? T.green : T.ink3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>{chat.online && <span style={{ width: 6, height: 6, borderRadius: 999, background: T.green }} />}{chat.kind === 'ai' ? 'Yapay Zeka Asistanı' : chat.online ? 'Çevrimiçi' : 'Çevrimdışı'}</div>
            </div>
          </div>
        </div>
        {/* body */}
        <div ref={bodyRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '76%', padding: '11px 14px', borderRadius: m.from === 'me' ? '18px 18px 5px 18px' : '18px 18px 18px 5px', background: m.from === 'me' ? T.brand : T.card, color: m.from === 'me' ? '#fff' : T.ink, fontSize: 14.5, lineHeight: 1.45, boxShadow: m.from === 'me' ? 'none' : T.shadowSm, fontWeight: 450 }}>
                {m.text}
                <div style={{ fontSize: 10.5, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{m.time}</div>
              </div>
            </div>
          ))}
          {typing && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '13px 16px', borderRadius: '18px 18px 18px 5px', background: T.card, boxShadow: T.shadowSm, display: 'flex', gap: 5, alignItems: 'center' }}>
                {[0, 1, 2].map(d => <span key={d} style={{ width: 7, height: 7, borderRadius: 999, background: T.ink3, animation: `typingDot 1.2s ${d * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}
        </div>
        {/* input */}
        <div style={{ padding: '10px 12px calc(env(safe-area-inset-bottom) + 14px)', background: T.card, borderTop: `1px solid ${T.line2}`, display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: T.bg, borderRadius: 999, padding: '0 16px', height: 46 }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Mesaj yazın…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontFamily: T.font, color: T.ink }} />
          </div>
          <button onClick={send} style={{ width: 46, height: 46, borderRadius: 999, background: text.trim() ? T.brand : hexA(T.navy, 0.12), border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s', flexShrink: 0 }}>
            <Icon name="send" size={21} color={text.trim() ? '#fff' : T.ink3} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // ── New AI assistant ────────────────────────────────────────
  const PERSONAS = [
    { id: 'helper', name: 'Yardımsever', color: '#7C5CBF', icon: 'sparkle' },
    { id: 'finance', name: 'Finans', color: '#5FA37F', icon: 'coins' },
    { id: 'hr', name: 'İK', color: '#3D8BD4', icon: 'briefcase' },
    { id: 'fun', name: 'Enerjik', color: '#F2697B', icon: 'bolt' },
  ];
  function NewAI() {
    const app = window.useApp();
    const [name, setName] = React.useState('');
    const [persona, setPersona] = React.useState('helper');
    const [desc, setDesc] = React.useState('');
    const p = PERSONAS.find(x => x.id === persona);
    const create = () => {
      const id = 'ch' + Date.now();
      app.update(s => s.chats.unshift({ id, name: name || 'Yeni Asistan', kind: 'ai', avatar: p.color, last: 'Merhaba! Sana nasıl yardımcı olabilirim?', time: 'Şimdi', unread: 0, online: true, messages: [{ from: 'them', text: `Merhaba, ben ${name || 'asistanın'}! ${desc || 'Sana yardımcı olmak için buradayım.'} ✨`, time: 'Şimdi' }] }));
      app.back(); app.showToast('AI asistan oluşturuldu 🎉');
    };
    return (
      <window.Screen padBottom={20}>
        <window.TopBar title="Yeni AI Asistan" onBack={app.back} brand />
        <div style={{ padding: '20px 18px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ width: 84, height: 84, borderRadius: 999, background: `linear-gradient(140deg, ${p.color}, ${hexA(p.color, 0.6)})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 28px ${hexA(p.color, 0.35)}` }}><Icon name={p.icon} size={40} color="#fff" /></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="Asistan Adı"><Input value={name} onChange={setName} placeholder="Örn. Bütçe Botu" icon="sparkle" /></Field>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 10, marginLeft: 4 }}>Kişilik & Avatar</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {PERSONAS.map(x => (
                  <button key={x.id} onClick={() => setPersona(x.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, border: `2px solid ${persona === x.id ? x.color : T.line}`, background: persona === x.id ? hexA(x.color, 0.07) : T.card, cursor: 'pointer', fontFamily: T.font }}>
                    <div style={{ width: 34, height: 34, borderRadius: 999, background: hexA(x.color, 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={x.icon} size={18} color={x.color} /></div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{x.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Field label="Kısa Açıklama"><Input value={desc} onChange={setDesc} placeholder="Bu asistan ne yapacak?" /></Field>
          </div>
        </div>
        <div style={{ padding: '24px 18px 0' }}><Btn variant="navy" icon="sparkle" disabled={!name} onClick={create} style={{ background: T.purple, boxShadow: `0 8px 20px ${hexA(T.purple, 0.3)}` }}>Oluştur</Btn></div>
      </window.Screen>
    );
  }

  function NewChat() {
    const app = window.useApp();
    const [q, setQ] = React.useState('');
    const list = app.store.colleagues.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <window.Screen padBottom={20}>
        <window.TopBar title="Yeni Sohbet" onBack={app.back} brand />
        <div style={{ padding: '16px 18px 0' }}>
          <Input value={q} onChange={setQ} placeholder="Kişi ara…" icon="search" />
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink2, margin: '20px 4px 10px', letterSpacing: 0.2 }}>FİRMA ÇALIŞANLARI</div>
          <Panel pad={0}>
            {list.length ? list.map((c, i) => (
              <Row key={c.id} icon={<div style={{ width: 40, height: 40, borderRadius: 999, background: hexA(c.avatar, 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 15, fontWeight: 800, color: c.avatar }}>{c.name.split(' ').map(w => w[0]).join('')}</span></div>}
                title={c.name} sub={c.title} last={i === list.length - 1} onClick={() => { app.showToast(`${c.name} ile sohbet başlatıldı`); app.back(); }} />
            )) : <window.Empty icon="users" title="Kişi bulunamadı" />}
          </Panel>
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    chatList: { C: ChatList },
    chat: { C: Chat, full: true },
    newAI: { C: NewAI, full: true },
    newChat: { C: NewChat, full: true },
  });
})();
