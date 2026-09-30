/*
 * WzMenuStyle - the Mod Menu's Customise window. It floats over the game and is laid out like the rest of the
 * program's settings: tabs along the top, then sections with switches, sliders and colour boxes.
 * It wears the program's current look (Vista, Modern, Bubble, Comic, Crystal, Mac...) but only changes the Mod Menu.
 *
 * Nothing is sent anywhere: the choices are saved on this computer and handed to the game.
 */
(function () {
  if (window.WzMenuStyle) return;
  const KEY = 'bjMenuSkin';
  const COLOURS = [['panel', 'Menu background'], ['card', 'Tiles'], ['text', 'Text'], ['acc', 'Buttons and switches'], ['line', 'Borders']];
  const STYLES = [['cards', 'Mod Menu'], ['vista', 'Vista / 7'], ['modern', 'Modern'], ['bubble', 'Bubble'], ['comic', 'Comic'], ['crystal', 'Crystal'], ['mac', 'Mac'], ['auto', 'Same as app']];
  const DEF = { on: false, panel: '', card: '', text: '', acc: '', line: '', bw: 2, rad: 100, pa: 100, ca: 100, ia: 60, img: '',
    style: 'mac', size: 'roomy', hot: true, desc: true, anim: true };
  let st = Object.assign({}, DEF);
  try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && typeof d === 'object') st = Object.assign({}, DEF, d); } catch (e) {}
  const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v || '');

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('bj-menuskin-change')); } catch (e) {}
  }
  // the text the game receives: the layout and style choices always, the colours / shape only when "own colours" is on
  function serialize() {
    const okStyle = STYLES.some((x) => x[0] === st.style) ? st.style : 'mac';
    const p = ['on=' + (st.on ? 1 : 0), 'style=' + okStyle, 'size=' + (st.size === 'small' ? 'small' : 'roomy'), 'hot=' + (st.hot ? 1 : 0), 'desc=' + (st.desc ? 1 : 0), 'anim=' + (st.anim ? 1 : 0)];
    if (st.on) {
      COLOURS.forEach((c) => { if (isHex(st[c[0]])) p.push(c[0] + '=' + st[c[0]].slice(1)); });
      ['bw', 'rad', 'pa', 'ca', 'ia'].forEach((k) => p.push(k + '=' + (Math.round(+st[k]) || 0)));
    }
    return p.join(';');
  }
  const image = () => (st.on && st.img ? st.img : '');

  const CSS = `
    #bj-ms { --ms-card: #fbf9f3; --ms-text: #3a3226; --ms-muted: #8a7d63; --ms-pri: #c8952a; --ms-field: #ffffff; --ms-line: rgba(0,0,0,.14); --ms-pri-text: #fff; --ms-head: color-mix(in srgb, var(--ms-card) 88%, var(--ms-text));
      position: fixed; top: 50px; right: 24px; width: 380px; max-height: calc(100vh - 80px); z-index: 2147483000; display: none; flex-direction: column;
      background: var(--ms-card); color: var(--ms-text); border: 1px solid var(--ms-line); border-radius: 12px; box-shadow: 0 12px 44px rgba(0,0,0,.45);
      font: 13px "Segoe UI", Tahoma, sans-serif; overflow: hidden; box-sizing: border-box; }
    #bj-ms * { box-sizing: border-box; }
    #bj-ms.open { display: flex; }
    #bj-ms .h { display: flex; align-items: center; padding: 10px 12px; font-weight: 700; font-size: 14px; background: var(--ms-head); cursor: move; user-select: none; border-bottom: 1px solid var(--ms-line); }
    #bj-ms .h span { flex: 1; }
    #bj-ms .x { width: 24px; height: 24px; border: none; border-radius: 6px; background: transparent; cursor: pointer; font-size: 15px; color: inherit; }
    #bj-ms .x:hover { background: #d9534f; color: #fff; }
    #bj-ms .tabs { display: flex; gap: 4px; padding: 8px 10px 0; border-bottom: 1px solid var(--ms-line); }
    #bj-ms .tab { flex: 1; padding: 7px 4px; border: 1px solid transparent; border-bottom: none; border-radius: 8px 8px 0 0; background: transparent; color: var(--ms-muted); cursor: pointer; font: inherit; font-weight: 600; }
    #bj-ms .tab:hover { background: rgba(128,128,128,.12); }
    #bj-ms .tab.on { background: var(--ms-field); color: var(--ms-text); border-color: var(--ms-line); margin-bottom: -1px; }
    #bj-ms .b { padding: 6px 14px 14px; overflow-y: auto; }
    #bj-ms .pane { display: none; }
    #bj-ms .pane.on { display: block; }
    #bj-ms .sec { margin: 14px 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: var(--ms-muted); }
    #bj-ms .r { display: flex; align-items: center; gap: 10px; margin: 9px 0; min-height: 26px; }
    #bj-ms .r label { flex: 1; }
    #bj-ms .n { font-size: 11.5px; color: var(--ms-muted); margin: 2px 0 6px; }
    #bj-ms .v { width: 40px; text-align: right; color: var(--ms-muted); font-variant-numeric: tabular-nums; }
    #bj-ms input[type=range] { flex: 1.4; accent-color: var(--ms-pri); }
    #bj-ms input[type=color] { width: 42px; height: 26px; padding: 0; border: 1px solid var(--ms-line); border-radius: 6px; background: none; cursor: pointer; }
    #bj-ms input[type=color].auto { opacity: .3; }
    #bj-ms .btn { border: 1px solid var(--ms-line); border-radius: 8px; background: var(--ms-field); color: var(--ms-text); padding: 5px 11px; cursor: pointer; font: inherit; }
    #bj-ms .btn:hover { background: rgba(128,128,128,.14); }
    #bj-ms .btn.main { background: var(--ms-pri); color: var(--ms-pri-text); border-color: transparent; }
    #bj-ms .off { opacity: .4; pointer-events: none; }
    /* switch, like the program's settings switches */
    #bj-ms .tg { position: relative; width: 42px; height: 22px; flex: none; }
    #bj-ms .tg input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; z-index: 1; }
    #bj-ms .tg i { position: absolute; inset: 0; border-radius: 99px; background: rgba(128,128,128,.4); transition: background .15s; }
    #bj-ms .tg i::after { content: ''; position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.35); transition: transform .15s; }
    #bj-ms .tg input:checked + i { background: var(--ms-pri); }
    #bj-ms .tg input:checked + i::after { transform: translateX(20px); }
    /* style tiles, like the program's icon tiles */
    #bj-ms .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    #bj-ms .tile { border: 2px solid transparent; border-radius: 10px; background: var(--ms-field); padding: 6px 4px 5px; cursor: pointer; text-align: center; font-size: 11.5px; font-weight: 600; box-shadow: 0 0 0 1px var(--ms-line); }
    #bj-ms .tile:hover { box-shadow: 0 0 0 1px var(--ms-pri); }
    #bj-ms .tile.on { border-color: var(--ms-pri); }
    #bj-ms .tile .pv { height: 30px; border-radius: 6px; margin-bottom: 4px; background: #e9e2cf; position: relative; overflow: hidden; }
    #bj-ms .tile .pv b { position: absolute; left: 6px; right: 6px; top: 8px; height: 14px; background: #fff; border: 1px solid rgba(0,0,0,.2); }
    #bj-ms .pv.s-cards b { border-radius: 8px; } #bj-ms .pv.s-vista b { border-radius: 3px; background: linear-gradient(#f6f6f6, #ddd); border-color: #707070; }
    #bj-ms .pv.s-modern b { border-radius: 5px; border-color: rgba(0,0,0,.1); } #bj-ms .pv.s-mac b { border-radius: 3px; border-color: rgba(0,0,0,.14); }
    #bj-ms .pv.s-bubble b { border-radius: 99px; background: linear-gradient(#fff, #ececec); border-color: #fff; box-shadow: 0 0 6px rgba(255,150,190,.8); }
    #bj-ms .pv.s-crystal b { border-radius: 99px; background: rgba(255,255,255,.45); border-color: #fff; box-shadow: 0 0 6px rgba(80,200,255,.8); }
    #bj-ms .pv.s-comic b { border-radius: 6px; border: 2px solid #3b2f2f; box-shadow: 2px 2px 0 #3b2f2f; } #bj-ms .pv.s-auto { background: repeating-linear-gradient(45deg,#e9e2cf,#e9e2cf 6px,#f4efe0 6px,#f4efe0 12px); }
    #bj-ms .swatches { display: flex; flex-wrap: wrap; gap: 6px; }
    #bj-ms .sw { width: 34px; height: 24px; border-radius: 6px; border: 1px solid var(--ms-line); cursor: pointer; padding: 0; }
    #bj-ms .sw:hover { outline: 2px solid var(--ms-pri); }
    #bj-ms .seg { display: flex; border: 1px solid var(--ms-line); border-radius: 8px; overflow: hidden; }
    #bj-ms .seg button { border: none; background: var(--ms-field); color: var(--ms-text); padding: 5px 14px; cursor: pointer; font: inherit; }
    #bj-ms .seg button.on { background: var(--ms-pri); color: var(--ms-pri-text); }
    #bj-ms .ft { padding: 8px 14px; border-top: 1px solid var(--ms-line); display: flex; justify-content: space-between; align-items: center; }
    /* the program's looks */
    html.wz-style-vista #bj-ms { border-color: #707070; border-radius: 8px; } html.wz-style-vista #bj-ms .h { background: linear-gradient(#f4f9fd, #d3e6f5 48%, #c2dcf0 50%, #dcecf8); color: #1e1e1e; }
    html.wz-style-vista #bj-ms .btn:not(.main), html.wz-style-vista #bj-ms .seg button:not(.on) { background: linear-gradient(#f6f6f6, #ebebeb 48%, #ddd 50%, #cfcfcf); color: #1e1e1e; border-color: #707070; border-radius: 4px; }
    html.wz-style-vista #bj-ms .btn.main { border-color: #707070; border-radius: 4px; }
    html.wz-style-bubble #bj-ms, html.wz-style-crystal #bj-ms { border: 2px solid rgba(255,255,255,.9); border-radius: 26px; box-shadow: 0 0 26px rgba(255,180,210,.6), 0 14px 36px rgba(0,0,0,.3); }
    html.wz-style-bubble #bj-ms .h, html.wz-style-crystal #bj-ms .h { border-radius: 24px 24px 0 0; }
    html.wz-style-bubble #bj-ms .btn, html.wz-style-crystal #bj-ms .btn, html.wz-style-bubble #bj-ms .tab, html.wz-style-crystal #bj-ms .tab { border-radius: 99px; background-image: linear-gradient(#fff, #f0f0f0); border-color: #fff; color: #333; box-shadow: 0 0 0 1px rgba(0,0,0,.1), 0 2px 5px rgba(0,0,0,.12); }
    html.wz-style-bubble #bj-ms .btn.main, html.wz-style-crystal #bj-ms .btn.main, html.wz-style-bubble #bj-ms .tab.on, html.wz-style-crystal #bj-ms .tab.on { background-image: linear-gradient(rgba(255,255,255,.6), rgba(255,255,255,.1) 50%, transparent 51%); background-color: var(--ms-pri); color: var(--ms-pri-text); }
    html.wz-style-crystal #bj-ms { background: color-mix(in srgb, var(--ms-card) 60%, transparent); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
    html.wz-style-comic #bj-ms { border: 2.5px solid #3b2f2f; border-radius: 20px; box-shadow: 5px 5px 0 rgba(59,47,47,.85); }
    html.wz-style-comic #bj-ms .h { border-bottom: 2.5px solid #3b2f2f; }
    html.wz-style-comic #bj-ms .btn, html.wz-style-comic #bj-ms .tab, html.wz-style-comic #bj-ms .tile { border: 2px solid #3b2f2f; border-radius: 10px; box-shadow: 2px 2px 0 #3b2f2f; }
    html.wz-style-comic #bj-ms .tab.on, html.wz-style-comic #bj-ms .btn.main { background: var(--ms-pri); color: var(--ms-pri-text); }
    html.wz-style-modern #bj-ms, html.wz-style-mac #bj-ms { border-radius: 14px; }
    html.wz-style-mac #bj-ms .btn { border-radius: 6px; }
  `;

  let box = null;
  function themeVars() {
    if (!box) return;
    try {
      const host = document.getElementById('login-screen');
      const cs = getComputedStyle(host || document.documentElement);
      const g = (k) => (cs.getPropertyValue(k) || '').trim();
      const set = (name, v) => { if (v) box.style.setProperty(name, v); };
      set('--ms-card', g('--wz-card') || g('--theme-box-background'));
      set('--ms-text', g('--wz-text'));
      set('--ms-muted', g('--wz-muted'));
      set('--ms-pri', g('--wz-ui') || g('--theme-primary'));
      set('--ms-field', g('--wz-field'));
      // text on the accent colour: dark on a light accent, white on a dark one
      const pri = g('--wz-ui') || g('--theme-primary');
      const m = /^#([0-9a-f]{6})$/i.exec(pri);
      if (m) { const n = parseInt(m[1], 16); const y = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000; set('--ms-pri-text', y > 150 ? '#1c1c1c' : '#ffffff'); }
    } catch (e) {}
  }

  function build() {
    if (box) return box;
    const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    box = document.createElement('div'); box.id = 'bj-ms';
    const tg = (k) => '<span class="tg"><input type="checkbox" data-k="' + k + '"><i></i></span>';
    const range = (k, label, min, max) => '<div class="r"><label>' + label + '</label><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '"><span class="v" data-v="' + k + '"></span></div>';
    let h = '<div class="h"><span>Customise the Mod Menu</span><button class="x" title="Close">&#x2715;</button></div>';
    h += '<div class="tabs"><button class="tab on" data-t="style">Look</button><button class="tab" data-t="colours">Colours</button><button class="tab" data-t="layout">Layout</button><button class="tab" data-t="picture">Picture</button></div><div class="b">';
    // Look
    h += '<div class="pane on" data-p="style"><div class="sec">Style</div><div class="tiles">';
    STYLES.forEach((s) => { h += '<div class="tile" data-s="' + s[0] + '"><div class="pv s-' + s[0] + '"><b></b></div>' + s[1] + '</div>'; });
    h += '</div><div class="n">Only changes the Mod Menu. "Same as app" follows the look you picked for the rest of the program.</div>';
    h += '<div class="sec">Movement</div><div class="r"><label>Animations</label>' + tg('anim') + '</div></div>';
    // Colours
    h += '<div class="pane" data-p="colours"><div class="r"><label><b>Use my own colours</b></label>' + tg('on') + '</div>';
    h += '<div class="n">Off = the menu uses the program\'s colours.</div><div id="bj-ms-c"><div class="sec">Ready-made</div><div class="swatches" id="bj-ms-pre"></div><div class="sec">Each colour</div>';
    COLOURS.forEach((c) => { h += '<div class="r"><label>' + c[1] + '</label><input type="color" data-c="' + c[0] + '" class="auto" value="#888888"><button class="btn" data-a="' + c[0] + '">Auto</button></div>'; });
    h += '<div class="sec">Borders and shape</div>' + range('bw', 'Border width', 0, 8) + range('rad', 'Round corners', 0, 200);
    h += '<div class="sec">See-through</div>' + range('pa', 'Menu', 15, 100) + range('ca', 'Tiles', 15, 100) + '</div></div>';
    // Layout
    h += '<div class="pane" data-p="layout"><div class="sec">Tiles</div><div class="r"><label>Card size</label><div class="seg"><button data-z="roomy">Roomy</button><button data-z="small">Small</button></div></div>';
    h += '<div class="r"><label>Show hotkeys</label>' + tg('hot') + '</div><div class="r"><label>Show descriptions</label>' + tg('desc') + '</div></div>';
    // Picture
    h += '<div class="pane" data-p="picture"><div class="sec">Picture behind the menu</div><div class="r"><button class="btn main" id="bj-ms-pick">Choose a picture...</button><button class="btn" id="bj-ms-rm">Remove</button></div><div class="n" id="bj-ms-status"></div>';
    h += range('ia', 'Picture strength', 5, 100) + '<div class="n">The picture only shows while "Use my own colours" is on (Colours tab).</div><input type="file" id="bj-ms-file" accept="image/*" style="display:none"></div>';
    h += '</div><div class="ft"><button class="btn" id="bj-ms-reset">Reset everything</button><span class="n" style="margin:0">Saved on this computer</span></div>';
    box.innerHTML = h;
    document.body.appendChild(box);
    themeVars();
    window.addEventListener('wz-style-change', themeVars);
    if (window.WzColorPicker) { try { window.WzColorPicker.attach(box); } catch (e) {} }

    // ready-made colour sets, from the program's own presets
    const pre = box.querySelector('#bj-ms-pre');
    try {
      ((window.WzPresets && window.WzPresets.READY) || []).forEach((p) => {
        const l = p.launcher || {};
        if (!isHex(l.panel) || !isHex(l.accent)) return;
        const b = document.createElement('button'); b.className = 'sw'; b.title = p.name;
        b.style.background = 'linear-gradient(135deg,' + l.panel + ' 50%,' + l.accent + ' 50%)';
        b.addEventListener('click', () => {
          st.on = true; st.panel = l.panel; st.card = isHex(l.bg) ? l.bg : l.panel; st.acc = l.accent; st.line = isHex(l.header) ? l.header : '';
          st.text = '#3a2c1c'; sync(); save();
        });
        pre.appendChild(b);
      });
    } catch (e) {}

    box.querySelector('.x').addEventListener('click', () => box.classList.remove('open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && box.classList.contains('open')) box.classList.remove('open'); });
    box.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
      box.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
      box.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.dataset.p === t.dataset.t));
    }));
    const head = box.querySelector('.h');
    head.addEventListener('mousedown', (e) => {
      if (e.target.closest('.x')) return;
      const r = box.getBoundingClientRect(); const dx = e.clientX - r.left, dy = e.clientY - r.top;
      const mv = (m) => { box.style.left = Math.max(0, Math.min(window.innerWidth - 80, m.clientX - dx)) + 'px'; box.style.top = Math.max(0, Math.min(window.innerHeight - 40, m.clientY - dy)) + 'px'; box.style.right = 'auto'; };
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
    });
    box.querySelectorAll('.tg input').forEach((el) => el.addEventListener('change', () => { st[el.dataset.k] = el.checked; sync(); save(); }));
    box.querySelectorAll('input[type=range]').forEach((el) => el.addEventListener('input', () => { st[el.dataset.k] = +el.value; sync(); save(); }));
    box.querySelectorAll('input[type=color]').forEach((el) => {
      const fn = () => { st[el.dataset.c] = el.value; st.on = true; sync(); save(); };
      el.addEventListener('input', fn); el.addEventListener('change', fn);
    });
    box.querySelectorAll('button[data-a]').forEach((el) => el.addEventListener('click', () => { st[el.dataset.a] = ''; sync(); save(); }));
    box.querySelectorAll('.tile').forEach((el) => el.addEventListener('click', () => { st.style = el.dataset.s; sync(); save(); }));
    box.querySelectorAll('.seg button').forEach((el) => el.addEventListener('click', () => { st.size = el.dataset.z; sync(); save(); }));
    box.querySelector('#bj-ms-rm').addEventListener('click', () => { st.img = ''; status(''); sync(); save(); });
    box.querySelector('#bj-ms-reset').addEventListener('click', () => { st = Object.assign({}, DEF); status(''); sync(); save(); });

    function status(t) { const el = box.querySelector('#bj-ms-status'); if (el) el.textContent = t || ''; }
    const useDataUrl = (url) => {
      const im = new Image();
      im.onload = () => {
        const sc = Math.min(1, 800 / im.width, 536 / im.height);
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
        const cx = c.getContext('2d'); cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height);
        cx.drawImage(im, 0, 0, c.width, c.height);
        try { st.img = c.toDataURL('image/jpeg', 0.82).split(',')[1] || ''; } catch (x) { st.img = ''; }
        if (!st.img) { status('Could not read that picture.'); return; }
        st.on = true;
        status('Picture added (' + Math.round(st.img.length * 0.75 / 1024) + ' KB). Waiting for the menu...');
        sync(); save();
      };
      im.onerror = () => status('Could not read that picture.');
      im.src = url;
    };
    box.querySelector('#bj-ms-pick').addEventListener('click', async () => {
      status('');
      try {
        if (window.ipc && typeof window.ipc.invoke === 'function') {
          const r = await window.ipc.invoke('bj-pick-image');
          if (!r) return;
          if (r.error) { status(r.error); return; }
          useDataUrl(r.data); return;
        }
      } catch (e) {}
      box.querySelector('#bj-ms-file').click();
    });
    box.querySelector('#bj-ms-file').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      const rd = new FileReader(); rd.onload = () => useDataUrl(rd.result); rd.readAsDataURL(f);
    });
    sync();
    return box;
  }

  function sync() {
    if (!box) return;
    box.querySelectorAll('.tg input').forEach((el) => { el.checked = !!st[el.dataset.k]; });
    box.querySelector('#bj-ms-c').classList.toggle('off', !st.on);
    box.querySelectorAll('input[type=range]').forEach((el) => {
      el.value = st[el.dataset.k];
      const v = box.querySelector('[data-v="' + el.dataset.k + '"]');
      if (v) v.textContent = el.dataset.k === 'bw' ? String(st.bw) : st[el.dataset.k] + '%';
    });
    box.querySelectorAll('input[type=color]').forEach((el) => {
      const v = st[el.dataset.c];
      if (isHex(v)) { el.value = v; el.classList.remove('auto'); } else { el.classList.add('auto'); }
    });
    box.querySelectorAll('.tile').forEach((el) => el.classList.toggle('on', el.dataset.s === st.style));
    box.querySelectorAll('.seg button').forEach((el) => el.classList.toggle('on', el.dataset.z === st.size));
  }

  function open() { build().classList.add('open'); themeVars(); sync(); }
  window.WzMenuStyle = { open, serialize, image, get: () => st, status: (t) => { const el = box && box.querySelector('#bj-ms-status'); if (el) el.textContent = t || ''; } };
})();
