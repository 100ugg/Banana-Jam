/**
 * @file confirmExitModal.js - Modal for confirming application exit.
 */

const { ipcRenderer } = require('electron');

// Define isDevelopment for environment checks
const isDevelopment = process.env.NODE_ENV === 'development';

// Helper: Only log in development
function devLog(...args) {
  if (isDevelopment) console.log(...args);
}

module.exports = {
  name: 'confirmExitModal',

  /**
   * Renders the confirm exit modal.
   * @param {Application} application - The application instance.
   * @param {Object} data - Optional data (not used here).
   * @returns {JQuery<HTMLElement>} - The rendered modal element.
   */
  render (application, data = {}) {
    devLog('[ConfirmExitModal] Rendering modal...');

    // Banana Jam: a Windows Vista / 7 style dialog, glass tinted with the title bar colour
    const $modal = $(`
      <div class="flex items-center justify-center min-h-screen p-4" style="z-index: 9999;">
        <div class="fixed inset-0" id="modalBackdrop" style="z-index: 9000; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(3px);"></div>
        <div class="bjx st-${(window.WzStyle && window.WzStyle.get().base) || 'modern'} st-${(window.WzStyle && window.WzStyle.get().ui) || 'mac'}" role="dialog" aria-label="Exit Banana Jam" style="z-index: 9100;">
          <style>
            @keyframes bjxIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }
            .bjx {
              position: relative; width: 430px; max-width: calc(100% - 24px); box-sizing: border-box; padding: 0 8px 8px;
              border: 1px solid rgba(0, 0, 0, 0.62); border-radius: 7px; text-align: left; user-select: none;
              background: linear-gradient(180deg,
                color-mix(in srgb, var(--bj-header, #bccb8e) 40%, white) 0%,
                color-mix(in srgb, var(--bj-header, #bccb8e) 70%, white) 22px,
                var(--bj-header, #bccb8e) 23px,
                color-mix(in srgb, var(--bj-header, #bccb8e) 82%, white) 100%);
              box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 10px 30px rgba(0, 0, 0, 0.5);
              animation: bjxIn 0.16s ease-out; font-family: "Segoe UI", Tahoma, Verdana, sans-serif;
            }
            .bjx.bjx-out { opacity: 0; transform: scale(0.96); transition: opacity 0.15s ease, transform 0.15s ease; }
            .bjx * { box-sizing: border-box; }
            .bjx-head { display: flex; align-items: flex-start; height: 31px; }
            .bjx-title { flex: 1; margin: 7px 0 0 4px; font-size: 13px; color: var(--bj-header-text, #111);
              text-shadow: 0 0 8px rgba(255, 255, 255, 0.9), 0 0 3px rgba(255, 255, 255, 0.9); }
            .bjx-head .wzcaps { margin-left: 6px; --wzcap-h: 31px; color: var(--bj-header-text, #111); }
            .bjx-client { border: 1px solid rgba(0, 0, 0, 0.5); border-radius: 2px; overflow: hidden;
              background: var(--bj-panel, #fff); box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.35); }
            .bjx-body { display: flex; gap: 14px; padding: 18px 18px 20px; }
            .bjx-icon { flex-shrink: 0; width: 34px; height: 34px; }
            .bjx-instr { font-size: 15.5px; color: #1e3f7a; margin: 2px 0 8px; }
            html.bj-pdark .bjx-instr { color: #8cc4ff; }
            .bjx-foot { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
              background: color-mix(in srgb, var(--bj-panel, #fff) 90%, #808080); border-top: 1px solid var(--bj-pline, #dfdfdf); }
            .bjx-check { flex: 1; display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: 13px; color: var(--bj-ptext, #1e1e1e); }
            .bjx-check input { width: 14px; height: 14px; margin: 0; cursor: pointer; }
            .bjx-btn { min-width: 82px; height: 27px; padding: 0 12px; cursor: pointer; border-radius: 3px;
              border: 1px solid #707070; color: #1e1e1e; outline: none;
              background: linear-gradient(180deg, #f2f2f2 0%, #ebebeb 48%, #dddddd 52%, #cfcfcf 100%);
              box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8); font: 13px "Segoe UI", Tahoma, sans-serif; }
            .bjx-btn:hover { border-color: #3c7fb1; background: linear-gradient(180deg, #eaf6fd 0%, #d9f0fc 48%, #bee6fd 52%, #a7d9f5 100%); }
            .bjx-btn:active { border-color: #2c628b; background: linear-gradient(180deg, #e5f4fc 0%, #c4e5f6 48%, #98d1ef 52%, #68b3db 100%); }
            .bjx-btn:focus { border-color: #3c7fb1; box-shadow: inset 0 0 0 1px #a5dcf9, 0 0 3px rgba(60, 127, 177, 0.7); }

            /* Modern: flat card */
            .bjx.st-modern { padding: 0; border: 1px solid rgba(0, 0, 0, 0.14); border-radius: 12px; overflow: hidden; background: var(--bj-panel, #fff); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35); }
            .bjx.st-modern .bjx-head { height: 40px; }
            .bjx.st-modern .bjx-head .wzcaps { --wzcap-h: 40px; color: var(--bj-ptext, #1e1e1e); }
            .bjx.st-modern .bjx-title { margin: 11px 0 0 16px; color: var(--bj-ptext, #1e1e1e); text-shadow: none; font-weight: 600; }
            .bjx.st-modern .bjx-client { border: none; border-radius: 0; box-shadow: none; }
            .bjx.st-modern .bjx-body { padding: 8px 20px 20px; }
            .bjx.st-modern .bjx-instr { color: var(--bj-ptext, #1e1e1e); }
            .bjx.st-modern .bjx-foot { background: color-mix(in srgb, var(--bj-panel, #fff) 94%, #808080); }
            .bjx.st-modern .bjx-btn { height: 32px; border-radius: 8px; border: 1px solid var(--bj-pline, #d0d0d0); box-shadow: none; background: var(--bj-pfield, #fff); color: var(--bj-ptext, #1e1e1e); font-weight: 500; }
            .bjx.st-modern .bjx-btn:hover { background: color-mix(in srgb, var(--bj-ptext, #000) 8%, var(--bj-pfield, #fff)); }
            .bjx.st-modern .bjx-btn:focus { border-color: var(--bj-accent, #b8621f); box-shadow: 0 0 0 3px color-mix(in srgb, var(--bj-accent, #b8621f) 30%, transparent); }
            .bjx.st-modern #confirmExitBtn { background: var(--bj-btn, #b07a3c); color: var(--bj-btn-text, #fff); border-color: transparent; }

            /* Bubble: soft, shiny 3D with a gentle glow */
            .bjx.st-bubble { padding: 0 10px 10px; border: 2px solid rgba(255, 255, 255, 0.95); border-radius: 28px;
              background: radial-gradient(ellipse at 50% -10%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 55%), linear-gradient(180deg, color-mix(in srgb, var(--bj-header, #bccb8e) 30%, white) 0%, color-mix(in srgb, var(--bj-header, #bccb8e) 75%, white) 100%);
              box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 0 30px color-mix(in srgb, var(--bj-header, #bccb8e) 60%, transparent), 0 16px 40px rgba(0, 0, 0, 0.3), inset 0 -5px 10px rgba(0, 0, 0, 0.06); }
            .bjx.st-bubble .bjx-head { height: 36px; }
            .bjx.st-bubble .bjx-title { margin: 9px 0 0 8px; font-weight: 800; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85), 0 0 8px rgba(255, 255, 255, 0.7); }
            .bjx.st-bubble .bjx-client { border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 22px; box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.07); }
            .bjx.st-bubble .bjx-foot { border-top: 1px solid var(--bj-pline, #e6e6e6); background: color-mix(in srgb, var(--bj-panel, #fff) 96%, #808080); }
            .bjx.st-bubble .bjx-btn { height: 32px; border-radius: 99px; border: 1px solid rgba(255, 255, 255, 0.95); color: #4a4a4a; font-weight: bold;
              background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 50%, #ececec 51%, #f5f5f5 100%);
              box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 -3px 5px rgba(0, 0, 0, 0.06), 0 3px 7px rgba(0, 0, 0, 0.13); transition: transform .15s ease, box-shadow .15s ease; }
            .bjx.st-bubble .bjx-btn:hover { transform: translateY(-1px) scale(1.04); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.14), 0 0 16px color-mix(in srgb, var(--bj-btn, #b07a3c) 50%, transparent); }
            .bjx.st-bubble .bjx-btn:active { transform: scale(0.97); }
            .bjx.st-bubble .bjx-btn:focus { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 0 0 4px color-mix(in srgb, var(--bj-btn, #b07a3c) 30%, transparent), 0 3px 7px rgba(0, 0, 0, 0.13); }
            .bjx.st-bubble #confirmExitBtn { color: var(--bj-btn-text, #fff); border-color: rgba(255, 255, 255, 0.7); text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--bj-btn, #b07a3c);
              box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.18), 0 3px 8px rgba(0, 0, 0, 0.18), 0 0 14px color-mix(in srgb, var(--bj-btn, #b07a3c) 50%, transparent); }

            /* Comic: soft 2D cartoon (flat colours, soft ink outlines, solid drop shadows) */
            .bjx.st-comic { padding: 0 10px 10px; border: 2.5px solid #3b2f2f; border-radius: 22px;
              background: radial-gradient(rgba(59, 47, 47, 0.07) 1px, transparent 1.6px) 0 0 / 7px 7px, color-mix(in srgb, var(--bj-header, #bccb8e) 55%, white);
              box-shadow: 6px 6px 0 rgba(59, 47, 47, 0.85); }
            .bjx.st-comic .bjx-head { height: 36px; }
            .bjx.st-comic .bjx-title { margin: 9px 0 0 8px; font-weight: 800; color: #3b2f2f; text-shadow: none; }
            .bjx.st-comic .bjx-head .wzcaps { color: #3b2f2f; }
            .bjx.st-comic .bjx-client { border: 2px solid #3b2f2f; border-radius: 16px; box-shadow: none; }
            .bjx.st-comic .bjx-foot { border-top: 2px solid color-mix(in srgb, var(--bj-ptext, #3b2f2f) 18%, transparent); background: transparent; }
            .bjx.st-comic .bjx-btn { height: 32px; border-radius: 12px; border: 2px solid #3b2f2f; color: var(--bj-ptext, #3b2f2f); font-weight: bold;
              background: var(--bj-pfield, #fff); box-shadow: 2px 2px 0 #3b2f2f; transition: transform .1s ease, box-shadow .1s ease; }
            .bjx.st-comic .bjx-btn:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #3b2f2f; background: color-mix(in srgb, var(--bj-header, #bccb8e) 30%, var(--bj-pfield, #fff)); }
            .bjx.st-comic .bjx-btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0 #3b2f2f; }
            .bjx.st-comic .bjx-btn:focus { border-color: #3b2f2f; box-shadow: 2px 2px 0 #3b2f2f, 0 0 0 3px color-mix(in srgb, var(--bj-accent, #b8621f) 30%, transparent); }
            .bjx.st-comic #confirmExitBtn { background: var(--bj-btn, #b07a3c); color: var(--bj-btn-text, #fff); }
          </style>
          <div class="bjx-head">
            <span class="bjx-title">Exit Banana Jam</span>
            ${window.WzStyle ? window.WzStyle.capsHTML(['close']) : '<div class="wzcaps"><button type="button" class="wzcap wzcap-close" title="Close">✕</button></div>'}
          </div>
          <div class="bjx-client">
            <div class="bjx-body">
              <svg class="bjx-icon" viewBox="0 0 34 34" aria-hidden="true">
                <defs>
                  <linearGradient id="bjxTri" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#fff3a8"/><stop offset="0.5" stop-color="#ffd52e"/><stop offset="1" stop-color="#f0a300"/>
                  </linearGradient>
                </defs>
                <path d="M17 2.5 L32 30 Q32.6 31.5 31 31.5 L3 31.5 Q1.4 31.5 2 30 Z" fill="url(#bjxTri)" stroke="#b07800" stroke-width="1.4" stroke-linejoin="round"/>
                <path d="M17 5.5 L29.2 28.8" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" fill="none"/>
                <rect x="15.2" y="11" width="3.6" height="11" rx="1.6" fill="#3a2a00"/>
                <circle cx="17" cy="26.2" r="2.1" fill="#3a2a00"/>
              </svg>
              <div>
                <div class="bjx-instr">Are you sure you want to exit Banana Jam?</div>
              </div>
            </div>
            <div class="bjx-foot">
              <label class="bjx-check"><input type="checkbox" id="dontAskAgain"> Don't ask me again</label>
              <button type="button" class="bjx-btn" id="confirmExitBtn">Yes, exit</button>
              <button type="button" class="bjx-btn" id="cancelExitBtn">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `);

    let answered = false;
    const onKey = (e) => { if (e.key === 'Escape') answer(false); };
    const answer = (confirmed) => {
      if (answered) return;
      answered = true;
      document.removeEventListener('keydown', onKey, true);
      const dontAskAgain = $modal.find('#dontAskAgain').prop('checked');
      $modal.find('.bjx').addClass('bjx-out');
      $modal.find('#modalBackdrop').animate({ opacity: 0 }, 150);
      setTimeout(() => {
        ipcRenderer.send('exit-confirmation-response', { confirmed, dontAskAgain });
        if (!confirmed) application.modals.close();
      }, 150);
    };

    $modal.find('#cancelExitBtn').on('click', () => answer(false));
    $modal.find('.wzcap-close').on('click', () => answer(false));
    $modal.find('#confirmExitBtn').on('click', () => answer(true));
    $modal.find('#modalBackdrop').on('click', () => answer(false));
    document.addEventListener('keydown', onKey, true);
    // Cancel is the safe choice, so it starts selected
    setTimeout(() => $modal.find('#cancelExitBtn').trigger('focus'), 60);

    return $modal;
  },

  // Optional: Add a close handler if needed for specific cleanup
  close (application) {
    devLog('[ConfirmExitModal] Close handler called (optional).');
    // Perform any cleanup specific to this modal if necessary
  }
};
