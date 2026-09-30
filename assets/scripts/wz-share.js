/*
 * WzShare - keeps colours the same between the launcher and the game window.
 * A small file on this PC holds the shared colours and an on/off switch (the lock).
 * This script only talks to that file; each window says how to apply what it reads.
 *
 *   WzShare.read()        -> the shared data, or null
 *   WzShare.write(data)   -> saves it (the other window is told automatically)
 *   WzShare.onChange(fn)  -> fn(data) runs when the file changes
 */
(function () {
  if (window.WzShare) return;

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

  const subs = [];
  if (ipc) { try { ipc.on('bj-shared-changed', (d) => subs.slice().forEach((f) => { try { f(d); } catch (e) {} })); } catch (e) {} }

  window.WzShare = {
    ok: !!ipc,
    read: async () => { try { return ipc ? await ipc.invoke('bj-shared-read') : null; } catch (e) { return null; } },
    write: async (data) => { try { return ipc ? await ipc.invoke('bj-shared-write', data) : false; } catch (e) { return false; } },
    onChange: (fn) => { subs.push(fn); }
  };
})();
