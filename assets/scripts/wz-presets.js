/*
 * WzPresets - Banana Jam's ready-made colour presets, shared by the game window
 * and (as a copy) the launcher.
 *
 * Each one is built on a colour theory rule (see "scheme" and "about").
 * Every preset has colours for the game window ("game") and for the launcher
 * ("launcher"), so picking one looks right in both places.
 *
 * It can also turn a game preset file into a launcher one and back, so a
 * preset downloaded from one can be uploaded to the other.
 */
(function () {
  if (window.WzPresets) return;

  const READY = [
    {
      id: 'banana-yellow', name: 'Banana', scheme: 'Sunny',
      about: 'Warm banana yellow. The bright look Banana Jam used to start with.',
      main: '#f2c230', fruit: 'banana.png',
      game: { title: '#b8790a', button: null, link: '#9a6a10', box: '#fff8dc', bg: '#f7dc5a', exit: null, ui: null, border: '#f7dc5a' },
      launcher: { header: '#f7dc5a', tab: null, btn: null, accent: '#b8790a', bg: '#fdf3c4', panel: '#fff8dc' }
    },
    {
      id: 'melon-green', name: 'Melon', scheme: 'Natural',
      about: 'Soft green and sand. The look Banana Jam used to start with.',
      main: '#b07a3c', fruit: 'cantaloupe.png',
      game: { title: '#c0661f', button: null, link: '#9a6a2e', box: '#fbf4e2', bg: '#bccb8e', exit: null, ui: null, border: '#bccb8e' },
      launcher: { header: '#bccb8e', tab: null, btn: null, accent: '#b8621f', bg: '#f5f0de', panel: '#fbf4e2' }
    },
    {
      id: 'sunset-savanna', name: 'Warm', scheme: 'Analogous',
      about: 'Oranges and yellows. Cosy and bright.',
      main: '#d9822b', fruit: 'cantaloupe.png',
      game: { title: '#c0461f', button: null, link: '#a8431a', box: '#fff6e6', bg: '#f4c95d', exit: null, ui: null, border: '#f4c95d' },
      launcher: { header: '#f4c95d', tab: null, btn: null, accent: '#c0461f', bg: '#fbeccd', panel: '#fff6e6' }
    },
    {
      id: 'ocean-coral', name: 'Contrast', scheme: 'Complementary',
      about: 'Teal and orange. The two colours make each other stand out.',
      main: '#1f8a8a', fruit: 'dragonfruit.png',
      game: { title: '#e8603f', button: null, link: '#c9482f', box: '#f2fbfa', bg: '#9ed9d3', exit: null, ui: null, border: '#9ed9d3' },
      launcher: { header: '#9ed9d3', tab: null, btn: null, accent: '#d4502f', bg: '#e1f3f1', panel: '#f2fbfa' }
    },
    {
      id: 'berry-lime', name: 'Playful', scheme: 'Triadic',
      about: 'Purple, green and orange. Fun and lively.',
      main: '#7b4bb7', fruit: 'pumpkin.png',
      game: { title: '#e0782a', button: null, link: '#4f8a1e', box: '#f8f4fd', bg: '#b9dc72', exit: null, ui: null, border: '#b9dc72' },
      launcher: { header: '#b9dc72', tab: null, btn: null, accent: '#d06a1f', bg: '#ede6f6', panel: '#f8f4fd' }
    },
    {
      id: 'blueberry-lemon', name: 'Balanced', scheme: 'Split complementary',
      about: 'Blue with warm yellow. Bright, but easy on the eyes.',
      main: '#3d5a98', fruit: 'blueberry.png',
      game: { title: '#c98a12', button: null, link: '#c8552a', box: '#f4f7fd', bg: '#f3dc7a', exit: null, ui: null, border: '#f3dc7a' },
      launcher: { header: '#f3dc7a', tab: null, btn: null, accent: '#c8552a', bg: '#e6ecf8', panel: '#f4f7fd' }
    },
    {
      id: 'minty-fresh', name: 'Simple', scheme: 'Monochromatic',
      about: 'Light and dark shades of one green. Clean and calm.',
      main: '#2f7d5b', fruit: 'pineapple.png',
      game: { title: '#1f5c42', button: null, link: '#3a8f68', box: '#eef8f2', bg: '#a9d9bf', exit: null, ui: null, border: '#a9d9bf' },
      launcher: { header: '#a9d9bf', tab: null, btn: null, accent: '#1f5c42', bg: '#dff1e7', panel: '#eef8f2' }
    },
    {
      id: 'pink-pastel', name: 'Pink', scheme: 'Soft pastel',
      about: 'Soft, light pinks. Gentle and cute.',
      main: '#e86a9f', fruit: 'strawberry.png',
      game: { title: '#d6457f', button: null, link: '#c23a70', box: '#fff3f8', bg: '#ffc2da', exit: null, ui: null, border: '#ffc2da' },
      launcher: { header: '#ffc2da', tab: null, btn: null, accent: '#d6457f', bg: '#ffe3ee', panel: '#fff3f8' }
    }
  ];

  // The Default look has two modes. Light and Dark switch between these two sets of colours
  // (the same colours are used by the launcher, the game window and the Mod Menu).
  const MODES = {
    dark: {
      main: '#5a67e8', fruit: 'banana.png',
      game: { title: '#f0f1f6', button: null, link: '#d3d6e0', box: '#2b2d33', bg: '#1e1f24', exit: null, ui: null, border: '#17181c' },
      launcher: { header: '#17181c', tab: null, btn: null, accent: '#e4e7f0', bg: '#1e1f24', panel: '#2b2d33' }
    },
    light: {
      main: '#557186', fruit: 'banana.png',
      game: { title: '#3f5b70', button: null, link: '#3f5b70', box: '#faf9f6', bg: '#dcd7cf', exit: null, ui: null, border: '#dcd7cf' },
      launcher: { header: '#dcd7cf', tab: null, btn: null, accent: '#3f5b70', bg: '#f2f0ec', panel: '#faf9f6' }
    }
  };

  const label = (r) => r.name;

  // a ready-made preset in the shape the game window saves
  function forGame(r) {
    return {
      type: 'banana-jam-preset', version: 1, name: r.name, main: r.main, customName: 'Banana Jam',
      fruit: r.fruit, icon: null, parts: Object.assign({}, r.game), border: {}, login: {}
    };
  }
  // ... and in the shape the launcher saves
  function forLauncher(r) {
    return {
      type: 'banana-jam-launcher-preset', version: 1, name: r.name, main: r.main, customName: 'Banana Jam',
      fruit: r.fruit, icon: null, parts: Object.assign({}, r.launcher), picture: {}
    };
  }

  // ---- turning one kind of preset file into the other ----
  const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((x, i) => x + (B[i] - x) * t)); };
  const pick = (v) => (isHex(v) ? v.toLowerCase() : null);

  function launcherFromGame(g) {
    const p = (g && g.parts) || {};
    const header = pick(p.border) || pick(p.bg);
    const panel = pick(p.box);
    return {
      type: 'banana-jam-launcher-preset', version: 1, name: g.name, main: g.main, customName: g.customName,
      fruit: g.fruit, icon: g.icon || null,
      parts: {
        header, tab: null, btn: pick(p.button), accent: pick(p.title),
        bg: panel && header ? mix(panel, header, 0.22) : null, panel
      },
      picture: g.border || {}
    };
  }

  function gameFromLauncher(l) {
    const p = (l && l.parts) || {};
    const header = pick(p.header);
    return {
      type: 'banana-jam-preset', version: 1, name: l.name, main: l.main, customName: l.customName,
      fruit: l.fruit, icon: l.icon || null,
      parts: {
        title: pick(p.accent), button: pick(p.btn), link: null, box: pick(p.panel),
        bg: header, exit: null, ui: null, border: header
      },
      border: l.picture || {}, login: {}
    };
  }

  window.WzPresets = { READY, MODES, label, forGame, forLauncher, launcherFromGame, gameFromLauncher };
})();
