"use strict";

(() => {
  const { isLightColor, darkenColor, hexToCssFilter, normalizeHexColor } = window.LoginScreenUtilities || window;

  const WZ_PART_KEYS = ['title', 'button', 'link', 'box', 'bg', 'exit', 'ui', 'border'];

  // small colour helpers (the game window may run an older Chrome, so no color-mix())
  const wzRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const wzMix = (a, b, t) => { const A = wzRgb(a), B = wzRgb(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * t).toString(16).padStart(2, '0')).join(''); };
  const wzBright = (h) => { const c = wzRgb(h); return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000; };

  // Banana Jam default look (used for new installs and by the Reset button):
  // modern dark: charcoal background, slightly lighter boxes and a soft indigo accent
  // The Default look has two modes (Dark and Light); the colours live in WzPresets.MODES
  const WZ_FALLBACK_LOOK = { main: '#5a67e8', parts: { title: '#f0f1f6', button: null, link: '#d3d6e0', box: '#2b2d33', bg: '#1e1f24', exit: null, ui: null, border: '#17181c' } };
  const wzModeLook = () => {
    try {
      const m = (window.WzMode && window.WzMode.get()) || 'dark';
      const M = window.WzPresets && window.WzPresets.MODES && window.WzPresets.MODES[m];
      if (M) return { main: M.main, parts: Object.assign({}, M.game) };
    } catch (e) {}
    return { main: WZ_FALLBACK_LOOK.main, parts: Object.assign({}, WZ_FALLBACK_LOOK.parts) };
  };
  const WZ_THEME_DEFAULTS = {
    get main() { return wzModeLook().main; },
    name: 'Banana Jam',
    fruit: 'banana.png',
    get parts() { return wzModeLook().parts; }
  };
  // the yellow look Banana Jam started with before the calm default (now the "Banana" preset)
  const WZ_BANANA_PARTS = { title: '#b8790a', button: null, link: '#9a6a10', box: '#fff8dc', bg: '#f7dc5a', exit: null, ui: null, border: '#f7dc5a' };
  // the look Banana Jam used to start with (now the "Melon" preset)
  const WZ_OLD_DEFAULT_PARTS = { title: '#c0661f', button: null, link: '#9a6a2e', box: '#fbf4e2', bg: '#bccb8e', exit: null, ui: null, border: '#bccb8e' };
  window.WZ_THEME_DEFAULTS = WZ_THEME_DEFAULTS;

  // Colours shared with things outside the login screen (exit menu, in-game tray)
  function setDocAccents(ui, exit) {
    const doc = document.documentElement.style;
    if (ui) doc.setProperty('--wz-ui', ui); else doc.removeProperty('--wz-ui');
    if (exit) doc.setProperty('--wz-exit', exit); else doc.removeProperty('--wz-exit');
  }

  window.LoginScreenThemeManager = class {
    constructor(loginScreenInstance) {
      this.loginScreen = loginScreenInstance;
      // Light / Dark: repaint this window's colours whenever the shared switch changes
      if (window.WzMode) window.WzMode.apply((m) => { this._applyModeLook(m).catch((e) => console.error('[mode]', e)); });
    }

    // Switch this window to the Light or Dark version of the Default look.
    // (Colours only: your name, icon and pictures stay.)
    async _applyModeLook(mode) {
      const Ms = window.WzPresets && window.WzPresets.MODES;
      const M = Ms && Ms[mode];
      if (!M) return;
      const sr = this.loginScreen.shadowRoot;
      const toggle = sr.getElementById('custom-theme-enabled-toggle');
      const picker = sr.getElementById('custom-theme-color-picker');
      const text = sr.getElementById('custom-theme-color-input');
      const nameInput = sr.getElementById('custom-theme-name-input');
      const fruitSelect = sr.getElementById('custom-theme-fruit-select');
      const same = (K) => {
        const cur = this.loadThemeParts();
        const main = ((picker && picker.value) || '').toLowerCase();
        return main === K.main && WZ_PART_KEYS.every(k => (cur[k] || null) === (K.game[k] || null));
      };
      // your own colours are saved as a preset first, so switching is never a loss
      try {
        if (toggle && toggle.checked && !same(Ms.dark) && !same(Ms.light)) {
          const keep = this._currentAsPreset('My colours (auto-saved)');
          if (keep) {
            const list = this._loadPresets().filter(x => x.name !== keep.name);
            list.push(keep);
            this._savePresets(list);
          }
        }
      } catch (e) {}
      try { this.loginScreen.uiManager.toggleDarkMode(mode === 'dark'); } catch (e) { this.loginScreen.classList.toggle('dark-mode', mode === 'dark'); }
      if (picker) picker.value = M.main;
      if (text) text.value = M.main;
      this.saveThemeParts(Object.assign({}, M.game));
      const name = (nameInput && nameInput.value) || WZ_THEME_DEFAULTS.name;
      const fruit = (fruitSelect && fruitSelect.value) || WZ_THEME_DEFAULTS.fruit;
      if (window.ipc) {
        await window.ipc.invoke('set-setting', 'ui.customThemeColor', M.main).catch(() => {});
        await window.ipc.invoke('set-setting', 'darkMode', mode === 'dark').catch(() => {});
      }
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      } else {
        await this.applyCustomColorTheme(M.main, name, fruit);
      }
      // the settings switch, the dark-mode look of the panels and the Mod Menu follow
      const dm = sr.getElementById('dark-mode-toggle');
      if (dm) dm.checked = mode === 'dark';
      if (this._refreshPartRows) this._refreshPartRows();
      try { window.dispatchEvent(new Event('wz-style-change')); } catch (e) {}
    }

    async applyCustomColorTheme(customColor, customName, customFruit, partsOverride, isDefaultLook) {
      if (!customColor) return false;
      
      const normalizedColor = normalizeHexColor(customColor);
      if (!normalizedColor) return false;
      
      if (!customName && window.ipc) {
        customName = await window.ipc.invoke('get-setting', 'ui.customThemeName').catch(() => 'Custom Jam');
      }
      customName = customName || 'Custom Jam';
      
      if (!customFruit && window.ipc) {
        customFruit = await window.ipc.invoke('get-setting', 'ui.customThemeFruit').catch(() => 'strawberry.png');
      }
      customFruit = customFruit || 'banana.png';
      
      // Banana Jam: a fruit, "None", or one of your own icons
      const iconSrc = window.WzIcons ? window.WzIcons.src(customFruit) : `images/${customFruit}`;
      const loginAppIconElem = this.loginScreen.loginAppIconElem;
      if (loginAppIconElem) {
        if (iconSrc) loginAppIconElem.src = iconSrc;
        loginAppIconElem.style.display = iconSrc ? 'block' : 'none';
        loginAppIconElem.style.filter = 'none'; // Banana Jam: the fruit logo keeps its own colours
      }
      // Banana Jam: the title bar shows the same name and icon
      try {
        window.dispatchEvent(new CustomEvent('wz-theme-identity', { detail: { name: customName, icon: iconSrc } }));
      } catch (e) {}
      
      const root = this.loginScreen.shadowRoot.host;
      const primaryIsLight = isLightColor(normalizedColor);
      
      const r = parseInt(normalizedColor.slice(1, 3), 16);
      const g = parseInt(normalizedColor.slice(3, 5), 16);
      const b = parseInt(normalizedColor.slice(5, 7), 16);
      
      root.style.setProperty('--theme-primary', normalizedColor);
      root.style.setProperty('--theme-secondary', `rgba(${r}, ${g}, ${b}, 0.3)`);
      root.style.setProperty('--theme-highlight', `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, 0.3)`);
      root.style.setProperty('--theme-shadow', `rgba(${r}, ${g}, ${b}, 0.1)`);
      root.style.setProperty('--theme-gradient-start', `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, 0.3)`);
      root.style.setProperty('--theme-gradient-end', `rgba(255, 245, 230, 0.6)`);
      root.style.setProperty('--theme-hover-border', `rgba(${r}, ${g}, ${b}, 0.5)`);
      root.style.setProperty('--theme-radial-1', `rgba(${r}, ${g}, ${b}, 0.05)`);
      root.style.setProperty('--theme-radial-2', `rgba(${r}, ${g}, ${b}, 0.07)`);
      root.style.setProperty('--theme-settings-hover', `rgba(${r}, ${g}, ${b}, 0.05)`);
      root.style.setProperty('--theme-settings-border', `rgba(${r}, ${g}, ${b}, 0.2)`);
      
      if (this.loginScreen.playerLoginTextElem) {
        this.loginScreen.playerLoginTextElem.innerText = (!customName || ['Custom Jam', 'wizJAM', 'Banana JAM'].includes(customName)) ? 'Banana Jam' : customName;
      }
      
      if (primaryIsLight) {
        root.style.setProperty('--theme-box-background', 'rgba(225, 210, 180, 0.97)');
        root.style.setProperty('--theme-text-shadow', '0 1px 1px rgba(0, 0, 0, 0.5)');
        root.style.setProperty('--theme-border-enhancement', '1px solid rgba(0, 0, 0, 0.2)');
        const playerLoginText = this.loginScreen.shadowRoot.getElementById('player-login-text');
        if (playerLoginText) {
          playerLoginText.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.5)';
          playerLoginText.style.webkitTextStroke = '0.5px rgba(0, 0, 0, 0.5)';
        }
      } else {
        root.style.setProperty('--theme-box-background', 'rgba(255, 245, 230, 0.95)');
        root.style.setProperty('--theme-text-shadow', 'none');
        root.style.setProperty('--theme-border-enhancement', 'none');
        const playerLoginText = this.loginScreen.shadowRoot.getElementById('player-login-text');
        if (playerLoginText) {
          playerLoginText.style.textShadow = `1px 2px 0px rgba(${r}, ${g}, ${b}, 0.1)`;
        }
      }
      
      const buttonBg = primaryIsLight ? darkenColor(normalizedColor, 20) : normalizedColor;
      root.style.setProperty('--theme-button-bg', buttonBg);
      root.style.setProperty('--theme-button-border', primaryIsLight ? 'rgba(0, 0, 0, 0.3)' : `rgba(${r}, ${g}, ${b}, 0.3)`);
      root.style.setProperty('--theme-button-text', primaryIsLight ? '#333333' : '#FFFFFF');
      
      const loginBtn = this.loginScreen.shadowRoot.getElementById('log-in-btn');
      const createAccountBtn = this.loginScreen.shadowRoot.getElementById('create-account-btn');
      
      if (loginBtn) {
        loginBtn.style.setProperty('--ajd-bubble-button-background-color', buttonBg);
        loginBtn.style.setProperty('--ajd-bubble-button-border-color', primaryIsLight ? 'rgba(0, 0, 0, 0.3)' : `rgba(${r}, ${g}, ${b}, 0.3)`);
        loginBtn.style.setProperty('--ajd-bubble-button-text-color', primaryIsLight ? '#333333' : '#FFFFFF');
        loginBtn.style.setProperty('--ajd-bubble-button-background-color-hover', primaryIsLight ? darkenColor(buttonBg, 10) : darkenColor(buttonBg, -15));
        loginBtn.style.setProperty('--ajd-bubble-button-background-color-active', buttonBg);
      }
      
      if (createAccountBtn) {
        createAccountBtn.style.setProperty('--ajd-bubble-button-background-color', buttonBg);
        createAccountBtn.style.setProperty('--ajd-bubble-button-border-color', primaryIsLight ? 'rgba(0, 0, 0, 0.3)' : `rgba(${r}, ${g}, ${b}, 0.3)`);
        createAccountBtn.style.setProperty('--ajd-bubble-button-text-color', primaryIsLight ? '#333333' : '#FFFFFF');
        createAccountBtn.style.setProperty('--ajd-bubble-button-background-color-hover', primaryIsLight ? darkenColor(buttonBg, 10) : darkenColor(buttonBg, -15));
        createAccountBtn.style.setProperty('--ajd-bubble-button-background-color-active', buttonBg);
      }
      
      this._customOn = !isDefaultLook;
      this.applyThemeParts(partsOverride || this.loadThemeParts(), normalizedColor);
      if (this._sharePing) this._sharePing();
      return true;
    }

    // ---- Banana Jam: separate colours for each part of the login screen ----
    loadThemeParts() {
      try {
        const stored = localStorage.getItem('wzThemeParts');
        const raw = stored ? JSON.parse(stored) : Object.assign({}, WZ_THEME_DEFAULTS.parts);
        // One-time update: older saves had no Game Border colour, give them the green default
        if (stored && !localStorage.getItem('wzPartsV2')) {
          if (!raw.border) raw.border = WZ_THEME_DEFAULTS.parts.border;
          localStorage.setItem('wzThemeParts', JSON.stringify(raw));
          localStorage.setItem('wzPartsV2', '1');
        }
        // One-time update: still on the old green default? Move to the safari default.
        if (stored && !localStorage.getItem('wzSafariV1')) {
          const low = (v) => (typeof v === 'string' ? v.toLowerCase() : v || null);
          const old = { title: '#9ad256', button: null, link: null, box: '#faf4de', bg: '#9ad256', exit: null, ui: null, border: '#9ad256' };
          if (WZ_PART_KEYS.every(k => low(raw[k]) === old[k])) {
            Object.assign(raw, WZ_THEME_DEFAULTS.parts);
            localStorage.setItem('wzThemeParts', JSON.stringify(raw));
          }
          localStorage.setItem('wzSafariV1', '1');
        }
        // One-time update: still on the old melon-green start look? Move to the new banana-yellow default.
        if (stored && !localStorage.getItem('wzBananaV1')) {
          const low2 = (v) => (typeof v === 'string' ? v.toLowerCase() : v || null);
          if (WZ_PART_KEYS.every(k => low2(raw[k]) === WZ_OLD_DEFAULT_PARTS[k])) {
            Object.assign(raw, WZ_THEME_DEFAULTS.parts);
            localStorage.setItem('wzThemeParts', JSON.stringify(raw));
          }
          localStorage.setItem('wzBananaV1', '1');
        }
        // One-time update: still on the untouched banana-yellow start look? Move to the modern dark default.
        if (stored && !localStorage.getItem('wzNeutralV1')) {
          const low3 = (v) => (typeof v === 'string' ? v.toLowerCase() : v || null);
          if (WZ_PART_KEYS.every(k => low3(raw[k]) === WZ_BANANA_PARTS[k])) {
            Object.assign(raw, WZ_THEME_DEFAULTS.parts);
            localStorage.setItem('wzThemeParts', JSON.stringify(raw));
          }
          localStorage.setItem('wzNeutralV1', '1');
        }
        // One-time: the old blue-tinted heading and link colours become the neutral light ones (no blue text on dark).
        if (stored && !localStorage.getItem('wzNeutralV2')) {
          ['title', 'link'].forEach((k) => {
            if (typeof raw[k] === 'string' && raw[k].toLowerCase() === '#9aa5ff') raw[k] = WZ_THEME_DEFAULTS.parts[k];
          });
          localStorage.setItem('wzThemeParts', JSON.stringify(raw));
          localStorage.setItem('wzNeutralV2', '1');
        }
        const out = {};
        for (const k of WZ_PART_KEYS) {
          out[k] = (typeof raw[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw[k])) ? raw[k] : null;
        }
        return out;
      } catch (e) {
        return Object.fromEntries(WZ_PART_KEYS.map(k => [k, null]));
      }
    }

    saveThemeParts(parts) {
      try { localStorage.setItem('wzThemeParts', JSON.stringify(parts)); } catch (e) {}
    }

    clearThemePartVars() {
      const root = this.loginScreen.shadowRoot.host;
      root.classList.remove('wz-has-login-image');
      ['--wz-title', '--wz-link', '--wz-bg', '--wz-bg-ink', '--wz-card', '--wz-card-rgb', '--wz-field', '--wz-field-border', '--wz-text', '--wz-muted'].forEach(v => root.style.removeProperty(v));
      root.classList.remove('wz-card-light', 'wz-card-dark', 'wz-bg-light');
    }

    applyThemeParts(parts, mainColor) {
      const root = this.loginScreen.shadowRoot.host;
      setDocAccents(parts.ui || mainColor, parts.exit || mainColor);
      if (window.GameBorder && mainColor) {
        const cur = window.GameBorder.load();
        const want = parts.border || mainColor;
        if (!cur.enabled || cur.all !== want) window.GameBorder.update({ enabled: true, all: want });
      }
      const setVar = (name, val) => val ? root.style.setProperty(name, val) : root.style.removeProperty(name);
      setVar('--wz-title', parts.title);
      setVar('--wz-link', parts.link);
      setVar('--wz-bg', parts.bg);
      // on a very light background the small text underneath the box turns dark, so it can be read
      const lightBg = !!parts.bg && wzBright(parts.bg) > 196;
      root.classList.toggle('wz-bg-light', lightBg);
      setVar('--wz-bg-ink', lightBg ? wzMix(parts.bg, '#000000', 0.72) : null);
      this.applyLoginPic();
      if (parts.box) {
        root.style.setProperty('--theme-box-background', parts.box);
        root.style.setProperty('--theme-box-background-dark', parts.box);
        root.style.setProperty('--wz-card', parts.box);
        root.style.setProperty('--wz-card-rgb', wzRgb(parts.box).join(', '));
        // fields and text follow how light or dark the chosen box colour is
        const lightCard = isLightColor(parts.box);
        root.style.setProperty('--wz-field', lightCard ? wzMix(parts.box, '#ffffff', 0.55) : 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--wz-field-border', lightCard ? 'rgba(110, 75, 55, 0.18)' : 'rgba(255, 255, 255, 0.14)');
        root.style.setProperty('--wz-text', lightCard ? '#4a3526' : '#e8e8e8');
        root.style.setProperty('--wz-muted', lightCard ? 'rgba(74, 53, 38, 0.65)' : 'rgba(232, 232, 232, 0.6)');
        root.classList.toggle('wz-card-light', lightCard);
        root.classList.toggle('wz-card-dark', !lightCard);
      } else {
        ['--wz-card', '--wz-field', '--wz-field-border', '--wz-text', '--wz-muted'].forEach(v => root.style.removeProperty(v));
        root.classList.remove('wz-card-light', 'wz-card-dark');
      }
      if (parts.button) {
        const light = isLightColor(parts.button);
        const btn = this.loginScreen.shadowRoot.getElementById('log-in-btn');
        if (btn) {
          btn.style.setProperty('--ajd-bubble-button-background-color', parts.button);
          btn.style.setProperty('--ajd-bubble-button-border-color', 'rgba(0, 0, 0, 0.2)');
          btn.style.setProperty('--ajd-bubble-button-text-color', light ? '#333333' : '#FFFFFF');
          btn.style.setProperty('--ajd-bubble-button-background-color-hover', darkenColor(parts.button, light ? 10 : -15));
          btn.style.setProperty('--ajd-bubble-button-background-color-active', parts.button);
        }
      }
    }

    setupThemePartsControls() {
      const sr = this.loginScreen.shadowRoot;
      const rows = sr.querySelectorAll('.wz-part-row');
      const mainPicker = sr.getElementById('custom-theme-color-picker');
      const nameInput = sr.getElementById('custom-theme-name-input');
      const fruitSelect = sr.getElementById('custom-theme-fruit-select');
      const enabledToggle = sr.getElementById('custom-theme-enabled-toggle');
      const resetBtn = sr.getElementById('reset-custom-theme-color-btn');
      const mainColor = () => (mainPicker && mainPicker.value) || '#e83d52';

      const refreshRows = () => {
        const parts = this.loadThemeParts();
        rows.forEach(row => {
          const key = row.dataset.part;
          const color = row.querySelector('.wz-part-color');
          row.classList.toggle('is-auto', !parts[key]);
          if (color) color.value = parts[key] || mainColor();
        });
      };

      const reapply = () => {
        if (!enabledToggle || !enabledToggle.checked) return;
        this.applyCustomColorTheme(mainColor(), nameInput && nameInput.value, fruitSelect && fruitSelect.value);
      };

      rows.forEach(row => {
        const key = row.dataset.part;
        const color = row.querySelector('.wz-part-color');
        const lock = row.querySelector('.wz-part-lock');
        if (color) color.addEventListener('input', () => {
          const parts = this.loadThemeParts();
          parts[key] = color.value;
          this.saveThemeParts(parts);
          row.classList.remove('is-auto');
          reapply();
        });
        if (lock) lock.addEventListener('click', () => {
          const parts = this.loadThemeParts();
          parts[key] = parts[key] ? null : (color ? color.value : mainColor());
          this.saveThemeParts(parts);
          refreshRows();
          reapply();
        });
      });

      if (mainPicker) mainPicker.addEventListener('input', refreshRows);
      if (resetBtn) resetBtn.addEventListener('click', () => {
        this.saveThemeParts(Object.assign({}, WZ_THEME_DEFAULTS.parts));
        refreshRows();
      });
      refreshRows();
      setTimeout(refreshRows, 1500); // after saved settings load in
      this._refreshPartRows = refreshRows;
    }

    // ---- Banana Jam: pictures (login background + game border) ----
    _shrinkImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('That file is not a picture I can use.'));
          img.onload = () => {
            const MAX = 1600;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            // keep see-through parts for PNG/WebP/GIF unless the file gets too big
            let out = file.type === 'image/jpeg' ? canvas.toDataURL('image/jpeg', 0.85) : canvas.toDataURL('image/png');
            if (out.length > 3000000) out = canvas.toDataURL('image/jpeg', 0.85);
            resolve(out);
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    _cleanPic(o) {
      o = o && typeof o === 'object' ? o : {};
      const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v)) ? Math.max(lo, Math.min(hi, Math.round(v))) : d;
      const image = (typeof o.image === 'string' && o.image.length < 8000000 &&
        /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(o.image)) ? o.image : null;
      return {
        image,
        blur: typeof o.blur === 'number' ? num(o.blur, 0, 40, 0) : (o.blur === true ? 16 : 0),
        zoom: num(o.zoom, 100, 300, 100),
        x: num(o.x, 0, 100, 50),
        y: num(o.y, 0, 100, 50),
        mirror: o.mirror === true,
        flip: o.flip === true
      };
    }

    loadLoginPic() {
      try { return this._cleanPic(JSON.parse(localStorage.getItem('wzLoginBg') || '{}')); }
      catch (e) { return this._cleanPic({}); }
    }

    saveLoginPic(changes) {
      const next = this._cleanPic(Object.assign(this.loadLoginPic(), changes));
      try { localStorage.setItem('wzLoginBg', JSON.stringify(next)); } catch (e) { return false; }
      this.applyLoginPic();
      return true;
    }

    applyLoginPic() {
      const host = this.loginScreen.shadowRoot.host;
      // While the login screen is still being built by the page it must not be
      // given classes or styles yet (the page refuses to draw it). Do it a moment later.
      if (!host.isConnected) { setTimeout(() => this.applyLoginPic(), 0); return; }
      const sr = this.loginScreen.shadowRoot;
      const pic = this.loadLoginPic();
      const on = !!pic.image && this._customOn === true;
      host.classList.toggle('wz-has-login-image', on);
      const st = host.style;
      if (!on) { st.removeProperty('--wz-login-image'); return; }
      st.setProperty('--wz-login-image', `url("${pic.image}")`);
      st.setProperty('--wz-login-blur', `${pic.blur}px`);
      st.setProperty('--wz-login-scale', String((pic.zoom / 100) * (pic.blur > 0 ? 1.08 : 1)));
      st.setProperty('--wz-login-x', `${pic.x}%`);
      st.setProperty('--wz-login-y', `${pic.y}%`);
      st.setProperty('--wz-login-sx', pic.mirror ? '-1' : '1');
      st.setProperty('--wz-login-sy', pic.flip ? '-1' : '1');
    }

    _picStores() {
      return {
        'wz-login': {
          load: () => this.loadLoginPic(),
          save: (c) => this.saveLoginPic(c),
          done: 'Picture set. It shows behind the login screen.'
        },
        'wz-border': {
          load: () => this._cleanPic(window.GameBorder ? window.GameBorder.load() : {}),
          save: (c) => {
            if (!window.GameBorder) return false;
            window.GameBorder.update(c);
            return !c.image || !!window.GameBorder.load().image;
          },
          done: 'Picture set. It shows around the game.'
        }
      };
    }

    _refreshPictureUI(prefix) {
      const sr = this.loginScreen.shadowRoot;
      const store = this._picStores()[prefix];
      if (!store) return;
      const pic = store.load();
      const $ = (id) => sr.getElementById(`${prefix}-${id}`);
      const preview = $('img-preview'), remove = $('img-remove'), adjust = $('adjust');
      if (preview) { preview.style.display = pic.image ? 'block' : 'none'; if (pic.image) preview.src = pic.image; }
      if (remove) remove.style.display = pic.image ? '' : 'none';
      if (adjust) adjust.style.display = pic.image ? '' : 'none';
      const setRange = (id, val, label) => {
        const r = $(id), v = $(`${id}-value`);
        if (r) r.value = String(val);
        if (v) v.textContent = label;
      };
      setRange('blur', pic.blur, pic.blur > 0 ? `${pic.blur}` : 'Off');
      setRange('zoom', pic.zoom, `${pic.zoom}%`);
      setRange('x', pic.x, `${pic.x}%`);
      setRange('y', pic.y, `${pic.y}%`);
      const m = $('mirror'), f = $('flip');
      if (m) m.classList.toggle('on', pic.mirror);
      if (f) f.classList.toggle('on', pic.flip);
    }

    setupPictureControls(prefix) {
      const sr = this.loginScreen.shadowRoot;
      const store = this._picStores()[prefix];
      const $ = (id) => sr.getElementById(`${prefix}-${id}`);
      const upload = $('img-upload'), remove = $('img-remove'), file = $('img-file'), status = $('img-status');
      if (!store || !upload || !file) return;
      const say = (t) => { if (status) status.textContent = t || ''; };
      const refresh = () => this._refreshPictureUI(prefix);

      upload.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        try {
          say('Loading picture…');
          const data = await this._shrinkImage(f);
          if (!store.save({ image: data, zoom: 100, x: 50, y: 50, mirror: false, flip: false })) {
            throw new Error('That picture is too big to save. Try a smaller one.');
          }
          say(store.done);
        } catch (e) {
          say(e.message || 'Something went wrong with that picture.');
        }
        refresh();
      });
      if (remove) remove.addEventListener('click', () => { store.save({ image: null }); say('Picture removed.'); refresh(); });

      // sliders update live while dragging
      [['blur', 'blur'], ['zoom', 'zoom'], ['x', 'x'], ['y', 'y']].forEach(([id, key]) => {
        const r = $(id);
        if (!r) return;
        let frame = 0;
        r.addEventListener('input', () => {
          const label = $(`${id}-value`);
          const val = Number(r.value);
          if (label) label.textContent = id === 'blur' ? (val > 0 ? `${val}` : 'Off') : `${val}%`;
          if (frame) return;
          frame = requestAnimationFrame(() => { frame = 0; store.save({ [key]: Number(r.value) }); });
        });
      });
      const mirror = $('mirror'), flip = $('flip'), reset = $('reset');
      if (mirror) mirror.addEventListener('click', () => { store.save({ mirror: !store.load().mirror }); refresh(); });
      if (flip) flip.addEventListener('click', () => { store.save({ flip: !store.load().flip }); refresh(); });
      if (reset) reset.addEventListener('click', () => { store.save({ zoom: 100, x: 50, y: 50, mirror: false, flip: false }); refresh(); });
      refresh();
    }

    // ---- Banana Jam: fold-away sections in the settings panel ----
    setupCollapsibleSections() {
      const sr = this.loginScreen.shadowRoot;
      const panel = sr.getElementById('settings-panel');
      if (!panel || panel.__wzSections) return;
      panel.__wzSections = true;
      const KEY = 'wzOpenSections';
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
      const DEFAULT_OPEN = ['presets', 'style', 'theme', 'login', 'enhancements', 'interface', 'general:'];
      const keyOf = (t) => t.trim().toLowerCase();

      // Each section opens as a pop-up on top of Settings (no long scrolling)
      let cur = null;
      const closePop = () => {
        if (!cur) return;
        const { box, body, header, dim, prevOverflow } = cur;
        body.style.display = 'none';
        box.appendChild(body);
        header.classList.remove('open');
        dim.remove();
        panel.style.overflow = prevOverflow;
        cur = null;
      };
      const openPop = (box, body, header, title) => {
        const same = cur && cur.box === box;
        closePop();
        if (same) return;
        const cont = body.closest('[id^="custom-theme-color-container"]');
        const off = !!cont && getComputedStyle(cont).pointerEvents === 'none';
        const dim = document.createElement('div');
        dim.className = 'wz-pop-dim';
        dim.innerHTML = '<div class="wz-pop-card" role="dialog" aria-modal="true"><div class="wz-pop-head"><span class="wz-pop-title"></span><button type="button" class="wz-pop-x" aria-label="Close">\u2715</button></div><div class="wz-pop-body"></div><div class="wz-pop-foot"><button type="button" class="wz-btn wz-pop-done">Done</button></div></div>';
        dim.querySelector('.wz-pop-title').textContent = title;
        const pb = dim.querySelector('.wz-pop-body');
        if (off) { pb.style.opacity = '0.5'; pb.style.pointerEvents = 'none'; }
        body.style.display = '';
        pb.appendChild(body);
        dim.addEventListener('mousedown', (e) => { if (e.target === dim) closePop(); });
        dim.querySelector('.wz-pop-x').addEventListener('click', closePop);
        dim.querySelector('.wz-pop-done').addEventListener('click', closePop);
        const prevOverflow = panel.style.overflow;
        panel.scrollTop = 0;
        panel.style.overflow = 'hidden';
        panel.appendChild(dim);
        header.classList.add('open');
        cur = { box, body, header, dim, prevOverflow };
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && cur && cur.dim.isConnected) { e.stopPropagation(); e.preventDefault(); closePop(); }
      }, true);

      const makeFoldable = (header, bodyNodes, opts) => {
        if (!bodyNodes.length) return;
        if (opts && opts.title) header.textContent = opts.title;
        const name = keyOf(header.textContent);
        const titleText = (opts && opts.title) || (header.querySelector('.wz-fold-ttl') && header.querySelector('.wz-fold-ttl').firstChild ? header.querySelector('.wz-fold-ttl').firstChild.textContent : header.textContent).trim();
        const body = document.createElement('div');
        body.className = 'wz-fold-body';
        if (bodyNodes[0].parentNode === header.parentNode) header.parentNode.insertBefore(body, bodyNodes[0]);
        else header.parentNode.insertBefore(body, header.nextSibling);
        bodyNodes.forEach((n) => body.appendChild(n));
        // each section sits in its own darker box
        const box = document.createElement('div');
        box.className = 'wz-section';
        header.parentNode.insertBefore(box, header);
        box.appendChild(header);
        box.appendChild(body);
        header.classList.add('wz-fold-head');
        const DESC = {
          presets: 'Quickest way to change the look. Pick a ready-made one.',
          style: 'The shape of the windows and their buttons.',
          fonts: 'The text style. Pick one that comes with the app, one from your PC, or upload your own.',
          theme: 'Name, icon, main colour, and each part\'s colour.',
          login: 'The login screen picture and box.',
          'in-game': 'The game window border and picture.',
          other: 'Colour wheel and other extras.',
          reset: 'Put things back to how they started.'
        };
        const descText = (opts && opts.desc) || DESC[name];
        if (descText && !header.querySelector('.wz-fold-ttl')) {
          const ttl = document.createElement('span');
          ttl.className = 'wz-fold-ttl';
          ttl.appendChild(document.createTextNode(header.textContent));
          const sm = document.createElement('small');
          sm.textContent = descText;
          ttl.appendChild(sm);
          header.textContent = '';
          header.appendChild(ttl);
        }
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        const chevron = document.createElement('span');
        chevron.className = 'wz-fold-chevron';
        chevron.textContent = '\u203a';
        header.appendChild(chevron);
        body.style.display = 'none';
        const toggle = () => openPop(box, body, header, titleText);
        header.addEventListener('click', toggle);
        header.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      };

      // Theme tab: the eight headings are merged into four sections, each made of little cards
      const isCust = (n) => n && typeof n.id === 'string' && n.id.indexOf('custom-theme-color-container') === 0;
      const headByText = (t) => Array.from(panel.querySelectorAll('.wz-subhead')).find((h) => h.textContent.trim().toLowerCase() === t.toLowerCase());
      const GROUPS = [
        { title: 'Colours & presets', desc: 'Ready-made looks, your name and icon, all the colours and both pictures.', heads: ['Presets', 'Theme', 'Login', 'In-Game'] },
        { title: 'Look & fonts', desc: 'The shape of the windows and buttons, and the text style.', heads: ['Style', 'Fonts'] },
        { title: 'Extras', desc: 'Colour picker, exit menu colour and reset.', heads: ['Other', 'Reset'] }
      ];
      const CARD_TITLES = { 'theme': 'Name, icon & main colour', 'login': 'Login screen: colours & picture', 'in-game': 'Game window: colours & border picture', 'other': 'Exit menu & colour wheel', 'style': 'Look' };
      GROUPS.forEach((g) => {
        const hs = g.heads.map(headByText);
        if (hs.some((h) => !h)) return;
        const cards = hs.map((h, k) => {
          const card = document.createElement('div');
          card.className = 'wz-subcard';
          const box = h.parentNode;
          if (isCust(box) && box.firstElementChild === h && !hs.some((o, j) => j !== k && o.parentNode === box)) {
            // this heading owns a whole box (the Theme box): the box itself becomes the card
            h.classList.remove('wz-subhead'); h.classList.add('wz-subtitle');
            h.textContent = CARD_TITLES[h.textContent.trim().toLowerCase()] || h.textContent.trim();
            card.appendChild(box);
            return card;
          }
          const label = document.createElement('div');
          label.className = 'wz-subtitle';
          label.textContent = CARD_TITLES[h.textContent.trim().toLowerCase()] || h.textContent.trim();
          const nodes = [];
          let n = h.nextElementSibling;
          while (n && !n.classList.contains('wz-subhead') && !isCust(n)) { nodes.push(n); n = n.nextElementSibling; }
          card.appendChild(label);
          nodes.forEach((x) => card.appendChild(x));
          if (isCust(box)) {
            // several cards share one dimmed box (login + in-game): keep them together inside it
            box.appendChild(card);
            return box.__wzTaken ? null : (box.__wzTaken = true, box);
          }
          return card;
        }).filter(Boolean);
        // the first heading becomes the section header; the others are only labels inside the cards
        makeFoldable(hs[0], cards, { title: g.title, desc: g.desc });
        hs.slice(1).forEach((h) => { if (h.isConnected && !h.closest('.wz-subcard')) h.remove(); });
      });

      // headings that were merged into a card are now just labels; drop any left-over copies
      Array.from(panel.querySelectorAll('.wz-subhead:not(.wz-fold-head)')).forEach((h) => {
        h.remove();
      });

      // Theme tab style headings: everything after a heading up to the next heading
      const heads = Array.from(panel.querySelectorAll('.wz-subhead')).filter((h) => !h.classList.contains('wz-fold-head'));
      heads.forEach((h) => {
        const nodes = [];
        let n = h.nextElementSibling;
        while (n && !n.classList.contains('wz-subhead') && !isCust(n)) { nodes.push(n); n = n.nextElementSibling; }
        makeFoldable(h, nodes);
      });
      // General / Shortcuts tabs: each subsection's heading folds its own items
      panel.querySelectorAll('.settings-subsection > h5').forEach((h) => {
        const nodes = [];
        let n = h.nextElementSibling;
        while (n) { nodes.push(n); n = n.nextElementSibling; }
        makeFoldable(h, nodes);
      });
    }

    setupPickerPrefsControls() {
      const sr = this.loginScreen.shadowRoot;
      const P = window.WzColorPicker;
      if (!P) return;
      const opacity = sr.getElementById('wz-picker-opacity');
      const opacityValue = sr.getElementById('wz-picker-opacity-value');
      const style = sr.getElementById('wz-picker-style');
      const size = sr.getElementById('wz-picker-size');
      const recenter = sr.getElementById('wz-picker-recenter');
      const prefs = P.loadPrefs();
      if (opacity) {
        opacity.value = String(prefs.opacity);
        if (opacityValue) opacityValue.textContent = prefs.opacity >= 100 ? 'Solid' : `${prefs.opacity}%`;
        opacity.addEventListener('input', () => {
          const v = Number(opacity.value);
          if (opacityValue) opacityValue.textContent = v >= 100 ? 'Solid' : `${v}%`;
          P.savePrefs({ opacity: v });
          const open = sr.querySelector('.wzcp');
          if (open) open.style.setProperty('--wzcp-alpha', String(v / 100));
          if (open) open.style.setProperty('--wzcp-alpha-pct', `${v}%`);
        });
      }
      const styleRow = sr.getElementById('wz-picker-style-row');
      const styleLock = sr.getElementById('wz-picker-style-lock');
      const applyStyleUI = () => {
        const p = P.loadPrefs();
        const used = P.styleFor(sr, p);
        if (style) style.value = used;
        if (styleRow) styleRow.classList.toggle('is-auto', !p.styleLocked);
        const open = sr.querySelector('.wzcp');
        if (open) open.classList.toggle('light', used === 'light');
      };
      if (style) {
        style.addEventListener('change', () => {
          P.savePrefs({ style: style.value, styleLocked: true });
          applyStyleUI();
        });
      }
      if (styleLock) {
        styleLock.addEventListener('click', () => {
          const p = P.loadPrefs();
          P.savePrefs(p.styleLocked ? { styleLocked: false } : { styleLocked: true, style: P.styleFor(sr, p) });
          applyStyleUI();
        });
      }
      // follow Dark Mode changes while unlocked
      new MutationObserver(applyStyleUI).observe(sr.host, { attributes: true, attributeFilter: ['class'] });
      applyStyleUI();
      if (size) {
        size.value = prefs.size;
        size.addEventListener('change', () => P.savePrefs({ size: size.value }));
      }
      if (recenter) recenter.addEventListener('click', () => {
        P.savePrefs({ x: null, y: null, gx: null, gy: null });
        if (window.ipc && window.ipc.send) window.ipc.send('wz-picker-reset-position');
      });
    }

    // ---- Banana Jam: a small reset button beside each colour and setting ----
    setupResetButtons() {
      const sr = this.loginScreen.shadowRoot;
      if (!sr || sr.__wzRst) return;
      sr.__wzRst = true;
      const $ = (id) => sr.getElementById(id);
      const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>';
      const list = [];
      const refresh = () => list.forEach((r) => {
        let d = false;
        try { d = !!r.isDef(); } catch (e) {}
        r.b.classList.toggle('is-default', d);
        r.b.disabled = d;
      });
      const soon = () => setTimeout(refresh, 80);
      const add = (el, label, isDef, run) => {
        if (!el || !el.parentNode) return;
        let row = el.parentNode;
        // a control that sits alone gets a small row of its own
        if (!(row.classList.contains('wz-row') || row.classList.contains('wz-part-row') || /display:\s*flex/.test(row.getAttribute('style') || ''))) {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'display: flex; align-items: center; gap: 6px;';
          row.insertBefore(wrap, el);
          wrap.appendChild(el);
          el.style.flex = '1'; el.style.width = 'auto'; el.style.minWidth = '0';
          row = wrap;
        }
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'wz-btn wz-rst';
        b.title = `Put ${label} back to how it started`;
        b.setAttribute('aria-label', `Reset ${label}`);
        b.innerHTML = SVG;
        b.addEventListener('click', () => { run(); soon(); });
        row.appendChild(b);
        list.push({ b, isDef: isDef });
      };
      const fire = (el, type) => { if (el) el.dispatchEvent(new Event(type, { bubbles: true })); };
      const D = WZ_THEME_DEFAULTS;

      // name, icon and main colour
      const name = $('custom-theme-name-input'), fruit = $('custom-theme-fruit-select');
      const mainPk = $('custom-theme-color-picker'), mainTxt = $('custom-theme-color-input');
      add(name, 'the name', () => (name.value.trim() || D.name) === D.name, () => { name.value = D.name; fire(name, 'input'); });
      add(fruit, 'the icon', () => fruit.value === D.fruit, () => { fruit.value = D.fruit; fire(fruit, 'change'); });
      if (mainTxt) add(mainTxt, 'the Main Colour', () => (mainPk.value || '').toLowerCase() === D.main, () => {
        mainPk.value = D.main; mainTxt.value = D.main; fire(mainPk, 'input'); fire(mainPk, 'change');
      });

      // each colour part
      sr.querySelectorAll('.wz-part-row[data-part]').forEach((row) => {
        const key = row.dataset.part;
        const lock = row.querySelector('.wz-part-lock');
        const label = ((row.querySelector('.wz-part-label') || {}).textContent || key).trim().toLowerCase();
        add(lock, label, () => (this.loadThemeParts()[key] || null) === (D.parts[key] || null), () => {
          const parts = this.loadThemeParts();
          parts[key] = D.parts[key] || null;
          this.saveThemeParts(parts);
          if (this._refreshPartRows) this._refreshPartRows();
          const on = $('custom-theme-enabled-toggle');
          if (on && on.checked) this.applyCustomColorTheme((mainPk && mainPk.value) || D.main, name && name.value, fruit && fruit.value);
        });
      });

      // picture sliders (login background and game border)
      const PIC_DEF = { blur: 0, zoom: 100, x: 50, y: 50 };
      ['wz-login', 'wz-border'].forEach((prefix) => {
        const store = this._picStores()[prefix];
        if (!store) return;
        Object.keys(PIC_DEF).forEach((id) => {
          const r = $(`${prefix}-${id}-value`);
          const lab = r && r.parentNode && r.parentNode.querySelector('.wz-part-label');
          add(r, ((lab && lab.textContent) || id).trim().toLowerCase(), () => store.load()[id] === PIC_DEF[id],
            () => { store.save({ [id]: PIC_DEF[id] }); this._refreshPictureUI(prefix); });
        });
      });

      // look and window buttons
      const WS = window.WzStyle;
      if (WS) {
        add($('wz-look-select'), 'the look', () => WS.get().ui === 'mac', () => WS.set({ ui: 'mac' }));
        add($('wz-btns-select'), 'the window buttons', () => WS.get().btns === 'match', () => WS.set({ btns: 'match' }));
        window.addEventListener('wz-style-change', refresh);
      }

      // font
      if (window.WzFonts && $('wz-font-select')) add($('wz-font-select'), 'the font', () => window.WzFonts.load().id === 'look', () => { window.WzFonts.set({ id: 'look' }); if (this._fontPaint) this._fontPaint(); });

      // colour wheel
      const P = window.WzColorPicker;
      if (P) {
        const op = $('wz-picker-opacity'), sz = $('wz-picker-size'), st = $('wz-picker-style'), lk = $('wz-picker-style-lock');
        add($('wz-picker-opacity-value'), 'the see-through amount', () => P.loadPrefs().opacity === 85, () => { op.value = '85'; fire(op, 'input'); });
        add(sz, 'the wheel size', () => P.loadPrefs().size === 'normal', () => { sz.value = 'normal'; fire(sz, 'change'); });
        add(lk, 'the wheel style', () => !P.loadPrefs().styleLocked, () => { if (P.loadPrefs().styleLocked && lk) lk.click(); });
      }

      // anything changing in the panel can change what is "already original"
      ['input', 'change', 'click'].forEach((t) => sr.addEventListener(t, soon, true));
      refresh();
      setTimeout(refresh, 1500);
    }

    // ---- Banana Jam: the Font setting ----
    setupFontControls() {
      const sr = this.loginScreen.shadowRoot;
      const WF = window.WzFonts;
      const sel = sr.getElementById('wz-font-select');
      if (!WF || !sel || sel.__wzFont) return;
      sel.__wzFont = true;
      const prev = sr.getElementById('wz-font-prev'), up = sr.getElementById('wz-font-up'), del = sr.getElementById('wz-font-del');
      const file = sr.getElementById('wz-font-file'), stat = sr.getElementById('wz-font-status'), aj = sr.getElementById('wz-font-aj');
      const note = stat.innerHTML;
      WF.addRoot(this.loginScreen);
      const paint = () => {
        WF.fillSelect(sel);
        prev.style.fontFamily = WF.stackFor(sel.value) || '';
        del.disabled = sel.value.indexOf('my:') !== 0;
        aj.checked = WF.load().aj === true;
        aj.disabled = sel.value === 'look';
        if (this._fontResetRefresh) this._fontResetRefresh();
      };
      sel.addEventListener('change', () => { WF.set({ id: sel.value }); paint(); stat.innerHTML = note; });
      aj.addEventListener('change', () => WF.set({ aj: aj.checked }));
      up.addEventListener('click', () => file.click());
      file.addEventListener('change', () => {
        const f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        WF.addFile(f).then((r) => { WF.set({ id: 'my:' + r.uid }); paint(); stat.textContent = 'Added "' + r.name + '" and switched to it.'; })
          .catch((e) => { stat.textContent = e.message; });
      });
      del.addEventListener('click', () => {
        if (sel.value.indexOf('my:') !== 0) return;
        WF.removeMine(sel.value.slice(3)); paint(); stat.textContent = 'Font deleted.';
      });
      this._fontPaint = paint;
      paint();
    }

    // ---- Banana Jam: the lock that keeps the game and the launcher on the same colours ----
    setupShareControls() {
      const sr = this.loginScreen.shadowRoot;
      const Sh = window.WzShare, Pz = window.WzPresets;
      const btn = sr.getElementById('wz-share-btn'), note = sr.getElementById('wz-share-note'), row = sr.getElementById('wz-share');
      if (!btn || btn.__wzShare) return;
      btn.__wzShare = true;
      let on = false, echo = false, timer = 0, quietUntil = Date.now() + 4000;
      const paint = () => {
        row.classList.toggle('is-on', on);
        btn.classList.toggle('is-auto', !on);
        btn.setAttribute('aria-pressed', String(on));
        if (!Sh || !Sh.ok) { note.textContent = 'Not available right now.'; btn.disabled = true; return; }
        note.textContent = on
          ? 'Locked: the game, login screen and launcher use the same colours. Change them in either place and the other follows.'
          : 'Unlocked: each keeps its own colours. Click the lock to make the launcher match this window.';
      };
      const push = async () => {
        if (!Sh || !Sh.ok || !Pz) return;
        const picker = sr.getElementById('custom-theme-color-picker');
        const main = (picker && picker.value) || WZ_THEME_DEFAULTS.main;
        const parts = this.loadThemeParts();
        const l = Pz.launcherFromGame({ name: 'x', main, customName: 'x', fruit: 'x', parts, border: {} });
        await Sh.write({ on, by: 'game', main, game: parts, launcher: l.parts });
      };
      this._sharePing = () => {
        if (echo || !on || Date.now() < quietUntil) return;
        clearTimeout(timer);
        timer = setTimeout(push, 300);
      };
      const applyShared = async (d) => {
        if (!d || !d.on || d.by === 'game') return;
        echo = true;
        try {
          const parts = {};
          for (const k of WZ_PART_KEYS) parts[k] = (d.game && /^#[0-9a-f]{6}$/i.test(d.game[k] || '')) ? d.game[k].toLowerCase() : null;
          const main = /^#[0-9a-f]{6}$/i.test(d.main || '') ? d.main.toLowerCase() : WZ_THEME_DEFAULTS.main;
          const picker = sr.getElementById('custom-theme-color-picker'), text = sr.getElementById('custom-theme-color-input');
          const toggle = sr.getElementById('custom-theme-enabled-toggle');
          const nm = sr.getElementById('custom-theme-name-input'), fr = sr.getElementById('custom-theme-fruit-select');
          if (picker) picker.value = main;
          if (text) text.value = main;
          this.saveThemeParts(parts);
          if (window.ipc) await window.ipc.invoke('set-setting', 'ui.customThemeColor', main).catch(() => {});
          if (toggle && !toggle.checked) { toggle.checked = true; toggle.dispatchEvent(new Event('change')); }
          else await this.applyCustomColorTheme(main, nm && nm.value, fr && fr.value);
          if (this._refreshPartRows) this._refreshPartRows();
        } finally { setTimeout(() => { echo = false; }, 600); }
      };
      if (Sh && Sh.ok) {
        Sh.onChange((d) => { on = !!(d && d.on); paint(); applyShared(d); });
        Sh.read().then(async (d) => { on = !!(d && d.on); paint(); await applyShared(d); quietUntil = Date.now() + 2500; });
      }
      btn.addEventListener('click', async () => { on = !on; paint(); quietUntil = 0; await push(); });
      paint();
    }

    setupBorderImageControls() {
      this.setupPickerPrefsControls();
      this.setupCollapsibleSections();
      this.setupPictureControls('wz-login');
      this.setupPictureControls('wz-border');
      this.applyLoginPic();
    }

    _refreshBorderImageUI() {
      this._refreshPictureUI('wz-login');
      this._refreshPictureUI('wz-border');
    }

    // ---- Banana Jam: presets (save, choose, delete, download, upload) ----
    _loadPresets() {
      try {
        const list = JSON.parse(localStorage.getItem('wzPresets') || '[]');
        return Array.isArray(list) ? list : [];
      } catch (e) { return []; }
    }

    _savePresets(list) {
      try { localStorage.setItem('wzPresets', JSON.stringify(list)); return true; }
      catch (e) { return false; }
    }

    _cleanPreset(p) {
      if (!p || typeof p !== 'object') return null;
      // a preset downloaded from the launcher works here too
      if (p.type === 'banana-jam-launcher-preset' && window.WzPresets) p = window.WzPresets.gameFromLauncher(p);
      const hex = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v.toLowerCase() : null;
      const fruits = ['strawberry.png', 'banana.png', 'blueberry.png', 'cantaloupe.png', 'coconut.png', 'dragonfruit.png', 'pineapple.png', 'pumpkin.png', 'none'];
      // your own icon travels inside the preset
      const iconData = p.icon && typeof p.icon.data === 'string' &&
        /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(p.icon.data) && p.icon.data.length < 2000000
        ? { name: typeof p.icon.name === 'string' ? p.icon.name.slice(0, 30) : 'My icon', data: p.icon.data } : null;
      const customFruit = typeof p.fruit === 'string' && /^custom:[a-z0-9]{1,40}$/i.test(p.fruit) && iconData ? p.fruit : null;
      const name = typeof p.name === 'string' ? p.name.trim().slice(0, 40) : '';
      const main = hex(p.main);
      if (!name || !main) return null;
      const parts = {};
      for (const k of WZ_PART_KEYS) parts[k] = hex(p.parts && p.parts[k]);
      const border = this._cleanPic(p.border || { image: p.image, blur: p.blur });
      const login = this._cleanPic(p.login || {});
      return {
        type: 'banana-jam-preset', version: 1,
        name, main,
        customName: typeof p.customName === 'string' ? p.customName.slice(0, 50) : 'Banana Jam',
        fruit: customFruit || (fruits.includes(p.fruit) ? p.fruit : 'banana.png'),
        icon: customFruit ? iconData : null,
        parts, border, login
      };
    }

    _currentAsPreset(name) {
      const sr = this.loginScreen.shadowRoot;
      const border = window.GameBorder ? window.GameBorder.load() : {};
      const fruitNow = (sr.getElementById('custom-theme-fruit-select') || {}).value;
      return this._cleanPreset({
        name,
        icon: window.WzIcons ? window.WzIcons.exportIcon(fruitNow) : null,
        main: (sr.getElementById('custom-theme-color-picker') || {}).value,
        customName: (sr.getElementById('custom-theme-name-input') || {}).value || 'Banana Jam',
        fruit: (sr.getElementById('custom-theme-fruit-select') || {}).value,
        parts: this.loadThemeParts(),
        border: this._cleanPic(border),
        login: this.loadLoginPic()
      });
    }

    _defaultPreset() {
      return this._cleanPreset({
        name: 'Default', main: WZ_THEME_DEFAULTS.main, customName: WZ_THEME_DEFAULTS.name,
        fruit: WZ_THEME_DEFAULTS.fruit, parts: WZ_THEME_DEFAULTS.parts, border: {}, login: {}
      });
    }

    async _applyPreset(p) {
      const sr = this.loginScreen.shadowRoot;
      const toggle = sr.getElementById('custom-theme-enabled-toggle');
      const picker = sr.getElementById('custom-theme-color-picker');
      const text = sr.getElementById('custom-theme-color-input');
      const nameInput = sr.getElementById('custom-theme-name-input');
      const fruitSelect = sr.getElementById('custom-theme-fruit-select');
      if (picker) picker.value = p.main;
      if (text) text.value = p.main;
      if (nameInput) nameInput.value = p.customName;
      // a preset with its own icon adds that icon to "My icons"
      if (window.WzIcons) p = Object.assign({}, p, { fruit: window.WzIcons.importIcon(p.fruit, p.icon) });
      if (fruitSelect) {
        if (window.WzIcons) window.WzIcons.fillSelect(fruitSelect, p.fruit);
        else fruitSelect.value = p.fruit;
      }
      this.saveThemeParts(p.parts);
      if (window.GameBorder) window.GameBorder.update(this._cleanPic(p.border));
      try { localStorage.setItem('wzLoginBg', JSON.stringify(this._cleanPic(p.login))); } catch (e) {}
      if (window.ipc) {
        await window.ipc.invoke('set-setting', 'ui.customThemeColor', p.main).catch(() => {});
        await window.ipc.invoke('set-setting', 'ui.customThemeName', p.customName).catch(() => {});
        await window.ipc.invoke('set-setting', 'ui.customThemeFruit', p.fruit).catch(() => {});
      }
      if (toggle && !toggle.checked) {
        toggle.checked = true;
        toggle.dispatchEvent(new Event('change'));
      } else {
        await this.applyCustomColorTheme(p.main, p.customName, p.fruit);
      }
      if (this._refreshPartRows) this._refreshPartRows();
      this._refreshBorderImageUI();
      if (this._renderCustomIcons) this._renderCustomIcons();
    }

    setupPresetsControls() {
      const sr = this.loginScreen.shadowRoot;
      const select = sr.getElementById('wz-preset-select');
      const del = sr.getElementById('wz-preset-delete');
      const nameInput = sr.getElementById('wz-preset-name');
      const save = sr.getElementById('wz-preset-save');
      const exp = sr.getElementById('wz-preset-export');
      const imp = sr.getElementById('wz-preset-import');
      const file = sr.getElementById('wz-preset-file');
      const status = sr.getElementById('wz-preset-status');
      if (!select) return;
      const say = (t) => { if (status) status.textContent = t || ''; };
      const DEFAULT_ID = '__default__';
      // ready-made presets (colour theory) come from WzPresets.js
      const READY = (window.WzPresets && window.WzPresets.READY) || [];
      const isReady = (v) => /^ready:\d+$/.test(v);
      const readyAt = (v) => READY[Number(v.slice(6))] || null;

      const option = (parent, value, text) => {
        const o = document.createElement('option');
        o.value = value; o.textContent = text;
        parent.appendChild(o);
      };
      const fill = (selectName) => {
        const list = this._loadPresets();
        select.innerHTML = '';
        option(select, '', 'Choose a preset…');
        const ready = document.createElement('optgroup');
        ready.label = 'Ready-made';
        option(ready, DEFAULT_ID, 'Default');
        READY.forEach((r, i) => option(ready, 'ready:' + i, window.WzPresets.label(r)));
        select.appendChild(ready);
        const mine = document.createElement('optgroup');
        mine.label = list.length ? 'My presets' : 'My presets (none saved yet)';
        list.forEach((p, i) => option(mine, String(i), p.name));
        select.appendChild(mine);
        if (selectName) {
          const idx = list.findIndex(p => p.name === selectName);
          select.value = idx >= 0 ? String(idx) : '';
        }
      };
      const chosen = () => {
        if (select.value === DEFAULT_ID) return this._defaultPreset();
        if (isReady(select.value)) { const r = readyAt(select.value); return r ? this._cleanPreset(window.WzPresets.forGame(r)) : null; }
        const list = this._loadPresets();
        return select.value === '' ? null : (list[Number(select.value)] || null);
      };

      select.addEventListener('change', async () => {
        const p = chosen();
        if (!p) return;
        await this._applyPreset(p);
        const r = isReady(select.value) ? readyAt(select.value) : null;
        say(r ? `Using "${r.name}". ${r.about}` : `Using "${p.name}".`);
      });

      save.addEventListener('click', () => {
        const name = (nameInput.value || '').trim() || (/^\d+$/.test(select.value) ? (chosen() || {}).name : '');
        if (!name) { say('Type a name for the preset first.'); return; }
        if (name === 'Default') { say('Pick a different name.'); return; }
        const p = this._currentAsPreset(name);
        if (!p) { say('Could not save that preset.'); return; }
        const list = this._loadPresets();
        const idx = list.findIndex(x => x.name === name);
        if (idx >= 0) list[idx] = p; else list.push(p);
        if (!this._savePresets(list)) { say('Not enough space to save. Try a smaller border picture.'); return; }
        nameInput.value = '';
        fill(name);
        say(idx >= 0 ? `Updated "${name}".` : `Saved "${name}".`);
      });

      del.addEventListener('click', () => {
        if (select.value === '' ) { say('Choose a preset to delete.'); return; }
        if (select.value === DEFAULT_ID || isReady(select.value)) { say('Ready-made presets can\'t be deleted.'); return; }
        const list = this._loadPresets();
        const p = list[Number(select.value)];
        list.splice(Number(select.value), 1);
        this._savePresets(list);
        fill();
        say(p ? `Deleted "${p.name}".` : '');
      });

      exp.addEventListener('click', () => {
        const p = chosen() || this._currentAsPreset('My Banana Jam theme');
        if (!p) { say('Nothing to download.'); return; }
        const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${p.name.replace(/[^a-z0-9 _-]/gi, '').trim() || 'preset'}.bananajam.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        say(`Downloaded "${p.name}". It's in your Downloads folder.`);
      });

      imp.addEventListener('click', () => file.click());
      file.addEventListener('change', () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        const reader = new FileReader();
        reader.onload = async () => {
          let p = null;
          try { p = this._cleanPreset(JSON.parse(reader.result)); } catch (e) { p = null; }
          if (!p) { say('That file isn\'t a Banana Jam preset.'); return; }
          // uploading the same preset again just uses it
          const same = this._loadPresets().findIndex(x => JSON.stringify(Object.assign({}, x, { name: '' })) === JSON.stringify(Object.assign({}, p, { name: '' })));
          if (same >= 0) { fill(this._loadPresets()[same].name); await this._applyPreset(p); say(`You already have that one, so it's now in use.`); return; }
          const list = this._loadPresets();
          let name = p.name, n = 2;
          while (list.some(x => x.name === name) || name === 'Default') name = `${p.name} (${n++})`;
          p.name = name;
          list.push(p);
          if (!this._savePresets(list)) { say('Not enough space to add that preset.'); return; }
          fill(name);
          await this._applyPreset(p);
          say(`Added and using "${name}".`);
        };
        reader.readAsText(f);
      });

      fill();
    }

    // ---- Banana Jam: the look (Vista / Modern / Bubble / Comic), window buttons, and the reset buttons ----
    setupStyleControls() {
      const sr = this.loginScreen.shadowRoot;
      const host = sr.host;
      const S = window.WzStyle;
      if (!S) return;
      // the login screen's own CSS keys off classes on itself
      const mirror = () => {
        const st = S.get();
        Array.from(host.classList).forEach((c) => { if (/^wz-style-/.test(c)) host.classList.remove(c); });
        host.classList.add('wz-style-' + st.base);
        if (st.ui !== st.base) host.classList.add('wz-style-' + st.ui);
      };
      // not straight away: this runs while the login screen is still being built,
      // and adding a class to it at that moment stops it from being drawn at all
      if (host.isConnected) mirror(); else setTimeout(mirror, 0);
      window.addEventListener('wz-style-change', mirror);
      S.bindSelects(sr.getElementById('wz-look-select'), sr.getElementById('wz-btns-select'));

      const status = sr.getElementById('wz-reset-status');
      const say = (t) => { if (status) status.textContent = t || ''; };
      // a reset button needs two clicks, so nothing gets wiped by accident
      const twoClicks = (btn, label, run) => {
        if (!btn) return;
        let armed = 0;
        btn.addEventListener('click', async () => {
          if (!armed) {
            armed = setTimeout(() => { armed = 0; btn.textContent = label; }, 3500);
            btn.textContent = 'Click again';
            return;
          }
          clearTimeout(armed); armed = 0; btn.textContent = label;
          try { await run(); } catch (e) { say('Something went wrong while resetting.'); }
        });
      };
      twoClicks(sr.getElementById('wz-reset-colours'), 'Reset colours', async () => {
        await this.resetColours();
        say('Colours, name, icon and pictures are back to the Banana Jam default.');
      });
      twoClicks(sr.getElementById('wz-reset-all'), 'Reset all settings', async () => {
        await this.resetAllSettings();
        say('Every setting is back to how it started.');
      });
    }

    async resetColours() {
      // the default preset has the default colours, name, icon and no pictures
      await this._applyPreset(this._defaultPreset());
    }

    async resetAllSettings() {
      const sr = this.loginScreen.shadowRoot;
      const ls = this.loginScreen;
      await this.resetColours();
      if (window.WzStyle) window.WzStyle.reset();
      try {
        ['wzPickerPrefs', 'wzOpenSections', 'wzRecentColors', 'wzFont'].forEach((k) => localStorage.removeItem(k));
        if (window.WzFonts) window.WzFonts.apply();
        if (this._fontPaint) this._fontPaint();
      } catch (e) {}
      if (window.ipc && window.ipc.send) window.ipc.send('wz-picker-reset-position');
      // colour wheel controls
      const P = window.WzColorPicker;
      if (P) {
        const prefs = P.loadPrefs();
        const op = sr.getElementById('wz-picker-opacity'), opv = sr.getElementById('wz-picker-opacity-value');
        if (op) op.value = String(prefs.opacity);
        if (opv) opv.textContent = `${prefs.opacity}%`;
        const size = sr.getElementById('wz-picker-size');
        if (size) size.value = prefs.size;
        const row = sr.getElementById('wz-picker-style-row');
        if (row) row.classList.add('is-auto');
      }
      // General tab switches back to how they start (each saves itself when changed)
      const defaults = [
        [ls.uuidSpooferToggle, false], [ls.backgroundProcessingToggle, true], [ls.fastModeToggle, false], [ls.gameUiToggle, true],
        [ls.darkModeToggle, true], [ls.showImportAccountsToggle, false], [ls.showWheelAutomationToggle, false],
        [ls.hideDevToolsBadgeToggle, false]
      ];
      defaults.forEach(([toggle, value]) => {
        if (toggle && toggle.checked !== value) {
          toggle.checked = value;
          toggle.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      // server swap back to Default (without the pop-up)
      const swap = sr.getElementById('server-swap-select');
      if (swap && swap.value !== '') {
        swap.value = '';
        if (window.ipc) {
          await window.ipc.invoke('set-setting', 'login.language', '').catch(() => {});
          await window.ipc.invoke('set-setting', 'debug.locale', '').catch(() => {});
          await window.ipc.invoke('set-setting', 'debug.country', '').catch(() => {});
        }
      }
    }

    // ---- Banana Jam: your own icons next to the fruits ----
    setupCustomIcons() {
      const sr = this.loginScreen.shadowRoot;
      const I = window.WzIcons;
      const select = sr.getElementById('custom-theme-fruit-select');
      const listEl = sr.getElementById('wz-icons-list');
      const addBtn = sr.getElementById('wz-icons-add');
      const file = sr.getElementById('wz-icons-file');
      const status = sr.getElementById('wz-icons-status');
      if (!I || !select || !listEl || !addBtn || !file) return;
      const say = (t) => { if (status) status.textContent = t || ''; };
      const choose = (key) => {
        I.fillSelect(select, key);
        select.dispatchEvent(new Event('change'));
        render();
      };
      const render = () => {
        const keep = select.value;
        I.fillSelect(select, keep);
        listEl.innerHTML = '';
        const mine = I.list();
        if (!mine.length) {
          const empty = document.createElement('span');
          empty.className = 'wz-icons-empty';
          empty.textContent = 'No icons yet';
          listEl.appendChild(empty);
        }
        mine.forEach((icon) => {
          const key = 'custom:' + icon.id;
          const tile = document.createElement('div');
          tile.className = 'wz-icon-tile' + (select.value === key ? ' on' : '');
          tile.title = `${icon.name} (click to use it)`;
          const img = document.createElement('img');
          img.src = icon.data;
          img.alt = icon.name;
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'wz-icon-del';
          del.title = `Delete ${icon.name}`;
          del.textContent = '✕';
          tile.addEventListener('click', () => choose(key));
          del.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOn = select.value === key;
            I.remove(icon.id);
            say(`Deleted "${icon.name}".`);
            if (wasOn) choose(I.DEFAULT); else render();
          });
          tile.appendChild(img);
          tile.appendChild(del);
          listEl.appendChild(tile);
        });
        // a deleted icon that was still chosen falls back to the banana
        if (keep && keep !== select.value) select.dispatchEvent(new Event('change'));
      };
      addBtn.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0];
        file.value = '';
        if (!f) return;
        try {
          say('Adding icon…');
          const key = await I.addFile(f);
          say(`Added "${I.nameOf(key)}". It's in the Fruit Icon list now.`);
          choose(key);
        } catch (e) {
          say(e.message || 'Something went wrong with that picture.');
        }
      });
      select.addEventListener('change', () => {
        listEl.querySelectorAll('.wz-icon-tile').forEach((t, i) => {
          const icon = I.list()[i];
          if (icon) t.classList.toggle('on', select.value === 'custom:' + icon.id);
        });
      });
      render();
      this._renderCustomIcons = render;
    }

    setupFruitRotation() {
      const loginAppIconElem = this.loginScreen.loginAppIconElem;
      if (!loginAppIconElem) return;

      loginAppIconElem.style.cursor = 'pointer';
      loginAppIconElem.style.cursor = 'default';
      loginAppIconElem.addEventListener('click', async () => {
        return; // Banana Jam: the logo no longer cycles fruit themes
        if (window.ipc) {
          const customEnabled = await window.ipc.invoke('get-setting', 'ui.customThemeEnabled').catch(() => false);
          if (customEnabled === true) {
            return;
          }
        }
        
        this.loginScreen._currentFruitIndex = (this.loginScreen._currentFruitIndex + 1) % this.loginScreen._fruitImages.length;
        const nextFruitKey = this.loginScreen._fruitImages[this.loginScreen._currentFruitIndex];
        
        loginAppIconElem.src = `images/${nextFruitKey}`;
        loginAppIconElem.style.filter = 'none';
        this.applyTheme(nextFruitKey);

        if (window.ipc) {
          window.ipc.invoke('set-setting', 'fruitTheme', nextFruitKey)
            .catch(err => {});
        }

        loginAppIconElem.classList.remove('fruit-animate'); 
        void loginAppIconElem.offsetWidth; 
        loginAppIconElem.classList.add('fruit-animate'); 

        setTimeout(() => {
          if (loginAppIconElem) { 
            loginAppIconElem.classList.remove('fruit-animate');
          }
        }, 300); 
      });
    }

    applyTheme(fruitKey) {
      this._customOn = false;
      this.clearThemePartVars();
      // Banana Jam: with Custom Theme off, always use the default Banana Jam look
      const D = WZ_THEME_DEFAULTS;
      this.applyCustomColorTheme(D.main, D.name, D.fruit, Object.assign({}, D.parts), true);
      return;
      const theme = this.loginScreen._fruitThemes[fruitKey];
      if (!theme) {
        return;
      }
      setDocAccents(theme.primary, theme.primary);
      if (window.GameBorder && window.GameBorder.load().enabled) window.GameBorder.update({ enabled: false });
      const root = this.loginScreen.shadowRoot.host;

      let fruitName = fruitKey.replace('.png', '');
      if (fruitName === 'blueberries') {
        fruitName = 'blueberry';
      }
      const displayName = 'Banana Jam';

      if (this.loginScreen.playerLoginTextElem) {
        this.loginScreen.playerLoginTextElem.innerText = displayName;
      }
      
      const primaryIsLight = isLightColor(theme.primary);

      root.style.setProperty('--theme-primary', theme.primary);
      root.style.setProperty('--theme-secondary', theme.secondary);
      root.style.setProperty('--theme-highlight', theme.highlight);
      root.style.setProperty('--theme-shadow', theme.shadow);
      root.style.setProperty('--theme-gradient-start', theme.gradientStart);
      root.style.setProperty('--theme-gradient-end', theme.gradientEnd);
      root.style.setProperty('--theme-hover-border', theme.hoverBorder);
      root.style.setProperty('--theme-radial-1', theme.radial1);
      root.style.setProperty('--theme-radial-2', theme.radial2);
      root.style.setProperty('--theme-settings-hover', theme.settingsHover);
      root.style.setProperty('--theme-settings-border', theme.settingsBorder);

      if (primaryIsLight && (fruitKey === 'banana.png' || fruitKey === 'pineapple.png')) {
        root.style.setProperty('--theme-box-background', 'rgba(225, 210, 180, 0.97)');
        root.style.setProperty('--theme-text-shadow', '0 1px 1px rgba(0, 0, 0, 0.5)');
        root.style.setProperty('--theme-border-enhancement', '1px solid rgba(0, 0, 0, 0.2)');
        const playerLoginText = this.loginScreen.shadowRoot.getElementById('player-login-text');
        if (playerLoginText) {
          playerLoginText.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.5)';
          playerLoginText.style.webkitTextStroke = '0.5px rgba(0, 0, 0, 0.5)';
        }
        const settingsHeadings = this.loginScreen.shadowRoot.querySelectorAll('#settings-panel h3, #tester-info-modal .modal-header h3');
        settingsHeadings.forEach(heading => {
          heading.style.textShadow = '0 1px 1px rgba(0, 0, 0, 0.5)';
          heading.style.webkitTextStroke = '0.5px rgba(0, 0, 0, 0.5)';
        });
        root.style.setProperty('--standard-text-shadow', 'none');
      } else {
        root.style.setProperty('--theme-box-background', 'rgba(255, 245, 230, 0.95)');
        root.style.setProperty('--theme-text-shadow', 'none');
        root.style.setProperty('--theme-border-enhancement', 'none');
        root.style.setProperty('--standard-text-shadow', 'none');
        const playerLoginText = this.loginScreen.shadowRoot.getElementById('player-login-text');
        if (playerLoginText) {
          playerLoginText.style.textShadow = '1px 2px 0px var(--theme-shadow)';
        }
        const settingsHeadings = this.loginScreen.shadowRoot.querySelectorAll('#settings-panel h3, #tester-info-modal .modal-header h3');
        settingsHeadings.forEach(heading => {
          heading.style.textShadow = '1px 1px 0px var(--theme-shadow)';
        });
      }

      const buttonBg = primaryIsLight ? darkenColor(theme.primary, 20) : theme.primary;
      root.style.setProperty('--theme-button-bg', buttonBg);
      root.style.setProperty('--theme-button-border', primaryIsLight ? 'rgba(0, 0, 0, 0.3)' : theme.secondary);
      root.style.setProperty('--theme-button-text', primaryIsLight ? '#333333' : '#FFFFFF');
      
      const loginBtn = this.loginScreen.shadowRoot.getElementById('log-in-btn');
      const createAccountBtn = this.loginScreen.shadowRoot.getElementById('create-account-btn');
      
      if (loginBtn) {
        loginBtn.style.setProperty('--ajd-bubble-button-background-color', buttonBg);
        loginBtn.style.setProperty('--ajd-bubble-button-border-color', primaryIsLight ? 'rgba(0, 0, 0, 0.3)' : theme.secondary);
        loginBtn.style.setProperty('--ajd-bubble-button-text-color', primaryIsLight ? '#333333' : '#FFFFFF');
        loginBtn.style.setProperty('--ajd-bubble-button-background-color-hover', primaryIsLight ? darkenColor(buttonBg, 10) : darkenColor(buttonBg, -15));
        loginBtn.style.setProperty('--ajd-bubble-button-background-color-active', buttonBg);
        if (primaryIsLight && (fruitKey === 'banana.png' || fruitKey === 'pineapple.png')) {
          loginBtn.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.3)';
        } else {
          loginBtn.style.boxShadow = '';
        }
      }
      
      if (createAccountBtn) {
        createAccountBtn.style.setProperty('--ajd-bubble-button-background-color', buttonBg);
        createAccountBtn.style.setProperty('--ajd-bubble-button-border-color', primaryIsLight ? 'rgba(0, 0, 0, 0.3)' : theme.secondary);
        createAccountBtn.style.setProperty('--ajd-bubble-button-text-color', primaryIsLight ? '#333333' : '#FFFFFF');
        createAccountBtn.style.setProperty('--ajd-bubble-button-background-color-hover', primaryIsLight ? darkenColor(buttonBg, 10) : darkenColor(buttonBg, -15));
        createAccountBtn.style.setProperty('--ajd-bubble-button-background-color-active', buttonBg);
        if (primaryIsLight && (fruitKey === 'banana.png' || fruitKey === 'pineapple.png')) {
          createAccountBtn.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.3)';
        } else {
          createAccountBtn.style.boxShadow = '';
        }
      }

      if (this.loginScreen.accountPanelInstance && typeof this.loginScreen.accountPanelInstance.updateTheme === 'function') {
        this.loginScreen.accountPanelInstance.updateTheme(fruitKey);
      }
      if (window.UserTrayManager && window.UserTrayManager.instance && typeof window.UserTrayManager.instance.updateTheme === 'function') {
        window.UserTrayManager.instance.updateTheme(theme);
      }
      if (this.loginScreen.importButtonInstance && typeof this.loginScreen.importButtonInstance.updateTheme === 'function') {
        this.loginScreen.importButtonInstance.updateTheme(fruitKey);
      }
      if (this.loginScreen.autoWheelButtonInstance && typeof this.loginScreen.autoWheelButtonInstance.updateTheme === 'function') {
        this.loginScreen.autoWheelButtonInstance.updateTheme(fruitKey);
      }
    }
  };
})();

