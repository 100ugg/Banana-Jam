"use strict";

const Module = require('module');
const originalRequire = Module.prototype.require;
const originalResolveFilename = Module._resolveFilename;

const fs = require('fs');
const fsPromisesValue = fs.promises || (() => {
  const { promisify } = require('util');
  const promises = {};
  const fsMethods = ['access', 'appendFile', 'chmod', 'chown', 'copyFile', 'lchmod', 'lchown', 'link', 'lstat', 'mkdir', 'mkdtemp', 'open', 'readdir', 'readFile', 'readlink', 'realpath', 'rename', 'rmdir', 'stat', 'symlink', 'truncate', 'unlink', 'utimes', 'writeFile'];
  fsMethods.forEach(method => {
    if (typeof fs[method] === 'function') {
      promises[method] = promisify(fs[method]);
    }
  });
  return promises;
})();

Module._cache['fs/promises'] = {
  id: 'fs/promises',
  exports: fsPromisesValue,
  loaded: true,
  children: [],
  parent: null,
  filename: 'fs/promises',
  paths: []
};

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === 'fs/promises') {
    return 'fs/promises';
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module.prototype.require = function(id) {
  if (id === 'fs/promises') {
    return fsPromisesValue;
  }
  return originalRequire.apply(this, arguments);
};

const {app, BrowserWindow, clipboard, dialog, ipcMain, Menu, shell, globalShortcut, session} = require("electron");
const {autoUpdater} = require("electron-updater");
// Banana Jam: never download or install updates from anyone else's release feed
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
const crypto = require("crypto");
const path = require("path");
const Store = require("electron-store");
const {machineId} = require("node-machine-id");
const {v4: uuidv4} = require('uuid');
const os = require("os");
const fsPromises = fsPromisesValue;
const config = require("./config.js");

const TCP_SERVER_PORTS = [443, 444, 445, 8443, 9443];
const API_SERVER_PORTS = [7680, 7681, 7682, 7683, 7684];
const server = require("./server.js");
const translation = require("./translation.js");
const net = require('net');
require("./proxy.js");

const strawberryJamClassicPath = path.join(app.getPath('appData'), 'bananajam-classic');
app.setPath('userData', strawberryJamClassicPath);

try {
  const ajClassicConfigPath = path.join(app.getPath('appData'), 'AJ Classic', 'config.json');
  const newConfigPath = path.join(strawberryJamClassicPath, 'config.json');
  if (fs.existsSync(ajClassicConfigPath) && !fs.existsSync(newConfigPath)) {
    fs.mkdirSync(strawberryJamClassicPath, { recursive: true });
    fs.copyFileSync(ajClassicConfigPath, newConfigPath);
  }
} catch (e) {}

const STORE_KEY_UUID_SPOOFER = 'uuid_spoofer_enabled';
const STORE_KEY_SAVED_ACCOUNTS = 'saved_accounts';

const AUTO_UPDATE_STARTUP_DELAY_MS = 2000;
const AUTO_UPDATE_PERIODIC_DELAY_MS = 1 * 60 * 60 * 1000;

let isUserLoggedIn = false;


let win = null;

let printWindow = null;
let isClosing = false;

const store = new Store();

// Banana Jam: one-time copy of saved accounts from an existing Strawberry Jam install
try {
  if (!store.get('wz_imported_sj_accounts')) {
    const sjConfig = path.join(app.getPath('appData'), 'strawberry-jam-classic', 'config.json');
    const current = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
    if ((!current || current.length === 0) && fs.existsSync(sjConfig)) {
      const old = JSON.parse(fs.readFileSync(sjConfig, 'utf8'));
      if (Array.isArray(old[STORE_KEY_SAVED_ACCOUNTS]) && old[STORE_KEY_SAVED_ACCOUNTS].length) {
        store.set(STORE_KEY_SAVED_ACCOUNTS, old[STORE_KEY_SAVED_ACCOUNTS]);
        if (old.savedAccountPasswords) store.set('savedAccountPasswords', old.savedAccountPasswords);
      }
    }
    store.set('wz_imported_sj_accounts', true);
  }
} catch (e) {}

let originalMachineId = null;
let spoofedUuid = null;

(async function() {
  try {
    originalMachineId = await machineId();
    log("debug", `[UUID] Original machine ID retrieved: ${originalMachineId.substr(0, 8)}...`);
  } catch (err) {
    log("error", `[UUID] Failed to get original machine ID: ${err.message}`);
  }
})();

async function toggleUuidSpoofing(enable) {
  let logMsg = enable ? "Enabling" : "Disabling";
  log("info", `[UUID Spoofer] ${logMsg} UUID spoofing`);

  try {
    store.set(STORE_KEY_UUID_SPOOFER, enable);
    
    if (win) {
      if (enable) {
        const newUuid = uuidv4();
        log("info", `[UUID Spoofer] Generated random UUID: ${newUuid.substr(0, 8)}...`);
        
        win.webContents.send('update-df', newUuid);
        
        return { success: true, uuid: newUuid };
      } else {
        try {
          spoofedUuid = null;

          const realId = originalMachineId || await machineId();
          log("info", `[UUID Spoofer] Restoring original machine ID: ${realId.substr(0, 8)}...`);
          
          win.webContents.send('update-df', realId);
          
          return { success: true, uuid: realId };
        } catch (idErr) {
          log("error", `[UUID Spoofer] Failed to get actual machine ID: ${idErr}`);
          return { success: false, error: "Failed to get actual machine ID" };
        }
      }
    } else {
      log("error", "[UUID Spoofer] Window not available");
      return { success: false, error: "Window not available" };
    }
  } catch (err) {
    log("error", `[UUID Spoofer] Error toggling UUID spoofing: ${err}`);
    return { success: false, error: err.message || String(err) };
  }
}

async function showUuidActivationConfirmation() {
  const uuidEnabled = store.get(STORE_KEY_UUID_SPOOFER, false);
  
  if (uuidEnabled) {
    return true;
  }
  
  const confirmOptions = {
    type: 'warning',
    title: 'UUID Spoofing Activation',
    message: 'Are you sure you want to enable UUID spoofing?',
    detail: 'This will cause issues with 2FA accounts. This is a safety feature to protect your main accounts unique identifier from being linked to other accounts. This does not affect IP which will still be exposed.',
    buttons: ['Cancel', 'Enable'],
    defaultId: 0,
    cancelId: 0
  };
  
  const result = await dialog.showMessageBox(win, confirmOptions);
  return result.response === 1;
}

async function getCurrentMachineId() {
  const uuidEnabled = store.get(STORE_KEY_UUID_SPOOFER, false);
  
  if (uuidEnabled && spoofedUuid) {
    log("debug", `[UUID] Using spoofed UUID: ${spoofedUuid.substr(0, 8)}...`);
    return spoofedUuid;
  } else {
    if (!originalMachineId) {
      try {
        originalMachineId = await machineId();
        log("debug", `[UUID] Retrieved original machine ID: ${originalMachineId.substr(0, 8)}...`);
      } catch (err) {
        log("error", `[UUID] Failed to get machine ID: ${err.message}`);
        const fallbackUuid = uuidv4();
        log("debug", `[UUID] Using fallback random UUID: ${fallbackUuid.substr(0, 8)}...`);
        return fallbackUuid;
      }
    }
    log("debug", `[UUID] Using original machine ID: ${originalMachineId.substr(0, 8)}...`);
    return originalMachineId;
  }
}

const log = (level, message) => {
  if (win) {
    if (typeof message === "object") {
      message = message.stack || message.error?.stack || JSON.stringify(message);
    }
    if (level === 'debug' || level === 'debugError') {
        win.webContents.send("log", {level: level === 'debug' ? 'debug' : 'error', message});
    }
    else {
      if (["info", "warn", "error"].includes(level)) {
        win.webContents.send("log", {level, message});
      }
    }
  }
  else {
    setTimeout(() => {
      log(level, message);
    }, 1000);
  }
};

process.on("uncaughtException", err => {
  log("error", `[App] Uncaught exception: ${err.stack || err.error?.stack || err}`);
  setTimeout(() => {
    process.exit(1);
  }, 100);
});

process.on("unhandledRejection", err => {
  log("error", `[App] Unhandled rejection: ${err.stack || err.error?.stack || err}`);
});

let rcToken = "";
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] == "--rc-token") {
    if (process.argv[++i]) {
      rcToken = crypto.createHash("sha1").update(process.argv[i]).digest("hex");
      break;
    }
  }
}

const pack = require("./package.json");

if (config.clearStorage) {
  store.clear();
}

let webview = null;

const setApplicationMenu = () => {
  log("info", "Enabling Dev Menu.");
  Menu.setApplicationMenu(Menu.buildFromTemplate([{
    label: "Development",
    submenu: [{
      label: "Reload",
      accelerator: "CmdOrCtrl+R",
      click: () => {
        if (win && win.webContents && !win.isDestroyed()) {
          win.webContents.reloadIgnoringCache();
        }
      },
    }, {
      label: "Toggle DevTools",
      accelerator: "CmdOrCtrl+Shift+I",
      click: () => {
        if (win && win.webContents && !win.isDestroyed()) {
          if (win.webContents.isDevToolsOpened()) {
            win.webContents.closeDevTools();
          } else {
            win.webContents.openDevTools({ mode: 'detach' });
          }
          log('info', '[DevTools] Toggled for main window.');
          win.webContents.send("toggleDevTools");
        }
      },
    }],
  }]));
};

const loadClient = () => {
  win.loadURL(`file://${__dirname}/gui/index.html`);
};

const updateStatus = {
  state: "idle",
  progress: 0,
};

let autoUpdateTimeoutId = null;

const scheduleAutoUpdate = (delayMs) => {
  // Banana Jam: auto-updates are switched off
  return;
  log("debug", `Scheduled update check: ${delayMs}ms`);
  if (autoUpdateTimeoutId !== null) {
    clearTimeout(autoUpdateTimeoutId);
  }
  autoUpdateTimeoutId = setTimeout(() => autoUpdater.checkForUpdates(), delayMs);
};

const autoUpdateProgress = (state, progress = null) => {
  updateStatus.state = state;
  updateStatus.progress = progress || null;
  if (win && win.webContents && !win.isDestroyed()) {
    win.webContents.send("autoUpdateStatus", updateStatus);
  }
};

if (!config.noUpdater) {
  scheduleAutoUpdate(AUTO_UPDATE_STARTUP_DELAY_MS);
  autoUpdater.on("error", (error) => {
    log("error", `[AutoUpdate] Error: ${error}`);
    autoUpdateProgress("error");
    scheduleAutoUpdate(AUTO_UPDATE_PERIODIC_DELAY_MS);
  });
  autoUpdater.on("checking-for-update", () => {
    log("info", "[AutoUpdate] Checking for update...");
    autoUpdateProgress("check");
  });
  autoUpdater.on("update-available", () => {
    log("info", "[AutoUpdate] Update available.");
    autoUpdateProgress("download", 1);
  });
  autoUpdater.on("update-not-available", () => {
    log("info", "[AutoUpdate] Update not available.");
    autoUpdateProgress("idle");
    scheduleAutoUpdate(AUTO_UPDATE_PERIODIC_DELAY_MS);
  });
  autoUpdater.on("download-progress", (progress) => {
    log("info", `[AutoUpdate] Download progress: ${progress.percent}%`);
    autoUpdateProgress("download", progress.percent);
  });
  autoUpdater.on("update-downloaded", () => {
    log("info", "[AutoUpdate] Update downloaded, will install on next restart.");
    autoUpdateProgress("restart");
    store.set("app.lastUpdatedAt", new Date().getTime());
  });
}

ipcMain.on("loaded", async (event, message) => {
  webview = event.sender;
  const username = store.get("login.username") || "";
  const rememberMe = store.get("login.rememberMe") !== false;
  let password = "";

  if (username && rememberMe) {
    password = store.get(`savedAccountPasswords.${username}`) || "";
  }

  const df = await getDf();

  if (webview && webview.send) {
    webview.send("loginInfoLoaded", {
      username,
      password,
      rememberMe,
      df,
      config,
      rcToken,
    });
  }


  if (Object.keys(store.store).length === 0) {
    log("debug", "Listening for Autologin data.");
    (async () => {
      try {
        const data = await server.listenForAutoLogin();
        log("debug", `Webserver stopped, ${data ? "received data." : "did not receive data."}`);
        if (data) {
          if (data.affiliateCode) {
            store.set("login.affiliateCode", data.affiliateCode);
          }
          if (win && win.webContents && !win.isDestroyed()) {
            win.webContents.send("obtainedToken", {
              token: data.authToken,
            });
          }
        }
      }
      catch (err) {
        log("debugError", JSON.stringify(err));
      }
    })();
  }

  win.on("enter-full-screen", () => {
    setTimeout(() => {
      if (wzInGame) store.set("window.state", "fullScreen");
      if (webview && webview.send) webview.send("screenChange", "fullScreen");
    }, 1);
  });

  win.on("maximize", () => {
    if (wzInGame) store.set("window.state", "maximized");
    if (webview && webview.send) webview.send("screenChange", "maximized");
  });

  win.on("unmaximize", () => {
    if (wzInGame) store.set("window.state", "windowed");
    if (webview && webview.send) webview.send("screenChange", "windowed");
  });

  win.on("leave-full-screen", () => {
    // Banana Jam: a frameless window can come back off-screen or tiny; put it back somewhere sensible
    setTimeout(() => {
      try {
        if (!win || win.isDestroyed() || win.isFullScreen() || win.isMaximized()) return;
        const b = win.getBounds();
        const wa = require("electron").screen.getDisplayMatching(b).workArea;
        const bad = b.width < 300 || b.height < 300 || b.x + b.width < wa.x + 60 || b.x > wa.x + wa.width - 60 || b.y < wa.y - 5 || b.y > wa.y + wa.height - 60;
        if (bad) {
          win.setSize(wzInGame ? (store.get("window.width") || 1440) : WZ_COMPACT.width, wzInGame ? (store.get("window.height") || 880) : WZ_COMPACT.height);
          win.center();
        }
        if (!win.isVisible()) win.show();
        win.focus();
      } catch (e) {}
    }, 250);
    if (wzInGame) store.set("window.state", "windowed");
    if (webview && webview.send) webview.send("screenChange", "windowed");
  });

  win.on("minimize", () => {
    log("debug", "[Window] Window minimized");
    const backgroundProcessing = store.get("backgroundProcessing", true);
    if (backgroundProcessing) {
      if (win && win.webContents && !win.isDestroyed()) {
        win.webContents.backgroundThrottling = false;
      }
    }
    if (webview && webview.send) {
      webview.send("screenChange", "minimized");
    }
  });

  win.on("restore", () => {
    log("debug", "[Window] Window restored");
    if (win && win.webContents && !win.isDestroyed()) {
      win.webContents.backgroundThrottling = true;
    }
    if (webview && webview.send) {
      webview.send("screenChange", "restored");
    }
  });

  win.on("close", (event) => {
    log("debug", `[Exit Confirmation] Window close event triggered. isClosing: ${isClosing}`);
    
    if (isClosing) {
      log("info", "[Exit Confirmation] isClosing=true, allowing window to close");
      try {
        const position = win.getPosition();
        store.set("window.x", position[0]);
        store.set("window.y", position[1]);
        log("debug", "[Exit Confirmation] Saved window position");
      } catch (err) {
        log("warn", `[Exit Confirmation] Failed to save window position: ${err.message}`);
      }
      
      notifyStrawberryJamClose();
      log("debug", "[Exit Confirmation] Close notification sent, allowing close to proceed");
      return;
    }
    
    event.preventDefault();

    const skipConfirmation = store.get("ui.skipExitConfirmation", false);
    log("debug", `[Exit Confirmation] Skip confirmation setting: ${skipConfirmation}`);
    
    if (skipConfirmation) {
      log("info", "[Exit Confirmation] Skipping confirmation due to user preference");
      isClosing = true;
      win.close();
      return;
    }
    
    // Banana Jam: closing from the taskbar can leave the window minimised or off-screen, so the question is never seen
    try {
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        const wb = win.getBounds();
        const wa = require("electron").screen.getDisplayMatching(wb).workArea;
        if (wb.width < 300 || wb.height < 300 || wb.x + wb.width < wa.x + 60 || wb.x > wa.x + wa.width - 60 || wb.y < wa.y - 5 || wb.y > wa.y + wa.height - 60) {
          win.setSize(wzInGame ? (store.get("window.width") || 1440) : WZ_COMPACT.width, wzInGame ? (store.get("window.height") || 880) : WZ_COMPACT.height);
          win.center();
        }
        if (!win.isVisible()) win.show();
        win.focus();
      }
    } catch (e) {}
    if (win && win.webContents && !win.isDestroyed()) {
      log("debug", "[Exit Confirmation] Sending show-exit-confirmation to renderer");
      win.webContents.send("show-exit-confirmation");
    } else {
      log("error", "[Exit Confirmation] Cannot send to renderer - window not available");
    }
  });
});

ipcMain.on("loginSucceeded", async (event, message) => {
  log("debug", `[IPC] loginSucceeded received. Saving login data for ${message.username}`);
  server.stop();

  store.set("login.username", message.username);
  store.set("login.language", message.language);
  translation.setLanguage(message.language);
  store.set("login.rememberMe", message.rememberMe);

  if (message.authToken) {
    store.set("login.authToken", message.authToken);
    store.set(`accounts.${message.username}.authToken`, message.authToken);
  }

  if (message.refreshToken) {
    store.set("login.refreshToken", message.refreshToken);
    store.set(`accounts.${message.username}.refreshToken`, message.refreshToken);
  }
});

ipcMain.handle('get-account-tokens', async (event, username) => {
  if (!username) return { authToken: null, refreshToken: null };
  const authToken = store.get(`accounts.${username}.authToken`) || null;
  const refreshToken = store.get(`accounts.${username}.refreshToken`) || null;
  return { authToken, refreshToken };
});

ipcMain.on("rememberMeStateUpdated", async (event, message) => {
  log('debug', `[IPC] rememberMeStateUpdated received: ${message.newValue}`);
  store.set("login.rememberMe", message.newValue);
});

ipcMain.on("clearAuthToken", async (event, message) => {
  log('debug', '[IPC] clearAuthToken received.');
  store.delete("login.authToken"); 
  const username = store.get("login.username");
  if (username) {
    store.delete(`accounts.${username}.authToken`);
  }
});

ipcMain.on("clearRefreshToken", async (event, message) => {
  log('debug', '[IPC] clearRefreshToken received.');
  store.delete("login.refreshToken"); 
  const username = store.get("login.username");
  if (username) {
    store.delete(`accounts.${username}.refreshToken`);
  }
});

ipcMain.on("about", async (event, message) => {
  if (win) {
    const details = [
      `${translate("version")}: ${pack.version}`,
      `${translate("os")}: ${getOsName()} ${os.arch()} ${os.release()}`,
    ];
    const lastUpdatedAt = store.get("app.lastUpdatedAt");
    if (lastUpdatedAt) {
      details.push(`${translate("lastUpdated")}: ${lastUpdatedAt}`);
    }
    const username = store.get("login.username");
    if (username) {
      details.push(`${translate("username")}: ${username}`);
    }
    const buttons = [translate("copyDetails"), translate("ok")];
    if (updateStatus.state == "restart") {
      details.push(`\n${translate("restartMessage")}`);
      buttons.unshift(translate("restartButton"));
    }
    else if (updateStatus.state == "error") {
      details.push(`\n${translate("updateError")}`);
      buttons.unshift(translate("websiteButton"));
    }
    const returnValue = await dialog.showMessageBox(win, {
      type: "none",
      // Banana Jam: no icon here, so it keeps the normal Animal Jam icon
      title: `${pack.productName}`,
      message: `${pack.productName}`,
      detail: details.join("\n"),
      buttons,
      cancelId: buttons.length - 1,
      defaultId: buttons.length - 1,
    });
    if (updateStatus.state == "restart" && returnValue.response == 0) {
      autoUpdater.quitAndInstall();
    }
    if (updateStatus.state == "error" && returnValue.response == 0) {
      shell.openExternal(config.webClassic);
    }
    else if (returnValue.response == buttons.length - 2) {
      clipboard.writeText(details.join("\n"));
    }
  }
});

const getOsName = () => {
  switch (os.platform()) {
    case "win32": return "Windows";
    case "darwin": return "macOS";
    case "linux": return "Linux";
    default: return "Unknown";
  }
};

const getSystemData = () => {
  const language = store.get("login.language") || app.getLocale().split("-")[0];
  translation.setLanguage(language);
  return {
    version: pack.version,
    platform: os.platform(),
    platformRelease: os.release(),
    language,
    affiliateCode: store.get("login.affiliateCode") || "",
  };
};

const getDf = async () => {
  const uuidSpooferEnabled = store.get(STORE_KEY_UUID_SPOOFER, false);
  if (uuidSpooferEnabled) {
    if (spoofedUuid) {
      log("debug", `[DF] UUID spoofing enabled, using existing spoofed UUID: ${spoofedUuid.substr(0, 8)}...`);
      return spoofedUuid;
    }
    const newUuid = uuidv4();
    spoofedUuid = newUuid; 
    log("debug", `[DF] UUID spoofing enabled, generated new spoofed UUID: ${newUuid.substr(0, 8)}...`);
    return newUuid;
  }
  try {
    const realMachineId = await getCurrentMachineId();
    store.set("login.df", realMachineId);
    log("debug", `[DF] UUID spoofing disabled, using original machine ID: ${realMachineId.substr(0, 8)}...`);
    return realMachineId;
  } catch (err) {
    log("debugError", `[DF] Error getting machine ID: ${JSON.stringify(err)}`);
    const storedDf = store.get("login.df");
    if (storedDf) {
      log("debug", `[DF] Using stored machine ID: ${storedDf.substr(0, 8)}...`);
      return storedDf;
    } else {
      const fallbackUuid = uuidv4();
      store.set("login.df", fallbackUuid);
      log("debug", `[DF] Using random UUID as fallback machine ID: ${fallbackUuid.substr(0, 8)}...`);
      return fallbackUuid;
    }
  }
};

// ---- Banana Jam: colour picker in its own see-through window (can move outside the app) ----
let wzPickerWin = null;

ipcMain.on("wz-picker-open", (event, opts) => {
  if (!win || win.isDestroyed()) return;
  opts = opts && typeof opts === "object" ? opts : {};
  const zoom = { small: 0.85, normal: 1, large: 1.15 }[opts.size] || 1;
  // a first guess; the picker page tells us its exact size once it has drawn
  const width = Math.round(322 * zoom) + 16, height = Math.round(575 * zoom) + 16;
  const b = win.getBounds();
  const saved = store.get("wzPickerWin");
  // it goes beside the game window when there is room, otherwise on top of its right side; it always stays on the screen
  const wa = require("electron").screen.getDisplayMatching(b).workArea;
  let x = b.x + b.width + 8, y = b.y + 40;
  if (x + width > wa.x + wa.width) x = b.x + b.width - width - 24;
  if (saved && typeof saved.x === "number" && typeof saved.y === "number") { x = saved.x; y = saved.y; }
  x = Math.round(Math.min(Math.max(x, wa.x), wa.x + wa.width - width));
  y = Math.round(Math.min(Math.max(y, wa.y), wa.y + wa.height - height));
  const query = encodeURIComponent(JSON.stringify(opts));
  if (wzPickerWin && !wzPickerWin.isDestroyed()) wzPickerWin.close();
  wzPickerWin = new BrowserWindow({
    parent: win,
    x, y, width, height,
    frame: false,
    transparent: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "gui/pickerPreload.js"),
    },
  });
  wzPickerWin.setMenu(null);
  wzPickerWin.loadURL(`file://${__dirname}/gui/picker.html#${query}`);
  // show it once it knows its size (or after a moment, just in case)
  const shownWin = wzPickerWin;
  setTimeout(() => { if (shownWin && !shownWin.isDestroyed() && !shownWin.isVisible()) shownWin.show(); }, 1200);
  const savePos = () => {
    if (!wzPickerWin || wzPickerWin.isDestroyed()) return;
    const pb = wzPickerWin.getBounds();
    store.set("wzPickerWin", { x: pb.x, y: pb.y });
  };
  wzPickerWin.on("moved", savePos);
  wzPickerWin.on("closed", () => {
    wzPickerWin = null;
    if (win && !win.isDestroyed()) win.webContents.send("wz-picker-closed");
  });
});

ipcMain.on("wz-picker-color", (event, data) => {
  if (win && !win.isDestroyed()) win.webContents.send("wz-picker-color", data);
});

// ---- Banana Jam: our own title bar (minimise, maximise, close) ----
function wzSendWindowState() {
  if (!win || win.isDestroyed()) return;
  win.webContents.send("wz-win-state", {
    maximized: win.isMaximized(),
    fullscreen: win.isFullScreen(),
    focused: win.isFocused(),
  });
}
function wzWatchWindowState() {
  ["maximize", "unmaximize", "enter-full-screen", "leave-full-screen", "focus", "blur", "restore"]
    .forEach((name) => win.on(name, () => setTimeout(wzSendWindowState, 10)));
  win.webContents.on("did-finish-load", () => {
    wzSendWindowState();
    // the real Animal Jam icon, for the title bar while the game is running
    app.getFileIcon(process.execPath, { size: "small" })
      .then((img) => { if (win && !win.isDestroyed()) win.webContents.send("wz-win-icon", img.toDataURL()); })
      .catch(() => {});
  });
}
ipcMain.on("wz-win", (event, action) => {
  if (!win || win.isDestroyed()) return;
  if (action === "minimize") win.minimize();
  else if (action === "maximize") {
    if (win.isFullScreen()) win.setFullScreen(false);
    else if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  } else if (action === "close") win.close(); // shows the usual "are you sure?" first
  else if (action === "state") wzSendWindowState();
});

ipcMain.on("wz-picker-size", (event, data) => {
  if (!wzPickerWin || wzPickerWin.isDestroyed() || !data) return;
  const w = Math.max(200, Math.min(800, Math.round(Number(data.width) || 0)));
  const h = Math.max(200, Math.min(1000, Math.round(Number(data.height) || 0)));
  wzPickerWin.setContentSize(w, h);
  if (!wzPickerWin.isVisible()) wzPickerWin.show();
});

ipcMain.on("wz-picker-close", () => {
  if (wzPickerWin && !wzPickerWin.isDestroyed()) wzPickerWin.close();
});

// colours shared with the launcher
try { require('./bjShared').install(app, ipcMain, BrowserWindow); } catch (e) { console.error('[Banana Jam] shared colours', e); }

ipcMain.on("wz-picker-reset-position", () => {
  store.delete("wzPickerWin");
});

// ---- Banana Jam: small window on the login screen, full size in game ----
// a thin border around the login box (the title bar is part of this height)
const WZ_COMPACT = { width: 410, height: 604, minWidth: 380, minHeight: 540 };
const WZ_GAME_MIN = { width: 900, height: 550 };
let wzInGame = false;

ipcMain.on("wz-game-mode", (event, inGame) => {
  if (!win || win.isDestroyed()) return;
  inGame = !!inGame;
  if (inGame === wzInGame) return;
  if (inGame) {
    wzInGame = true;
    win.setMinimumSize(WZ_GAME_MIN.width, WZ_GAME_MIN.height);
    const state = store.get("window.state");
    if (state === "fullScreen") {
      win.setFullScreen(true);
    } else if (state === "maximized") {
      win.maximize();
    } else {
      win.setSize(store.get("window.width") || 1440, store.get("window.height") || 880);
      win.center();
    }
  } else {
    wzInGame = false;
    if (win.isFullScreen()) win.setFullScreen(false);
    if (win.isMaximized()) win.unmaximize();
    win.setMinimumSize(WZ_COMPACT.minWidth, WZ_COMPACT.minHeight);
    win.setContentSize(WZ_COMPACT.width, WZ_COMPACT.height);
    win.center();
  }
});

ipcMain.on("ready", () => {
  if (webview && webview.send) {
    webview.send("postSystemData", getSystemData());
    const screenState = store.get("window.state");
    webview.send("screenChange", screenState);
  }
});

ipcMain.on("winReady", () => {
  if (win && win.webContents && !win.isDestroyed()) {
    win.webContents.send("postSystemData", getSystemData());
  }
});

ipcMain.on('user-now-logged-in', () => {
  isUserLoggedIn = true;
  log('info', '[App IPC] Received user-now-logged-in. Status: true');
});

ipcMain.on('user-now-logged-out', () => {
  isUserLoggedIn = false;
  log('info', '[App IPC] Received user-now-logged-out. Status: false');
});

const handleKey = event => {
  const platform = getSystemData().platform;
  const isWinOrLinux = platform === "win32" || platform === "linux";
  if (
    (event.key === "Enter" && event.altKey && isWinOrLinux)
    || (event.key === "F11" && isWinOrLinux)
    || (event.key === "f" && event.ctrlKey && event.metaKey && platform === "darwin")
  ) {
    if (win) win.setFullScreen(!win.isFullScreen());
  }
  else if (
    (event.key === "q" && event.ctrlKey && isWinOrLinux)
    || (event.key === "F4" && event.altKey && isWinOrLinux)
    || (event.key === "q" && event.metaKey && platform === "darwin")
  ) {
    app.quit();
  }
};

ipcMain.on("openExternal", (event, message) => {
  if (['https:', 'http:'].includes(new URL(message.url).protocol)) {
    shell.openExternal(message.url);
  }
});

ipcMain.on("keyEvent", (event, message) => handleKey(message));

if (store.get("window.fullscreen")) {
  store.set("window.state", "fullScreen");
  store.delete("window.fullscreen");
}

ipcMain.on("systemCommand", (event, message) => {
  if (message.command === "toggleFullScreen") {
    if (win) win.setFullScreen(!win.isFullScreen());
  }
  else if (message.command === "exit") {
    app.quit();
  }
  else if (message.command === "print") {
    printWindow = new BrowserWindow({
      // Banana Jam: no icon here, so it keeps the normal Animal Jam icon
      enableLargerThanScreen: true,
      x: 0,
      y: 0,
      useContentSize: true,
      resizable: false,
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: false,
        preload: path.join(__dirname, "gui/printPreload.js"),
      },
      fullscreen: false,
      fullscreenable: false,
      backgroundColor: "#FFFFFF",
    });
    printWindow.setSize(2480, 3508);
    if (config.showTools) {
      if (printWindow.webContents && !printWindow.isDestroyed()) printWindow.webContents.openDevTools();
    }
    else {
      printWindow.hide();
    }
    printWindow.loadURL(`file://${__dirname}/gui/print.html`);

    ipcMain.on("readyForImage", event => {
      if (event.sender && event.sender.send) {
        event.sender.send("setImage", {
          image: message.image,
          width: message.width,
          height: message.height,
        });
      }
      if (printWindow && printWindow.webContents && !printWindow.isDestroyed()) {
        printWindow.webContents.print({silent: false, printBackground: false, deviceName: ""});
      }
    });

    ipcMain.on("closePrintWindow", event => {
      if (printWindow) printWindow.close();
    });
  }
});

ipcMain.on("open-devtools-both", () => {
  try {
    if (win && win.webContents && !win.isDestroyed()) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    }
    
    if (win && win.webContents && !win.isDestroyed()) {
      win.webContents.send('toggleDevTools');
    }
  } catch (error) {
    log("error", `[DevTools] Error toggling devtools: ${error.message}`);
  }
});

ipcMain.handle("toggle-uuid-spoofing", async (event, enable) => {
  try {
    log("debug", `[UUID] Received toggle-uuid-spoofing: ${enable}`);
    if (enable) {
      const confirmed = await showUuidActivationConfirmation();
      if (!confirmed) {
        log("info", "[UUID] User cancelled UUID spoofing activation");
        return { success: false, message: "Activation cancelled by user" };
      }
    }
    const result = await toggleUuidSpoofing(enable);
    if (result.success) {
      return { success: true, enabled: enable, message: enable ? "UUID spoofing enabled" : "UUID spoofing disabled" };
    } else {
      return { success: false, message: result.error || "Failed to toggle UUID spoofing" };
    }
  } catch (error) {
    log("error", `[UUID] Error in toggle-uuid-spoofing handler: ${error.message}`);
    return { success: false, message: error.message || "An unknown error occurred" };
  }
});

const DEFAULT_APP_STATE = {
  accountTester: {
    currentFile: null,
    scrollIndex: {},
    filterQuery: {},
    fileStates: {}
  }
};
let appState = { ...DEFAULT_APP_STATE };

function initializeAppState() {
  log('debug', '[AppState] Initializing app state from store');
  try {
    const storedState = store.get('app_state');
    if (storedState) {
      appState = {
        ...DEFAULT_APP_STATE,
        ...storedState,
        accountTester: {
          ...DEFAULT_APP_STATE.accountTester,
          ...(storedState.accountTester || {}),
          fileStates: {
            ...DEFAULT_APP_STATE.accountTester.fileStates,
            ...(storedState.accountTester?.fileStates || {})
          },
          scrollIndex: {
            ...DEFAULT_APP_STATE.accountTester.scrollIndex,
            ...(storedState.accountTester?.scrollIndex || {})
          },
          filterQuery: {
            ...DEFAULT_APP_STATE.accountTester.filterQuery,
            ...(storedState.accountTester?.filterQuery || {})
          }
        }
      };
      log('debug', '[AppState] Loaded state from store');
    } else {
      log('debug', '[AppState] No stored state found, using defaults');
      appState = { ...DEFAULT_APP_STATE };
    }
  } catch (error) {
    log('error', `[AppState] Error initializing app state: ${error.message}`);
    appState = { ...DEFAULT_APP_STATE };
  }
}

async function saveAppState() {
  log('debug', '[AppState] Saving app state to store');
  try {
    store.set('app_state', appState);
    log('debug', '[AppState] State saved successfully');
    return true;
  } catch (error) {
    log('error', `[AppState] Error saving app state: ${error.message}`);
    return false;
  }
}

ipcMain.handle('get-api-port', async () => {
  const http = require('http');
  const ports = API_SERVER_PORTS;

  for (const port of ports) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 500 }, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json && json.service === 'strawberry-jam-api') {
                resolve(port);
              } else {
                reject(new Error('Not Strawberry Jam API'));
              }
            } catch {
              reject(new Error('Invalid response'));
            }
          });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.on('error', reject);
      });
      if (result) return result;
    } catch {
      continue;
    }
  }
  return null;
});

ipcMain.handle('get-server-port', async () => {
  return TCP_SERVER_PORTS[0];
});

ipcMain.handle('get-app-state', async () => {
  log('debug', '[IPC] Handling get-app-state request');
  return appState;
});

ipcMain.handle('set-app-state', async (event, newState) => {
  log('debug', '[IPC] Handling set-app-state request');
  if (!newState || typeof newState !== 'object') {
    log('error', '[IPC] Invalid state provided to set-app-state');
    return { success: false, error: 'Invalid state object' };
  }
  try {
    appState = {
      ...appState,
      ...newState,
      accountTester: {
        ...appState.accountTester,
        ...(newState.accountTester || {}),
        fileStates: {
          ...appState.accountTester.fileStates,
          ...(newState.accountTester?.fileStates || {})
        },
        scrollIndex: {
          ...appState.accountTester.scrollIndex,
          ...(newState.accountTester?.scrollIndex || {})
        },
        filterQuery: {
          ...appState.accountTester.filterQuery,
          ...(newState.accountTester?.filterQuery || {})
        }
      }
    };
    await saveAppState();
    log('debug', '[IPC] App state updated successfully');
    return { success: true };
  } catch (error) {
    log('error', `[IPC] Error updating app state: ${error.message}`);
    return { success: false, error: error.message };
  }
});

async function getSavedAccountsData() {
  log('debug', '[AccMan Helper] Fetching saved accounts data (using plaintext store).');
  const accountsFromStore = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
  const accountsWithPasswords = [];
  for (const acc of accountsFromStore) {
    const storedPassword = store.get(`savedAccountPasswords.${acc.username}`);
    accountsWithPasswords.push({ ...acc, password: storedPassword || null });
    if (storedPassword) {
      log('warn', `[WINAPP AccMan Helper] Retrieved plaintext password for ${acc.username} from electron-store.`);
    } else {
      log('info', `[WINAPP AccMan Helper] No plaintext password found in electron-store for ${acc.username}.`);
    }
  }
  return accountsWithPasswords;
}

ipcMain.handle('get-saved-accounts', async () => {
  log('debug', '[AccMan IPC] Handling get-saved-accounts request');
  return await getSavedAccountsData();
});

ipcMain.handle('save-account', async (event, accountData) => {
  log('debug', `[AccMan] Handling save-account request for ${accountData.username}`);
  if (!accountData || !accountData.username || !accountData.password) {
    log('error', '[AccMan] Invalid account data provided to save-account');
    return { success: false, error: 'Invalid account data' };
  }
  try {
    let savedAccountsMetadata = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
    const accountMetadata = { username: accountData.username };
    const existingAccountIndex = savedAccountsMetadata.findIndex(acc => acc.username.toLowerCase() === accountData.username.toLowerCase());
    if (existingAccountIndex !== -1) {
      savedAccountsMetadata[existingAccountIndex] = accountMetadata;
      log('info', `[AccMan] Updated existing account metadata: ${accountData.username}`);
    } else {
      savedAccountsMetadata.push(accountMetadata);
      log('info', `[AccMan] Added new account metadata: ${accountData.username}`);
    }
    store.set(`savedAccountPasswords.${accountData.username}`, accountData.password);
    log('warn', `[WINAPP AccMan] Stored plaintext password for ${accountData.username} in electron-store.`);
    store.set(STORE_KEY_SAVED_ACCOUNTS, savedAccountsMetadata);
    const updatedAccountsWithPasswords = await getSavedAccountsData();
    return { success: true, accounts: updatedAccountsWithPasswords };
  } catch (error) {
    log('error', `[AccMan] Error saving account: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-account', async (event, username) => {
  log('debug', `[AccMan] Handling delete-account request for ${username}`);
  if (!username) {
    log('error', '[AccMan] Invalid username provided to delete-account');
    return { success: false, error: 'Invalid username' };
  }
  try {
    let savedAccountsMetadata = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
    const initialLength = savedAccountsMetadata.length;
    savedAccountsMetadata = savedAccountsMetadata.filter(acc => acc.username.toLowerCase() !== username.toLowerCase());
    if (savedAccountsMetadata.length < initialLength) {
      store.set(STORE_KEY_SAVED_ACCOUNTS, savedAccountsMetadata);
      log('info', `[AccMan] Deleted account metadata for: ${username}`);
      store.delete(`savedAccountPasswords.${username}`);
      log('warn', `[WINAPP AccMan] Deleted plaintext password for ${username} from electron-store.`);
      const updatedAccountsWithPasswords = await getSavedAccountsData();
      return { success: true, accounts: updatedAccountsWithPasswords };
    } else {
      log('warn', `[AccMan] Account metadata not found for deletion: ${username}`);
      store.delete(`savedAccountPasswords.${username}`);
      const updatedAccountsWithPasswords = await getSavedAccountsData();
      return { success: false, error: 'Account not found', accounts: updatedAccountsWithPasswords };
    }
  } catch (error) {
    log('error', `[AccMan] Error deleting account: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-all-accounts', async () => {
  log('debug', '[AccMan] Handling delete-all-accounts request (non-pinned only)');
  try {
    const savedAccountsMetadata = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
    if (!Array.isArray(savedAccountsMetadata)) {
      store.set(STORE_KEY_SAVED_ACCOUNTS, []);
      return { success: true, deleted: 0 };
    }

    const nonPinned = savedAccountsMetadata.filter(acc => !acc?.pinned);
    const pinned = savedAccountsMetadata.filter(acc => acc?.pinned);
    const deletedCount = nonPinned.length;

    for (const account of nonPinned) {
      if (account && account.username) {
        store.delete(`savedAccountPasswords.${account.username}`);
      }
    }

    store.set(STORE_KEY_SAVED_ACCOUNTS, pinned);
    log('info', `[AccMan] Deleted non-pinned accounts (count: ${deletedCount}). Kept pinned: ${pinned.length}`);

    return { success: true, deleted: deletedCount, kept: pinned.length };
  } catch (error) {
    log('error', `[AccMan] Error deleting non-pinned accounts: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-pin-account', async (event, username) => {
  log('debug', `[AccMan] Handling toggle-pin-account request for ${username}`);
  if (!username) {
    log('error', '[AccMan] Invalid username provided to toggle-pin-account');
    return { success: false, error: 'Invalid username' };
  }
  try {
    let savedAccountsMetadata = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
    const accountIndex = savedAccountsMetadata.findIndex(acc => acc.username.toLowerCase() === username.toLowerCase());
    
    if (accountIndex === -1) {
      log('warn', `[AccMan] Account metadata not found for pin toggle: ${username}`);
      return { success: false, error: 'Account not found' };
    }
    
    savedAccountsMetadata[accountIndex].pinned = !savedAccountsMetadata[accountIndex].pinned;
    
    store.set(STORE_KEY_SAVED_ACCOUNTS, savedAccountsMetadata);
    log('info', `[AccMan] Toggled pin status for: ${username} to ${savedAccountsMetadata[accountIndex].pinned}`);
    
    const updatedAccountsWithPasswords = await getSavedAccountsData();
    return { success: true, accounts: updatedAccountsWithPasswords };
  } catch (error) {
    log('error', `[AccMan] Error toggling pin status: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-user-cache-file', async () => {
  try {
    const filePath = store.path;
    shell.openPath(filePath);
    log('info', `[AccMan] Opened user cache file: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    log('error', `[AccMan] Error opening user cache file: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-accounts', async (event, accounts) => {
  log('debug', `[AccMan] Handling import-accounts request for ${accounts.length} accounts`);
  if (!Array.isArray(accounts) || accounts.length === 0) {
    log('error', '[AccMan] Invalid accounts array provided to import-accounts');
    return { success: false, error: 'Invalid accounts array' };
  }

  try {
    let savedAccountsMetadata = store.get(STORE_KEY_SAVED_ACCOUNTS, []);
    let importedCount = 0;

    for (const account of accounts) {
      if (!account.username || !account.password) {
        log('warn', `[AccMan] Skipping invalid account: ${JSON.stringify(account)}`);
        continue;
      }

      const accountMetadata = { username: account.username };
      const existingAccountIndex = savedAccountsMetadata.findIndex(acc => 
        acc.username.toLowerCase() === account.username.toLowerCase()
      );

      if (existingAccountIndex !== -1) {
        savedAccountsMetadata[existingAccountIndex] = accountMetadata;
        log('info', `[AccMan] Updated existing account: ${account.username}`);
      } else {
        savedAccountsMetadata.push(accountMetadata);
        log('info', `[AccMan] Added new account: ${account.username}`);
      }

      store.set(`savedAccountPasswords.${account.username}`, account.password);
      importedCount++;
    }

    store.set(STORE_KEY_SAVED_ACCOUNTS, savedAccountsMetadata);
    log('info', `[AccMan] Import completed: ${importedCount} accounts imported`);

    const updatedAccountsWithPasswords = await getSavedAccountsData();
    return { 
      success: true, 
      imported: importedCount, 
      total: accounts.length,
      accounts: updatedAccountsWithPasswords 
    };
  } catch (error) {
    log('error', `[AccMan] Error importing accounts: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-df', async () => {
  try {
    const currentDf = await getDf();
    log('debug', `[IPC] Returning DF to renderer: ${currentDf}`);
    return currentDf;
  } catch (error) {
    log('error', `[IPC] Error handling get-df: ${error.message}`);
    return null; 
  }
});

ipcMain.handle("refresh-df", async (event) => {
  if (store.get(STORE_KEY_UUID_SPOOFER, false)) {
    const newUuid = uuidv4();
    spoofedUuid = newUuid;
    log("debug", `[DF] Refreshed DF - generated new UUID: ${newUuid}`);
    return newUuid;
  }
  return null;
});

const translate = (phrase) => {
  const {error, value} = translation.translate(phrase);
  if (error) {
    log("warn", error);
  }
  return value;
};

let isNotificationSent = false;
const notifyStrawberryJamClose = () => {
  try {
    if (isNotificationSent) {
      log("debug", "[AJ Classic Close] Notification already sent, skipping duplicate call");
      return;
    }
    
    log("info", "[AJ Classic Close] notifyStrawberryJamClose called - attempting to notify main Strawberry Jam app");
    
    const strawberryJamDataPath = process.env.STRAWBERRY_JAM_DATA_PATH;
    if (strawberryJamDataPath) {
      log("debug", `[AJ Classic Close] Found STRAWBERRY_JAM_DATA_PATH: ${strawberryJamDataPath}`);
      const http = require('http');

      const ports = API_SERVER_PORTS;
      let notificationSuccessful = false;
      
      const tryPort = (portIndex) => {
        if (portIndex >= ports.length || notificationSuccessful) {
          if (!notificationSuccessful) {
            log("warn", "[AJ Classic Close] Failed to notify Strawberry Jam on any port");
          }
          return;
        }
        
        const port = ports[portIndex];
        const postData = JSON.stringify({
          action: 'aj-classic-closing',
          timestamp: Date.now()
        });
        
        const options = {
          hostname: '127.0.0.1',
          port: port,
          path: '/api/aj-classic-close',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 1000
        };
        
        const req = http.request(options, (res) => {
          if (res.statusCode === 200 && !notificationSuccessful) {
            notificationSuccessful = true;
            isNotificationSent = true;
            log("info", `[AJ Classic Close] Successfully notified Strawberry Jam on port ${port}`);
          } else if (res.statusCode !== 200) {
            log("debug", `[AJ Classic Close] Unexpected response code ${res.statusCode} from port ${port}`);
            setTimeout(() => tryPort(portIndex + 1), 100);
          }
        });
        
        req.on('error', (err) => {
          log("debug", `[AJ Classic Close] Connection failed for port ${port}: ${err.message}`);
          setTimeout(() => tryPort(portIndex + 1), 100);
        });
        
        req.on('timeout', () => {
          log("debug", `[AJ Classic Close] Request timeout for port ${port}`);
          req.destroy();
          setTimeout(() => tryPort(portIndex + 1), 100);
        });
        
        req.write(postData);
        req.end();
      };
      
      tryPort(0);
    } else {
      log("warn", "[AJ Classic Close] STRAWBERRY_JAM_DATA_PATH environment variable not set - cannot notify main app");
    }
  } catch (error) {
    log("error", `[AJ Classic Close] Error in notifyStrawberryJamClose: ${error.message}`);
  }
};

ipcMain.on("exit-confirmation-response", (event, { confirmed, dontAskAgain }) => {
  log("debug", `[Exit Confirmation] Received response: confirmed=${confirmed}, dontAskAgain=${dontAskAgain}`);
  
  if (dontAskAgain) {
    store.set("ui.skipExitConfirmation", true);
    log("info", "[Exit Confirmation] User chose to skip confirmation in future");
  }
  
  if (confirmed) {
    log("info", "[Exit Confirmation] User confirmed exit, closing application");
    isClosing = true;
    
    setTimeout(() => {
      log("warn", "[Exit Confirmation] Force quitting application due to timeout");
      app.quit();
    }, 2000);
    
    if (win && !win.isDestroyed()) {
      log("debug", "[Exit Confirmation] Calling win.close()");
      win.close();
    } else {
      log("warn", "[Exit Confirmation] Window already destroyed or null, calling app.quit()");
      app.quit();
    }
  } else {
    log("debug", "[Exit Confirmation] User cancelled exit");
  }
});

ipcMain.on("translate", (event, message) => {
  if (win && win.webContents && !win.isDestroyed()) {
    win.webContents.send("translate", {
      phrase: message.phrase,
      requestId: message.requestId,
      value: translate(message.phrase),
    });
  }
});

// Banana Jam: Fast mode (off by default) uses the graphics card more and stops Windows slowing the game down when
// another window covers it. Turn it off in the game settings if the game looks wrong. Takes effect after a restart.
try {
  if (store.get("fastMode", false) === true) {
    app.commandLine.appendSwitch("enable-gpu-rasterization");
    app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
  }
} catch (e) { /* the game still starts without them */ }

app.commandLine.appendSwitch("ppapi-flash-path", path.join(__dirname, `${config.pluginPath}${config.pluginName}`));

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  console.log(`Certificate error: ${error} for ${url}`);
  event.preventDefault();
  callback(true);
});

app.whenReady().then(async () => {
  log('info', '[App] App ready event triggered.');

  initializeAppState();
  if (!store.has(STORE_KEY_UUID_SPOOFER)) {
    store.set(STORE_KEY_UUID_SPOOFER, false);
    log('info', '[Store] Initialized default UUID spoofer setting.');
  }
  if (!Array.isArray(store.get(STORE_KEY_SAVED_ACCOUNTS))) {
    store.set(STORE_KEY_SAVED_ACCOUNTS, []);
    log('info', '[Store] Initialized saved_accounts as empty array.');
  }
  // Banana Jam: new installs start with the Banana Jam custom theme switched on
  if (!store.has('ui.customThemeEnabled')) {
    store.set('ui.customThemeEnabled', true);
    store.set('ui.customThemeColor', '#5a67e8');
    store.set('ui.customThemeName', 'Banana Jam');
    store.set('ui.customThemeFruit', 'banana.png');
  }
  // Banana Jam: one-time move from the old green default to the safari default
  if (!store.get('wzSafariV1')) {
    if (String(store.get('ui.customThemeColor') || '').toLowerCase() === '#5e4308') {
      store.set('ui.customThemeColor', '#b07a3c');
    }
    store.set('wzSafariV1', true);
  }
  // Banana Jam: one-time move from the old melon-green start colour to banana yellow
  if (!store.get('wzBananaV1')) {
    if (String(store.get('ui.customThemeColor') || '').toLowerCase() === '#b07a3c') {
      store.set('ui.customThemeColor', '#f2c230');
    }
    store.set('wzBananaV1', true);
  }
  // Banana Jam: one-time move from the untouched banana-yellow start colour to the calm default
  if (!store.get('wzNeutralV1')) {
    if (String(store.get('ui.customThemeColor') || '').toLowerCase() === '#f2c230') {
      store.set('ui.customThemeColor', '#5a67e8');
    }
    store.set('wzNeutralV1', true);
  }
  if (!store.has('disableDevToolsEnabled')) {
    store.set('disableDevToolsEnabled', false);
    log('info', '[Store] Initialized default disableDevToolsEnabled.');
  }
  // Banana Jam: start as a small window just around the login box.
  // It grows to the saved game size when the game starts (see "wz-game-mode").
  win = new BrowserWindow({
    // Banana Jam: no icon here, so it keeps the normal Animal Jam icon
    minWidth: WZ_COMPACT.minWidth,
    minHeight: WZ_COMPACT.minHeight,
    width: WZ_COMPACT.width,
    height: WZ_COMPACT.height,
    center: true,
    useContentSize: true,
    resizable: true,
    webPreferences: {
      contextIsolation: true,
      webviewTag: true,
      nodeIntegration: true,
      preload: path.join(__dirname, "gui/preload.js"),
      plugins: true,
    },
    autoHideMenuBar: true,
    fullscreen: false,
    fullscreenable: true,
    // Banana Jam: no Windows frame; the page draws its own Windows 7 style title bar (always on, also in the game)
    frame: false,
    // Banana Jam: the saved Light / Dark colour while the page loads (no flash of another look); window shows once it is ready
    backgroundColor: require('./bjShared').startColour(app, 'game'),
    show: false,
  });
  {
    const wzShowNow = () => { try { if (win && !win.isDestroyed() && !win.isVisible()) win.show(); } catch (e) {} };
    win.once("ready-to-show", wzShowNow);
    setTimeout(wzShowNow, 4000);
  }
  win.setMenu(null);
  wzWatchWindowState();
  if (config.clearCache) {
    if (win.webContents && !win.isDestroyed()) {
      win.webContents.session.clearCache(() => {});
    }
  }
  loadClient();

  if (config.showTools && win && win.webContents && !win.isDestroyed()) {
      win.webContents.openDevTools({ mode: 'detach' });
      log('info', '[DevTools] Main window DevTools opened on startup due to config.showTools. GameScreen will handle its own if present.');
  }

  setApplicationMenu();
  win.on("closed", () => {
    win = null;
    if (printWindow) {
      printWindow.close();
    }
  });
  win.on("resize", () => {
    if (win && wzInGame && !win.isMaximized() && !win.isFullScreen()) {
      const bounds = win.getBounds();
      store.set("window.width", bounds.width);
      store.set("window.height", bounds.height);
    }
  });
  log('info', '[App] Auto-loading will be handled by renderer process.');
});

app.on("window-all-closed", () => {
  log('info', '[App] window-all-closed event triggered.');
  app.quit();
});

app.on('will-quit', () => {
  log('info', '[App] will-quit event triggered.');
  globalShortcut.unregisterAll();
  log('info', '[Shortcut] Unregistered all global shortcuts.');
});

ipcMain.handle('set-user-agent', async (event, userAgent) => {
  if (userAgent && typeof userAgent === 'string') {
    try {
      await session.defaultSession.setUserAgent(userAgent);
      return true;
    } catch (err) {
      console.error('[Tester Integration] Failed to set User-Agent on session:', err);
      return false;
    }
  } else {
    console.warn('[Tester Integration] Invalid User-Agent received for session:', userAgent);
    return false;
  }
});

// Banana Jam: the Mod Menu style editor's "Choose a picture" opens a normal Windows file picker
ipcMain.handle("bj-pick-image", async () => {
  try {
    const r = await dialog.showOpenDialog(win && !win.isDestroyed() ? win : undefined, {
      title: "Choose a picture for the Mod Menu",
      properties: ["openFile"],
      filters: [{ name: "Pictures", extensions: ["png", "jpg", "jpeg", "gif", "bmp", "webp"] }],
    });
    if (r.canceled || !r.filePaths || !r.filePaths[0]) return null;
    const fs = require("fs");
    const file = r.filePaths[0];
    if (fs.statSync(file).size > 15 * 1024 * 1024) return { error: "That picture is too big (15 MB max)." };
    const ext = (file.split(".").pop() || "png").toLowerCase().replace("jpg", "jpeg");
    return { data: `data:image/${ext};base64,` + fs.readFileSync(file).toString("base64") };
  } catch (e) { return { error: "Could not open that picture." }; }
});

ipcMain.handle("get-setting", async (event, key) => {
  try {
    if (key === 'uuidSpoofingEnabled') {
      return store.get(STORE_KEY_UUID_SPOOFER, false);
    } else if (key === 'debug.country') {
      return store.get('debug.country', '');
    } else if (key === 'debug.locale') {
      return store.get('debug.locale', '');
    }
    return store.get(key);
  } catch (error) {
    log('error', `[IPC] Error getting setting ${key}: ${error.message}`);
    return null;
  }
});

ipcMain.handle('set-setting', async (event, key, value) => {
  log('debug', `[IPC] Handling set-setting request for key: ${key}`);
  if (!key || typeof key !== 'string') {
    log('error', '[IPC] Invalid key provided to set-setting');
    return { success: false, error: 'Invalid key' };
  }
  try {
    if (key === 'uuid_spoofer_enabled') {
      store.set(STORE_KEY_UUID_SPOOFER, value === true);
      log("info", `[Settings] UUID spoofer set to: ${value === true}`);
      return true;
    } else if (key === 'debug.country') {
      store.set('debug.country', value);
      log("info", `[Settings] Country override set to: ${value || 'none'}`);
      return true;
    } else if (key === 'debug.locale') {
      store.set('debug.locale', value);
      log("info", `[Settings] Locale override set to: ${value || 'none'}`);
      return true;
    }
    store.set(key, value);
    return true;
  } catch (error) {
    log('error', `[IPC] Error updating setting ${key}: ${error.message}`);
    return { success: false, error: error.message };
  }
});
