/*
 * WzTitleBar - Banana Jam's own Windows 7 style title bar for the game window.
 *
 * The window has no Windows frame, so this draws one: Aero glass tinted with
 * the Game Border colour, the icon and name on the left, and the joined
 * minimise / maximise / close buttons hanging from the top edge (close is red).
 *
 * On the login screen it is always there. While the game is running it hides,
 * so the game gets the whole window; move the mouse to the very top to see it.
 * In full screen it is hidden.
 *
 * The game window runs an older Chrome, so colours are mixed here in JavaScript.
 */
(function () {
  if (document.getElementById('wz-titlebar')) return;

  const HEIGHT = 30;
  const css = `
    body { box-sizing: border-box; padding-top: ${HEIGHT}px; }
    body.wzt-fullscreen { padding-top: 0; }
    /* in the game the bar stays on, and the game sits under it */
    body:not(.wzt-fullscreen) #game-screen { height: calc(100vh - ${HEIGHT}px); --game-height: min(calc(100vh - ${HEIGHT}px), calc(550 / 900 * 100vw)); --game-width: calc(var(--game-height) * 900 / 550); }
    body:not(.wzt-fullscreen) #game-screen.show { transform: translateY(calc(-100vh + ${HEIGHT}px)); }
    #wz-titlebar {
      position: fixed; top: 0; left: 0; right: 0; height: ${HEIGHT}px; z-index: 2147482000;
      display: flex; align-items: flex-start; box-sizing: border-box;
      -webkit-app-region: drag; user-select: none;
      background: linear-gradient(180deg, var(--wzt-g1) 0%, var(--wzt-g2) 46%, var(--wzt-g3) 50%, var(--wzt-g4) 100%);
      border-bottom: 1px solid rgba(0, 0, 0, 0.5);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65), 0 1px 3px rgba(0, 0, 0, 0.25);
      font: 12px "Segoe UI", Tahoma, Verdana, sans-serif;
    }
    #wz-titlebar.wzt-blurred { filter: saturate(0.55) brightness(1.06); }
    /* full screen: the bar is gone (F11 brings the window back) */
    body.wzt-fullscreen #wz-titlebar, body.wzt-fullscreen #wz-titlebar-hot { display: none; }
    #wz-titlebar-hot { display: none; }
    .wzt-icon { width: 16px; height: 16px; margin: 7px 6px 0 8px; flex-shrink: 0; object-fit: contain; }
    .wzt-icon:not([src]) { display: none; }
    .wzt-icon:not([src]) + .wzt-title { margin-left: 10px; }
    .wzt-title {
      flex: 1; min-width: 0; margin-top: 7px; color: var(--wzt-text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-shadow: 0 0 8px var(--wzt-glow), 0 0 3px var(--wzt-glow), 0 0 1px var(--wzt-glow);
    }
    #wz-titlebar .wzcaps { margin: 0 6px 0 8px; --wzcap-h: ${HEIGHT}px; color: var(--wzt-text); }
    .wzb-vista #wz-titlebar .wzcaps { margin-top: 0; }

    /* Modern: flat bar in the card colour, thin line underneath */
    html.wz-style-modern #wz-titlebar {
      background: var(--wzt-flat); border-bottom: 1px solid rgba(0, 0, 0, 0.1); box-shadow: none;
      font: 12px "Segoe UI Variable Text", "Segoe UI", Tahoma, sans-serif;
    }
    html.wz-style-modern .wzt-title { text-shadow: none; color: var(--wzt-flat-text); margin-top: 8px; }
    html.wz-style-modern #wz-titlebar .wzcaps { color: var(--wzt-flat-text); }
    html.wz-style-modern .wzt-icon { margin-top: 7px; }
    html.wz-style-cards #wz-titlebar { border-bottom: 2px solid rgba(128, 128, 128, 0.28); }
    .wzb-cards #wz-titlebar .wzcaps { align-self: center; margin-top: 0; }

    /* Bubble: a soft, shiny 3D strip that glows a little */
    html.wz-style-bubble #wz-titlebar {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.25) 48%, rgba(255, 255, 255, 0) 52%),
        linear-gradient(180deg, var(--wzt-bub1) 0%, var(--wzt-bub2) 100%);
      border-bottom: none;
      box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.08), 0 3px 12px var(--wzt-bubble-glow), 0 1px 3px rgba(0, 0, 0, 0.12);
      font: bold 12px "Segoe UI", Tahoma, sans-serif;
    }
    html.wz-style-bubble .wzt-title { text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85), 0 0 8px rgba(255, 255, 255, 0.7); color: var(--wzt-soft-text); margin-top: 7px; }
    html.wz-style-bubble .wzt-icon { width: 18px; height: 18px; margin-top: 6px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2)); }

    /* Comic: flat pastel cartoon strip with a soft ink line and comic dots */
    html.wz-style-comic #wz-titlebar {
      background:
        radial-gradient(rgba(59, 47, 47, 0.07) 1px, transparent 1.6px) 0 0 / 7px 7px,
        var(--wzt-soft1);
      border-bottom: 2.5px solid #3b2f2f;
      box-shadow: 0 2px 0 rgba(59, 47, 47, 0.18);
      font: bold 12px "Segoe UI", Tahoma, sans-serif;
    }
    html.wz-style-comic .wzt-title { text-shadow: none; color: #3b2f2f; margin-top: 6px; }
    html.wz-style-comic .wzt-icon { width: 18px; height: 18px; margin-top: 5px; }
    html.wz-style-comic #wz-titlebar.wzt-blurred { filter: saturate(0.7); }

    /* dark border colour (dark mode): a dark bar with light text, in every look */
    #wz-titlebar.wzt-dark { border-bottom-color: rgba(0, 0, 0, 0.55); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 1px 3px rgba(0, 0, 0, 0.35); }
    #wz-titlebar.wzt-dark.wzt-blurred { filter: brightness(0.9); }
    html.wz-style-modern #wz-titlebar.wzt-dark { border-bottom: 1px solid rgba(255, 255, 255, 0.08); box-shadow: none; }
    html.wz-style-bubble #wz-titlebar.wzt-dark {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 50%, rgba(255, 255, 255, 0) 52%), linear-gradient(180deg, var(--wzt-bub1) 0%, var(--wzt-bub2) 100%);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }
    html.wz-style-bubble #wz-titlebar.wzt-dark .wzt-title { text-shadow: none; }
    html.wz-style-comic #wz-titlebar.wzt-dark { background: var(--wzt-soft1); border-bottom-color: rgba(255, 255, 255, 0.35); box-shadow: none; }
    html.wz-style-comic #wz-titlebar.wzt-dark .wzt-title { color: var(--wzt-soft-text); }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const bar = document.createElement('div');
  bar.id = 'wz-titlebar';
  bar.innerHTML = `
    <img class="wzt-icon" alt="">
    <div class="wzt-title">Banana Jam</div>
    ${window.WzStyle ? window.WzStyle.capsHTML(['min', 'max', 'close']) : ''}`;
  const hot = document.createElement('div');
  hot.id = 'wz-titlebar-hot';
  document.body.appendChild(hot);
  document.body.appendChild(bar);

  const send = (action) => { if (window.ipc) window.ipc.send('wz-win', action); };
  const btnMin = bar.querySelector('.wzcap-min'), btnMax = bar.querySelector('.wzcap-max'), btnClose = bar.querySelector('.wzcap-close');
  if (btnMin) btnMin.addEventListener('click', () => send('minimize'));
  if (btnMax) btnMax.addEventListener('click', () => send('maximize'));
  if (btnClose) btnClose.addEventListener('click', () => send('close'));
  bar.addEventListener('dblclick', (e) => { if (!e.target.closest('.wzcaps')) send('maximize'); });

  // ---- colours from the Game Border colour ----
  const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return hexOf(A.map((x, i) => x + (B[i] - x) * t)); };
  const bright = (hex) => { const c = rgbOf(hex); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; };
  function toHex(v) {
    v = (v || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
    const m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
    return m ? hexOf([+m[1], +m[2], +m[3]]) : null;
  }
  let lastTint = '';
  function paint() {
    const tint = toHex(getComputedStyle(document.documentElement).getPropertyValue('--wz-border')) || '#bccb8e';
    if (tint === lastTint) return;
    lastTint = tint;
    const st = bar.style;
    const dark = bright(tint) < 90;
    bar.classList.toggle('wzt-dark', dark);
    if (dark) {
      // dark border colour: only a touch of white, so the bar stays dark
      st.setProperty('--wzt-g1', mix(tint, '#ffffff', 0.13));
      st.setProperty('--wzt-g2', mix(tint, '#ffffff', 0.08));
      st.setProperty('--wzt-g3', mix(tint, '#ffffff', 0.04));
      st.setProperty('--wzt-g4', mix(tint, '#ffffff', 0.02));
      st.setProperty('--wzt-text', '#ececec');
      st.setProperty('--wzt-glow', 'rgba(0, 0, 0, 0.6)');
      st.setProperty('--wzt-flat', mix(tint, '#ffffff', 0.05));
      st.setProperty('--wzt-flat-text', '#ececec');
      st.setProperty('--wzt-soft1', mix(tint, '#ffffff', 0.1));
      st.setProperty('--wzt-bub1', mix(tint, '#ffffff', 0.14));
      st.setProperty('--wzt-bub2', mix(tint, '#ffffff', 0.06));
      st.setProperty('--wzt-bubble-glow', 'rgba(0, 0, 0, 0.25)');
      st.setProperty('--wzt-soft2', mix(tint, '#ffffff', 0.08));
      st.setProperty('--wzt-soft3', mix(tint, '#ffffff', 0.04));
      st.setProperty('--wzt-soft-text', '#ececec');
      return;
    }
    st.setProperty('--wzt-g1', mix(tint, '#ffffff', 0.6));
    st.setProperty('--wzt-g2', mix(tint, '#ffffff', 0.3));
    st.setProperty('--wzt-g3', tint);
    st.setProperty('--wzt-g4', mix(tint, '#ffffff', 0.2));
    const light = bright(mix(tint, '#ffffff', 0.3)) > 140;
    st.setProperty('--wzt-text', light ? '#111111' : '#ffffff');
    st.setProperty('--wzt-glow', light ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.85)');
    // Modern: a light, flat version of the colour
    st.setProperty('--wzt-flat', mix(tint, '#ffffff', 0.72));
    st.setProperty('--wzt-flat-text', '#1f1f1f');
    // Bubble and Comic: soft versions of the colour
    st.setProperty('--wzt-soft1', mix(tint, '#ffffff', 0.55));
    st.setProperty('--wzt-bub1', mix(tint, '#ffffff', 0.72));
    st.setProperty('--wzt-bub2', mix(tint, '#ffffff', 0.4));
    st.setProperty('--wzt-bubble-glow', 'rgba(' + rgbOf(tint).join(', ') + ', 0.45)');
    st.setProperty('--wzt-soft2', mix(tint, '#ffffff', 0.45));
    st.setProperty('--wzt-soft3', mix(tint, '#ffffff', 0.2));
    st.setProperty('--wzt-soft-text', mix(tint, '#000000', 0.65));
  }
  paint();
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  // ---- name and icon ----
  const icon = bar.querySelector('.wzt-icon');
  const title = bar.querySelector('.wzt-title');
  let loginIcon = 'images/banana.png';
  let gameIcon = '';
  let inGame = false;
  function showIcon() {
    const src = inGame ? (gameIcon || '') : (loginIcon || '');
    if (src) icon.setAttribute('src', src); else icon.removeAttribute('src');
  }
  window.addEventListener('wz-theme-identity', (e) => {
    const d = (e && e.detail) || {};
    if (typeof d.name === 'string' && d.name.trim()) {
      title.textContent = d.name.trim();
      document.title = d.name.trim();
    }
    if (typeof d.icon === 'string') loginIcon = d.icon; // '' means no icon
    showIcon();
  });
  if (window.ipc) {
    window.ipc.on('wz-win-icon', (event, dataUrl) => {
      if (typeof dataUrl === 'string' && /^data:image\//.test(dataUrl)) { gameIcon = dataUrl; showIcon(); }
    });
    window.ipc.on('wz-win-state', (event, state) => {
      state = state || {};
      bar.classList.toggle('wzt-maximized', !!state.maximized);
      bar.classList.toggle('wzt-blurred', state.focused === false);
      document.body.classList.toggle('wzt-fullscreen', !!state.fullscreen);
      if (btnMax) {
        btnMax.classList.toggle('is-restore', !!state.maximized);
        btnMax.title = state.maximized ? 'Restore Down' : 'Maximise';
      }
    });
    window.ipc.send('wz-win', 'state');
  }
  showIcon();

  // ---- in the game: hide it, show it when the mouse goes to the top ----
  let hideTimer = 0;
  const reveal = () => { clearTimeout(hideTimer); bar.classList.add('wzt-show'); };
  const conceal = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => bar.classList.remove('wzt-show'), 700); };
  hot.addEventListener('mouseenter', reveal);
  bar.addEventListener('mouseenter', reveal);
  bar.addEventListener('mouseleave', conceal);
  const gameScreen = document.getElementById('game-screen');
  function syncGame() {
    inGame = !!(gameScreen && gameScreen.classList.contains('show'));
    document.body.classList.toggle('wzt-in-game', inGame);
    if (!inGame) bar.classList.remove('wzt-show');
    showIcon();
  }
  if (gameScreen) new MutationObserver(syncGame).observe(gameScreen, { attributes: true, attributeFilter: ['class'] });
  syncGame();

  window.WzTitleBar = { height: HEIGHT, element: bar };
})();
