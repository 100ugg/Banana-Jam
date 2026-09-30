/*
 * WzFonts - the Font setting, shared by the launcher and the game window.
 *
 * Where a font comes from (the picker shows these as separate groups):
 *   "Built into Banana Jam"  fonts that ship inside the app (assets/.../fonts/bj), always there
 *   "On this PC"             fonts that are already installed in Windows (only shown if found)
 *   "My fonts"               fonts you upload (saved inside Banana Jam, in this window)
 *
 * The choice is saved in localStorage ("wzFont") and applied by adding the class "wzf-on"
 * to <html> and a --wzf variable holding the font list.
 */
(function () {
  if (window.WzFonts) return;

  const KEY = 'wzFont';
  const MINE = 'wzFontsMine';
  const MAX_FILE = 1500000;    // one uploaded font
  const MAX_TOTAL = 3500000;   // all uploaded fonts together

  const BUILTIN = [
    { id: 'nunito', name: 'Nunito', about: 'Round and friendly' },
    { id: 'fredoka', name: 'Fredoka', about: 'Bubbly and playful' },
    { id: 'comicneue', name: 'Comic Neue', family: 'Comic Neue', about: 'Neat handwritten comic' },
    { id: 'atkinson', name: 'Atkinson Hyperlegible', about: 'Made to be very easy to read' },
    { id: 'lexend', name: 'Lexend', about: 'Made to help reading' },
    { id: 'andika', name: 'Andika', about: 'Clear letters for learners' },
    { id: 'poppins', name: 'Poppins', about: 'Clean and modern' },
    { id: 'opendyslexic', name: 'OpenDyslexic', about: 'Weighted letters for dyslexia' }
  ];
  const PC = ['Segoe UI', 'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Calibri', 'Georgia', 'Times New Roman',
    'Comic Sans MS', 'Consolas', 'Courier New', 'Lucida Sans Unicode', 'Palatino Linotype'];
  const SERIFS = { 'Georgia': 1, 'Times New Roman': 1, 'Palatino Linotype': 1 };
  const MONO = { 'Consolas': 1, 'Courier New': 1 };

  let mode = 'launcher';
  const roots = [];   // login screen (game): shadow hosts that need the class too

  // ---------- saved choice ----------
  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    raw = raw && typeof raw === 'object' ? raw : {};
    return { id: typeof raw.id === 'string' ? raw.id : 'look', aj: raw.aj === true };
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // ---------- fonts you uploaded ----------
  function mine() {
    try {
      const l = JSON.parse(localStorage.getItem(MINE) || '[]');
      return Array.isArray(l) ? l.filter((f) => f && typeof f.uid === 'string' && typeof f.data === 'string') : [];
    } catch (e) { return []; }
  }
  const myFamily = (f) => 'BJ My ' + f.uid;
  const registered = {};
  function registerMine() {
    mine().forEach((f) => {
      if (registered[f.uid] || !window.FontFace) return;
      registered[f.uid] = true;
      try {
        const face = new FontFace(myFamily(f), 'url(' + f.data + ')');
        document.fonts.add(face);
        face.load().catch(() => {});
      } catch (e) {}
    });
  }

  // ---------- which PC fonts are really installed ----------
  let canvas = null;
  function installed(name) {
    try {
      canvas = canvas || document.createElement('canvas').getContext('2d');
      const text = 'mmmmmmmmmmlli WwQq 0123';
      const width = (font) => { canvas.font = '32px ' + font; return canvas.measureText(text).width; };
      const a = width('monospace'), b = width('serif'), c = width('sans-serif');
      const q = '"' + name + '"';
      return width(q + ', monospace') !== a || width(q + ', serif') !== b || width(q + ', sans-serif') !== c;
    } catch (e) { return false; }
  }
  let pcCache = null;
  function pcFonts() {
    if (!pcCache) pcCache = PC.filter(installed);
    return pcCache;
  }

  // ---------- picking a font ----------
  function stackFor(id) {
    if (!id || id === 'look') return null;
    if (id === 'aj') return 'CCDigitalDelivery, "Segoe UI", sans-serif';
    if (id.indexOf('b:') === 0) {
      const b = BUILTIN.find((x) => x.id === id.slice(2));
      return b ? '"' + (b.family || b.name) + '", "Segoe UI", sans-serif' : null;
    }
    if (id.indexOf('pc:') === 0) {
      const n = id.slice(3);
      if (PC.indexOf(n) < 0) return null;
      return '"' + n + '", ' + (MONO[n] ? 'monospace' : SERIFS[n] ? 'serif' : '"Segoe UI", sans-serif');
    }
    if (id.indexOf('my:') === 0) {
      const f = mine().find((x) => x.uid === id.slice(3));
      return f ? '"' + myFamily(f) + '", "Segoe UI", sans-serif' : null;
    }
    return null;
  }
  function nameFor(id) {
    if (!id || id === 'look') return 'Match the look';
    if (id === 'aj') return 'Animal Jam (original)';
    if (id.indexOf('b:') === 0) { const b = BUILTIN.find((x) => x.id === id.slice(2)); return b ? b.name : 'Match the look'; }
    if (id.indexOf('pc:') === 0) return id.slice(3);
    if (id.indexOf('my:') === 0) { const f = mine().find((x) => x.uid === id.slice(3)); return f ? f.name : 'Match the look'; }
    return 'Match the look';
  }

  // ---------- applying it ----------
  function css() {
    if (mode === 'game') {
      return `
        html.wzf-on .wztip, html.wzf-on .wztip *, html.wzf-on .wztm, html.wzf-on .wztm *,
        html.wzf-on .wzcp, html.wzf-on .wzcp *, html.wzf-on .wzx, html.wzf-on .wzx * { font-family: var(--wzf) !important; }
        html.wzf-on .wzt-title { font-family: var(--wzf) !important; }`;
    }
    return `
      html.wzf-on body { font-family: var(--wzf) !important; }
      html.wzf-on body *:not(i):not(svg):not(svg *):not([class*="fa-"]):not(.fas):not(.far):not(.fab):not(.fa):not(.font-mono):not(pre):not(code):not(kbd):not(.wzcap) { font-family: inherit !important; }`;
  }
  // the login screen keeps its own styles inside a shadow root
  function shadowCss() {
    return `
      :host(.wzf-on) #settings-panel, :host(.wzf-on) #settings-panel :not(h3), :host(.wzf-on) .wz-pop-card, :host(.wzf-on) .wz-pop-card *,
      :host(.wzf-on) .wz-share-text, :host(.wzf-on) .wz-share-text * { font-family: var(--wzf) !important; }
      :host(.wzf-on.wzf-aj), :host(.wzf-on.wzf-aj) * { font-family: var(--wzf) !important; }`;
  }
  function putStyle(where, id, text) {
    let el = where.querySelector ? where.querySelector('#' + id) : null;
    if (!el) { el = document.createElement('style'); el.id = id; where.appendChild(el); }
    if (el.textContent !== text) el.textContent = text;
  }

  function apply() {
    const s = load();
    const stack = stackFor(s.id);
    const html = document.documentElement;
    registerMine();
    putStyle(document.head, 'wzf-style', css());
    if (stack) {
      html.style.setProperty('--wzf', stack);
      html.style.setProperty('--bj-font', stack);
    } else {
      html.style.removeProperty('--wzf');
      html.style.removeProperty('--bj-font');
    }
    html.classList.toggle('wzf-on', !!stack);
    roots.forEach((r) => {
      try {
        const sr = r.shadowRoot;
        if (sr) putStyle(sr, 'wzf-style', shadowCss());
        r.classList.toggle('wzf-on', !!stack);
        r.classList.toggle('wzf-aj', !!stack && s.aj);
      } catch (e) {}
    });
    try { window.dispatchEvent(new CustomEvent('wz-font-change', { detail: { id: s.id, stack } })); } catch (e) {}
  }

  function set(changes) { save(Object.assign(load(), changes)); apply(); }

  // ---------- uploading ----------
  function addFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Pick a font file first.'));
      if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) return reject(new Error('That is not a font file. Use .ttf, .otf, .woff or .woff2.'));
      if (file.size > MAX_FILE) return reject(new Error('That font is too big (over 1.5 MB).'));
      const total = mine().reduce((n, f) => n + f.data.length, 0);
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const data = String(reader.result || '');
        if (total + data.length > MAX_TOTAL) return reject(new Error('Not enough room. Delete one of your fonts first.'));
        const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 40) || 'My font';
        let face;
        try { face = new FontFace('BJ My ' + uid, 'url(' + data + ')'); } catch (e) { return reject(new Error('That file is not a usable font.')); }
        face.load().then(() => {
          document.fonts.add(face);
          registered[uid] = true;
          const list = mine();
          list.push({ uid, name, data });
          try { localStorage.setItem(MINE, JSON.stringify(list)); } catch (e) { return reject(new Error('Not enough room to save it. Delete one of your fonts first.')); }
          resolve({ uid, name });
        }).catch(() => reject(new Error('That file is not a usable font.')));
      };
      reader.readAsDataURL(file);
    });
  }
  function removeMine(uid) {
    try { localStorage.setItem(MINE, JSON.stringify(mine().filter((f) => f.uid !== uid))); } catch (e) {}
    if (load().id === 'my:' + uid) set({ id: 'look' });
  }

  // ---------- filling a <select> ----------
  function fillSelect(select, selected) {
    const add = (parent, value, label) => {
      const o = document.createElement('option');
      o.value = value; o.textContent = label; parent.appendChild(o);
    };
    const group = (label) => { const g = document.createElement('optgroup'); g.label = label; select.appendChild(g); return g; };
    select.textContent = '';
    add(select, 'look', 'Match the look (recommended)');
    if (mode === 'game') add(select, 'aj', 'Animal Jam (original)');
    const g1 = group('Built into Banana Jam');
    BUILTIN.forEach((b) => add(g1, 'b:' + b.id, b.name));
    const pcs = pcFonts();
    const g2 = group(pcs.length ? 'On this PC (Windows)' : 'On this PC (none found)');
    pcs.forEach((n) => add(g2, 'pc:' + n, n));
    const m = mine();
    const g3 = group(m.length ? 'My fonts (uploaded)' : 'My fonts (none uploaded yet)');
    m.forEach((f) => add(g3, 'my:' + f.uid, f.name));
    select.value = selected || load().id;
    if (select.value !== (selected || load().id)) select.value = 'look';
  }

  function init(opts) {
    if (opts && opts.mode) mode = opts.mode;
    if (opts && opts.root) roots.push(opts.root);
    apply();
  }

  window.WzFonts = { BUILTIN, init, load, set, apply, mine, addFile, removeMine, fillSelect, stackFor, nameFor, addRoot: (r) => { if (roots.indexOf(r) < 0) roots.push(r); apply(); } };
})();
