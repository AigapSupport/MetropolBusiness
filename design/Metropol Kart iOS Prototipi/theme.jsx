// theme.jsx — design tokens + phone frame + shared primitives for Metropol Kart app.
(function () {
  const Icon = window.Icon;

  // ── Design tokens ───────────────────────────────────────────
  const T = {
    coral: '#F2697B', coralDark: '#E04E63', coralSoft: '#FDEEF1', coralPress: '#D94560',
    navy: '#2D2A5A', navySoft: '#EAE9F2',
    green: '#5FA37F', greenDark: '#4F8C6C', greenSoft: '#E9F3EE',
    purple: '#7C5CBF', blue: '#3D8BD4',
    bg: '#F4F4F7', card: '#FFFFFF',
    ink: '#1C1B2E', ink2: '#6E6D7E', ink3: '#A6A5B3',
    line: 'rgba(45,42,90,0.10)', line2: 'rgba(45,42,90,0.06)',
    radius: 18, radiusSm: 12, radiusLg: 24,
    font: '-apple-system, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
    shadow: '0 6px 20px rgba(45,42,90,0.08)',
    shadowSm: '0 2px 8px rgba(45,42,90,0.06)',
    shadowUp: '0 -2px 16px rgba(45,42,90,0.07)',
  };

  // brand accent override hook (white-label) — App reassigns these before render
  T.brand = T.coral; T.brandDark = T.coralDark; T.brandSoft = T.coralSoft;

  const fmt = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = (n) => Number(n).toLocaleString('tr-TR');

  // ── Phone frame ─────────────────────────────────────────────
  function Phone({ children, statusDark = false, scale }) {
    const W = 390, H = 844;
    return (
      <div style={{
        width: W, height: H, borderRadius: 52, position: 'relative',
        background: '#000', padding: 4, boxSizing: 'border-box',
        boxShadow: '0 50px 100px rgba(28,27,46,0.28), 0 0 0 1px rgba(0,0,0,0.2)',
        transform: scale ? `scale(${scale})` : undefined, transformOrigin: 'center top',
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: 48, overflow: 'hidden',
          position: 'relative', background: T.bg, fontFamily: T.font,
          WebkitFontSmoothing: 'antialiased', display: 'flex', flexDirection: 'column',
        }}>
          {/* dynamic island */}
          <div style={{
            position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)',
            width: 120, height: 34, borderRadius: 22, background: '#000', zIndex: 90,
          }} />
          {/* status bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 80, pointerEvents: 'none' }}>
            {window.IOSStatusBar ? <window.IOSStatusBar dark={statusDark} /> : <div style={{ height: 54 }} />}
          </div>
          {children}
          {/* home indicator */}
          <div style={{
            position: 'absolute', bottom: 7, left: 0, right: 0, zIndex: 95,
            display: 'flex', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <div style={{ width: 134, height: 5, borderRadius: 100, background: statusDark ? 'rgba(255,255,255,0.85)' : 'rgba(28,27,46,0.32)' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Screen scaffold: fixed top bar + scroll body ────────────
  const STATUS_H = 56;
  function Screen({ children, bg = T.bg, padBottom = 24, noScroll = false, scrollRef }) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: bg }}>
        <div ref={scrollRef} style={{
          flex: 1, minHeight: 0, overflowY: noScroll ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
        }}>
          <div style={{ paddingBottom: padBottom }}>{children}</div>
        </div>
      </div>
    );
  }

  // ── Top bar (back + title + brand/trailing) ─────────────────
  function TopBar({ title, onBack, brand, trailing, color = T.ink, bg = T.card, border = true, large }) {
    return (
      <div style={{
        paddingTop: STATUS_H, background: bg, position: 'relative', zIndex: 30,
        borderBottom: border ? `1px solid ${T.line2}` : 'none',
        boxShadow: border ? '0 1px 0 rgba(45,42,90,0.02)' : 'none',
      }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
          <div style={{ width: 64, display: 'flex', justifyContent: 'flex-start' }}>
            {onBack && (
              <button onClick={onBack} style={iconBtn(color)} aria-label="Geri">
                <Icon name="back" size={24} color={color} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700, color, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          <div style={{ width: 64, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            {trailing}
            {brand && <BrandMark color={color} />}
          </div>
        </div>
        {large && <div style={{ fontSize: 30, fontWeight: 800, color, letterSpacing: -0.6, padding: '2px 18px 14px' }}>{large}</div>}
      </div>
    );
  }
  const iconBtn = (color) => ({ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color });

  // ── Brand wordmark (white-label placeholder) ────────────────
  function BrandMark({ color = T.navy, size = 1 }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 * size }}>
        <div style={{ width: 22 * size, height: 22 * size, borderRadius: 7 * size, background: T.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(242,105,123,0.4)' }}>
          <div style={{ width: 9 * size, height: 9 * size, borderRadius: 3 * size, background: '#fff' }} />
        </div>
        <span style={{ fontSize: 15 * size, fontWeight: 800, color, letterSpacing: -0.4 }}>metropol<span style={{ fontWeight: 500, opacity: 0.6 }}>kart</span></span>
      </div>
    );
  }

  // ── Buttons ─────────────────────────────────────────────────
  function Btn({ children, onClick, variant = 'coral', size = 'lg', icon, disabled, full = true, style }) {
    const v = {
      coral: { bg: T.brand, fg: '#fff', sh: '0 8px 20px rgba(242,105,123,0.32)' },
      green: { bg: T.green, fg: '#fff', sh: '0 8px 20px rgba(95,163,127,0.3)' },
      navy: { bg: T.navy, fg: '#fff', sh: '0 8px 20px rgba(45,42,90,0.25)' },
      light: { bg: T.brandSoft, fg: T.brandDark, sh: 'none' },
      outline: { bg: 'transparent', fg: T.navy, sh: 'none', border: `1.5px solid ${T.line}` },
      ghost: { bg: 'rgba(45,42,90,0.05)', fg: T.navy, sh: 'none' },
    }[variant];
    const h = size === 'sm' ? 38 : size === 'md' ? 46 : 54;
    return (
      <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
        height: h, width: full ? '100%' : undefined, padding: full ? 0 : '0 22px',
        borderRadius: 999, border: v.border || 'none', background: v.bg, color: v.fg,
        fontSize: size === 'sm' ? 14 : 16, fontWeight: 700, fontFamily: T.font, letterSpacing: -0.2,
        cursor: disabled ? 'default' : 'pointer', boxShadow: disabled ? 'none' : v.sh,
        opacity: disabled ? 0.45 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'transform .12s, opacity .15s', WebkitTapHighlightColor: 'transparent', ...style,
      }}
        onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.97)'; }}
        onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        {icon && <Icon name={icon} size={size === 'sm' ? 17 : 20} color={v.fg} strokeWidth={2} />}
        {children}
      </button>
    );
  }

  // ── Inputs ──────────────────────────────────────────────────
  function Field({ label, children, hint, style }) {
    return (
      <label style={{ display: 'block', ...style }}>
        {label && <div style={{ fontSize: 13, fontWeight: 600, color: T.ink2, marginBottom: 7, marginLeft: 4 }}>{label}</div>}
        {children}
        {hint && <div style={{ fontSize: 12, color: T.ink3, marginTop: 6, marginLeft: 4 }}>{hint}</div>}
      </label>
    );
  }
  function Input({ value, onChange, placeholder, type = 'text', icon, prefix, suffix, inputMode, maxLength, align, autoFocus, big }) {
    const [foc, setFoc] = React.useState(false);
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, height: big ? 60 : 52, padding: '0 16px',
        background: T.card, borderRadius: T.radiusSm, border: `1.5px solid ${foc ? T.brand : T.line}`,
        transition: 'border-color .15s', boxShadow: foc ? '0 0 0 4px rgba(242,105,123,0.1)' : 'none',
      }}>
        {icon && <Icon name={icon} size={20} color={foc ? T.brand : T.ink3} />}
        {prefix && <span style={{ fontSize: big ? 24 : 16, fontWeight: 700, color: T.ink2 }}>{prefix}</span>}
        <input
          value={value} onChange={e => onChange && onChange(e.target.value)} placeholder={placeholder}
          type={type} inputMode={inputMode} maxLength={maxLength} autoFocus={autoFocus}
          onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent', minWidth: 0,
            fontSize: big ? 26 : 16, fontWeight: big ? 800 : 500, fontFamily: T.font, color: T.ink,
            textAlign: align || 'left', letterSpacing: big ? 0.5 : -0.2,
          }} />
        {suffix && <span style={{ fontSize: 15, fontWeight: 600, color: T.ink3 }}>{suffix}</span>}
      </div>
    );
  }

  // ── OTP / code boxes ────────────────────────────────────────
  function CodeInput({ length = 6, value, onChange, autoFocus }) {
    const refs = React.useRef([]);
    const set = (i, v) => {
      v = v.replace(/\D/g, '').slice(-1);
      const arr = value.split('');
      arr[i] = v; const next = arr.join('').slice(0, length);
      onChange(next);
      if (v && i < length - 1) refs.current[i + 1] && refs.current[i + 1].focus();
    };
    const key = (i, e) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1].focus(); };
    return (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        {Array.from({ length }).map((_, i) => {
          const filled = !!value[i];
          return (
            <input key={i} ref={el => refs.current[i] = el} value={value[i] || ''}
              onChange={e => set(i, e.target.value)} onKeyDown={e => key(i, e)}
              inputMode="numeric" maxLength={1} autoFocus={autoFocus && i === 0}
              style={{
                width: 48, height: 58, textAlign: 'center', fontSize: 26, fontWeight: 800,
                fontFamily: T.font, color: T.navy, background: T.card, caretColor: T.brand,
                border: `2px solid ${filled ? T.brand : T.line}`, borderRadius: 14, outline: 'none',
                boxShadow: filled ? '0 4px 12px rgba(242,105,123,0.18)' : 'none', transition: 'all .15s',
              }} />
          );
        })}
      </div>
    );
  }

  // ── Card / Section / ListRow ────────────────────────────────
  function Panel({ children, style, pad = 16, onClick }) {
    return <div onClick={onClick} style={{ background: T.card, borderRadius: T.radius, boxShadow: T.shadowSm, padding: pad, cursor: onClick ? 'pointer' : undefined, ...style }}>{children}</div>;
  }
  function SectionTitle({ children, action, onAction, style }) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px', margin: '0 0 12px', ...style }}>
        <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>{children}</h3>
        {action && <button onClick={onAction} style={{ background: 'none', border: 'none', color: T.brand, fontSize: 14, fontWeight: 700, fontFamily: T.font, cursor: 'pointer' }}>{action}</button>}
      </div>
    );
  }
  function Row({ icon, iconBg, iconColor, title, sub, right, onClick, chevron, last, badge, danger }) {
    return (
      <div onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', cursor: onClick ? 'pointer' : undefined,
        borderBottom: last ? 'none' : `1px solid ${T.line2}`, position: 'relative', WebkitTapHighlightColor: 'transparent',
      }}>
        {icon && (
          <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg || T.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {typeof icon === 'string' ? <Icon name={icon} size={21} color={iconColor || T.brand} strokeWidth={1.9} /> : icon}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: danger ? T.coralDark : T.ink, letterSpacing: -0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {sub && <div style={{ fontSize: 13, color: T.ink2, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
        </div>
        {badge}
        {right && <div style={{ flexShrink: 0 }}>{right}</div>}
        {chevron && <Icon name="chevron" size={18} color={T.ink3} strokeWidth={2} />}
      </div>
    );
  }

  // ── Badge / Pill / Toggle / Segmented ───────────────────────
  function Badge({ children, color = T.green, soft = true, style }) {
    return <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 700, letterSpacing: -0.1,
      background: soft ? hexA(color, 0.13) : color, color: soft ? color : '#fff', ...style,
    }}>{children}</span>;
  }
  function Toggle({ on, onChange }) {
    return (
      <button onClick={() => onChange(!on)} style={{
        width: 51, height: 31, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 2,
        background: on ? T.green : 'rgba(45,42,90,0.18)', transition: 'background .2s', position: 'relative',
      }}>
        <div style={{ width: 27, height: 27, borderRadius: 999, background: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transform: `translateX(${on ? 20 : 0}px)`, transition: 'transform .2s' }} />
      </button>
    );
  }
  function Segmented({ options, value, onChange, style }) {
    return (
      <div style={{ display: 'flex', background: 'rgba(45,42,90,0.06)', borderRadius: 12, padding: 3, gap: 2, ...style }}>
        {options.map(o => {
          const active = o.value === value;
          return (
            <button key={o.value} onClick={() => onChange(o.value)} style={{
              flex: 1, height: 36, border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: T.font,
              fontSize: 14, fontWeight: 700, letterSpacing: -0.2, color: active ? T.ink : T.ink2,
              background: active ? T.card : 'transparent', boxShadow: active ? '0 1px 4px rgba(45,42,90,0.12)' : 'none',
              transition: 'all .18s',
            }}>{o.label}</button>
          );
        })}
      </div>
    );
  }

  // ── Striped image placeholder ───────────────────────────────
  function Ph({ label, h = 120, r = 14, accent = T.navy, style, children }) {
    return (
      <div style={{
        height: h, borderRadius: r, position: 'relative', overflow: 'hidden',
        background: `repeating-linear-gradient(135deg, ${hexA(accent, 0.07)}, ${hexA(accent, 0.07)} 11px, ${hexA(accent, 0.03)} 11px, ${hexA(accent, 0.03)} 22px)`,
        border: `1px solid ${hexA(accent, 0.12)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
      }}>
        {children || (label && <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 11, fontWeight: 600, color: hexA(accent, 0.55), letterSpacing: 0.3, textTransform: 'uppercase', padding: '0 12px', textAlign: 'center' }}>{label}</span>)}
      </div>
    );
  }

  // ── Empty / Loading ─────────────────────────────────────────
  function Empty({ icon = 'document', title, sub, action }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '56px 32px', gap: 6 }}>
        <div style={{ width: 76, height: 76, borderRadius: 24, background: T.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Icon name={icon} size={34} color={T.brand} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.ink }}>{title}</div>
        {sub && <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.5, maxWidth: 240 }}>{sub}</div>}
        {action && <div style={{ marginTop: 14 }}>{action}</div>}
      </div>
    );
  }
  function Spinner({ size = 28, color = T.brand }) {
    return <div style={{ width: size, height: size, borderRadius: '50%', border: `3px solid ${hexA(color, 0.2)}`, borderTopColor: color, animation: 'mspin 0.8s linear infinite' }} />;
  }

  function hexA(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  Object.assign(window, {
    T, fmt, fmt0, hexA, Phone, Screen, TopBar, BrandMark, Btn, Field, Input, CodeInput,
    Panel, SectionTitle, Row, Badge, Toggle, Segmented, Ph, Empty, Spinner, STATUS_H,
  });
})();
