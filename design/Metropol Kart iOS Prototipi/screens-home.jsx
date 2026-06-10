// screens-home.jsx — Ana Sayfa feed, survey fill, video player.
(function () {
  const { T, hexA, Btn, Panel, Row, SectionTitle, Badge, Ph, BrandMark } = window;
  const Icon = window.Icon;
  window.SCREENS = window.SCREENS || {};

  function HomeHeader() {
    const app = window.useApp();
    const unread = app.store.notifications.length;
    return (
      <div style={{ paddingTop: window.STATUS_H, background: T.card, borderBottom: `1px solid ${T.line2}`, position: 'relative', zIndex: 20 }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px' }}>
          <button onClick={() => app.setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="menu" size={24} color={T.ink} strokeWidth={2} /></button>
          <BrandMark color={T.navy} />
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => app.switchTab('chat')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}><Icon name="chat" size={23} color={T.ink} strokeWidth={1.9} /></button>
            <button onClick={() => app.go('notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, position: 'relative' }}>
              <Icon name="bell" size={23} color={T.ink} strokeWidth={1.9} />
              {unread > 0 && <span style={{ position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: T.brand, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>{unread}</span>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function Home() {
    const app = window.useApp();
    const { announcements, surveys, videos, profile } = app.store;
    return (
      <window.Screen padBottom={120}>
        <HomeHeader />
        <div style={{ padding: '16px 0 0' }}>
          <div style={{ padding: '0 18px 16px' }}>
            <div style={{ fontSize: 14, color: T.ink2 }}>Merhaba,</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>{profile.first} 👋</div>
          </div>

          {/* Announcements carousel */}
          <SectionTitle style={{ padding: '0 18px', marginBottom: 12 }} action="Tümü" onAction={() => app.showToast('Tüm duyurular')}>Duyurular</SectionTitle>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 18px 4px', scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}>
            {announcements.map(a => (
              <div key={a.id} onClick={() => app.showToast('Duyuru açıldı')} style={{ flex: '0 0 280px', scrollSnapAlign: 'start', background: T.card, borderRadius: 18, overflow: 'hidden', boxShadow: T.shadowSm, cursor: 'pointer' }}>
                <Ph h={120} r={0} accent={a.accent} label={`KAPAK GÖRSELİ · ${a.tag}`} />
                <div style={{ padding: 14 }}>
                  <Badge color={a.accent}>{a.tag}</Badge>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: T.ink, margin: '8px 0 4px', letterSpacing: -0.3, lineHeight: 1.25 }}>{a.title}</div>
                  <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Surveys */}
          <div style={{ padding: '24px 18px 0' }}>
            <SectionTitle>Anketler</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {surveys.map(s => (
                <Panel key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: hexA(T.purple, 0.13), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="poll" size={24} color={T.purple} strokeWidth={2} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: -0.2 }}>{s.title}</span>
                      {s.tag && !s.done && <Badge color={T.coral} style={{ padding: '2px 7px', fontSize: 10.5 }}>{s.tag}</Badge>}
                    </div>
                    <div style={{ fontSize: 12.5, color: T.ink2, marginTop: 2 }}>{s.q} soru · ~{Math.ceil(s.q / 3)} dk</div>
                  </div>
                  {s.done
                    ? <Badge color={T.green} soft={false} style={{ padding: '6px 10px' }}><Icon name="check" size={13} color="#fff" strokeWidth={3} /> Tamamlandı</Badge>
                    : <Btn variant="light" size="sm" full={false} onClick={() => app.go('survey', { id: s.id })}>Katıl</Btn>}
                </Panel>
              ))}
            </div>
          </div>

          {/* Videos */}
          <div style={{ padding: '24px 18px 0' }}>
            <SectionTitle>İzlenecek Videolar</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {videos.map(v => (
                <Panel key={v.id} pad={0} onClick={() => app.go('video', { id: v.id })} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 12, padding: 10 }}>
                  <div style={{ position: 'relative', width: 110, flexShrink: 0 }}>
                    <Ph h={70} r={12} accent={T.navy} label="" />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowSm }}><Icon name="play" size={16} color={T.navy} fill={T.navy} /></div>
                    </div>
                    <span style={{ position: 'absolute', bottom: 5, right: 5, background: 'rgba(28,27,46,0.85)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>{v.dur}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>{v.tag && !v.watched && <Badge color={T.coral} style={{ padding: '2px 7px', fontSize: 10.5 }}>{v.tag}</Badge>}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: T.ink, letterSpacing: -0.2, lineHeight: 1.3 }}>{v.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 12.5, fontWeight: 600, color: v.watched ? T.green : T.ink3 }}>
                      <Icon name={v.watched ? 'check' : 'play'} size={14} color={v.watched ? T.green : T.ink3} strokeWidth={2.4} />{v.watched ? 'İzlendi' : 'İzlenmedi'}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        </div>
      </window.Screen>
    );
  }

  // ── Survey fill ─────────────────────────────────────────────
  function Survey({ id }) {
    const app = window.useApp();
    const qs = app.store.surveyQuestions;
    const [i, setI] = React.useState(0);
    const [ans, setAns] = React.useState({});
    const q = qs[i];
    const last = i === qs.length - 1;
    const cur = ans[q.id];
    const next = () => {
      if (last) { app.update(s => { const sv = s.surveys.find(x => x.id === id); if (sv) sv.done = true; }); app.back(); app.showToast('Anket tamamlandı 🎉'); }
      else setI(i + 1);
    };
    return (
      <window.Screen padBottom={20}>
        <window.TopBar title="Anket" onBack={() => i === 0 ? app.back() : setI(i - 1)} brand />
        <div style={{ padding: '8px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 999, background: hexA(T.purple, 0.14), overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${((i + 1) / qs.length) * 100}%`, background: T.purple, borderRadius: 999, transition: 'width .3s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink2 }}>{i + 1}/{qs.length}</span>
          </div>
          <h2 style={{ margin: '0 0 24px', fontSize: 21, fontWeight: 800, color: T.ink, letterSpacing: -0.4, lineHeight: 1.3 }}>{q.text}</h2>
          {q.type === 'scale' ? (
            <div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setAns({ ...ans, [q.id]: n })} style={{ flex: 1, aspectRatio: '1', borderRadius: 16, border: `2px solid ${cur === n ? T.purple : T.line}`, background: cur === n ? T.purple : T.card, color: cur === n ? '#fff' : T.ink, fontSize: 20, fontWeight: 800, cursor: 'pointer', fontFamily: T.font, transition: 'all .12s' }}>{n}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: T.ink3, fontWeight: 600 }}><span>Hiç memnun değilim</span><span>Çok memnunum</span></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.map(o => (
                <button key={o} onClick={() => setAns({ ...ans, [q.id]: o })} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, border: `2px solid ${cur === o ? T.purple : T.line}`, background: cur === o ? hexA(T.purple, 0.07) : T.card, cursor: 'pointer', fontFamily: T.font, textAlign: 'left' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${cur === o ? T.purple : T.line}`, background: cur === o ? T.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{cur === o && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}</div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{o}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: '28px 18px 0' }}>
          <Btn variant="navy" disabled={cur === undefined} onClick={next} style={{ background: T.purple, boxShadow: `0 8px 20px ${hexA(T.purple, 0.3)}` }}>{last ? 'Anketi Bitir' : 'Sonraki Soru'}</Btn>
        </div>
      </window.Screen>
    );
  }

  // ── Video player ────────────────────────────────────────────
  function Video({ id }) {
    const app = window.useApp();
    const v = app.store.videos.find(x => x.id === id) || app.store.videos[0];
    const [playing, setPlaying] = React.useState(false);
    const [prog, setProg] = React.useState(v.watched ? 100 : 0);
    React.useEffect(() => {
      if (!playing) return;
      const t = setInterval(() => setProg(p => {
        if (p >= 100) { clearInterval(t); setPlaying(false); app.update(s => { const vv = s.videos.find(x => x.id === id); if (vv) vv.watched = true; }); return 100; }
        return p + 2;
      }), 120);
      return () => clearInterval(t);
    }, [playing]);
    return (
      <window.Screen padBottom={24}>
        <window.TopBar title="Video" onBack={app.back} brand />
        <div style={{ position: 'relative', margin: '14px 18px 0' }}>
          <Ph h={210} r={18} accent={T.navy} label="" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <button onClick={() => setPlaying(!playing)} style={{ width: 64, height: 64, borderRadius: 999, background: 'rgba(255,255,255,0.95)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadow }}>
              <Icon name={playing ? 'pause' : 'play'} size={28} color={T.navy} fill={playing ? 'none' : T.navy} strokeWidth={2} />
            </button>
          </div>
          {/* progress */}
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
            <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.4)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${prog}%`, background: T.brand, borderRadius: 999 }} />
            </div>
          </div>
        </div>
        <div style={{ padding: '18px 18px 0' }}>
          {v.watched && <Badge color={T.green} soft={false} style={{ marginBottom: 10 }}><Icon name="check" size={13} color="#fff" strokeWidth={3} /> İzlendi</Badge>}
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4, lineHeight: 1.3 }}>{v.title}</h2>
          <div style={{ fontSize: 13, color: T.ink2, marginTop: 6 }}>Süre: {v.dur} · Kurumsal Eğitim</div>
          <p style={{ fontSize: 14.5, color: T.ink2, lineHeight: 1.6, marginTop: 16 }}>Bu eğitim videosu, tüm çalışanların yıl içinde tamamlaması gereken zorunlu içeriklerden biridir. İzleme durumunuz otomatik olarak kaydedilir ve İK paneline yansır.</p>
        </div>
      </window.Screen>
    );
  }

  Object.assign(window.SCREENS, {
    home: { C: Home },
    survey: { C: Survey, full: true },
    video: { C: Video, full: true },
  });
})();
