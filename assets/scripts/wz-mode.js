/*
 * WzMode - the one Light / Dark switch for all of Banana Jam.
 * The choice is kept in a tiny file on this PC (just the word "light" or "dark"), so the launcher,
 * the game window and the Mod Menu always agree, whichever one you click it in.
 *
 *   WzMode.get()          -> 'light' or 'dark'
 *   WzMode.set(mode)      -> changes it everywhere
 *   WzMode.toggle()       -> flips it
 *   WzMode.apply(fn)      -> fn(mode) paints this window's colours; runs on every change
 *                            (and once at start if the other program changed it while this one was closed)
 *   WzMode.onChange(fn)   -> fn(mode) for small things like the sun / moon button
 */
(function () {
  if (window.WzMode) return;

  let ipc = null;
  try {
    if (window.ipc && window.ipc.invoke && window.ipc.on) {
      // the game window
      ipc = { invoke: (c, d) => window.ipc.invoke(c, d), on: (c, f) => window.ipc.on(c, (e, d) => f(d)) };
    } else if (typeof require === 'function') {
      // the launcher
      const r = require('electron').ipcRenderer;
      ipc = { invoke: (c, d) => r.invoke(c, d), on: (c, f) => r.on(c, (e, d) => f(d)) };
    }
  } catch (e) { ipc = null; }

  const KEY = 'bjMode', APPLIED = 'bjModeApplied';
  const ok = (m) => m === 'light' || m === 'dark';
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  let mode = ok(lsGet(KEY)) ? lsGet(KEY) : 'dark';
  const appliers = [], watchers = [];

  const paint = () => {
    appliers.slice().forEach((f) => { try { f(mode); } catch (e) { console.error('[WzMode]', e); } });
    lsSet(APPLIED, mode);
    watchers.slice().forEach((f) => { try { f(mode); } catch (e) {} });
  };
  const change = (m) => {
    if (!ok(m) || m === mode) return;
    mode = m; lsSet(KEY, m);
    paint();
  };

  if (ipc) {
    try { ipc.on('bj-mode-changed', (m) => change(m)); } catch (e) {}
    // catch up with the file once the window has started
    setTimeout(() => {
      ipc.invoke('bj-mode-read').then((m) => {
        if (ok(m)) {
          if (m !== mode) change(m);
          else if (lsGet(APPLIED) && lsGet(APPLIED) !== mode) paint();
        } else {
          ipc.invoke('bj-mode-write', mode).catch(() => {});   // first run: save the starting mode
        }
      }, () => {});
    }, 0);
  }

  window.WzMode = {
    ok: true,
    get: () => mode,
    set: (m) => {
      if (!ok(m)) return;
      if (ipc) ipc.invoke('bj-mode-write', m).catch(() => {});
      change(m);
    },
    toggle: () => window.WzMode.set(mode === 'dark' ? 'light' : 'dark'),
    apply: (fn) => {
      appliers.push(fn);
      // first time this window has ever seen a mode: take it as it is, don't repaint the user's colours
      if (!lsGet(APPLIED)) lsSet(APPLIED, mode);
    },
    onChange: (fn) => { watchers.push(fn); }
  };
})();
