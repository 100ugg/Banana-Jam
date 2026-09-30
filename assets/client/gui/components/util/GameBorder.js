/*
 * GameBorder - stores and shares the custom game border settings.
 * Part of Banana Jam by 100ugg (based on Strawberry Jam by glvckoma, itself based on Jam by Sxip).
 *
 * Saved shape (localStorage key "gameBorder"):
 * {
 *   enabled: true,
 *   all: "#e83d52",              // used for any side without its own value
 *   sides: { top: null, right: null, bottom: null, left: null }
 * }
 * Also: fill (true = no border, the game fills the whole window).
 * Every value is a CSS background, so later it can be a gradient or url(...) image.
 */
(function () {
  const KEY = 'gameBorder';
  const DEFAULT_COLOR = '#e83d52';

  function defaults() {
    return { enabled: false, all: DEFAULT_COLOR, sides: { top: null, right: null, bottom: null, left: null } };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      const base = defaults();
      return {
        enabled: parsed.enabled === true,
        all: typeof parsed.all === 'string' && parsed.all ? parsed.all : base.all,
        sides: Object.assign(base.sides, parsed.sides || {}),
        // Banana Jam: optional border picture (data URL) and blur on/off
        image: (typeof parsed.image === 'string' && /^data:image\//.test(parsed.image)) ? parsed.image : null,
        blur: typeof parsed.blur === 'number' ? Math.max(0, Math.min(40, parsed.blur)) : (parsed.blur === true ? 16 : 0),
        zoom: typeof parsed.zoom === 'number' ? Math.max(100, Math.min(300, parsed.zoom)) : 100,
        x: typeof parsed.x === 'number' ? Math.max(0, Math.min(100, parsed.x)) : 50,
        y: typeof parsed.y === 'number' ? Math.max(0, Math.min(100, parsed.y)) : 50,
        mirror: parsed.mirror === true,
        flip: parsed.flip === true,
        // Banana Jam: no border, the game fills the whole window
        fill: parsed.fill === true
      };
    } catch (e) {
      return defaults();
    }
  }

  function save(config) {
    try { localStorage.setItem(KEY, JSON.stringify(config)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('game-border-changed', { detail: config }));
  }

  function update(changes) {
    const next = Object.assign(load(), changes);
    save(next);
    return next;
  }

  // Share the border colour as a CSS variable (--wz-border) so the login card
  // can use it for its thin outline. The page itself stays plain.
  function applyPageBackground(config) {
    const cfg = config || load();
    const root = document.documentElement;
    if (cfg.enabled) root.style.setProperty('--wz-border', cfg.all);
    else root.style.removeProperty('--wz-border');
  }

  window.GameBorder = { load, save, update, applyPageBackground, DEFAULT_COLOR };

  document.addEventListener('game-border-changed', (e) => applyPageBackground(e.detail));
  if (document.body) applyPageBackground();
  else document.addEventListener('DOMContentLoaded', () => applyPageBackground());
})();
