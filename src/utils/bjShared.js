'use strict';
/*
 * Banana Jam: colours shared between the launcher and the game window.
 * Both programs read and write the same small file, and each one tells its own
 * windows when the file changes. (The same file is in assets/client/bjShared.js.)
 * The file only holds colours and an on/off switch, nothing about accounts.
 * A second tiny file holds the Light / Dark choice.
 */
const fs = require('fs');
const path = require('path');

function install(app, ipcMain, BrowserWindow) {
  const dir = path.join(app.getPath('appData'), 'bananajam');
  const file = path.join(dir, 'bj-shared-theme.json');

  const read = () => {
    try {
      const d = JSON.parse(fs.readFileSync(file, 'utf8'));
      return d && typeof d === 'object' ? d : null;
    } catch (e) { return null; }
  };
  const cleanHex = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);
  const cleanParts = (p) => {
    const out = {};
    if (p && typeof p === 'object') Object.keys(p).slice(0, 20).forEach((k) => { if (/^[a-z]{1,12}$/.test(k)) out[k] = cleanHex(p[k]); });
    return out;
  };
  const clean = (d) => {
    if (!d || typeof d !== 'object') return null;
    return {
      v: 1, on: d.on === true, by: d.by === 'game' ? 'game' : 'launcher', stamp: Date.now(),
      main: cleanHex(d.main), launcher: cleanParts(d.launcher), game: cleanParts(d.game)
    };
  };

  ipcMain.handle('bj-shared-read', () => read());
  ipcMain.handle('bj-shared-write', (event, data) => {
    const c = clean(data);
    if (!c) return false;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(c));
      fs.renameSync(tmp, file);
      return true;
    } catch (e) { return false; }
  });

  // tell every window when the file changes (also when the other program wrote it)
  let last = '';
  const tell = () => {
    const d = read();
    const text = d ? JSON.stringify(d) : '';
    if (text === last) return;
    last = text;
    BrowserWindow.getAllWindows().forEach((w) => {
      try { if (!w.isDestroyed()) w.webContents.send('bj-shared-changed', d); } catch (e) {}
    });
  };
  try { last = JSON.stringify(read() || ''); } catch (e) {}
  try { fs.watchFile(file, { interval: 600 }, tell); } catch (e) {}

  // ---- Light / Dark mode (one small file that only says "light" or "dark") ----
  const modeFile = path.join(dir, 'bj-mode.json');
  const readMode = () => {
    try {
      const d = JSON.parse(fs.readFileSync(modeFile, 'utf8'));
      return d && (d.mode === 'light' || d.mode === 'dark') ? d.mode : null;
    } catch (e) { return null; }
  };
  ipcMain.handle('bj-mode-read', () => readMode());
  ipcMain.handle('bj-mode-write', (event, mode) => {
    if (mode !== 'light' && mode !== 'dark') return false;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const tmp = modeFile + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify({ mode, stamp: Date.now() }));
      fs.renameSync(tmp, modeFile);
      return true;
    } catch (e) { return false; }
  });
  // ---- a fresh setup (the installer leaves one flag per program; each program uses its flag once, then removes it) ----
  ipcMain.handle('bj-fresh-install', (event, kind) => {
    if (kind !== 'launcher' && kind !== 'game') return false;
    const flag = path.join(dir, 'bj-fresh-' + kind + '.flag');
    try {
      if (!fs.existsSync(flag)) return false;
      fs.unlinkSync(flag);
      return true;
    } catch (e) { return false; }
  });
  let lastMode = readMode();
  const tellMode = () => {
    const m = readMode();
    if (m === lastMode) return;
    lastMode = m;
    BrowserWindow.getAllWindows().forEach((w) => {
      try { if (!w.isDestroyed()) w.webContents.send('bj-mode-changed', m); } catch (e) {}
    });
  };
  try { fs.watchFile(modeFile, { interval: 400 }, tellMode); } catch (e) {}
}

// The colour a window should have while its page is still loading (so it never flashes another look).
// kind is 'launcher' or 'game'. Uses the shared colours when they are on, else the Light / Dark choice.
function startColour(app, kind) {
  const dir = path.join(app.getPath('appData'), 'bananajam');
  const readJson = (name) => { try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch (e) { return null; } };
  const shared = readJson('bj-shared-theme.json');
  const custom = shared && shared.on === true && shared[kind] && shared[kind].bg;
  if (typeof custom === 'string' && /^#[0-9a-f]{6}$/i.test(custom)) return custom;
  const mode = readJson('bj-mode.json');
  const light = mode && mode.mode === 'light';
  if (kind === 'launcher') return light ? '#f2f0ec' : '#1e1f24';
  return light ? '#dcd7cf' : '#1e1f24';
}

module.exports = { install, startColour };
