/*
 * WzColorPicker - Banana Jam's own colour picker, drawn as a little
 * Windows Vista / 7 window: glass frame and title bar with a red close
 * button, a hue wheel, brightness and strength sliders, a hex box with
 * Copy, recent colours, and OK / Cancel.
 *
 * It takes over every <input type="color"> it is attached to. When a colour
 * changes it writes the input's value and fires the normal "input" and
 * "change" events, so all the existing theme code keeps working unchanged.
 *
 * The "See-through" setting only changes the glass frame (like real Aero),
 * so whatever is behind the window never shows through the controls.
 *
 * Note: the game window runs an older Chrome, so no color-mix() here.
 * Mixed colours are worked out in JavaScript instead.
 */
(function () {
  const RECENT_KEY = 'wzRecentColors';
  const MAX_RECENT = 8;

  // ---------- colour maths ----------
  function hsvToHex(h, s, v) {
    const f = (n) => {
      const k = (n + h / 60) % 6;
      return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    };
    const to = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
    return '#' + to(f(5)) + to(f(3)) + to(f(1));
  }

  function hexToHsv(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return { h: 0, s: 1, v: 1 };
    const n = parseInt(m[1], 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  }

  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
  const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgbOf(a), B = rgbOf(b); return hexOf(A.map((x, i) => x + (B[i] - x) * t)); };
  const rgba = (hex, a) => { const c = rgbOf(hex); return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`; };
  const bright = (hex) => { const c = rgbOf(hex); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; };
  // turn "rgb(1, 2, 3)" or "#abc" or "#aabbcc" into "#aabbcc" (or null)
  function toHex(v) {
    v = (v || '').trim();
    if (isHex(v)) return v.toLowerCase();
    let m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
    if (m) return ('#' + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toLowerCase();
    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
    if (m) return hexOf([+m[1], +m[2], +m[3]]);
    return null;
  }

  // ---------- picker window settings (see-through amount, style, size, position) ----------
  const PREFS_KEY = 'wzPickerPrefs';
  const SIZES = { small: 0.85, normal: 1, large: 1.15 };
  function loadPrefs() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) {}
    return {
      opacity: typeof p.opacity === 'number' ? Math.max(40, Math.min(100, p.opacity)) : 85,
      style: p.style === 'light' ? 'light' : 'dark',
      styleLocked: p.styleLocked === true,
      size: SIZES[p.size] ? p.size : 'normal',
      x: typeof p.x === 'number' ? p.x : null,
      gx: typeof p.gx === 'number' ? p.gx : null,
      gy: typeof p.gy === 'number' ? p.gy : null,
      y: typeof p.y === 'number' ? p.y : null
    };
  }
  function savePrefs(changes) {
    const next = Object.assign(loadPrefs(), changes);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (e) {}
    return next;
  }
  let activeClose = null;

  // Is the app's card dark? A locked Box colour wins, otherwise the Dark Mode setting.
  function appIsDark(host) {
    if (!host) return true;
    if (host.classList.contains('wz-card-light')) return false;
    if (host.classList.contains('wz-card-dark')) return true;
    return host.classList.contains('dark-mode');
  }

  // Dark or light: follows the app's Dark Mode setting unless the user locked their own choice
  function styleFor(root, prefs) {
    if (prefs.styleLocked) return prefs.style;
    const host = root && root.host;
    return appIsDark(host) ? 'dark' : 'light';
  }

  function loadRecent() {
    try {
      const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(list) ? list.filter(isHex).slice(0, MAX_RECENT) : [];
    } catch (e) { return []; }
  }

  function pushRecent(hex) {
    if (!isHex(hex)) return;
    const list = loadRecent().filter((c) => c.toLowerCase() !== hex.toLowerCase());
    list.unshift(hex.toLowerCase());
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))); } catch (e) {}
  }

  const STYLE = `
    .wzcp {
      position: fixed; z-index: 20000; box-sizing: border-box;
      width: 322px; padding: 0 8px 8px;
      border: 1px solid rgba(0, 0, 0, 0.62); border-radius: 7px;
      background: linear-gradient(180deg, var(--wzcp-g1) 0%, var(--wzcp-g2) 22px, var(--wzcp-g3) 23px, var(--wzcp-g4) 100%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 22px rgba(0, 0, 0, 0.45);
      -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
      font-family: var(--wzcp-font, CCDigitalDelivery), "Segoe UI", Tahoma, sans-serif;
      user-select: none; text-align: left;
    }
    .wzcp * { box-sizing: border-box; }
    .wzcp.standalone { position: static; margin: 0; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 3px 9px rgba(0, 0, 0, 0.45); }

    /* title bar */
    .wzcp-head { display: flex; align-items: flex-start; height: 32px; cursor: default; touch-action: none; }
    .wzcp.standalone .wzcp-head { -webkit-app-region: drag; }
    .wzcp-ico {
      flex-shrink: 0; width: 17px; height: 17px; margin: 8px 7px 0 2px; border-radius: 50%;
      background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
    .wzcp-title {
      flex: 1; margin-top: 7px; font: 13px "Segoe UI", Tahoma, sans-serif; color: var(--wzcp-title);
      text-shadow: 0 0 7px var(--wzcp-glow), 0 0 3px var(--wzcp-glow);
      white-space: nowrap; overflow: hidden;
    }
    .wzcp-head .wzcaps { margin-left: 6px; --wzcap-h: 32px; color: var(--wzcp-title); }

    /* the window's inside */
    .wzcp-client {
      padding: 12px 13px 13px; border: 1px solid rgba(0, 0, 0, 0.5); border-radius: 2px;
      background: var(--wzcp-card); color: var(--wzcp-text); font-size: 14px;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35);
    }
    .wzcp-well {
      display: flex; justify-content: center; padding: 10px; margin-bottom: 12px;
      background: var(--wzcp-field); border: 1px solid var(--wzcp-line); border-radius: 3px;
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.18);
    }
    .wzcp-wheel {
      position: relative; width: 214px; height: 214px; border-radius: 50%; cursor: crosshair; touch-action: none;
      background:
        radial-gradient(circle closest-side, #fff 0%, rgba(255, 255, 255, 0) 100%),
        conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
    }
    .wzcp-dot {
      position: absolute; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%;
      border: 3px solid #fff; pointer-events: none;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.5);
    }

    /* trackbars */
    .wzcp-slider-row { display: flex; align-items: center; gap: 8px; height: 32px; }
    .wzcp-slider-label { flex: 0 0 84px; font-size: 14px; }
    .wzcp-slider-val { flex: 0 0 38px; text-align: right; font-size: 13px; color: var(--wzcp-muted); }
    .wzcp-range {
      -webkit-appearance: none; appearance: none; flex: 1; min-width: 0; height: 8px; margin: 0; cursor: pointer;
      border: 1px solid #8e8f8f; border-radius: 2px; outline: none;
      box-shadow: inset 1px 1px 1px rgba(0, 0, 0, 0.25);
    }
    .wzcp-range::-webkit-slider-thumb {
      -webkit-appearance: none; width: 13px; height: 23px; border-radius: 2px; cursor: pointer;
      border: 1px solid #707070;
      background: linear-gradient(180deg, #f6f6f6 0%, #e6e6e6 48%, #d5d5d5 52%, #cacaca 100%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.85), 0 1px 1px rgba(0, 0, 0, 0.2);
    }
    .wzcp-range:hover::-webkit-slider-thumb, .wzcp-range:focus::-webkit-slider-thumb {
      border-color: #3c7fb1; background: linear-gradient(180deg, #eaf6fd 0%, #d9f0fc 48%, #bee6fd 52%, #a7d9f5 100%);
    }

    /* group boxes */
    .wzcp-group { position: relative; margin-top: 16px; padding: 14px 10px 10px; border: 1px solid var(--wzcp-line); border-radius: 4px; }
    .wzcp-legend {
      position: absolute; top: -9px; left: 8px; padding: 0 5px; line-height: 16px;
      background: var(--wzcp-card); color: var(--wzcp-accent); font-size: 13px; font-weight: bold;
    }
    .wzcp-hexrow { display: flex; align-items: center; gap: 7px; }
    .wzcp-swatch {
      flex-shrink: 0; display: flex; width: 56px; height: 30px; cursor: pointer;
      border: 1px solid var(--wzcp-line); border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
      overflow: hidden;
    }
    .wzcp-new, .wzcp-old { flex: 1; }
    .wzcp-hex {
      flex: 1; min-width: 0; height: 30px; padding: 0 6px; outline: none; text-align: center;
      background: var(--wzcp-field); color: var(--wzcp-text);
      border: 1px solid var(--wzcp-line); border-top-color: var(--wzcp-line-dark); border-radius: 2px;
      font: 15px Consolas, "Lucida Console", monospace; letter-spacing: 0.5px; user-select: text;
    }
    .wzcp-hex:focus { border-color: #3d7bad; box-shadow: 0 0 0 1px rgba(61, 123, 173, 0.35); }
    .wzcp-recent { display: flex; flex-wrap: wrap; gap: 6px; min-height: 26px; }
    .wzcp-recent button {
      width: 26px; height: 26px; padding: 0; cursor: pointer; border-radius: 3px;
      border: 1px solid rgba(0, 0, 0, 0.45); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    }
    .wzcp-recent button:hover { border-color: #3c7fb1; box-shadow: inset 0 0 0 1px rgba(255,255,255,.7), 0 0 4px rgba(80, 160, 230, 0.9); }
    .wzcp-empty { font-size: 13px; color: var(--wzcp-muted); align-self: center; }
    .wzcp.st-bubble .wzcp-empty { color: var(--wzcp-text); opacity: .85; }

    /* buttons */
    .wzcp-btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
    .wzcp-btn {
      -webkit-app-region: no-drag;
      min-width: 82px; height: 29px; padding: 0 12px; cursor: pointer; border-radius: 3px;
      border: 1px solid #707070; color: #1e1e1e;
      background: linear-gradient(180deg, #f2f2f2 0%, #ebebeb 48%, #dddddd 52%, #cfcfcf 100%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
      font: 13px "Segoe UI", Tahoma, sans-serif;
    }
    .wzcp-btn:hover { border-color: #3c7fb1; background: linear-gradient(180deg, #eaf6fd 0%, #d9f0fc 48%, #bee6fd 52%, #a7d9f5 100%); }
    .wzcp-btn:active { border-color: #2c628b; background: linear-gradient(180deg, #e5f4fc 0%, #c4e5f6 48%, #98d1ef 52%, #68b3db 100%); }
    .wzcp-copy { min-width: 0; height: 30px; }
    .wzcp-done { border-color: #3c7fb1; box-shadow: inset 0 0 0 1px #a5dcf9, 0 0 3px rgba(60, 127, 177, 0.6); font-weight: bold; }

    /* ---------- Modern: sleek and flat ---------- */
    .wzcp.st-modern {
      padding: 0; border: 1px solid rgba(0, 0, 0, 0.14); border-radius: 12px; overflow: hidden;
      background: var(--wzcp-card); box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
      -webkit-backdrop-filter: none; backdrop-filter: none;
    }
    .wzcp.st-modern .wzcp-head { height: 38px; }
    .wzcp.st-modern .wzcp-head .wzcaps { --wzcap-h: 38px; color: var(--wzcp-text); }
    .wzcp.st-modern .wzcp-ico { margin: 11px 8px 0 14px; }
    .wzcp.st-modern .wzcp-title { margin-top: 10px; color: var(--wzcp-text); text-shadow: none; font-weight: 600; }
    .wzcp.st-modern .wzcp-client { border: none; border-radius: 0; box-shadow: none; background: transparent; padding: 4px 16px 16px; }
    .wzcp.st-modern .wzcp-well { border: none; border-radius: 12px; box-shadow: none; }
    .wzcp.st-modern .wzcp-range { height: 6px; border: none; border-radius: 99px; box-shadow: none; }
    .wzcp.st-modern .wzcp-range::-webkit-slider-thumb {
      width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff;
      background: var(--wzcp-fill); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
    }
    .wzcp.st-modern .wzcp-range:hover::-webkit-slider-thumb { border-color: #fff; background: var(--wzcp-fill); transform: scale(1.1); }
    .wzcp.st-modern .wzcp-group { border-radius: 12px; }
    .wzcp.st-modern .wzcp-legend { font-weight: 600; }
    .wzcp.st-modern .wzcp-swatch, .wzcp.st-modern .wzcp-hex { border-radius: 8px; }
    .wzcp.st-modern .wzcp-hex { border-top-color: var(--wzcp-line); }
    .wzcp.st-modern .wzcp-recent button { border-radius: 7px; border-color: rgba(0, 0, 0, 0.12); box-shadow: none; }
    .wzcp.st-modern .wzcp-btn {
      height: 32px; border-radius: 8px; border: 1px solid var(--wzcp-line); box-shadow: none;
      background: var(--wzcp-field); color: var(--wzcp-text); font-weight: 500;
    }
    .wzcp.st-modern .wzcp-btn:hover { background: rgba(128, 128, 128, 0.14); border-color: var(--wzcp-line); }
    .wzcp.st-modern .wzcp-done { background: var(--wzcp-fill); color: var(--wzcp-fill-text); border-color: transparent; font-weight: 600; }
    .wzcp.st-modern .wzcp-done:hover { background: var(--wzcp-fill); filter: brightness(1.08); }

    /* ---------- Bubble: soft, shiny 3D with a gentle glow ---------- */
    .wzcp.st-bubble {
      padding: 0 10px 10px; border: 2px solid rgba(255, 255, 255, 0.95); border-radius: 28px;
      background:
        radial-gradient(ellipse at 50% -10%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 55%),
        linear-gradient(180deg, var(--wzcp-bub1) 0%, var(--wzcp-bub2) 100%);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 0 26px var(--wzcp-glow), 0 14px 34px rgba(0, 0, 0, 0.22), inset 0 -5px 10px rgba(0, 0, 0, 0.06);
      -webkit-backdrop-filter: none; backdrop-filter: none;
    }
    .wzcp.st-bubble .wzcp-head { height: 36px; }
    .wzcp.st-bubble .wzcp-ico { margin: 10px 7px 0 6px; width: 18px; height: 18px; box-shadow: 0 0 0 2px #fff, 0 0 8px rgba(255, 255, 255, 0.8); }
    .wzcp.st-bubble .wzcp-title { margin-top: 9px; font-weight: bold; color: var(--wzcp-soft-text); text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85), 0 0 8px rgba(255, 255, 255, 0.7); }
    .wzcp.st-bubble .wzcp-client {
      border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 22px; background: var(--wzcp-card);
      box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.07), 0 1px 0 rgba(255, 255, 255, 0.8); padding: 14px;
    }
    .wzcp.st-bubble .wzcp-well { border: none; border-radius: 22px; box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.09), inset 0 -2px 4px rgba(255, 255, 255, 0.6); }
    .wzcp.st-bubble .wzcp-wheel { box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.9), 0 0 16px var(--wzcp-glow), 0 4px 10px rgba(0, 0, 0, 0.18); }
    .wzcp.st-bubble .wzcp-dot { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 0 10px rgba(255, 255, 255, 0.9), 0 2px 4px rgba(0, 0, 0, 0.4); }
    .wzcp.st-bubble .wzcp-range { height: 12px; border: none; border-radius: 99px; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25), 0 1px 0 rgba(255, 255, 255, 0.8); }
    .wzcp.st-bubble .wzcp-range::-webkit-slider-thumb {
      width: 22px; height: 22px; border-radius: 50%; border: 2px solid #fff;
      background: radial-gradient(circle at 50% 30%, #ffffff 0%, var(--wzcp-fill) 65%);
      box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 2px 5px rgba(0, 0, 0, 0.3), 0 0 10px var(--wzcp-glow);
    }
    .wzcp.st-bubble .wzcp-range:hover::-webkit-slider-thumb { border-color: #fff; background: radial-gradient(circle at 50% 30%, #ffffff 0%, var(--wzcp-fill) 65%); transform: scale(1.12); box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.2), 0 2px 5px rgba(0, 0, 0, 0.3), 0 0 16px var(--wzcp-glow); }
    .wzcp.st-bubble .wzcp-group { border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 20px; background: rgba(255, 255, 255, 0.35); box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.04); }
    .wzcp.st-bubble .wzcp-legend { border-radius: 99px; padding: 0 9px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
    .wzcp.st-bubble .wzcp-swatch { border-radius: 16px; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 10px var(--wzcp-glow); }
    .wzcp.st-bubble .wzcp-hex { border-radius: 16px; border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08); }
    .wzcp.st-bubble .wzcp-hex:focus { border-color: var(--wzcp-fill); box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06), 0 0 0 3px var(--wzcp-glow); }
    .wzcp.st-bubble .wzcp-recent button { border-radius: 50%; border: 2px solid #fff; box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.25); transition: transform .15s ease, box-shadow .15s ease; }
    .wzcp.st-bubble .wzcp-recent button:hover { transform: scale(1.12); box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.25), 0 0 10px var(--wzcp-glow); }
    .wzcp.st-bubble .wzcp-btn {
      height: 32px; border-radius: 99px; border: 1px solid rgba(255, 255, 255, 0.95); color: #4a4a4a; font-weight: bold;
      background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 50%, #ececec 51%, #f5f5f5 100%);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 -3px 5px rgba(0, 0, 0, 0.06), 0 3px 7px rgba(0, 0, 0, 0.13);
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    .wzcp.st-bubble .wzcp-btn:hover { transform: translateY(-1px) scale(1.03); border-color: rgba(255, 255, 255, 0.95); background: linear-gradient(180deg, #ffffff 0%, #fafafa 50%, #f1f1f1 51%, #fafafa 100%); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.14), 0 0 14px var(--wzcp-glow); }
    .wzcp.st-bubble .wzcp-btn:active { transform: scale(0.97); }
    .wzcp.st-bubble .wzcp-done {
      color: var(--wzcp-fill-text); border-color: rgba(255, 255, 255, 0.7);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--wzcp-fill);
      box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.18), 0 3px 8px rgba(0, 0, 0, 0.18), 0 0 14px var(--wzcp-glow);
    }
    .wzcp.st-bubble .wzcp-done:hover { background: linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0) 51%), var(--wzcp-fill); filter: brightness(1.05); }

    /* ---------- Comic: soft 2D cartoon (flat colours, ink outlines, little drop shadows) ---------- */
    .wzcp.st-comic {
      padding: 0 10px 10px; border: 2.5px solid var(--wzcp-ink); border-radius: 22px;
      background: radial-gradient(rgba(59, 47, 47, 0.07) 1px, transparent 1.6px) 0 0 / 7px 7px, var(--wzcp-soft1);
      box-shadow: 5px 5px 0 var(--wzcp-ink-soft);
      -webkit-backdrop-filter: none; backdrop-filter: none;
    }
    .wzcp.st-comic .wzcp-head { height: 36px; }
    .wzcp.st-comic .wzcp-ico { margin: 10px 7px 0 6px; width: 18px; height: 18px; box-shadow: none; }
    .wzcp.st-comic .wzcp-title { margin-top: 9px; font-weight: bold; color: var(--wzcp-ink); text-shadow: none; }
    .wzcp.st-comic .wzcp-client {
      border: 2px solid var(--wzcp-ink); border-radius: 16px; background: var(--wzcp-card);
      box-shadow: none; padding: 14px;
    }
    .wzcp.st-comic .wzcp-well { border: 2px solid var(--wzcp-ink); border-radius: 16px; box-shadow: none; }
    .wzcp.st-comic .wzcp-wheel { box-shadow: 0 0 0 2px var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-dot { border: 3px solid #fff; box-shadow: 0 0 0 2px var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-range { height: 12px; border: 2px solid var(--wzcp-ink); border-radius: 99px; box-shadow: none; }
    .wzcp.st-comic .wzcp-range::-webkit-slider-thumb {
      width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--wzcp-ink);
      background: var(--wzcp-fill); box-shadow: 2px 2px 0 var(--wzcp-ink);
    }
    .wzcp.st-comic .wzcp-range:hover::-webkit-slider-thumb { border-color: var(--wzcp-ink); background: var(--wzcp-fill); transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-group { border: 2px solid var(--wzcp-ink-faint); border-radius: 16px; }
    .wzcp.st-comic .wzcp-legend { border-radius: 99px; padding: 0 8px; color: var(--wzcp-ink-text); }
    .wzcp.st-comic .wzcp-swatch { border-radius: 12px; border: 2px solid var(--wzcp-ink); box-shadow: 2px 2px 0 var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-hex { border-radius: 12px; border: 2px solid var(--wzcp-ink); box-shadow: none; }
    .wzcp.st-comic .wzcp-hex:focus { box-shadow: 0 0 0 3px var(--wzcp-soft1); }
    .wzcp.st-comic .wzcp-recent button { border-radius: 50%; border: 2px solid var(--wzcp-ink); box-shadow: 1.5px 1.5px 0 var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-recent button:hover { transform: translate(-1px, -1px); box-shadow: 2.5px 2.5px 0 var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-btn {
      height: 32px; border-radius: 12px; border: 2px solid var(--wzcp-ink); color: var(--wzcp-ink-text); font-weight: bold;
      background: var(--wzcp-field); box-shadow: 2px 2px 0 var(--wzcp-ink);
      transition: transform .1s ease, box-shadow .1s ease;
    }
    .wzcp.st-comic .wzcp-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--wzcp-ink); border-color: var(--wzcp-ink); background: var(--wzcp-soft1); }
    .wzcp.st-comic .wzcp-btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0 var(--wzcp-ink); }
    .wzcp.st-comic .wzcp-done { color: var(--wzcp-fill-text); background: var(--wzcp-fill); }
    .wzcp.st-comic .wzcp-done:hover { background: var(--wzcp-fill); filter: brightness(1.06); }
  `;

  // work out every colour the window needs, from the app's theme
  function paint(el, source, styleUsed, tone, opacity) {
    const cs = getComputedStyle(source);
    const get = (k) => (cs.getPropertyValue(k) || '').trim();
    const tint = toHex(get('--wz-border')) || toHex(get('--bj-header')) || toHex(get('--theme-primary')) || '#bccb8e';
    const a = Math.max(0.4, Math.min(1, opacity / 100));
    const set = (k, v) => el.style.setProperty(k, v);
    // Aero glass: see-through by the chosen amount
    set('--wzcp-g1', rgba(mix(tint, '#ffffff', 0.62), Math.min(1, a + 0.08)));
    set('--wzcp-g2', rgba(mix(tint, '#ffffff', 0.3), a));
    set('--wzcp-g3', rgba(tint, a));
    set('--wzcp-g4', rgba(mix(tint, '#ffffff', 0.18), a));
    const lightGlass = bright(mix(tint, '#ffffff', 0.3)) > 140;
    set('--wzcp-title', lightGlass ? '#111111' : '#ffffff');
    set('--wzcp-glow', lightGlass ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.8)');

    // the inside: solid, light or dark
    const dark = styleUsed === 'dark';
    let card = dark ? '#2b2b2e' : '#f7f6f1';
    let text = dark ? '#eeeeee' : '#1e1e1e';
    let muted = dark ? '#a8a8a8' : '#6d6d6d';
    let field = dark ? '#1c1c1e' : '#ffffff';
    let line = dark ? '#5c5c60' : '#abadb3';
    if (tone) {
      const c = toHex(get('--wz-card'));
      if (c) {
        card = c;
        text = get('--wz-text') || text;
        muted = get('--wz-muted') || muted;
        const f = get('--wz-field');
        if (f) field = f;
        const l = get('--wz-field-border');
        if (l) line = l;
      }
    }
    set('--wzcp-card', card);
    set('--wzcp-text', text);
    set('--wzcp-muted', muted);
    set('--wzcp-field', field);
    set('--wzcp-line', line);
    set('--wzcp-line-dark', dark ? '#77777c' : '#707070');
    // group titles use the theme colour when it is easy to read on the inside colour
    const accent = toHex(get('--theme-primary')) || toHex(get('--bj-accent')) || '#1e5aa8';
    const cardHex = toHex(card) || (dark ? '#2b2b2e' : '#f7f6f1');
    const gap = Math.abs(bright(accent) - bright(cardHex));
    set('--wzcp-accent', gap > 90 ? accent : (dark ? '#9cc8ff' : '#1e5aa8'));
    // filled buttons and handles use the theme colour
    set('--wzcp-fill', accent);
    set('--wzcp-fill-text', bright(accent) > 150 ? '#1e1e1e' : '#ffffff');
    // Bubble: a soft glow in the theme colour
    set('--wzcp-glow', rgba(accent, 0.35));
    set('--wzcp-bub1', mix(tint, '#ffffff', 0.75));
    set('--wzcp-bub2', mix(tint, '#ffffff', 0.42));
    // Comic: flat pastel frame and soft ink outlines
    set('--wzcp-soft1', mix(tint, '#ffffff', 0.55));
    set('--wzcp-soft2', mix(tint, '#ffffff', 0.45));
    set('--wzcp-soft-text', mix(tint, '#000000', 0.65));
    set('--wzcp-ink', dark ? '#141012' : '#3b2f2f');
    set('--wzcp-ink-soft', dark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(59, 47, 47, 0.85)');
    set('--wzcp-ink-faint', dark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(59, 47, 47, 0.3)');
    set('--wzcp-ink-text', dark ? '#f1ece6' : '#3b2f2f');
  }

  function open(root, input, opts) {
    opts = opts || {};
    const start = isHex(input.value) ? input.value.toLowerCase() : '#e83d52';
    let { h, s, v } = hexToHsv(start);
    let current = start;

    if (activeClose) activeClose(true);
    const prefs = Object.assign(loadPrefs(), opts.prefs || {});
    const styleUsed = opts.style || styleFor(root, prefs);
    const appDark = typeof opts.appDark === 'boolean' ? opts.appDark : appIsDark(root.host);
    const backdrop = document.createElement('div');
    // the look (vista / modern / bubble / comic) and the window button style
    const look = (window.WzStyle && window.WzStyle.get()) || { ui: 'mac', btnsUsed: 'mac' };
    backdrop.className = 'wzcp' + (opts.standalone ? ' standalone' : '') + ` st-${look.base} st-${look.ui} wzb-${look.btnsUsed}`;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-label', 'Pick a colour');
    backdrop.style.zoom = String(SIZES[prefs.size]);
    backdrop.innerHTML = `
        <div class="wzcp-head" title="Drag to move">
          <span class="wzcp-ico"></span>
          <span class="wzcp-title">Colour</span>
          ${window.WzStyle ? window.WzStyle.capsHTML(['close']) : '<div class="wzcaps"><button type="button" class="wzcap wzcap-close" title="Close">✕</button></div>'}
        </div>
        <div class="wzcp-client">
          <div class="wzcp-well"><div class="wzcp-wheel"><div class="wzcp-dot"></div></div></div>
          <div class="wzcp-slider-row" title="How light or dark">
            <span class="wzcp-slider-label">Brightness</span>
            <input type="range" class="wzcp-range wzcp-v" min="0" max="100" step="1">
            <span class="wzcp-slider-val wzcp-v-val"></span>
          </div>
          <div class="wzcp-slider-row" title="How strong the colour is">
            <span class="wzcp-slider-label">Strength</span>
            <input type="range" class="wzcp-range wzcp-s" min="0" max="100" step="1">
            <span class="wzcp-slider-val wzcp-s-val"></span>
          </div>
          <div class="wzcp-group">
            <span class="wzcp-legend">Colour</span>
            <div class="wzcp-hexrow">
              <div class="wzcp-swatch" title="Left: new colour. Right: the colour you started with (click to go back to it).">
                <span class="wzcp-new"></span><span class="wzcp-old"></span>
              </div>
              <input class="wzcp-hex" maxlength="7" spellcheck="false">
              <button type="button" class="wzcp-btn wzcp-copy">Copy</button>
            </div>
          </div>
          <div class="wzcp-group">
            <span class="wzcp-legend">Recent colours</span>
            <div class="wzcp-recent"></div>
          </div>
          <div class="wzcp-btns">
            <button type="button" class="wzcp-btn wzcp-done">OK</button>
            <button type="button" class="wzcp-btn wzcp-cancel">Cancel</button>
          </div>
        </div>`;
    root.appendChild(backdrop);
    backdrop.querySelector('.wzcap-close').classList.add('wzcp-close');
    // the inside matches the menus when the picker's style matches the app's mode
    paint(backdrop, root.host || document.documentElement, styleUsed, (styleUsed === 'dark') === appDark, prefs.opacity);

    if (!opts.standalone) {
      // place it where it was last left, otherwise in the middle
      const place = (x, y) => {
        const z = SIZES[prefs.size];
        const w = backdrop.offsetWidth * z, hgt = backdrop.offsetHeight * z;
        const maxX = Math.max(0, window.innerWidth - w), maxY = Math.max(0, window.innerHeight - hgt);
        const nx = Math.max(0, Math.min(maxX, x)), ny = Math.max(0, Math.min(maxY, y));
        backdrop.style.left = `${nx / z}px`;
        backdrop.style.top = `${ny / z}px`;
        return { x: nx, y: ny };
      };
      // in the game it has its own remembered spot, starting beside the settings panel
      const inGame = !!(root.host && root.host.classList.contains('in-game'));
      const kx = inGame ? 'gx' : 'x', ky = inGame ? 'gy' : 'y';
      {
        const z = SIZES[prefs.size];
        const w = backdrop.offsetWidth * z, hgt = backdrop.offsetHeight * z;
        let dx = (window.innerWidth - w) / 2, dy = (window.innerHeight - hgt) / 2;
        if (inGame) {
          const panel = root.getElementById && root.getElementById('settings-panel');
          const r = panel && panel.getBoundingClientRect();
          if (r && r.width) { dx = r.right + 12; dy = r.bottom - hgt; }
          else { dx = 12; dy = window.innerHeight - hgt - 12; }
        }
        place(prefs[kx] !== null ? prefs[kx] : dx, prefs[ky] !== null ? prefs[ky] : dy);
      }
      const head = backdrop.querySelector('.wzcp-head');
      head.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.wzcp-close')) return;
        head.setPointerCapture(e.pointerId);
        const r = backdrop.getBoundingClientRect();
        const offX = e.clientX - r.left, offY = e.clientY - r.top;
        let last = { x: r.left, y: r.top };
        const move = (ev) => { last = place(ev.clientX - offX, ev.clientY - offY); };
        const up = () => {
          head.removeEventListener('pointermove', move);
          head.removeEventListener('pointerup', up);
          savePrefs({ [kx]: last.x, [ky]: last.y });
        };
        head.addEventListener('pointermove', move);
        head.addEventListener('pointerup', up);
      });
    }

    const wheel = backdrop.querySelector('.wzcp-wheel');
    const dot = backdrop.querySelector('.wzcp-dot');
    const vRange = backdrop.querySelector('.wzcp-v');
    const sRange = backdrop.querySelector('.wzcp-s');
    const vVal = backdrop.querySelector('.wzcp-v-val');
    const sVal = backdrop.querySelector('.wzcp-s-val');
    const swatchNew = backdrop.querySelector('.wzcp-new');
    const swatchOld = backdrop.querySelector('.wzcp-old');
    const hexBox = backdrop.querySelector('.wzcp-hex');
    const copyBtn = backdrop.querySelector('.wzcp-copy');
    const recentBox = backdrop.querySelector('.wzcp-recent');
    const done = backdrop.querySelector('.wzcp-done');
    const cancel = backdrop.querySelector('.wzcp-cancel');
    swatchOld.style.background = start;

    let frame = 0;
    const emit = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        input.value = current;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    };

    const render = (fromHexBox) => {
      current = hsvToHex(h, s, v);
      const pure = hsvToHex(h, s, 1);
      const R = (wheel.clientWidth || 214) / 2;
      const rad = (h * Math.PI) / 180;
      dot.style.left = `${R + Math.sin(rad) * s * R}px`;
      dot.style.top = `${R - Math.cos(rad) * s * R}px`;
      dot.style.background = hsvToHex(h, s, 1);
      vRange.value = String(Math.round(v * 100));
      sRange.value = String(Math.round(s * 100));
      vVal.textContent = `${Math.round(v * 100)}%`;
      sVal.textContent = `${Math.round(s * 100)}%`;
      vRange.style.background = `linear-gradient(90deg, #000, ${pure})`;
      sRange.style.background = `linear-gradient(90deg, ${hsvToHex(h, 0, v)}, ${hsvToHex(h, 1, v)})`;
      swatchNew.style.background = current;
      if (!fromHexBox) hexBox.value = current.toUpperCase();
    };

    const setColour = (hex) => { ({ h, s, v } = hexToHsv(hex)); render(); emit(); };

    const renderRecent = () => {
      const list = loadRecent();
      recentBox.innerHTML = '';
      if (!list.length) {
        recentBox.innerHTML = '<span class="wzcp-empty">Colours you pick will show here</span>';
        return;
      }
      list.forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = c.toUpperCase();
        b.style.background = c;
        b.addEventListener('click', () => setColour(c));
        recentBox.appendChild(b);
      });
    };

    // wheel dragging
    const pickAt = (e) => {
      const r = wheel.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      s = Math.min(1, Math.hypot(dx, dy) / (r.width / 2));
      if (v < 0.05) v = 1;
      render();
      emit();
    };
    wheel.addEventListener('pointerdown', (e) => {
      wheel.setPointerCapture(e.pointerId);
      pickAt(e);
      const move = (ev) => pickAt(ev);
      const up = () => { wheel.removeEventListener('pointermove', move); wheel.removeEventListener('pointerup', up); };
      wheel.addEventListener('pointermove', move);
      wheel.addEventListener('pointerup', up);
    });

    vRange.addEventListener('input', () => { v = Number(vRange.value) / 100; render(); emit(); });
    sRange.addEventListener('input', () => { s = Number(sRange.value) / 100; render(); emit(); });
    swatchOld.addEventListener('click', () => setColour(start));

    hexBox.addEventListener('input', () => {
      let t = hexBox.value.trim();
      if (t && t[0] !== '#') t = '#' + t;
      if (isHex(t)) { ({ h, s, v } = hexToHsv(t)); render(true); emit(); }
    });

    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(current.toUpperCase()); copyBtn.textContent = 'Copied'; }
      catch (e) { hexBox.select(); copyBtn.textContent = 'Ctrl+C'; }
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
    });

    // OK and ✕ keep the colour. Cancel puts back the colour you started with.
    const close = (keep) => {
      if (frame) { cancelAnimationFrame(frame); frame = 0; }
      if (keep === false) current = start;
      if (current !== start || keep === false) {
        input.__wzCancelled = keep === false;
        input.value = current;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (keep !== false) pushRecent(current);
      }
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      activeClose = null;
      if (opts.onClosed) opts.onClosed();
    };
    activeClose = close;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
      else if (e.key === 'Enter') { e.stopPropagation(); close(true); }
    };
    document.addEventListener('keydown', onKey, true);
    done.addEventListener('click', () => close(true));
    cancel.addEventListener('click', () => close(false));
    backdrop.querySelector('.wzcp-close').addEventListener('click', () => close(true));
    // clicks on the picker never reach the settings panel's "click outside" check
    backdrop.addEventListener('click', (e) => e.stopPropagation());

    render();
    renderRecent();
    return backdrop;
  }

  // ---- separate window (can be dragged outside the app) ----
  let windowInput = null;
  let windowListening = false;
  function canUseWindow() {
    return !!(window.ipc && typeof window.ipc.send === 'function' && window.ipc.__noExternalPicker !== true);
  }
  function openInWindow(root, input) {
    const host = root.host;
    const prefs = loadPrefs();
    const cs = getComputedStyle(host || document.documentElement);
    const vars = {};
    ['--wz-card', '--wz-field', '--wz-field-border', '--wz-text', '--wz-muted', '--wz-border', '--theme-primary']
      .forEach((k) => { const v = cs.getPropertyValue(k).trim(); if (v) vars[k] = v; });
    windowInput = input;
    if (!windowListening) {
      windowListening = true;
      window.ipc.on('wz-picker-color', (event, data) => {
        if (!windowInput || !data || !isHex(data.hex)) return;
        windowInput.value = data.hex;
        windowInput.dispatchEvent(new Event('input', { bubbles: true }));
        if (data.final) {
          windowInput.dispatchEvent(new Event('change', { bubbles: true }));
          if (!data.cancelled) pushRecent(data.hex);
        }
      });
      window.ipc.on('wz-picker-closed', () => { windowInput = null; });
    }
    window.ipc.send('wz-picker-open', {
      color: isHex(input.value) ? input.value : '#e83d52',
      size: prefs.size,
      prefs: { opacity: prefs.opacity, size: prefs.size, style: prefs.style, styleLocked: prefs.styleLocked },
      style: styleFor(root, prefs),
      appDark: appIsDark(host),
      vars
    });
  }

  function attach(root) {
    if (!root || root.__wzColorPicker) return;
    root.__wzColorPicker = true;
    const style = document.createElement('style');
    style.textContent = STYLE + (window.WzStyle ? window.WzStyle.CAPS_CSS : '');
    root.appendChild(style);

    // take over every colour input in this root (now and later)
    root.addEventListener('click', (e) => {
      const input = e.composedPath().find((el) => el && el.tagName === 'INPUT' && el.type === 'color');
      if (!input || input.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      if (canUseWindow()) openInWindow(root, input);
      else open(root, input);
    }, true);
  }

  window.WzColorPicker = { attach, open, hsvToHex, hexToHsv, loadPrefs, savePrefs, styleFor, STYLE, SIZES };
})();
