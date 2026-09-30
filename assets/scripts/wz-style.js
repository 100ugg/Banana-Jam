/*
 * WzStyle - Banana Jam's look ("style") and window button settings.
 * Shared by the game window and (as a copy) the launcher.
 *
 * Look:            vista (glass) · modern (sleek) · bubble (soft, shiny 3D) · comic (soft 2D cartoon)
 *                 · crystal (see-through glass, on top of bubble) · mac and cards (on top of modern)
 * Window buttons:  match the look · vista · modern (Windows 11) · mac · bubble · comic · retro (Windows 98)
 *
 * It puts classes on <html>: "wz-style-<look>" and "wzb-<buttons>", and
 * data-wz-style / data-wz-btns. All the CSS for each look keys off those.
 * CAPS_CSS draws the window buttons (minimise, maximise, close) for every
 * button style; any element inside a ".wzb-<buttons>" parent picks it up.
 */
(function () {
  if (window.WzStyle) return;

  const UI_KEY = 'wzUiStyle';
  const BTN_KEY = 'wzWinButtons';
  const LOOKS = [['vista', 'Vista / 7'], ['modern', 'Modern'], ['bubble', 'Bubble'], ['comic', 'Comic'], ['crystal', 'Crystal'], ['mac', 'Mac'], ['cards', 'Mod Menu']];
  // Crystal is Bubble plus glass, Mac is Modern plus Mac touches: they wear both classes
  const BASE = { crystal: 'bubble', mac: 'modern', cards: 'modern' };
  const BUTTONS = [['match', 'Match look'], ['vista', 'Vista / 7'], ['modern', 'Windows 11'],
    ['mac', 'Mac'], ['bubble', 'Bubble'], ['comic', 'Comic'], ['retro', 'Windows 98'], ['cards', 'Mod Menu']];
  const MATCH = { vista: 'vista', modern: 'modern', bubble: 'bubble', comic: 'comic', crystal: 'bubble', mac: 'mac', cards: 'cards' };
  const has = (list, v) => list.some((x) => x[0] === v);

  // the old "Cute" look is now the Bubble look: move old saved settings across
  function migrate() {
    try {
      if (localStorage.getItem(UI_KEY) === 'cute') localStorage.setItem(UI_KEY, 'bubble');
      if (localStorage.getItem(BTN_KEY) === 'cute') localStorage.setItem(BTN_KEY, 'bubble');
    } catch (e) {}
  }
  migrate();

  function get() {
    let ui = 'mac', btns = 'match';
    try {
      const u = localStorage.getItem(UI_KEY); if (has(LOOKS, u)) ui = u;
      const b = localStorage.getItem(BTN_KEY); if (has(BUTTONS, b)) btns = b;
    } catch (e) {}
    return { ui, base: BASE[ui] || ui, btns, btnsUsed: btns === 'match' ? MATCH[ui] : btns };
  }

  function apply() {
    const s = get();
    const root = document.documentElement;
    Array.from(root.classList).forEach((c) => { if (/^wz-style-|^wzb-/.test(c)) root.classList.remove(c); });
    root.classList.add('wz-style-' + s.base, 'wz-style-' + s.ui, 'wzb-' + s.btnsUsed);
    root.dataset.wzStyle = s.ui;
    root.dataset.wzBtns = s.btnsUsed;
    try { window.dispatchEvent(new CustomEvent('wz-style-change', { detail: s })); } catch (e) {}
    return s;
  }

  function set(changes) {
    changes = changes || {};
    try {
      if (has(LOOKS, changes.ui)) localStorage.setItem(UI_KEY, changes.ui);
      if (has(BUTTONS, changes.btns)) localStorage.setItem(BTN_KEY, changes.btns);
    } catch (e) {}
    return apply();
  }

  function reset() {
    try { localStorage.removeItem(UI_KEY); localStorage.removeItem(BTN_KEY); } catch (e) {}
    return apply();
  }

  function fillSelect(select, list, value) {
    if (!select) return;
    select.innerHTML = '';
    list.forEach((x) => {
      const o = document.createElement('option');
      o.value = x[0]; o.textContent = x[1];
      select.appendChild(o);
    });
    select.value = value;
  }

  // wire a "look" drop-down and a "window buttons" drop-down
  function bindSelects(lookSelect, btnSelect) {
    const s = get();
    fillSelect(lookSelect, LOOKS, s.ui);
    fillSelect(btnSelect, BUTTONS, s.btns);
    if (lookSelect) lookSelect.addEventListener('change', () => set({ ui: lookSelect.value }));
    if (btnSelect) btnSelect.addEventListener('change', () => set({ btns: btnSelect.value }));
    window.addEventListener('wz-style-change', () => {
      const n = get();
      if (lookSelect && lookSelect.value !== n.ui) lookSelect.value = n.ui;
      if (btnSelect && btnSelect.value !== n.btns) btnSelect.value = n.btns;
    });
  }

  // the little pictures on the window buttons
  const GLYPH = {
    min: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 7.5h8"/></svg>',
    max: '<svg class="g-max" viewBox="0 0 10 10" aria-hidden="true"><rect x="1.2" y="1.2" width="7.6" height="7.6"/></svg>' +
         '<svg class="g-restore" viewBox="0 0 10 10" aria-hidden="true"><rect x="1" y="3" width="6" height="6"/><path d="M3 3V1h6v6H7"/></svg>',
    close: '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7"/></svg>'
  };
  // HTML for a set of window buttons, e.g. capsHTML(['min', 'max', 'close'])
  function capsHTML(which, extraClass) {
    const titles = { min: 'Minimise', max: 'Maximise', close: 'Close' };
    return '<div class="wzcaps' + (extraClass ? ' ' + extraClass : '') + '">' +
      which.map((w) => `<button type="button" class="wzcap wzcap-${w}" title="${titles[w]}">${GLYPH[w]}</button>`).join('') +
      '</div>';
  }

  const CAPS_CSS = `
    .wzcaps { display: flex; align-items: flex-start; flex-shrink: 0; -webkit-app-region: no-drag; }
    .wzcap {
      -webkit-app-region: no-drag; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
      padding: 0; margin: 0; cursor: pointer; outline: none; font-size: 0; line-height: 0; color: inherit;
    }
    .wzcap > i { display: none !important; }
    .wzcap svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.5; overflow: visible; }
    .wzcap .g-restore { display: none; }
    .wzcap.is-restore .g-max { display: none; }
    .wzcap.is-restore .g-restore { display: block; }

    /* Vista / 7: joined glass buttons hanging from the top edge, red close */
    .wzb-vista .wzcap {
      width: 27px; height: 21px; margin-top: -1px; border: 1px solid rgba(0, 0, 0, 0.55); border-top: none; border-left: none;
      background: linear-gradient(180deg, rgba(255,255,255,.72) 0%, rgba(255,255,255,.34) 45%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.32) 100%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.45); color: #1e1e1e; border-radius: 0;
    }
    .wzb-vista .wzcap:first-child { border-left: 1px solid rgba(0, 0, 0, 0.55); border-bottom-left-radius: 5px; }
    .wzb-vista .wzcap:last-child { border-bottom-right-radius: 5px; }
    .wzb-vista .wzcap svg { stroke-width: 2.1; filter: drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.95)); }
    .wzb-vista .wzcap:hover { background: linear-gradient(180deg, #eaf6fd 0%, #c9e8fb 45%, #9fd6f7 50%, #bfe6fb 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.6), 0 0 7px rgba(110, 190, 255, 0.95); }
    .wzb-vista .wzcap-close { width: 46px; color: #fff; background: linear-gradient(180deg, #e8a393 0%, #d8604a 45%, #c1341a 50%, #d9573c 100%); }
    .wzb-vista .wzcap-close svg { filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.8)); }
    .wzb-vista .wzcap-close:hover { background: linear-gradient(180deg, #f6bfae 0%, #ea7a5f 45%, #d8401f 50%, #ef7a55 100%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.5), 0 0 8px rgba(255, 120, 80, 0.95); }

    /* Modern: flat, like Windows 11 */
    .wzb-modern .wzcaps { align-self: stretch; }
    .wzb-modern .wzcap { width: 44px; height: var(--wzcap-h, 30px); border: none; border-radius: 0; background: transparent; color: inherit; transition: background .12s ease; }
    .wzb-modern .wzcap svg { stroke-width: 1.1; }
    .wzb-modern .wzcap:hover { background: rgba(128, 128, 128, 0.22); }
    .wzb-modern .wzcap-close:hover { background: #c42b1c; color: #fff; }

    /* Mod Menu: round buttons, with a red round close button */
    .wzb-cards .wzcaps { gap: 6px; padding: 0 8px; align-self: center; }
    .wzb-cards .wzcap { width: 28px; height: 28px; border-radius: 50%; border: none; color: inherit; background: rgba(128, 128, 128, 0.2); transition: background .12s ease, transform .12s ease; }
    .wzb-cards .wzcap svg { width: 11px; height: 11px; stroke-width: 2.2; stroke-linecap: round; }
    .wzb-cards .wzcap:hover { background: rgba(128, 128, 128, 0.38); transform: scale(1.06); }
    .wzb-cards .wzcap-close { background: #c0392b; color: #fff; }
    .wzb-cards .wzcap-close:hover { background: #d94636; }

    /* Mac: little traffic lights on the left, symbols show on hover */
    .wzb-mac .wzcaps { order: -1; gap: 8px; padding: 0 10px; align-self: center; }
    .wzb-mac .wzcap-close { order: 1; }
    .wzb-mac .wzcap-min { order: 2; }
    .wzb-mac .wzcap-max { order: 3; }
    .wzb-mac .wzcap { width: 13px; height: 13px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.22); color: rgba(60, 20, 0, 0.7); }
    .wzb-mac .wzcap-close { background: #ff5f57; }
    .wzb-mac .wzcap-min { background: #febc2e; }
    .wzb-mac .wzcap-max { background: #28c840; }
    .wzb-mac .wzcap svg { width: 7px; height: 7px; stroke-width: 1.5; opacity: 0; }
    .wzb-mac .wzcaps:hover .wzcap svg { opacity: 1; }

    /* Bubble: shiny 3D candy orbs with a soft glow */
    .wzb-bubble .wzcaps { gap: 7px; padding: 0 9px; align-self: center; }
    .wzb-bubble .wzcap {
      position: relative; width: 20px; height: 20px; border-radius: 50%; border: none; color: rgba(255, 255, 255, 0.95);
      box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.18), inset 0 2px 2px rgba(255, 255, 255, 0.55), 0 2px 5px rgba(0, 0, 0, 0.2), 0 0 10px var(--wzcap-glow, rgba(255, 255, 255, 0.5));
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    .wzb-bubble .wzcap::before {
      content: ''; position: absolute; left: 4px; top: 2px; width: 12px; height: 7px; border-radius: 50%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0)); pointer-events: none;
    }
    .wzb-bubble .wzcap-min { --wzcap-glow: rgba(255, 200, 80, 0.55); background: radial-gradient(circle at 50% 35%, #ffe79a 0%, #ffc94a 55%, #eea522 100%); }
    .wzb-bubble .wzcap-max { --wzcap-glow: rgba(90, 210, 140, 0.55); background: radial-gradient(circle at 50% 35%, #b6f5c9 0%, #62d68e 55%, #2fae62 100%); }
    .wzb-bubble .wzcap-close { --wzcap-glow: rgba(255, 110, 150, 0.6); background: radial-gradient(circle at 50% 35%, #ffc2d3 0%, #ff7aa0 55%, #e8467a 100%); }
    .wzb-bubble .wzcap svg { position: relative; width: 8px; height: 8px; stroke-width: 2.4; stroke-linecap: round; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3)); }
    .wzb-bubble .wzcap:hover { transform: scale(1.14); filter: brightness(1.06); box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.18), inset 0 2px 2px rgba(255, 255, 255, 0.6), 0 3px 7px rgba(0, 0, 0, 0.2), 0 0 16px var(--wzcap-glow); }
    .wzb-bubble .wzcap:active { transform: scale(0.94); }

    /* Comic: flat cartoon dots with a soft ink outline and a little drop shadow */
    .wzb-comic .wzcaps { gap: 6px; padding: 0 9px 2px 8px; align-self: center; }
    .wzb-comic .wzcap {
      width: 20px; height: 20px; border-radius: 50%; border: 2px solid #3b2f2f; color: #3b2f2f;
      box-shadow: 2px 2px 0 #3b2f2f; transition: transform .1s ease, box-shadow .1s ease;
    }
    .wzb-comic .wzcap-min { background: #ffe08a; }
    .wzb-comic .wzcap-max { background: #a8e6b8; }
    .wzb-comic .wzcap-close { background: #ffab9e; }
    .wzb-comic .wzcap svg { width: 8px; height: 8px; stroke-width: 2.4; stroke-linecap: round; }
    .wzb-comic .wzcap:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #3b2f2f; }
    .wzb-comic .wzcap:active { transform: translate(2px, 2px); box-shadow: 0 0 0 #3b2f2f; }

    /* Retro: grey Windows 98 buttons */
    .wzb-retro .wzcaps { gap: 2px; padding: 0 5px; align-self: center; }
    .wzb-retro .wzcap {
      width: 18px; height: 16px; border: none; border-radius: 0; background: #c0c0c0; color: #000;
      box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;
    }
    .wzb-retro .wzcap:active { box-shadow: inset 1px 1px #0a0a0a, inset -1px -1px #ffffff, inset 2px 2px #808080, inset -2px -2px #dfdfdf; }
    .wzb-retro .wzcap svg { width: 8px; height: 8px; stroke-width: 2; stroke-linecap: square; }
    .wzb-retro .wzcap-close { margin-left: 2px; }
  `;

  function injectCaps(root) {
    root = root || document.head;
    if (!root || (root.querySelector && root.querySelector('style[data-wzcaps]'))) return;
    const s = document.createElement('style');
    s.setAttribute('data-wzcaps', '1');
    s.textContent = CAPS_CSS;
    root.appendChild(s);
  }

  window.WzStyle = { LOOKS, BUTTONS, get, set, apply, reset, bindSelects, fillSelect, capsHTML, GLYPH, CAPS_CSS, injectCaps };
  apply();
  if (document.head) injectCaps(document.head);
  else document.addEventListener('DOMContentLoaded', () => injectCaps(document.head));
})();
