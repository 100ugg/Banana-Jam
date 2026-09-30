/*
 * Banana Jam launcher theme.
 *
 * The same kind of options as the game window's Theme tab:
 *   - Custom Theme on/off (off = the Banana Jam look)
 *   - presets: save, choose, delete, download, upload
 *   - name, fruit and Main Colour
 *   - a colour for each part, with a lock (locked = own colour, unlocked = follows the main colour)
 *   - a background picture with blur, see-through, zoom, move, mirror and flip
 *   - colour wheel options
 *
 * Everything is saved in this window's localStorage. The look itself is in
 * assets/styles/bj-vista.css, which reads the --bj-* variables set here.
 */
(function () {
  if (window.BJTheme) return;

  const KEY = 'bjLauncherTheme';
  const PIC_KEY = 'bjLauncherPic';
  const PRESETS_KEY = 'bjLauncherPresets';
  const OPEN_KEY = 'bjLauncherOpen';

  const PART_KEYS = ['header', 'tab', 'btn', 'accent', 'bg', 'panel'];
  const PART_NAMES = {
    header: 'Title bar', tab: 'Tabs', btn: 'Buttons',
    accent: 'Highlights', bg: 'Background', panel: 'Panels'
  };
  const FRUITS = [
    ['banana.png', 'Banana'], ['strawberry.png', 'Strawberry'], ['blueberry.png', 'Blueberry'],
    ['cantaloupe.png', 'Cantaloupe'], ['coconut.png', 'Coconut'], ['dragonfruit.png', 'Dragonfruit'],
    ['pineapple.png', 'Pineapple'], ['pumpkin.png', 'Pumpkin']
  ];
  // fruits, "None" and your own icons (see wz-icons.js)
  const Icons = window.WzIcons || null;
  const IMG_BASE = 'app://assets/images/';
  const validIcon = (k) => Icons ? Icons.isValid(k) : FRUITS.some(f => f[0] === k);
  const iconSrc = (k) => Icons ? Icons.src(k, IMG_BASE) : IMG_BASE + k;
  const isIconData = (v) => typeof v === 'string' && v.length < 2000000 && /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(v);

  // The Default look has two modes (Dark and Light); the colours live in WzPresets.MODES
  const FALLBACK_LOOK = { main: '#5a67e8', parts: { header: '#17181c', tab: null, btn: null, accent: '#e4e7f0', bg: '#1e1f24', panel: '#2b2d33' } };
  const modeLook = () => {
    try {
      const m = (window.WzMode && window.WzMode.get()) || 'dark';
      const M = window.WzPresets && window.WzPresets.MODES && window.WzPresets.MODES[m];
      if (M) return { main: M.main, parts: Object.assign({}, M.launcher) };
    } catch (e) {}
    return { main: FALLBACK_LOOK.main, parts: Object.assign({}, FALLBACK_LOOK.parts) };
  };
  const DEFAULTS = {
    enabled: true,
    get main() { return modeLook().main; },
    name: 'Banana Jam',
    fruit: 'banana.png',
    get parts() { return modeLook().parts; }
  };
  // the yellow look Banana Jam started with before the modern dark default (now the "Banana" preset)
  const BANANA_LOOK = { main: '#f2c230', header: '#f7dc5a', accent: '#b8790a', bg: '#fdf3c4', panel: '#fff8dc' };
  // the look Banana Jam used to start with (now the "Melon" preset)
  const OLD_DEFAULT = { main: '#b07a3c', header: '#bccb8e', accent: '#b8621f', bg: '#f5f0de', panel: '#fbf4e2' };
  const DEFAULT_PRESET_NAME = 'Default';

  // ---------- colour helpers ----------
  const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const toHex = (c) => '#' + c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((x, i) => x + (B[i] - x) * t)); };
  const rgba = (hex, a) => { const c = rgb(hex); return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`; };
  const bright = (hex) => { const c = rgb(hex); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; };
  const isLight = (hex) => bright(hex) > 150;
  const lum = (hex) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const c = rgb(hex); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // make a colour readable on a background by darkening or lightening it a little at a time
  const readable = (fg, bg, want) => {
    let c = fg;
    const toward = isLight(bg) ? '#000000' : '#ffffff';
    for (let i = 0; i < 12 && contrast(c, bg) < want; i++) c = mix(c, toward, 0.15);
    return c;
  };

  // ---------- saved settings ----------
  function cleanParts(p) {
    const out = {};
    PART_KEYS.forEach(k => { out[k] = isHex(p && p[k]) ? p[k].toLowerCase() : null; });
    return out;
  }
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(DEFAULTS));
    // one-time move from the old green default to the safari default
    try {
      if (!localStorage.getItem('bjSafariV1')) {
        const p = raw.parts || {};
        const low = (v) => (typeof v === 'string' ? v.toLowerCase() : null);
        if (low(raw.main) === '#5e4308' && low(p.header) === '#9ad256' && low(p.bg) === '#f3ecd3' && low(p.panel) === '#faf4de' && !p.tab && !p.btn && !p.accent) {
          raw.main = DEFAULTS.main;
          raw.parts = Object.assign({}, DEFAULTS.parts);
          localStorage.setItem(KEY, JSON.stringify(raw));
        }
        localStorage.setItem('bjSafariV1', '1');
      }
    } catch (e) {}
    // one-time move from the old melon-green start look to the banana-yellow default
    try {
      if (!localStorage.getItem('bjBananaV1')) {
        const p = raw.parts || {};
        const low = (v) => (typeof v === 'string' ? v.toLowerCase() : null);
        if (low(raw.main) === OLD_DEFAULT.main && low(p.header) === OLD_DEFAULT.header && low(p.accent) === OLD_DEFAULT.accent && low(p.bg) === OLD_DEFAULT.bg && low(p.panel) === OLD_DEFAULT.panel && !p.tab && !p.btn) {
          raw.main = DEFAULTS.main;
          raw.parts = Object.assign({}, DEFAULTS.parts);
          localStorage.setItem(KEY, JSON.stringify(raw));
        }
        localStorage.setItem('bjBananaV1', '1');
      }
    } catch (e) {}
    // one-time move from the untouched banana-yellow start look to the modern dark default
    try {
      if (!localStorage.getItem('bjNeutralV1')) {
        const p = raw.parts || {};
        const low = (v) => (typeof v === 'string' ? v.toLowerCase() : null);
        if (low(raw.main) === BANANA_LOOK.main && low(p.header) === BANANA_LOOK.header && low(p.accent) === BANANA_LOOK.accent && low(p.bg) === BANANA_LOOK.bg && low(p.panel) === BANANA_LOOK.panel && !p.tab && !p.btn) {
          raw.main = DEFAULTS.main;
          raw.parts = Object.assign({}, DEFAULTS.parts);
          localStorage.setItem(KEY, JSON.stringify(raw));
        }
        localStorage.setItem('bjNeutralV1', '1');
      }
    } catch (e) {}
    // one-time: the old blue-tinted dark highlight becomes the neutral light one (no blue text on dark)
    try {
      if (!localStorage.getItem('bjNeutralV2')) {
        const p = raw.parts || {};
        if (typeof p.accent === 'string' && p.accent.toLowerCase() === '#9aa5ff') {
          p.accent = DEFAULTS.parts.accent;
          raw.parts = p;
          localStorage.setItem(KEY, JSON.stringify(raw));
        }
        localStorage.setItem('bjNeutralV2', '1');
      }
    } catch (e) {}
    return {
      enabled: raw.enabled === true,
      main: isHex(raw.main) ? raw.main.toLowerCase() : DEFAULTS.main,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 50) : DEFAULTS.name,
      fruit: validIcon(raw.fruit) ? raw.fruit : DEFAULTS.fruit,
      parts: raw.parts ? cleanParts(raw.parts) : cleanParts(DEFAULTS.parts)
    };
  }
  let afterSave = null;   // set below: tells the game window when colours change (if locked together)
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    if (afterSave) { try { afterSave(); } catch (e) {} }
  }
  function update(changes) {
    const s = Object.assign(load(), changes);
    save(s);
    apply();
    return s;
  }

  function cleanPic(o) {
    o = o && typeof o === 'object' ? o : {};
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
    const image = (typeof o.image === 'string' && o.image.length < 8000000 &&
      /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(o.image)) ? o.image : null;
    return {
      image,
      blur: num(o.blur, 0, 40, 0),
      tint: num(o.tint, 0, 95, 45),
      zoom: num(o.zoom, 100, 300, 100),
      x: num(o.x, 0, 100, 50),
      y: num(o.y, 0, 100, 50),
      mirror: o.mirror === true,
      flip: o.flip === true
    };
  }
  function loadPic() {
    try { return cleanPic(JSON.parse(localStorage.getItem(PIC_KEY) || '{}')); } catch (e) { return cleanPic({}); }
  }
  function savePic(changes) {
    const next = cleanPic(Object.assign(loadPic(), changes));
    try { localStorage.setItem(PIC_KEY, JSON.stringify(next)); } catch (e) { return false; }
    apply();
    return true;
  }

  // ---------- work out every colour and put it on the page ----------
  function colours(state) {
    const on = state.enabled;
    const main = on ? state.main : DEFAULTS.main;
    const P = on ? state.parts : DEFAULTS.parts;
    const header = P.header || main;
    const tab = P.tab || main;
    const btn = P.btn || main;
    const bg = P.bg || mix(main, '#ffffff', 0.86);
    const panel = P.panel || mix(main, '#ffffff', 0.92);
    const accentRaw = P.accent || main;
    return { main, header, tab, btn, bg, panel, accentRaw, accent: readable(accentRaw, panel, 3.2) };
  }

  function surface(base, main) {
    const light = isLight(base);
    const text = light ? mix('#1c1c1c', main, 0.3) : '#ececec';
    return {
      light,
      text: light ? readable(text, base, 7) : text,
      muted: light ? rgba(readable(text, base, 7), 0.64) : 'rgba(236, 236, 236, 0.62)',
      line: light ? rgba(text, 0.22) : 'rgba(255, 255, 255, 0.14)',
      hover: light ? rgba(text, 0.07) : 'rgba(255, 255, 255, 0.07)',
      field: light ? mix(base, '#ffffff', 0.7) : 'rgba(255, 255, 255, 0.07)',
      fieldLine: light ? mix(base, '#000000', 0.3) : 'rgba(255, 255, 255, 0.24)'
    };
  }

  let hooksTried = 0;
  function apply() {
    const state = load();
    const c = colours(state);
    const pic = loadPic();
    const hasPic = state.enabled && !!pic.image;
    const S = surface(c.bg, c.main);
    const PS = surface(c.panel, c.main);
    const root = document.documentElement;
    const set = (k, v) => root.style.setProperty(k, v);

    set('--bj-main', c.main);
    set('--bj-header', c.header);
    set('--bj-header-text', isLight(c.header) ? mix('#111111', c.header, 0.2) : '#ffffff');
    set('--bj-tab', c.tab);
    set('--bj-tab-text', isLight(c.tab) ? '#1e1e1e' : '#ffffff');
    set('--bj-btn', c.btn);
    set('--bj-btn-text', isLight(c.btn) ? '#1e1e1e' : '#ffffff');
    set('--bj-accent', c.accent);
    set('--bj-accent-text', isLight(c.accent) ? '#1c1c1c' : '#ffffff');
    set('--bj-bg', c.bg);
    set('--bj-bg-fill', hasPic ? rgba(c.bg, pic.tint / 100) : c.bg);
    set('--bj-text', S.text); set('--bj-muted', S.muted); set('--bj-line', S.line);
    set('--bj-hover', S.hover); set('--bj-field', S.field); set('--bj-field-line', S.fieldLine);
    set('--bj-panel', c.panel);
    set('--bj-ptext', PS.text); set('--bj-pmuted', PS.muted); set('--bj-pline', PS.line);
    set('--bj-phover', PS.hover); set('--bj-pfield', PS.field); set('--bj-pfield-line', PS.fieldLine);
    // the colour wheel borrows these so it matches the panels
    set('--wz-card', c.panel); set('--wz-field', PS.field); set('--wz-field-border', PS.fieldLine);
    set('--wz-text', PS.text); set('--wz-muted', PS.muted);
    set('--wz-radius', '6px'); set('--wz-field-radius', '3px');
    set('--wz-shadow', `0 0 0 1px rgba(0,0,0,.45), 0 0 0 6px ${rgba(c.header, 0.55)}, 0 0 0 7px rgba(0,0,0,.4), 0 14px 34px rgba(0,0,0,.4)`);

    root.classList.toggle('bj-light', S.light);
    root.classList.toggle('bj-dark', !S.light);
    root.classList.toggle('bj-plight', PS.light);
    root.classList.toggle('bj-pdark', !PS.light);
    root.style.colorScheme = S.light ? 'light' : 'dark';

    // background picture
    root.classList.toggle('bj-has-pic', hasPic);
    if (hasPic) {
      set('--bj-pic', `url("${pic.image}")`);
      set('--bj-pic-blur', `${pic.blur}px`);
      set('--bj-pic-scale', String((pic.zoom / 100) * (pic.blur > 0 ? 1.08 : 1)));
      set('--bj-pic-x', `${pic.x}%`);
      set('--bj-pic-y', `${pic.y}%`);
      set('--bj-pic-sx', pic.mirror ? '-1' : '1');
      set('--bj-pic-sy', pic.flip ? '-1' : '1');
    } else {
      root.style.removeProperty('--bj-pic');
    }

    // older launcher code reads --theme-primary for a few small things
    const hooks = window.__bjThemeHooks;
    if (hooks) {
      try { hooks.updateThemeColors(c.accentRaw); hooks.applySynchronizedElements(c.accent); } catch (e) {}
    } else if (hooksTried++ < 20) {
      setTimeout(apply, 250);
    }

    // name and fruit (the fruit is never tinted)
    const name = state.enabled ? state.name : DEFAULTS.name;
    document.title = name;
    const fruit = document.getElementById('fruitIcon');
    if (fruit) {
      const src = iconSrc(state.enabled ? state.fruit : DEFAULTS.fruit);
      if (src && fruit.getAttribute('src') !== src) fruit.setAttribute('src', src);
      fruit.style.display = src ? '' : 'none';
      fruit.style.filter = 'none';
    }
  }

  // ---------- pictures ----------
  function shrinkImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('That file is not a picture I can use.'));
        img.onload = () => {
          const MAX = 1920;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          let out = file.type === 'image/jpeg' ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
          if (out.length > 3000000) out = canvas.toDataURL('image/jpeg', 0.85);
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ---------- presets ----------
  function loadPresets() {
    try { const l = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); return Array.isArray(l) ? l : []; }
    catch (e) { return []; }
  }
  function savePresets(list) {
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function cleanPreset(p) {
    if (!p || typeof p !== 'object') return null;
    // a preset downloaded from the game window works here too
    if (p.type === 'banana-jam-preset' && window.WzPresets) p = window.WzPresets.launcherFromGame(p);
    const name = typeof p.name === 'string' ? p.name.trim().slice(0, 40) : '';
    if (!name || !isHex(p.main)) return null;
    // your own icon travels inside the preset
    const icon = p.icon && isIconData(p.icon.data)
      ? { name: typeof p.icon.name === 'string' ? p.icon.name.slice(0, 30) : 'My icon', data: p.icon.data } : null;
    const custom = typeof p.fruit === 'string' && /^custom:[a-z0-9]{1,40}$/i.test(p.fruit) && icon ? p.fruit : null;
    const builtIn = p.fruit === 'none' || FRUITS.some(f => f[0] === p.fruit);
    return {
      type: 'banana-jam-launcher-preset', version: 1,
      name,
      main: p.main.toLowerCase(),
      customName: typeof p.customName === 'string' && p.customName.trim() ? p.customName.slice(0, 50) : DEFAULTS.name,
      fruit: custom || (builtIn ? p.fruit : DEFAULTS.fruit),
      icon: custom ? icon : null,
      parts: cleanParts(p.parts || {}),
      picture: cleanPic(p.picture || {})
    };
  }
  function currentAsPreset(name) {
    const s = load();
    return cleanPreset({ name, main: s.main, customName: s.name, fruit: s.fruit, icon: Icons ? Icons.exportIcon(s.fruit) : null, parts: s.parts, picture: loadPic() });
  }
  function defaultPreset() {
    return cleanPreset({ name: DEFAULT_PRESET_NAME, main: DEFAULTS.main, customName: DEFAULTS.name, fruit: DEFAULTS.fruit, parts: DEFAULTS.parts, picture: {} });
  }
  function applyPreset(p) {
    try { localStorage.setItem(PIC_KEY, JSON.stringify(cleanPic(p.picture))); } catch (e) {}
    const fruit = Icons ? Icons.importIcon(p.fruit, p.icon) : p.fruit;
    save({ enabled: true, main: p.main, name: p.customName, fruit, parts: cleanParts(p.parts) });
    apply();
  }

  // ---------- the Theme tab in Settings ----------
  const LOCK_SVG = `
    <svg class="bjt-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
    <svg class="bjt-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>`;

  function section(id, title, desc, body) {
    return `<div class="bjt-sec" data-sec="${id}">
      <div class="bjt-head" role="button" tabindex="0"><span class="bjt-ttl">${title}<small>${desc}</small></span><span class="bjt-chev">›</span></div>
      <div class="bjt-body">${body}</div>
    </div>`;
  }
  function slider(id, label, min, max) {
    return `<div class="bjt-row"><span class="bjt-label" style="flex:0 0 92px">${label}</span>
      <input type="range" class="bjt-range" id="bjt-${id}" min="${min}" max="${max}" step="1"><span class="bjt-val" id="bjt-${id}-val"></span></div>`;
  }

  const SUN_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="display:inline-block;vertical-align:-2px"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON_SVG = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function markup() {
    const parts = PART_KEYS.map(k => `
      <div class="bjt-row bjt-part" data-part="${k}">
        <span class="bjt-label">${PART_NAMES[k]}</span>
        <input type="color" class="bjt-part-color" value="#b07a3c">
        <button type="button" class="bjt-btn bjt-lock" title="Locked = your own colour. Unlocked = follows the main colour.">${LOCK_SVG}</button>
      </div>`).join('');
    const fruits = FRUITS.map(f => `<option value="${f[0]}">${f[1]}</option>`).join('');
    return `
      <div class="bjt">
        <div class="modal-setting-row" id="bjt-mode-row" style="margin-bottom:10px">
          <div class="flex-1 min-w-0">
            <div class="text-sm text-text-primary font-medium">Light or dark</div>
            <p class="text-xs text-gray-400 mt-0.5">Switches the launcher, the game and the Mod Menu together.</p>
          </div>
          <div class="flex gap-1 flex-shrink-0 ml-3">
            <button type="button" class="bjt-btn" id="bjt-mode-light">${SUN_SVG} Light</button>
            <button type="button" class="bjt-btn" id="bjt-mode-dark">${MOON_SVG} Dark</button>
          </div>
        </div>
        <div class="modal-setting-row" id="bjt-enabled-row" style="margin-bottom:10px">
          <div class="flex-1 min-w-0">
            <div class="text-sm text-text-primary font-medium">Custom theme</div>
            <p class="text-xs text-gray-400 mt-0.5">Off = the Default look (light or dark). On = your own colours and picture.</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
            <input type="checkbox" id="bjt-enabled" class="sr-only peer">
            <div class="toggle-switch"></div>
          </label>
        </div>
        <div class="modal-setting-row bjt-share" id="bjt-share" style="margin-bottom:10px">
          <button type="button" class="bjt-btn bjt-lock bjt-sharelock" id="bjt-share-btn" aria-pressed="false" title="Lock the launcher and the game to the same colours">${LOCK_SVG}</button>
          <div class="flex-1 min-w-0">
            <div class="text-sm text-text-primary font-medium" id="bjt-share-title">Same colours as the game</div>
            <p class="text-xs text-gray-400 mt-0.5" id="bjt-share-note"></p>
          </div>
        </div>
        ${section('colours', 'Colours &amp; presets', 'Ready-made looks, your colours, name, icon and background picture.', `
          <div class="bjt-card">
              <div class="bjt-sub">Presets</div>
              
          <div class="bjt-row"><select id="bjt-preset"></select><button type="button" class="bjt-btn" id="bjt-preset-delete">Delete</button></div>
          <div class="bjt-row"><input type="text" id="bjt-preset-name" maxlength="40" placeholder="New preset name"><button type="button" class="bjt-btn main" id="bjt-preset-save">Save</button></div>
          <div class="bjt-row"><button type="button" class="bjt-btn" style="flex:1" id="bjt-preset-export">Download</button><button type="button" class="bjt-btn" style="flex:1" id="bjt-preset-import">Upload</button>
            <input type="file" id="bjt-preset-file" accept=".json,application/json" style="display:none"></div>
          <div class="bjt-hint" id="bjt-preset-status">Save your own, or Download / Upload one to share.</div>
          </div>
          <div class="bjt-card bjt-custom-col">
              <div class="bjt-sub">Colours <small>(locked parts keep their own colour)</small></div>
              ${parts}<div class="bjt-hint">Unlocked parts follow the main colour.</div>
          </div>
          <div class="bjt-card">
              <div id="bjt-custom">
                <div class="bjt-sub">Name, icon &amp; main colour</div>
                
            <div class="bjt-row"><span class="bjt-label" style="flex:0 0 92px">Name</span><input type="text" id="bjt-name" maxlength="50" placeholder="Banana Jam"></div>
            <div class="bjt-row"><span class="bjt-label" style="flex:0 0 92px">Icon</span><select id="bjt-fruit">${fruits}</select><img class="bjt-fruit" id="bjt-fruit-img" alt=""></div>
            <div class="bjt-icons">
              <div class="bjt-row" style="margin-bottom:6px"><span class="bjt-label">My icons</span>
                <button type="button" class="bjt-btn" id="bjt-icons-add" title="Upload a picture to use as your icon">Upload icon</button>
                <input type="file" id="bjt-icons-file" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none"></div>
              <div class="bjt-icons-list" id="bjt-icons-list"></div>
              <div class="bjt-hint" id="bjt-icons-status"></div>
            </div>
            <div class="bjt-row"><span class="bjt-label" style="flex:0 0 92px">Main colour</span><input type="color" id="bjt-main"><input type="text" id="bjt-main-hex" maxlength="7" spellcheck="false"></div>
            <div class="bjt-row" style="justify-content:flex-end"><button type="button" class="bjt-btn" id="bjt-reset">Reset to Banana Jam</button></div>
              </div>
          </div>
          <div class="bjt-card bjt-custom-col">
              <div class="bjt-sub">Background picture</div>
              
            <div class="bjt-row"><span class="bjt-label">Picture</span><img class="bjt-pic" id="bjt-pic-img" alt="">
              <button type="button" class="bjt-btn" id="bjt-pic-upload">Upload</button><button type="button" class="bjt-btn" id="bjt-pic-remove">Remove</button>
              <input type="file" id="bjt-pic-file" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none"></div>
            <div class="bjt-hint" id="bjt-pic-status"></div>
            <div id="bjt-pic-adjust">
              ${slider('blur', 'Blur', 0, 40)}
              ${slider('tint', 'Colour over it', 0, 95)}
              ${slider('zoom', 'Zoom', 100, 300)}
              ${slider('x', 'Move ← →', 0, 100)}
              ${slider('y', 'Move ↑ ↓', 0, 100)}
              <div class="bjt-row"><button type="button" class="bjt-btn" id="bjt-mirror">Mirror</button><button type="button" class="bjt-btn" id="bjt-flip">Flip</button>
                <span style="flex:1"></span><button type="button" class="bjt-btn" id="bjt-pic-reset">Reset</button></div>
            </div>
          </div>`)}
        ${section('style', 'Look &amp; fonts', 'The shape of the windows and buttons, and the text style.', `
          <div class="bjt-sub">Look</div>
          <div id="bjt-lookblock">
          <div class="bjt-row"><span class="bjt-label" style="flex:0 0 110px">Look</span><select id="bjt-look"></select></div>
          <div class="bjt-row"><span class="bjt-label" style="flex:0 0 110px">Window buttons</span><select id="bjt-btns"></select></div>
          <div class="bjt-hint">Look changes the shape of everything. Window buttons are the minimise, maximise and close buttons at the top.</div></div>
          <div class="bjt-sub">Font</div>
          
          <div class="bjt-row"><span class="bjt-label" style="flex:0 0 110px">Font</span><select id="bjt-font" style="flex:1;min-width:0"></select></div>
          <div class="bjt-fontprev" id="bjt-font-prev">The quick brown fox jumps over the lazy dog. Aa Bb Cc 0123</div>
          <div class="bjt-row"><button type="button" class="bjt-btn" style="flex:1" id="bjt-font-up">Upload a font</button><button type="button" class="bjt-btn" style="flex:1" id="bjt-font-del">Delete this font</button>
            <input type="file" id="bjt-font-file" accept=".ttf,.otf,.woff,.woff2" style="display:none"></div>
          <div class="bjt-hint" id="bjt-font-status"><b>Built in:</b> comes with Banana Jam. <b>On this PC:</b> installed in Windows, so it may look different on another computer. <b>My fonts:</b> fonts you upload.</div>`)}
        ${section('more', 'Extras', 'Colour picker, tips and tour, and reset.', `
          <div id="bjt-pickerblock"><div class="bjt-sub">Colour wheel</div>
          ${slider('pk-opacity', 'See-through', 40, 100)}
          <div class="bjt-row"><span class="bjt-label" style="flex:0 0 92px">Style</span>
            <select id="bjt-pk-style"><option value="auto">Match the app</option><option value="dark">Dark</option><option value="light">Light</option></select></div>
          <div class="bjt-row"><span class="bjt-label" style="flex:0 0 92px">Size</span>
            <select id="bjt-pk-size"><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option></select></div>
          <div class="bjt-row" style="justify-content:flex-end"><button type="button" class="bjt-btn" id="bjt-pk-reset">Reset position</button></div></div>
          <div class="bjt-sub">Tips &amp; tour</div>
          
          <div class="bjt-row"><span class="bjt-label">Little pop-up tips explain each part of Banana Jam. The <b>?</b> at the top right lists them all.</span>
            <button type="button" class="bjt-btn" id="bjt-tips-again">Show all tips</button></div>
          <div class="bjt-row"><span class="bjt-label">Walk through every part of Banana Jam again.</span><button type="button" class="bjt-btn main" id="bjt-tour-again">Take the tour</button></div>
          <div class="bjt-sub">Reset</div>
          
          <div class="bjt-row"><button type="button" class="bjt-btn" style="flex:1" id="bjt-reset-colours" title="Colours, name, icon and picture go back to the Banana Jam default">Reset colours</button>
            <button type="button" class="bjt-btn" style="flex:1" id="bjt-reset-all" title="Every setting goes back to how it started">Reset all settings</button></div>
          <div class="bjt-hint" id="bjt-reset-status">Click a reset button twice to be sure.</div>`)}
      </div>`;
  }

  function mount(host) {
    if (!host || host.__bjt) return;
    host.__bjt = true;
    host.innerHTML = markup();
    // sections open in a pop-up, so look things up in the whole page, not just the tab
    const $ = (id) => document.getElementById(id);

    // sections: click one and its settings open in a pop-up on top of Settings
    const holder = () => host.closest('.modal-container') || host.closest('#modalContainer') || document.body;
    let current = null;
    function closePop() {
      if (!current) return;
      const { sec, body, dim } = current;
      sec.appendChild(body);            // the settings go back to their place
      sec.classList.remove('open');
      dim.remove();
      current = null;
    }
    function openPop(sec) {
      const same = current && current.sec === sec;
      closePop();
      if (same) return;
      const title = sec.querySelector('.bjt-ttl');
      const body = sec.querySelector('.bjt-body');
      const dim = document.createElement('div');
      dim.className = 'bjt-dim';
      dim.innerHTML = `<div class="modal-container bjt-pop" role="dialog" aria-modal="true">
        <div class="modal-header"><h3 class="modal-header-title bjt-pop-title"></h3>
          <button type="button" class="modal-close-btn bjt-pop-x" aria-label="Close"></button></div>
        <div class="bjt-pop-body"></div>
        <div class="bjt-pop-foot"><button type="button" class="bjt-btn main bjt-pop-done">Done</button></div></div>`;
      const x = dim.querySelector('.bjt-pop-x');
      x.classList.add('wzcap', 'wzcap-close');
      if (window.WzStyle) x.insertAdjacentHTML('beforeend', window.WzStyle.GLYPH.close);
      dim.querySelector('.bjt-pop-title').textContent = title ? title.firstChild.textContent : '';
      dim.querySelector('.bjt-pop').setAttribute('data-sec', sec.getAttribute('data-sec') || '');
      const pb = dim.querySelector('.bjt-pop-body');
      pb.appendChild(body);
      dim.addEventListener('mousedown', (e) => { if (e.target === dim) closePop(); });
      dim.querySelector('.bjt-pop-x').addEventListener('click', closePop);
      dim.querySelector('.bjt-pop-done').addEventListener('click', closePop);
      holder().appendChild(dim);
      sec.classList.add('open');       // (the tips list looks for this)
      current = { sec, body, dim };
      const first = pb.querySelector('input:not([type=file]):not([type=color]), select, button');
      if (first && first.focus) try { first.focus({ preventScroll: true }); } catch (e) {}
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && current) { e.stopPropagation(); e.preventDefault(); closePop(); }
    }, true);
    host.querySelectorAll('.bjt-sec').forEach(sec => {
      const head = sec.querySelector('.bjt-head');
      head.addEventListener('click', () => openPop(sec));
      head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(sec); } });
    });

    const enabled = $('bjt-enabled'), custom = { classList: { toggle: (c, on) => host.querySelectorAll('#bjt-custom, .bjt-custom-col').forEach((n) => n.classList.toggle(c, !!on)), contains: (c) => !!host.querySelector('#bjt-custom') && host.querySelector('#bjt-custom').classList.contains(c) } };
    const nameIn = $('bjt-name'), fruitSel = $('bjt-fruit'), fruitImg = $('bjt-fruit-img');
    const mainIn = $('bjt-main'), mainHex = $('bjt-main-hex');

    // a small reset button beside each colour and setting (see addReset below)
    const RST_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>';
    const resets = [];
    function refreshResets() {
      resets.forEach((r) => {
        let d = false;
        try { d = !!r.isDef(); } catch (e) {}
        r.b.classList.toggle('is-default', d);
        r.b.disabled = d;
      });
    }
    function addReset(el, label, isDef, doReset) {
      if (!el || !el.parentNode) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'bjt-btn bjt-rst';
      b.title = `Put ${label} back to how it started`;
      b.setAttribute('aria-label', `Reset ${label}`);
      b.innerHTML = RST_SVG;
      b.addEventListener('click', () => { doReset(); refresh(); });
      el.parentNode.appendChild(b);
      resets.push({ b, isDef });
    }

    const refresh = () => {
      const s = load();
      enabled.checked = s.enabled;
      custom.classList.toggle('bjt-off', !s.enabled);
      if (document.activeElement !== nameIn) nameIn.value = s.name;
      if (Icons) Icons.fillSelect(fruitSel, s.fruit); else fruitSel.value = s.fruit;
      const fsrc = iconSrc(s.fruit);
      fruitImg.style.visibility = fsrc ? 'visible' : 'hidden';
      if (fsrc) fruitImg.src = fsrc;
      renderIcons();
      mainIn.value = s.main;
      if (document.activeElement !== mainHex) mainHex.value = s.main;
      const c = colours(Object.assign({}, s, { enabled: true }));
      document.querySelectorAll('.bjt-part').forEach(row => {
        const k = row.dataset.part;
        row.classList.toggle('is-auto', !s.parts[k]);
        row.querySelector('.bjt-part-color').value = s.parts[k] || (k === 'accent' ? c.accentRaw : c[k]);
      });
      refreshPic();
      refreshResets();
    };

    enabled.addEventListener('change', () => { update({ enabled: enabled.checked }); refresh(); });
    // Light / dark buttons (the header sun / moon button does the same)
    const modeLightBtn = $('bjt-mode-light'), modeDarkBtn = $('bjt-mode-dark');
    const paintMode = () => {
      const m = window.WzMode ? window.WzMode.get() : 'dark';
      modeLightBtn.classList.toggle('on', m === 'light');
      modeDarkBtn.classList.toggle('on', m === 'dark');
      modeLightBtn.setAttribute('aria-pressed', String(m === 'light'));
      modeDarkBtn.setAttribute('aria-pressed', String(m === 'dark'));
    };
    modeLightBtn.addEventListener('click', () => { if (window.WzMode) window.WzMode.set('light'); paintMode(); });
    modeDarkBtn.addEventListener('click', () => { if (window.WzMode) window.WzMode.set('dark'); paintMode(); });
    if (window.WzMode) window.WzMode.onChange(paintMode);
    paintMode();
    window.__bjThemeRefresh = () => { try { refresh(); } catch (e) {} };
    nameIn.addEventListener('input', () => { update({ name: nameIn.value.trim() || DEFAULTS.name }); refreshResets(); });
    fruitSel.addEventListener('change', () => { update({ fruit: fruitSel.value }); refresh(); });

    // My icons: upload, pick, delete
    const iconsList = $('bjt-icons-list'), iconsFile = $('bjt-icons-file'), iconsStatus = $('bjt-icons-status');
    const sayIcon = (t) => { iconsStatus.textContent = t || ''; };
    function renderIcons() {
      if (!Icons) { document.querySelector('.bjt-icons').style.display = 'none'; return; }
      const chosen = load().fruit;
      iconsList.innerHTML = '';
      const mine = Icons.list();
      if (!mine.length) {
        iconsList.innerHTML = '<span class="bjt-hint" style="margin:0">No icons yet</span>';
        return;
      }
      mine.forEach((icon) => {
        const key = 'custom:' + icon.id;
        const tile = document.createElement('div');
        tile.className = 'bjt-icon' + (chosen === key ? ' on' : '');
        tile.title = `${icon.name} (click to use it)`;
        const img = document.createElement('img');
        img.src = icon.data; img.alt = icon.name;
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'bjt-icon-del'; del.textContent = '✕'; del.title = `Delete ${icon.name}`;
        tile.addEventListener('click', () => { update({ fruit: key }); refresh(); });
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          Icons.remove(icon.id);
          if (load().fruit === key) update({ fruit: DEFAULTS.fruit });
          sayIcon(`Deleted "${icon.name}".`);
          refresh();
        });
        tile.appendChild(img); tile.appendChild(del);
        iconsList.appendChild(tile);
      });
    }
    $('bjt-icons-add').addEventListener('click', () => iconsFile.click());
    iconsFile.addEventListener('change', async () => {
      const f = iconsFile.files && iconsFile.files[0];
      iconsFile.value = '';
      if (!f || !Icons) return;
      try {
        sayIcon('Adding icon…');
        const key = await Icons.addFile(f);
        update({ fruit: key });
        sayIcon(`Added "${Icons.nameOf(key)}". It's in the Icon list now.`);
        refresh();
      } catch (e) { sayIcon(e.message || 'Something went wrong with that picture.'); }
    });
    mainIn.addEventListener('input', () => { update({ main: mainIn.value }); refresh(); });
    mainHex.addEventListener('input', () => {
      let v = mainHex.value.trim();
      if (v && v[0] !== '#') v = '#' + v;
      if (isHex(v)) { update({ main: v.toLowerCase() }); refresh(); }
    });
    mainHex.addEventListener('blur', () => { mainHex.value = load().main; });
    $('bjt-reset').addEventListener('click', () => {
      const s = load();
      save(Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), { enabled: s.enabled }));
      apply(); refresh();
    });

    document.querySelectorAll('.bjt-part').forEach(row => {
      const k = row.dataset.part;
      const color = row.querySelector('.bjt-part-color');
      color.addEventListener('input', () => {
        const s = load();
        s.parts[k] = color.value.toLowerCase();
        save(s); apply();
        row.classList.remove('is-auto');
      });
      row.querySelector('.bjt-lock').addEventListener('click', () => {
        const s = load();
        s.parts[k] = s.parts[k] ? null : color.value.toLowerCase();
        save(s); apply(); refresh();
      });
    });

    // picture
    const picStatus = $('bjt-pic-status');
    const sayPic = (t) => { picStatus.textContent = t || ''; };
    function refreshPic() {
      const p = loadPic();
      const img = $('bjt-pic-img');
      img.style.display = p.image ? 'block' : 'none';
      if (p.image) img.src = p.image;
      $('bjt-pic-remove').style.display = p.image ? '' : 'none';
      $('bjt-pic-adjust').style.display = p.image ? '' : 'none';
      const setR = (id, v, label) => { $('bjt-' + id).value = String(v); $('bjt-' + id + '-val').textContent = label; };
      setR('blur', p.blur, p.blur ? `${p.blur}` : 'Off');
      setR('tint', p.tint, `${p.tint}%`);
      setR('zoom', p.zoom, `${p.zoom}%`);
      setR('x', p.x, `${p.x}%`);
      setR('y', p.y, `${p.y}%`);
      $('bjt-mirror').classList.toggle('on', p.mirror);
      $('bjt-flip').classList.toggle('on', p.flip);
    }
    const picFile = $('bjt-pic-file');
    $('bjt-pic-upload').addEventListener('click', () => picFile.click());
    picFile.addEventListener('change', async () => {
      const f = picFile.files && picFile.files[0];
      picFile.value = '';
      if (!f) return;
      try {
        sayPic('Loading picture…');
        const data = await shrinkImage(f);
        if (!savePic({ image: data, zoom: 100, x: 50, y: 50, mirror: false, flip: false })) throw new Error('That picture is too big to save. Try a smaller one.');
        sayPic(load().enabled ? 'Picture set. It shows behind everything.' : 'Picture set. Turn on Custom Theme to see it.');
      } catch (e) { sayPic(e.message || 'Something went wrong with that picture.'); }
      refreshPic();
    });
    $('bjt-pic-remove').addEventListener('click', () => { savePic({ image: null }); sayPic('Picture removed.'); refreshPic(); });
    ['blur', 'tint', 'zoom', 'x', 'y'].forEach(id => {
      const r = $('bjt-' + id);
      let frame = 0;
      r.addEventListener('input', () => {
        const v = Number(r.value);
        $('bjt-' + id + '-val').textContent = id === 'blur' ? (v ? `${v}` : 'Off') : `${v}%`;
        if (frame) return;
        frame = requestAnimationFrame(() => { frame = 0; savePic({ [id]: Number(r.value) }); refreshResets(); });
      });
    });
    $('bjt-mirror').addEventListener('click', () => { savePic({ mirror: !loadPic().mirror }); refreshPic(); });
    $('bjt-flip').addEventListener('click', () => { savePic({ flip: !loadPic().flip }); refreshPic(); });
    $('bjt-pic-reset').addEventListener('click', () => { savePic({ zoom: 100, x: 50, y: 50, mirror: false, flip: false }); refreshPic(); });

    // presets
    const sel = $('bjt-preset'), presetName = $('bjt-preset-name'), status = $('bjt-preset-status'), file = $('bjt-preset-file');
    const say = (t) => { status.textContent = t || ''; };
    const DEF = '__default__';
    // ready-made presets (colour theory) come from wz-presets.js
    const READY = (window.WzPresets && window.WzPresets.READY) || [];
    const isReady = (v) => /^ready:\d+$/.test(v);
    const readyAt = (v) => READY[Number(v.slice(6))] || null;
    const option = (parent, value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; parent.appendChild(o); };
    const fill = (pick) => {
      const list = loadPresets();
      sel.innerHTML = '';
      option(sel, '', 'Choose a preset…');
      const ready = document.createElement('optgroup');
      ready.label = 'Ready-made';
      option(ready, DEF, DEFAULT_PRESET_NAME);
      READY.forEach((r, i) => option(ready, 'ready:' + i, window.WzPresets.label(r)));
      sel.appendChild(ready);
      const mine = document.createElement('optgroup');
      mine.label = list.length ? 'My presets' : 'My presets (none saved yet)';
      list.forEach((p, i) => option(mine, String(i), p.name));
      sel.appendChild(mine);
      if (pick) { const i = list.findIndex(p => p.name === pick); sel.value = i >= 0 ? String(i) : ''; }
    };
    const chosen = () => {
      if (sel.value === DEF) return defaultPreset();
      if (isReady(sel.value)) { const r = readyAt(sel.value); return r ? cleanPreset(window.WzPresets.forLauncher(r)) : null; }
      return sel.value === '' ? null : (loadPresets()[Number(sel.value)] || null);
    };
    sel.addEventListener('change', () => {
      const p = chosen();
      if (!p) return;
      applyPreset(cleanPreset(p) || p);
      refresh();
      const r = isReady(sel.value) ? readyAt(sel.value) : null;
      say(r ? `Using "${r.name}". ${r.about}` : `Using "${p.name}".`);
    });
    $('bjt-preset-save').addEventListener('click', () => {
      const name = (presetName.value || '').trim() || (/^\d+$/.test(sel.value) ? (chosen() || {}).name : '');
      if (!name) { say('Type a name for the preset first.'); return; }
      if (name === DEFAULT_PRESET_NAME) { say('Pick a different name.'); return; }
      const p = currentAsPreset(name);
      const list = loadPresets();
      const i = list.findIndex(x => x.name === name);
      if (i >= 0) list[i] = p; else list.push(p);
      if (!savePresets(list)) { say('Not enough space to save. Try a smaller picture.'); return; }
      presetName.value = '';
      fill(name);
      say(i >= 0 ? `Updated "${name}".` : `Saved "${name}".`);
    });
    $('bjt-preset-delete').addEventListener('click', () => {
      if (sel.value === '') { say('Choose a preset to delete.'); return; }
      if (sel.value === DEF || isReady(sel.value)) { say('Ready-made presets can\'t be deleted.'); return; }
      const list = loadPresets();
      const p = list.splice(Number(sel.value), 1)[0];
      savePresets(list); fill();
      say(p ? `Deleted "${p.name}".` : '');
    });
    $('bjt-preset-export').addEventListener('click', () => {
      const p = chosen() || currentAsPreset('My Banana Jam launcher theme');
      if (!p) { say('Nothing to download.'); return; }
      const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${p.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'preset'}.bananajam-launcher.json`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      say(`Downloaded "${p.name}".`);
    });
    $('bjt-preset-import').addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        let p = null;
        try { p = cleanPreset(JSON.parse(reader.result)); } catch (e) { p = null; }
        if (!p) { say('That file isn\'t a Banana Jam preset.'); return; }
        // uploading the same preset again just uses it
        const same = loadPresets().findIndex(x => JSON.stringify(Object.assign({}, x, { name: '' })) === JSON.stringify(Object.assign({}, p, { name: '' })));
        if (same >= 0) { fill(loadPresets()[same].name); applyPreset(p); refresh(); say('You already have that one, so it\'s now in use.'); return; }
        const list = loadPresets();
        let name = p.name, n = 2;
        while (list.some(x => x.name === name) || name === DEFAULT_PRESET_NAME) name = `${p.name} (${n++})`;
        p.name = name;
        list.push(p);
        if (!savePresets(list)) { say('Not enough space to add that preset.'); return; }
        fill(name); applyPreset(p); refresh();
        say(`Added and using "${name}".`);
      };
      reader.readAsText(f);
    });
    fill();

    // colour wheel options
    const P = window.WzColorPicker;
    if (P) {
      const prefs = P.loadPrefs();
      const op = $('bjt-pk-opacity');
      op.value = String(prefs.opacity); $('bjt-pk-opacity-val').textContent = `${prefs.opacity}%`;
      op.addEventListener('input', () => { $('bjt-pk-opacity-val').textContent = `${op.value}%`; P.savePrefs({ opacity: Number(op.value) }); });
      const st = $('bjt-pk-style');
      st.value = prefs.styleLocked ? prefs.style : 'auto';
      st.addEventListener('change', () => P.savePrefs(st.value === 'auto' ? { styleLocked: false } : { styleLocked: true, style: st.value }));
      const sz = $('bjt-pk-size');
      sz.value = prefs.size;
      sz.addEventListener('change', () => P.savePrefs({ size: sz.value }));
      $('bjt-pk-reset').addEventListener('click', () => P.savePrefs({ x: null, y: null }));
    } else {
      $('bjt-pickerblock').style.display = 'none';
    }

    $('bjt-tips-again').addEventListener('click', () => { if (window.WzTips) window.WzTips.replay(); });
    $('bjt-tour-again').addEventListener('click', () => {
      closePop();
      const x = document.querySelector('#modalContainer .modal-close-btn:not(.bjt-pop-x)');
      if (x) x.click();
      setTimeout(() => { if (window.WzTips) window.WzTips.tour(); }, 450);
    });

    // look and window buttons
    if (window.WzStyle) window.WzStyle.bindSelects($('bjt-look'), $('bjt-btns'));
    else $('bjt-lookblock').style.display = 'none';

    // reset buttons (two clicks, so nothing gets wiped by accident)
    const resetStatus = $('bjt-reset-status');
    const twoClicks = (btn, label, run, done) => {
      let armed = 0;
      btn.addEventListener('click', () => {
        if (!armed) {
          armed = setTimeout(() => { armed = 0; btn.textContent = label; }, 3500);
          btn.textContent = 'Click again';
          return;
        }
        clearTimeout(armed); armed = 0; btn.textContent = label;
        run();
        refresh();
        resetStatus.textContent = done;
      });
    };
    twoClicks($('bjt-reset-colours'), 'Reset colours', resetColours,
      'Colours, name, icon and picture are back to the Banana Jam default.');
    twoClicks($('bjt-reset-all'), 'Reset all settings', resetAll,
      'Every setting is back to how it started.');

    // ---- reset buttons: one beside every colour and setting ----
    const PIC_DEF = { blur: 0, tint: 45, zoom: 100, x: 50, y: 50 };
    addReset(nameIn, 'the name', () => load().name === DEFAULTS.name, () => { update({ name: DEFAULTS.name }); });
    addReset(fruitSel, 'the icon', () => load().fruit === DEFAULTS.fruit, () => { update({ fruit: DEFAULTS.fruit }); });
    addReset(mainHex, 'the main colour', () => load().main === DEFAULTS.main, () => { update({ main: DEFAULTS.main }); });
    document.querySelectorAll('.bjt-part').forEach((row) => {
      const k = row.dataset.part;
      addReset(row.querySelector('.bjt-lock'), PART_NAMES[k].toLowerCase(),
        () => (load().parts[k] || null) === DEFAULTS.parts[k],
        () => { const s = load(); s.parts[k] = DEFAULTS.parts[k]; save(s); apply(); });
    });
    Object.keys(PIC_DEF).forEach((id) => {
      addReset($('bjt-' + id + '-val'), $('bjt-' + id).parentNode.firstElementChild.textContent.toLowerCase(),
        () => loadPic()[id] === PIC_DEF[id], () => { savePic({ [id]: PIC_DEF[id] }); });
    });
    if (window.WzStyle) {
      const WS = window.WzStyle;
      addReset($('bjt-look'), 'the look', () => WS.get().ui === 'mac', () => { WS.set({ ui: 'mac' }); });
      addReset($('bjt-btns'), 'the window buttons', () => WS.get().btns === 'match', () => { WS.set({ btns: 'match' }); });
      window.addEventListener('wz-style-change', refreshResets);
    }
    if (P) {
      const pk = (changes, after) => { P.savePrefs(changes); after(); };
      addReset($('bjt-pk-opacity-val'), 'the see-through amount', () => P.loadPrefs().opacity === 85, () => pk({ opacity: 85 }, () => { $('bjt-pk-opacity').value = '85'; $('bjt-pk-opacity-val').textContent = '85%'; }));
      addReset($('bjt-pk-style'), 'the wheel style', () => !P.loadPrefs().styleLocked, () => pk({ styleLocked: false }, () => { $('bjt-pk-style').value = 'auto'; }));
      addReset($('bjt-pk-size'), 'the wheel size', () => P.loadPrefs().size === 'normal', () => pk({ size: 'normal' }, () => { $('bjt-pk-size').value = 'normal'; }));
      ['bjt-pk-opacity', 'bjt-pk-style', 'bjt-pk-size'].forEach((id) => $(id).addEventListener(id.endsWith('opacity') ? 'input' : 'change', refreshResets));
    }

    // ---- fonts ----
    const WF = window.WzFonts;
    if (WF) {
      const fsel = $('bjt-font'), fprev = $('bjt-font-prev'), fup = $('bjt-font-up'), fdel = $('bjt-font-del'), ffile = $('bjt-font-file'), fstat = $('bjt-font-status');
      const fnote = fstat.innerHTML;
      const paintFont = () => {
        WF.fillSelect(fsel);
        fprev.style.fontFamily = WF.stackFor(fsel.value) || 'var(--bj-font)';
        fdel.disabled = fsel.value.indexOf('my:') !== 0;
        refreshResets();
      };
      fsel.addEventListener('change', () => { WF.set({ id: fsel.value }); paintFont(); fstat.innerHTML = fnote; });
      fup.addEventListener('click', () => ffile.click());
      ffile.addEventListener('change', () => {
        const f = ffile.files && ffile.files[0]; ffile.value = '';
        if (!f) return;
        WF.addFile(f).then((r) => { WF.set({ id: 'my:' + r.uid }); paintFont(); fstat.textContent = `Added "${r.name}" and switched to it.`; })
          .catch((e) => { fstat.textContent = e.message; });
      });
      fdel.addEventListener('click', () => {
        if (fsel.value.indexOf('my:') !== 0) return;
        WF.removeMine(fsel.value.slice(3)); paintFont(); fstat.textContent = 'Font deleted.';
      });
      addReset(fsel, 'the font', () => WF.load().id === 'look', () => { WF.set({ id: 'look' }); paintFont(); });
      paintFont();
    }

    // ---- colours shared with the game window (the lock) ----
    const Sh = window.WzShare, Pz = window.WzPresets;
    const shareBtn = $('bjt-share-btn'), shareNote = $('bjt-share-note'), shareRow = $('bjt-share');
    let shareOn = false, echo = false, pushTimer = 0;
    const paintShare = () => {
      if (!shareBtn) return;
      shareRow.classList.toggle('is-on', shareOn);
      shareBtn.setAttribute('aria-pressed', String(shareOn));
      shareBtn.classList.toggle('is-auto', !shareOn);   // uses the same open/closed lock pictures as the colour locks
      if (!Sh || !Sh.ok) { shareNote.textContent = 'Not available right now.'; shareBtn.disabled = true; return; }
      shareNote.textContent = shareOn
        ? 'Locked: the launcher, login screen and game use the same colours. Change them in either place and the other follows.'
        : 'Unlocked: each keeps its own colours. Click the lock to make the game match this window.';
    };
    async function pushShare() {
      if (!Sh || !Sh.ok || !Pz) return;
      const st = load();
      const g = Pz.gameFromLauncher({ name: 'x', main: st.main, customName: st.name, fruit: st.fruit, parts: st.parts });
      await Sh.write({ on: shareOn, by: 'launcher', main: st.main, launcher: st.parts, game: g.parts });
    }
    afterSave = () => { if (echo || !shareOn) return; clearTimeout(pushTimer); pushTimer = setTimeout(pushShare, 300); };
    function applyShared(d) {
      if (!d || !d.on || d.by === 'launcher') return;
      echo = true;
      try {
        const st = load();
        save(Object.assign(st, { enabled: true, main: d.main || st.main, parts: cleanParts(d.launcher) }));
        apply(); refresh();
      } finally { echo = false; }
    }
    if (Sh && Sh.ok) {
      Sh.onChange((d) => { shareOn = !!(d && d.on); paintShare(); applyShared(d); });
      Sh.read().then((d) => { shareOn = !!(d && d.on); paintShare(); applyShared(d); });
    }
    if (shareBtn) shareBtn.addEventListener('click', async () => { shareOn = !shareOn; paintShare(); await pushShare(); });
    paintShare();

    refresh();
  }

  // ---------- reset ----------
  function resetColours() {
    try { localStorage.removeItem(PIC_KEY); } catch (e) {}
    save(JSON.parse(JSON.stringify(DEFAULTS)));
    apply();
  }
  function resetAll() {
    resetColours();
    if (window.WzStyle) window.WzStyle.reset();
    try { ['wzPickerPrefs', 'wzRecentColors', 'wzFont', OPEN_KEY].forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    if (window.WzFonts) window.WzFonts.apply();
    // the launcher's own settings (General tab) back to how they start
    try {
      const app = window.jam && window.jam.application;
      const defaults = { 'ui.performServerCheckOnLaunch': true, 'ui.militaryTime': false, 'ui.allowMultipleInstances': false };
      Object.keys(defaults).forEach((k) => { if (app && app.settings && app.settings.update) app.settings.update(k, defaults[k]); });
      const tick = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
      tick('performServerCheckOnLaunchToggle', true);
      tick('militaryTimeToggle', false);
      tick('allowMultipleInstancesToggle', false);
    } catch (e) {}
  }

  // ---------- colour wheel for every colour box in the launcher ----------
  function hookPicker() {
    const P = window.WzColorPicker;
    if (!P || document.__bjPicker) return;
    document.__bjPicker = true;
    const style = document.createElement('style');
    style.textContent = P.STYLE + '\n:root { --wzcp-font: "Segoe UI", Tahoma, Verdana, sans-serif; }';
    document.head.appendChild(style);
    document.addEventListener('click', (e) => {
      const input = e.target && e.target.closest && e.target.closest('input[type="color"]');
      if (!input || input.disabled) return;
      e.preventDefault();
      e.stopPropagation();
      const prefs = P.loadPrefs();
      const dark = document.documentElement.classList.contains('bj-pdark');
      P.open(document.body, input, { appDark: dark, style: prefs.styleLocked ? prefs.style : (dark ? 'dark' : 'light') });
    }, true);
  }

  // watch for the Settings window and fill in its Theme tab
  function watch() {
    const tryMount = () => {
      const host = document.getElementById('bjThemeMount');
      if (host && !host.__bjt) mount(host);
      // the close button on every window gets the chosen window button look
      document.querySelectorAll('.modal-close-btn:not(.wzcap)').forEach((btn) => {
        btn.classList.add('wzcap', 'wzcap-close');
        if (window.WzStyle) btn.insertAdjacentHTML('beforeend', window.WzStyle.GLYPH.close);
      });
      ['pluginSettingsPopover', 'networkSettingsPopover'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('bj-pop')) el.classList.add('bj-pop');
      });
    };
    new MutationObserver(tryMount).observe(document.body, { childList: true, subtree: true });
    tryMount();
  }

  function init() {
    if (!document.getElementById('bjBgPic')) {
      const pic = document.createElement('div');
      pic.id = 'bjBgPic';
      pic.innerHTML = '<div id="bjBgPicInner"><div id="bjBgPicImg"></div></div>';
      document.body.insertBefore(pic, document.body.firstChild);
    }
    apply();
    hookPicker();
    hookModeButton();
    watch();
  }

  // ---------- Light / Dark mode ----------
  const sameLook = (st, M) => !!M && st.main === M.main && PART_KEYS.every(k => ((st.parts && st.parts[k]) || null) === (M.launcher[k] || null));
  function applyModeLook(mode) {
    const Ms = window.WzPresets && window.WzPresets.MODES;
    const M = Ms && Ms[mode];
    if (!M) return;
    const cur = load();
    // your own colours are saved as a preset first, so switching is never a loss
    try {
      if (cur.enabled && !sameLook(cur, Ms.dark) && !sameLook(cur, Ms.light)) {
        const keep = currentAsPreset('My colours (auto-saved)');
        const list = loadPresets().filter(x => x.name !== keep.name);
        list.push(keep);
        savePresets(list);
      }
    } catch (e) {}
    save(Object.assign(cur, { enabled: true, main: M.main, parts: cleanParts(M.launcher) }));
    apply();
    if (window.__bjThemeRefresh) window.__bjThemeRefresh();
  }
  function hookModeButton() {
    const btn = document.getElementById('bjModeBtn');
    if (!btn || btn.__bjMode || !window.WzMode) return;
    btn.__bjMode = true;
    const paint = () => {
      const dark = window.WzMode.get() === 'dark';
      btn.innerHTML = dark ? SUN_SVG.replace('width="13" height="13"', 'width="16" height="16"') : MOON_SVG.replace('width="13" height="13"', 'width="16" height="16"');
      btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
      btn.setAttribute('aria-label', btn.title);
    };
    btn.addEventListener('click', () => window.WzMode.toggle());
    window.WzMode.onChange(paint);
    paint();
  }
  if (window.WzMode) window.WzMode.apply(applyModeLook);

  window.BJTheme = { apply, load, update, loadPic, DEFAULTS, resetColours, resetAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
