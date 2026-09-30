"use strict";

(() => {
  customElements.define("ajd-game-screen", class extends HTMLElement {
    constructor() {
      super();

      this.blankPageString = "data:text/plain,";

      this.retrying = false;

      this.attachShadow({mode: "open"}).innerHTML = `
      <style>
      :host {
        --game-width: 900px;
        --game-height: 550px;
        --game-scale: 1;
        --button-tray-scale: 1.25;
        
          --primary-bg: #121212;
        --secondary-bg: #121212;
        --tertiary-bg: #16171f;
        --sidebar-border: #16171f;
        --text-primary: #C3C3C3;
        --highlight-green: #38b000;
        --theme-primary: #e83d52;
      }
      @media (min-aspect-ratio: 900 / 550) {
        :host {
          --game-width: calc(900 / 550 * 100vh);
          --game-height: 100vh;
          --game-scale: calc(550px / 100vh);
        }
      }
      @media (max-aspect-ratio: 900 / 550) {
        :host {
          --game-width: 100vw;
          --game-height: calc(550 / 900 * 100vw);
          --game-scale: calc(900px / 100vw);
        }
      }

      .hidden {
        opacity: 0;
        transition: opacity 0.3s ease-out;
      }

      #floating-button-tray {
        left: 99%;
        top: calc(-12% * var(--button-tray-scale));
        width: calc(var(--game-height) * 0.13 * var(--button-tray-scale));
        height: calc(var(--game-height) * 0.12 * var(--button-tray-scale));
        position: relative;
        z-index: 1;
        transition-property: left, opacity, transform;
        transition-duration: 0.2s, 0.3s, 0.2s;
        transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      }

      #floating-button-tray.hidden {
        left: 150vw;
        transform: scale(0.95);
      }

      #floating-button-tray.expanded {
        left: calc(91% + (100vw - var(--game-width)) / 2);
        transform: scale(1.02);
      }

      #game-frame-container {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template: 1fr var(--game-height) 1fr/1fr var(--game-width) 1fr;
        grid-template-areas: ". top ."
                            "left game right"
                            ". bottom .";
        background: radial-gradient(ellipse at center, var(--primary-bg) 0%, rgba(18, 18, 18, 0.95) 100%);
        position: relative;
       transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      #game-frame-container::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
        animation: subtleGlow 8s ease-in-out infinite;
      }

      @keyframes subtleGlow {
        0%, 100% { opacity: 0; }
        50% { opacity: 1; }
      }

      #game-frame-container.logged-out {
        grid-template-areas: "left game right"
                            ". bottom .";
        transform: scale(1.01);
      }

      .border-spiral-background {
        width: 100%;
        height: 100%;
        pointer-events: none;
        visibility: hidden;
      }

      #border-top, #border-right, #border-bottom, #border-left {
        visibility: hidden;
      }
      /* --- CUSTOM BORDER (Banana Jam) ---
         Each side reads its own variable. Values are any CSS background,
         so a plain colour works now and images/gradients can be added later. */
      #border-top-background    { background: var(--border-top, transparent); }
      #border-right-container   { background: var(--border-right, transparent); }
      #border-bottom-background { background: var(--border-bottom, transparent); }
      #border-left-background   { background: var(--border-left, transparent); }
      #border-top-background, #border-right-container,
      #border-bottom-background, #border-left-background {
        background-size: cover;
        background-position: center;
        transition: background 0.3s ease;
      }
      /* Only fill the frame with the border colour while the game is showing,
         so it can't peek out under the login screen. */
      :host(:not(.show)) #game-frame-container { background: none !important; }
      #border-top-background { grid-area: top; }
      #border-right-container { grid-area: right; }
      #border-bottom-background { grid-area: bottom; }
      #border-left-background { grid-area: left; }

      #docked-button-tray {
        border: 1px solid rgba(58, 61, 77, 0.3);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        position: absolute;
        height: 11vh;
        width: 12vh;
        left: 0vh;
        bottom: 2vh;
        backdrop-filter: blur(10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      #docked-button-tray:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      }

      #border-right-container {
        grid-area: right;
      }

      #flash-game-container {
        grid-area: game;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
        position: relative;
        overflow: hidden;
        transition: all 0.3s ease;
      }

      #mod-menu-btn {
        position: absolute;
        bottom: 10px;
        left: 10px;
        width: 32px;
        height: 32px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        background-color: rgba(18, 18, 18, 0.85);
        backdrop-filter: blur(6px);
        cursor: pointer;
        opacity: 0.7;
        transition: all 0.2s ease;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 100;
        padding: 0;
      }
      #mod-menu-btn:hover {
        opacity: 1;
        border-color: var(--theme-primary, #e83d52);
        transform: scale(1.05);
      }
      #mod-menu-btn svg {
        display: block;
        color: #888;
      }
      /* Banana Jam: "Fill the window" - no border, the game fills the whole window */
      #game-frame-container.wz-fill { grid-template: 1fr / 1fr !important; grid-template-areas: "game" !important; }
      #game-frame-container.wz-fill #border-top-background,
      #game-frame-container.wz-fill #border-right-container,
      #game-frame-container.wz-fill #border-bottom-background,
      #game-frame-container.wz-fill #border-left-background,
      #game-frame-container.wz-fill #wz-border-image { display: none !important; }
      #game-frame-container.wz-fill #flash-game-container { grid-area: game; width: 100%; height: 100%; }
      /* Banana Jam: border picture sits behind the game and the border strips */
      #wz-border-image {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        z-index: 0;
        display: none;
      }
      #wz-border-image-inner {
        position: absolute;
        inset: 0;
        transform-origin: var(--wz-border-x, 50%) var(--wz-border-y, 50%);
        transform: scale(var(--wz-border-scale, 1));
        transition: filter 0.3s ease;
      }
      #wz-border-image-img {
        position: absolute;
        inset: 0;
        background-image: var(--wz-border-image, none);
        background-size: cover;
        background-repeat: no-repeat;
        background-position: var(--wz-border-x, 50%) var(--wz-border-y, 50%);
        transform: scale(var(--wz-border-sx, 1), var(--wz-border-sy, 1));
      }
      #game-frame-container.wz-has-image #wz-border-image { display: block; }
      #game-frame-container.wz-blur #wz-border-image-inner { filter: blur(var(--wz-border-blur, 16px)); }
      #game-frame-container.wz-has-image #border-top-background,
      #game-frame-container.wz-has-image #border-bottom-background,
      #game-frame-container.wz-has-image #border-left-background,
      #game-frame-container.wz-has-image #border-right-container { background: transparent !important; }
      #border-top-background, #border-bottom-background, #border-left-background, #border-right-container { position: relative; z-index: 1; }
      #flash-game-container { z-index: 1; }

      /* Banana Jam: clean edges where the game meets the border (no rounded corners, glow or outline) */
      #flash-game-container {
        border-radius: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
      webview { border-radius: 0 !important; }
      /* Banana Jam: mod menu button uses the In-Game UI colour */
      #mod-menu-btn {
        background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 49%, rgba(0,0,0,0.06) 50%, rgba(255,255,255,0.12) 100%), var(--wz-ui, rgba(18, 18, 18, 0.85));
        border: 1px solid rgba(0, 0, 0, 0.45);
        border-radius: 4px;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
      }
      #mod-menu-btn:hover { border-color: rgba(255, 255, 255, 0.6); }
      #mod-menu-btn svg { color: #ffffff; }
      :host-context(.wz-style-modern) #mod-menu-btn { background: var(--wz-ui, rgba(18, 18, 18, 0.85)); border: 1px solid transparent; border-radius: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
      :host-context(.wz-style-cards) #mod-menu-btn { background: var(--wz-ui, rgba(18, 18, 18, 0.85)); border: 1px solid transparent; border-radius: 50%; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); }
      :host-context(.wz-style-bubble) #mod-menu-btn {
        background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 51%), var(--wz-ui, rgba(18, 18, 18, 0.85));
        border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 50%;
        box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.25), 0 3px 8px rgba(0, 0, 0, 0.3), 0 0 14px rgba(255, 255, 255, 0.35);
      }
      :host-context(.wz-style-bubble) #mod-menu-btn:hover { box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.55); }
      :host-context(.wz-style-comic) #mod-menu-btn {
        background: var(--wz-ui, rgba(18, 18, 18, 0.85));
        border: 2px solid #3b2f2f; border-radius: 12px; box-shadow: 2px 2px 0 #3b2f2f;
      }
      :host-context(.wz-style-comic) #mod-menu-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #3b2f2f; }

      webview {
        transition: opacity 0.75s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 4px;
      }

      webview.hidden {
        opacity: 0;
        transform: scale(0.98);
      }

      @media (max-width: 1024px) {
        #docked-button-tray {
          height: 10vh;
          width: 11vh;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

    </style>
    <div id="game-frame-container" class="logged-out">
      <div id="wz-border-image"><div id="wz-border-image-inner"><div id="wz-border-image-img"></div></div></div>
      <div id="border-top-background"></div>
      <div id="border-bottom-background"></div>
      <div id="border-left-background"></div>
      <div id="border-right-container"></div>
      <div id="flash-game-container">
        <webview id="flash-game-webview" plugins preload="gamePreload.js" webpreferences="contextIsolation=false" style="height: 100%; width: 100%;"></webview>
        <button id="mod-menu-btn" title="Toggle Mod Menu (F10)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
      </div>
    </div>
      `;
      
      this.webViewElem = this.shadowRoot.querySelector("webview");
      const preloadUrl = new URL('gamePreload.js', window.location.href).href;
      this.webViewElem.setAttribute('preload', preloadUrl);

      this.modMenuBtn = this.shadowRoot.getElementById("mod-menu-btn");
      if (this.modMenuBtn) {
        // the old corner button is replaced by the one in the bottom-left column
        this.modMenuBtn.style.display = 'none';
      }
      // Banana Jam: the in-game Mod Menu uses the same colours as the rest of the program
      this._bjLastTheme = '';
      this._bjPushTheme = () => {
        try {
          const wv = this.webViewElem;
          const host = document.getElementById('login-screen');
          if (!wv || !host || !this._webviewReady || !wv.executeJavaScript) return Promise.resolve(false);
          const cs = getComputedStyle(host);
          const probe = document.createElement('div');
          probe.style.display = 'none';
          document.body.appendChild(probe);
          const rgb = (v, fb) => {
            probe.style.color = '';
            probe.style.color = (v || '').trim() || fb;
            const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0];
            return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
          };
          const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t));
          const hex = (c) => c.map((n) => ('0' + Math.max(0, Math.min(255, n)).toString(16)).slice(-2)).join('');
          // when the program has not set its own colours yet, the Mod Menu starts on the Default look (dark unless Light is chosen)
          const light = !!(window.WzMode && window.WzMode.get() === 'light');
          const card = rgb(cs.getPropertyValue('--wz-card'), light ? '#faf9f6' : '#2b2d33');
          const text = rgb(cs.getPropertyValue('--wz-text'), light ? '#2a2f35' : '#ececec');
          const accent = rgb(cs.getPropertyValue('--wz-ui') || cs.getPropertyValue('--theme-primary'), light ? '#3f5b70' : '#5a67e8');
          document.body.removeChild(probe);
          const args = [accent, card, mix(card, text, 0.07), mix(card, text, 0.22), text, mix(text, card, 0.45)].map(hex);
          let look = 'mac';
          try { if (window.WzStyle) look = window.WzStyle.get().ui; } catch (e) {}
          const key = args.join(',') + '|' + look;
          if (key === this._bjLastTheme) return Promise.resolve(true);
          this._bjLastTheme = key;
          return wv.executeJavaScript(
            "(function(){try{var l=document.querySelectorAll('embed,object');for(var i=0;i<l.length;i++){if(typeof l[i].bjSetTheme==='function'){l[i].bjSetTheme('" +
            args.join("','") + "');if(typeof l[i].bjSetStyle==='function'){l[i].bjSetStyle('" + look + "');}return true;}}}catch(e){}return false;})()"
          );
        } catch (e) { return Promise.resolve(false); }
      };
      setInterval(() => { if (!document.hidden) this._bjPushTheme(); }, 5000);
      window.addEventListener('wz-style-change', () => { this._bjLastTheme = ''; try { this._bjPushTheme(); } catch (e) {} });
      // the Mod Menu's "Open style editor" button asks the game window to open the editor
      setInterval(() => {
        try {
          const wv = this.webViewElem;
          if (document.hidden || !wv || !this._webviewReady || !wv.executeJavaScript) return;
          wv.executeJavaScript(
            "(function(){try{var l=document.querySelectorAll('embed,object');for(var i=0;i<l.length;i++){if(typeof l[i].bjGetLook==='function'){return l[i].bjGetLook();}}}catch(e){}return '';})()"
          ).then((v) => {
            if (v === '@editor' && window.WzMenuStyle) window.WzMenuStyle.open();
            // the Mod Menu's sun / moon button: the same shared light / dark switch
            if (v === '@mode' && window.WzMode) window.WzMode.toggle();
          }, () => {});
        } catch (e) {}
      }, 1000);
      // the Mod Menu's own colours, borders and picture (from the style editor)
      this._bjSkinKey = null; this._bjImgKey = null;
      this._bjPushSkin = () => {
        try {
          const wv = this.webViewElem; const ms = window.WzMenuStyle;
          if (!wv || !ms || !this._webviewReady || !wv.executeJavaScript) return;
          const str = ms.serialize(); const img = ms.image();
          const find = "var l=document.querySelectorAll('embed,object');for(var i=0;i<l.length;i++){if(typeof l[i].bjSetSkin==='function'){";
          if (str !== this._bjSkinKey) {
            this._bjSkinKey = str;
            wv.executeJavaScript("(function(){try{" + find + "l[i].bjSetSkin('" + str + "');return true;}}}catch(e){}return false;})()").catch(() => {});
          }
          if (img !== this._bjImgKey) {
            this._bjImgKey = img;
            if (img) {
              const ask = () => { try { wv.executeJavaScript("(function(){try{" + find + "return l[i].bjSkinInfo();}}}catch(e){}return 'nofn';})()").then((r) => {
                if (window.WzMenuStyle && window.WzMenuStyle.status) {
                  window.WzMenuStyle.status(/^ok/.test(r) ? 'The menu is showing your picture (' + r.slice(3) + ').' : (r === 'nofn' ? 'Open the Mod Menu once so it can load the picture.' : 'The menu could not read this picture (' + r + '). Try a different one.'));
                }
              }, () => {}); } catch (e) {} };
              setTimeout(ask, 1500); setTimeout(ask, 4000);
            }
            wv.executeJavaScript("(function(){try{" + find + "l[i].bjSetSkinImage('" + img + "');return true;}}}catch(e){}return false;})()").catch(() => {});
          }
        } catch (e) {}
      };
      setInterval(() => { this._bjPushSkin(); }, 5000);
      window.addEventListener('bj-menuskin-change', () => { setTimeout(() => { this._bjPushSkin(); }, 120); });

      document.addEventListener('mod-menu-toggle', () => {
        const wv = this.webViewElem;
        if (!wv) return;
        const pressF10 = () => {
          try { wv.focus(); } catch (e) {}
          setTimeout(() => {
            try {
              wv.sendInputEvent({ type: 'keyDown', keyCode: 'F10' });
              wv.sendInputEvent({ type: 'keyUp', keyCode: 'F10' });
            } catch (e) {}
          }, 60);
        };
        try { this._bjPushTheme(); } catch (e) {}
        // First try asking the game directly (works even when the game window is not clicked).
        // If the game file does not have that command, press F10 instead.
        let p = null;
        try {
          p = wv.executeJavaScript(
            "(function(){try{var l=document.querySelectorAll('embed,object');" +
            "for(var i=0;i<l.length;i++){if(typeof l[i].bjToggleModMenu==='function'){l[i].bjToggleModMenu();return true;}}}catch(e){}return false;})()"
          );
        } catch (e) { p = null; }
        if (p && p.then) p.then((ok) => { if (!ok) pressF10(); }, pressF10);
        else pressF10();
      });

      this._webviewReady = false; this._bjSkinKey = null; this._bjImgKey = null;
      this._pendingDevToolsToggle = false;

      this.gameFrameElem = this.shadowRoot.getElementById("game-frame-container");
      this._applyGameBorder(window.GameBorder ? window.GameBorder.load() : null);
      document.addEventListener('game-border-changed', (e) => {
        this._applyGameBorder(e.detail);
      });

      this._boundLogoutHandler = () => {
        this.closeGame();
        this.dispatchEvent(new CustomEvent("switchToLogin"));
      };
      document.addEventListener("logout-requested", this._boundLogoutHandler);

      this._boundDragoverHandler = (event) => {
        event.preventDefault();
        return false;
      };
      this._boundDropHandler = (event) => {
        event.preventDefault();
        return false;
      };
      this.webViewElem.addEventListener("dragover", this._boundDragoverHandler, false);
      this.webViewElem.addEventListener("drop", this._boundDropHandler, false);

      this._boundWillNavigateHandler = (event) => {
        console.log(`[GAME NAVIGATION] Game webview attempting navigation to: ${event.url}`);
        console.log(`[GAME NAVIGATION] Closing game due to navigation request`);
        if (window.ipc) {
          window.ipc.send("session-cleanup");
        }
        this.closeGame();
        this.dispatchEvent(new CustomEvent("switchToLogin"));
      };
      this.webViewElem.addEventListener("will-navigate", this._boundWillNavigateHandler);

      this._boundRedirectHandler = (event) => {
        console.log(`[GAME NAVIGATION] Game webview received redirect request:`, {
          oldURL: event.oldURL,
          newURL: event.newURL
        });
        console.log(`[GAME NAVIGATION] Closing game due to redirect request`);
        if (window.ipc) {
          window.ipc.send("session-cleanup");
        }
        this.closeGame();
        this.dispatchEvent(new CustomEvent("switchToLogin"));
      };
      this.webViewElem.addEventListener("did-get-redirect-request", this._boundRedirectHandler);

      this._boundNewWindowHandler = (event) => {
        console.log(`[GAME NAVIGATION] Game webview requesting new window: ${event.url}`);
        event.preventDefault();
        console.log(`[GAME NAVIGATION] Opening URL in external browser: ${event.url}`);
        window.ipc.send("openExternal", {url: event.url});
      };
      this.webViewElem.addEventListener("new-window", this._boundNewWindowHandler);

      window.ipc.on("toggleDevTools", () => {
        console.log('[GameScreen] Received "toggleDevTools" IPC message.');
        if (!this.webViewElem) {
          console.warn('[GameScreen] Game webview not available or destroyed when trying to toggle DevTools via IPC.');
          return;
        }
        if (!this._webviewReady) {
          console.warn('[GameScreen] Game webview not ready yet, queuing DevTools toggle.');
          this._pendingDevToolsToggle = true;
          return;
        }
        if (this.webViewElem.isDevToolsOpened()) {
          this.webViewElem.closeDevTools();
          console.log('[GameScreen] Closed game webview DevTools via IPC.');
        } else {
          this.webViewElem.openDevTools({ mode: 'detach' });
          console.log('[GameScreen] Opened game webview DevTools via IPC.');
        }
      });

      const sanitizeLogMessage = (message) => {
        let sanitized = message;
        
        const sensitiveJsonKeys = ['authToken', 'refreshToken', 'df', 'username', 'password', 'auth_token', 'gameSessionIdStr'];
        sensitiveJsonKeys.forEach(key => {
          const regex = new RegExp(`(["']?${key}["']?\\s*:\\s*["'])([^"']*)(["'])`, 'gi');
          sanitized = sanitized.replace(regex, `$1[REDACTED]$3`);
        });

        const passwordWarningRegex = /(Retrieved plaintext password for )([^ ]+)( from)/gi;
        sanitized = sanitized.replace(passwordWarningRegex, '$1[REDACTED]$3');

        const tokenRegex = /([a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]+\.[a-zA-Z0-9-_]{20,})/g;
        sanitized = sanitized.replace(tokenRegex, '[REDACTED_TOKEN]');

        const dfRegex = /[a-f0-9]{64}/gi;
        sanitized = sanitized.replace(dfRegex, '[REDACTED_DF]');

        return sanitized;
      };

      this.webViewElem.addEventListener("console-message", (event) => {
        if (!window.gameClientConsoleLogs) {
          window.gameClientConsoleLogs = [];
        }
        if (window.gameClientConsoleLogs.length > 500) {
          window.gameClientConsoleLogs = window.gameClientConsoleLogs.slice(-400);
        }
        const logLevel = event.level === 0 ? 'INFO' : event.level === 1 ? 'WARN' : 'ERROR';
        window.gameClientConsoleLogs.push({
          level: logLevel,
          message: sanitizeLogMessage(event.message),
          timestamp: new Date().toISOString(),
        });
        
        if (event.level >= 1) {
          console.log('[GameScreen] Game webview ' + logLevel + ': ' + sanitizeLogMessage(event.message));
        }
        if (event.level >= 2) {
          if (window.ipc && window.ipc.send) {
            window.ipc.send('game-webview-console-error');
          }
        }
      });

      this.webViewElem.addEventListener("ipc-message", async event => {
        switch (event.channel) {
          case "signupCompleted": {
            const {username, password} = event.args[0];
            this.dispatchEvent(new CustomEvent("accountCreated", {detail: {username, password}}));

            try {
              const {flashVars, userData} = await globals.authenticateWithPassword(username, password);

              const data = {
                username: userData.username,
                authToken: userData.authToken,
                refreshToken: userData.refreshToken,
                accountType: userData.accountType,
                language: userData.language,
                rememberMe: false,
              };

              window.ipc.send("loginSucceeded", data);
              this.loadGame(flashVars);
            }
            catch (err) {
              console.error(`[GAME IPC] Failed to authenticate new account:`, err);
              globals.genericError(`Failed to log in after account creation: ${err}`);
            }
            break;
          }
          case "initialized": {
            console.log(`[GAME] Game initialized successfully`);
            setTimeout(() => {
              this.classList.add("no-transition-delays");
            }, 1000);
            this.gameFrameElem.classList.remove("logged-out");
            window.UserTrayManager.show();
            this.dispatchEvent(new CustomEvent("gameLoaded"));
          } break;
          case "reloadGame": {
            const reloadSwf = event.args[0];
            if (reloadSwf) {
              if (event.args[1] && (event.args[1].ip || event.args[1].sessionId)) {
                const reloadData = event.args[1];
                globals.reloadFlashVars = {};
                if (reloadData.ip) {
                  globals.reloadFlashVars.smartfoxServer = reloadData.ip;
                  globals.reloadFlashVars.blueboxServer = reloadData.ip;
                }
                if (reloadData.sessionId) {
                  globals.reloadFlashVars.gameSessionId = reloadData.sessionId;
                }
              }
              this.reloadGame();
            }
            else {
              this.closeGame();
            }
          } break;
          case "reportError": {
            globals.reportError("gameClient", event.args[0]);
          } break;
          case "printImage": {
            const imageData = event.args[0];
            window.ipc.send("systemCommand", {command: "print", width: imageData.width, height: imageData.height, image: imageData.image});
          } break;
        }
      });

    }

    async loadGame(flashVars, theme) {
      this._initModMenuButton();

      if (!this.userTray) {
        this.userTray = window.UserTrayManager.create(theme);
      }
      if (this.closeGameTimeout) {
        clearTimeout(this.closeGameTimeout);
        this.closeGameTimeout = null;
        this.resetWebView();
      }


      this.webViewElem.classList.remove("hidden");
      this.webViewElem.src = globals.config.gameWebClient;
      this.webViewElem.addEventListener("dom-ready", () => {
        this._webviewReady = true; this._bjSkinKey = null; this._bjImgKey = null; this._bjLastTheme = "";
        if (this._pendingDevToolsToggle) {
          this._pendingDevToolsToggle = false;
          this.webViewElem.openDevTools({ mode: 'detach' });
        }
        if (globals.config && globals.config.showTools) {
          if (this.webViewElem && !this.webViewElem.isDestroyed() && !this.webViewElem.isDevToolsOpened()) {
            this.webViewElem.openDevTools({ mode: 'detach' });
          }
        }
        console.log('[SWF] FlashVars ready, sending to webview');
        this.webViewElem.send("flashVarsReady", flashVars);

      }, {once: true});

      this.webViewElem.addEventListener("did-fail-load", event => {
        if (!event.isMainFrame) return;
        if (event.errorCode === -3) return;

        console.error(`[SWF] WebView failed to load:`, {
          validatedURL: event.validatedURL,
          errorCode: event.errorCode,
          errorDescription: event.errorDescription,
          isRetrying: this.retrying
        });
        if (this.retrying) {
          if (!event.validatedURL.includes("/welcome")) {
            console.error(`[SWF LOADING] Final load failure, dispatching loadFailed event`);
            this.dispatchEvent(new CustomEvent("loadFailed"));
            globals.genericError(`Web view failed to load url: ${globals.config.gameWebClient}`);
          }
        }
        else {
          this.retrying = true;
          setTimeout(() => {
            this.loadGame(flashVars);
          }, 2000);
        }
      }, {once: true});
    }

    _applyGameBorder(config) {
      if (!this.gameFrameElem) return;
      const sides = ['top', 'right', 'bottom', 'left'];
      const enabled = config && config.enabled;
      for (const side of sides) {
        const value = enabled ? ((config.sides && config.sides[side]) || config.all) : null;
        if (value) this.gameFrameElem.style.setProperty(`--border-${side}`, value);
        else this.gameFrameElem.style.removeProperty(`--border-${side}`);
      }
      // Fill the whole frame (including corners) so no dark gaps show around the game.
      this.gameFrameElem.style.background = enabled ? config.all : '';
      // Banana Jam: fill the whole window (no border)
      const fill = !!(config && config.fill);
      this.gameFrameElem.classList.toggle('wz-fill', fill);
      // (a moment later: a page element may not have its style touched while it is still being created)
      setTimeout(() => {
        if (fill) {
          this.style.setProperty('--game-width', '100vw');
          this.style.setProperty('--game-height', '100vh');
        } else {
          this.style.removeProperty('--game-width');
          this.style.removeProperty('--game-height');
        }
      }, 0);
      // Banana Jam: optional border picture, with blur on/off
      const image = enabled && config.image && /^data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+$/.test(config.image) ? config.image : null;
      this.gameFrameElem.classList.toggle('wz-has-image', !!image);
      const blurPx = typeof config.blur === 'number' ? config.blur : (config.blur === true ? 16 : 0);
      this.gameFrameElem.classList.toggle('wz-blur', !!image && blurPx > 0);
      this.gameFrameElem.style.setProperty('--wz-border-blur', `${blurPx}px`);
      const zoom = (typeof config.zoom === 'number' ? config.zoom : 100) / 100;
      const fs = this.gameFrameElem.style;
      fs.setProperty('--wz-border-scale', String(zoom * (blurPx > 0 ? 1.08 : 1)));
      fs.setProperty('--wz-border-x', `${typeof config.x === 'number' ? config.x : 50}%`);
      fs.setProperty('--wz-border-y', `${typeof config.y === 'number' ? config.y : 50}%`);
      fs.setProperty('--wz-border-sx', config.mirror ? '-1' : '1');
      fs.setProperty('--wz-border-sy', config.flip ? '-1' : '1');
      if (image) this.gameFrameElem.style.setProperty('--wz-border-image', `url("${image}")`);
      else this.gameFrameElem.style.removeProperty('--wz-border-image');
    }

    _initModMenuButton() {
      if (!this.modMenuBtn) return;
      this.modMenuBtn.style.display = 'none';
    }

    reloadGame() {
      this.closeGame();
      globals.reloadGame();
    }

    closeGame() {
      try {
        const wc = this.webViewElem.getWebContents()
        if (wc && wc.session) {
          wc.session.clearCache()
        }
      } catch (e) {}

      this.webViewElem.classList.add("hidden");
      this.retrying = false;
      this.closeGameTimeout = setTimeout(this.resetWebView.bind(this), 1000);
      this.classList.remove("no-transition-delays");
      this.classList.remove("show");
      window.UserTrayManager.hide();
    }

    resetWebView() {
      this._webviewReady = false; this._bjSkinKey = null; this._bjImgKey = null;
      if (this.webViewElem) {
        const loadPromise = this.webViewElem.loadURL ? this.webViewElem.loadURL(this.blankPageString) : null;
        if (loadPromise) loadPromise.catch(() => {});
        else this.webViewElem.src = this.blankPageString;
      }
      if (this.gameFrameElem) {
        this.gameFrameElem.classList.add("logged-out");
      }
      this.closeGameTimeout = null;
    }

    disconnectedCallback() {
      document.removeEventListener("logout-requested", this._boundLogoutHandler);
      if (this.webViewElem) {
        this.webViewElem.removeEventListener("dragover", this._boundDragoverHandler, false);
        this.webViewElem.removeEventListener("drop", this._boundDropHandler, false);
        this.webViewElem.removeEventListener("will-navigate", this._boundWillNavigateHandler);
        this.webViewElem.removeEventListener("did-get-redirect-request", this._boundRedirectHandler);
        this.webViewElem.removeEventListener("new-window", this._boundNewWindowHandler);
      }
      window.UserTrayManager.destroy();
    }
  });
})();
