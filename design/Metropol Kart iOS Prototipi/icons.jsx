// icons.jsx — compact stroke icon set for the Metropol Kart app prototype.
// <Icon name="home" size={24} color="#333" strokeWidth={1.8} />
(function () {
  const P = {
    // ── nav / tab bar
    home: <path d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h12a1 1 0 001-1V9.5" />,
    gift: <g><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8a1 1 0 001 1h12a1 1 0 001-1v-8M12 8v13" /><path d="M12 8S10.5 3.5 8 4c-2 .4-1.6 4 0 4h4zM12 8s1.5-4.5 4-4c2 .4 1.6 4 0 4h-4z" /></g>,
    card: <g><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" /></g>,
    chat: <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z" />,
    grid: <g><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></g>,
    // ── chrome
    bell: <path d="M18 8.5a6 6 0 10-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5M10 20a2 2 0 004 0" />,
    menu: <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />,
    back: <path d="M15 4l-8 8 8 8" />,
    chevron: <path d="M9 4l8 8-8 8" />,
    chevronDown: <path d="M5 9l7 7 7-7" />,
    chevronUp: <path d="M5 15l7-7 7 7" />,
    close: <path d="M5 5l14 14M19 5L5 19" />,
    refresh: <path d="M20 11a8 8 0 10-.5 4M20 4v5h-5" />,
    nfc: <path d="M5 5c5 3.5 5 11 0 14M9 8c2.5 2 2.5 6 0 8M13 11c1 .8 1 2.2 0 3" />,
    copy: <g><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M5.5 15.5h-1a1 1 0 01-1-1v-9a1 1 0 011-1h9a1 1 0 011 1v1" /></g>,
    trash: <path d="M4 6.5h16M9 6.5V5a1 1 0 011-1h4a1 1 0 011 1v1.5M6 6.5l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13M10 10v7M14 10v7" />,
    qr: <g><rect x="3.5" y="3.5" width="6" height="6" rx="1" /><rect x="14.5" y="3.5" width="6" height="6" rx="1" /><rect x="3.5" y="14.5" width="6" height="6" rx="1" /><path d="M14.5 14.5h2.5v2.5M20.5 14.5v.01M14.5 20.5h6M20.5 18v2.5" /></g>,
    keypad: <g><circle cx="6" cy="6" r="1.4" /><circle cx="12" cy="6" r="1.4" /><circle cx="18" cy="6" r="1.4" /><circle cx="6" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="18" cy="12" r="1.4" /><circle cx="6" cy="18" r="1.4" /><circle cx="12" cy="18" r="1.4" /><circle cx="18" cy="18" r="1.4" /></g>,
    search: <path d="M11 18a7 7 0 100-14 7 7 0 000 14zM16 16l5 5" />,
    pin: <path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11zM12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />,
    locate: <path d="M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="M5 12.5l4.5 4.5L19 7" />,
    camera: <g><path d="M3 8a1 1 0 011-1h2.5l1.3-2h6.4L15.5 7H20a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" /><circle cx="12" cy="13" r="3.5" /></g>,
    cameraFlip: <path d="M12 9a4 4 0 014 4M12 17a4 4 0 01-4-4M14.5 7l-1.5 2 2 .6M9.5 19l1.5-2-2-.6" />,
    calendar: <g><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></g>,
    upload: <path d="M12 16V4M7 9l5-5 5 5M5 16v3a1 1 0 001 1h12a1 1 0 001-1v-3" />,
    edit: <path d="M16.5 4.5l3 3L8 19l-4 1 1-4L16.5 4.5z" />,
    star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
    sparkle: <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3zM18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />,
    phone: <path d="M5 4h3l1.5 4.5L7.5 10a12 12 0 006.5 6.5l1.5-2L20 16v3a1.5 1.5 0 01-1.6 1.5C10.5 20 4 13.5 3.5 5.6A1.5 1.5 0 015 4z" />,
    mail: <g><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></g>,
    directions: <path d="M12 2.5l9.5 9.5L12 21.5 2.5 12 12 2.5zM10 14v-2.5a1.5 1.5 0 011.5-1.5H15M15 10l-2-2M15 10l-2 2" />,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    send: <path d="M21 3L3 10.5l7 2.5 2.5 7L21 3zM10 13l4-4" />,
    arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
    arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    swap: <path d="M7 7h11l-3-3M7 7l3 3M17 17H6l3 3M17 17l-3-3" />,
    info: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5v.01" />,
    eye: <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z" />,
    eyeOff: <path d="M3 3l18 18M10 5.8A8 8 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 01-3 3.6M6.3 7.3A16 16 0 002.5 12S6 18.5 12 18.5a8 8 0 003.3-.7M9.5 9.6A3 3 0 0014 14" />,
    fingerprint: <path d="M5 11a7 7 0 0114 0v1M8 11a4 4 0 018 0v2a8 8 0 01-1 4M12 11v3a9 9 0 001.5 5M9 18a12 12 0 01-1-5v-2" />,
    user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0" />,
    users: <path d="M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 19a6 6 0 0112 0M16 4.5a3.5 3.5 0 010 7M17 13.5a6 6 0 014 5.5" />,
    percent: <path d="M5 19L19 5M7.5 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />,
    wallet: <path d="M4 7a2 2 0 012-2h11a1 1 0 011 1v2M3.5 8.5a1 1 0 011-1H19a1 1 0 011 1v9a1 1 0 01-1 1H4.5a1 1 0 01-1-1v-9zM16 13h2" />,
    history: <path d="M3.5 12a8.5 8.5 0 11.7 3.4M3.5 12V8M3.5 12H7M12 7.5V12l3 2" />,
    list: <path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5v.01M4 12v.01M4 17.5v.01" />,
    map: <path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4zM9 4v14M15 6v14" />,
    globe: <path d="M12 21a9 9 0 100-18 9 9 0 000 18zM3.5 12h17M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />,
    play: <path d="M7 4.5l12 7.5-12 7.5v-15z" />,
    pause: <path d="M8 5v14M16 5v14" />,
    briefcase: <g><rect x="3" y="7.5" width="18" height="12" rx="2" /><path d="M8.5 7.5V6a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0115.5 6v1.5M3 12.5h18" /></g>,
    receipt: <path d="M5 3.5h14v17l-2.3-1.5-2.4 1.5-2.3-1.5L9.7 20 7.3 18.5 5 20V3.5zM8.5 8h7M8.5 12h7" />,
    store: <path d="M4 9.5V20a1 1 0 001 1h14a1 1 0 001-1V9.5M3 9.5L4.5 4h15L21 9.5a2.5 2.5 0 01-5 0 2.5 2.5 0 01-4 0 2.5 2.5 0 01-4 0 2.5 2.5 0 01-5 0zM9 21v-5.5a1 1 0 011-1h4a1 1 0 011 1V21" />,
    fork: <path d="M6 3v6a2 2 0 004 0V3M8 9v12M16 3c-1.5 0-2.5 2-2.5 5s1 4 2.5 4M16 3c1.5 0 2.5 2 2.5 5s-1 4-2.5 4M16 12v9" />,
    basket: <path d="M5 9.5h14l-1.2 9a2 2 0 01-2 1.5H8.2a2 2 0 01-2-1.5L5 9.5zM8.5 9.5L12 3.5l3.5 6M9.5 13v3.5M14.5 13v3.5" />,
    ticket: <path d="M4 7.5A1.5 1.5 0 015.5 6h13A1.5 1.5 0 0120 7.5V10a2 2 0 000 4v2.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5V14a2 2 0 000-4V7.5zM13 6v12" />,
    megaphone: <path d="M4 10v4a1 1 0 001 1h2l8 4V5l-8 4H5a1 1 0 00-1 1zM18 9a4 4 0 010 6M7 15v3.5a1 1 0 001 1h1.5a1 1 0 001-1V18" />,
    poll: <path d="M5 21V11M12 21V4M19 21v-7" />,
    video: <g><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></g>,
    heart: <path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0112 7a3.8 3.8 0 017 3.5C19 15.5 12 20 12 20z" />,
    shield: <path d="M12 3.5l7 2.5v5c0 5-3.5 8-7 9.5-3.5-1.5-7-4.5-7-9.5V6l7-2.5z" />,
    lock: <g><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8 10.5V8a4 4 0 018 0v2.5" /></g>,
    settings: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.5 12a7.5 7.5 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 00-2-1.2L16.5 2h-4l-.5 2.4a7.5 7.5 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 002 1.2l.5 2.4h4l.5-2.4a7.5 7.5 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />,
    logout: <path d="M9 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h3M15 8l4 4-4 4M19 12H9" />,
    language: <path d="M3 5.5h9M7.5 3.5v2M9.5 5.5c0 4-3 7-6 8M5 9c1 2.5 3 4 6 5M13 20l4-9 4 9M14.3 17h5.4" />,
    document: <path d="M6 3.5h8L19 8v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4.5a1 1 0 011-1zM13 3.5V8h5" />,
    coins: <g><ellipse cx="9" cy="7" rx="5.5" ry="2.5" /><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5" /><ellipse cx="15" cy="14" rx="5.5" ry="2.5" /><path d="M9.5 14v.01M20.5 14v4c0 1.4-2.5 2.5-5.5 2.5s-5.5-1.1-5.5-2.5" /></g>,
    bookmark: <path d="M6 4h12v17l-6-4-6 4V4z" />,
    bolt: <path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />,
    transfer: <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />,
  };
  function Icon({ name, size = 24, color = 'currentColor', strokeWidth = 1.8, style, fill = 'none' }) {
    const node = P[name] || P.info;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
        strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        style={{ display: 'block', flexShrink: 0, ...style }}>
        {node}
      </svg>
    );
  }
  window.Icon = Icon;
  window.ICON_NAMES = Object.keys(P);
})();
