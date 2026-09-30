/*
 * WzTips - Banana Jam's retro (Windows Vista / 7 style) balloon tips.
 *
 * On a fresh setup, each tip points at one thing on screen the first time that
 * thing shows up. Otherwise tips only show after pressing the "?" button.
 * A tip goes away when you press its ✕, click anywhere else, press Esc, or
 * after a few seconds by itself. Once gone it stays gone.
 * The "?" help button brings every tip back.
 * It also swaps the plain hover tooltips (title="...") for retro ones.
 *
 * Used by both the launcher and the game window. Works with shadow DOM:
 * each tip finds its target with a small function.
 *
 *   WzTips.register([{ id, find: '#css-selector' or () => element, title, text, side: 'below' | 'above',
 *                      where: 'group name for the index', go: async () => { open the right place } }])
 *   WzTips.helpButton(element)   // wire a "?" button that shows every tip again
 *   WzTips.helpMenu(element)     // wire a "?" button that opens the tips index (a drop-down list)
 *   WzTips.showOne(id)           // go to one tip's place and show it
 *   WzTips.start()
 */
(function () {
  if (window.WzTips) return;

  const SEEN_KEY = 'wzTipsSeen';
  const SHOW_FOR = 12000;      // a tip fades away by itself after this long
  const GAP_AFTER_CLOSE = 1500;
  const GAP_AFTER_CLICK_AWAY = 8000;

  const STYLE = `
    .wztip {
      position: fixed; z-index: 2147483000; box-sizing: border-box;
      min-width: 180px; max-width: 260px; padding: 9px 28px 9px 11px;
      background: linear-gradient(180deg, #ffffff 0%, #f4f5f9 55%, #e4e5f0 100%);
      border: 1px solid #767676; border-radius: 6px;
      box-shadow: 2px 3px 9px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
      color: #1e1e1e; font: 12px/1.35 "Segoe UI", Tahoma, Verdana, sans-serif; text-align: left;
      opacity: 0; transform: translateY(4px); transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: auto; user-select: none;
    }
    .wztip.above { transform: translateY(-4px); }
    .wztip.wztour-center { top: 50% !important; left: 50% !important; max-width: 400px; min-width: 300px; transform: translate(-50%, -46%); }
    .wztip.wztour-center.show { transform: translate(-50%, -50%); }
    .wztip.wztour-center .wztip-tail { display: none; }
    .wztip.wztour .wztip-x { display: none; }
    .wztip.wztour:not(.wztour-center) { width: 360px; max-width: calc(100vw - 16px); }
    .wztip.wztour { font-size: 20px; line-height: 1.35; padding: 12px 14px; }
    .wztip.wztour .wztip-body { font-size: 20px; }
    .wztip.wztour .wztip-title { font-size: 21px; }
    .wztip.wztour-center { max-width: 400px; min-width: 300px; }
    .wztip.wztour:not(.wztour-center) .wztip-body { min-height: 0; }
    .wztour-nav { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .wztour-count { flex: 1; min-width: 0; min-width: 0; min-width: 0; text-align: center; font-size: 12px; color: #666; white-space: nowrap; }
    .wztour-nav button {
      font: 700 16px "Segoe UI", Tahoma, sans-serif; padding: 0 10px; min-width: 88px; height: 46px; cursor: pointer; color: #1e1e1e;
      border: 1px solid #767676; border-radius: 6px; background: linear-gradient(180deg, #ffffff 0%, #e4e5f0 100%);
    }
    .wztour-nav .wztour-next { min-width: 108px; }
    .wztour-nav { flex-wrap: wrap; }
    .wztour-nav .wztour-back { order: 1; } .wztour-nav .wztour-count { order: 2; } .wztour-nav .wztour-next { order: 3; }
    .wztour-nav .wztour-never { order: 5; flex: 0 0 100%; height: 30px; border-color: transparent; background: none; color: #444; font-weight: 400; font-size: 14px; min-width: 0; padding: 0 4px; cursor: pointer; text-decoration: underline; }
    .wztour-nav .wztour-skip { order: 4; flex: 0 0 100%; margin-top: 4px; height: 30px; font-size: 14px; }
    .wztour-nav button:hover { filter: brightness(1.05); }
    .wztour-nav button:disabled { opacity: .4; cursor: default; }
    .wztour-nav .wztour-next { color: #fff; border-color: #154f9e; background: linear-gradient(180deg, #6fb0f5 0%, #2f82e0 100%); text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3); }
    .wztour-nav .wztour-skip { border-color: transparent; background: none; color: #555; font-weight: 400; font-size: 12px; min-width: 0; padding: 0 4px; }
    html.wz-style-bubble .wztour-nav button { border-radius: 99px; }
    html.wz-style-comic .wztour-nav button { border: 2px solid #3b2f2f; border-radius: 10px; }

    .wztip.show { opacity: 1; transform: none; }
    .wztip-tail {
      position: absolute; left: var(--wztip-tail, 24px); width: 12px; height: 12px; margin-left: -6px;
      background: #ffffff; border-left: 1px solid #767676; border-top: 1px solid #767676;
      top: -7px; transform: rotate(45deg);
    }
    .wztip.above .wztip-tail { top: auto; bottom: -7px; background: #e4e5f0; transform: rotate(225deg); }
    .wztip-title { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; font-weight: 700; color: #1e395b; }
    .wztip-i {
      flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at 35% 28%, #a9d6ff 0%, #2f82e0 55%, #154f9e 100%);
      box-shadow: 0 0 0 1px #0d3f80, inset 0 0 0 1px rgba(255, 255, 255, 0.45);
      color: #fff; font: italic 700 11px Georgia, "Times New Roman", serif;
    }
    .wztip-x {
      position: absolute; top: 5px; right: 5px; width: 18px; height: 17px; padding: 0;
      border: 1px solid transparent; border-radius: 3px; background: none; cursor: pointer;
      color: #4d4d4d; font: 11px/15px "Segoe UI", Tahoma, sans-serif;
    }
    .wztip-x:hover {
      border-color: #8e2a18; color: #fff;
      background: linear-gradient(180deg, #f0a28e 0%, #d8492e 49%, #c1341a 50%, #e76b4b 100%);
    }
    .wztip-foot { margin-top: 6px; font-size: 10.5px; color: #6d6d6d; }
    .wztip-foot b { color: #1f5fb4; }
    /* small hover tooltip, like the Windows 7 ones */
    .wzhover {
      position: fixed; z-index: 2147483001; box-sizing: border-box; max-width: 280px;
      padding: 3px 7px 4px; border: 1px solid #767676; border-radius: 3px;
      background: linear-gradient(180deg, #ffffff 0%, #e4e5f0 100%);
      box-shadow: 2px 2px 3px rgba(0, 0, 0, 0.3);
      color: #4c4c4c; font: 12px/1.3 "Segoe UI", Tahoma, Verdana, sans-serif; white-space: pre-line;
      pointer-events: none; opacity: 0; transition: opacity 0.15s ease;
    }
    .wzhover.show { opacity: 1; }

    /* the tips index (drop-down from the ? button) */
    .wztm {
      position: fixed; z-index: 2147483002; box-sizing: border-box; width: 310px; max-width: calc(100vw - 16px);
      display: flex; flex-direction: column; overflow: hidden;
      background: linear-gradient(180deg, #ffffff 0%, #f5f6f9 100%); border: 1px solid #979797; border-radius: 5px;
      box-shadow: 2px 4px 12px rgba(0, 0, 0, 0.35); color: #1e1e1e; font: 12px/1.35 "Segoe UI", Tahoma, Verdana, sans-serif; text-align: left;
      opacity: 0; transform: translateY(-4px); transition: opacity .15s ease, transform .15s ease; user-select: none;
    }
    .wztm.show { opacity: 1; transform: none; }
    .wztm-head { display: flex; align-items: center; gap: 7px; padding: 8px 10px 7px; font-weight: 700; font-size: 13px; color: #1e395b; border-bottom: 1px solid #dfe3ea; }
    .wztm-head small { margin-left: auto; font-weight: 400; font-size: 11px; color: #6d6d6d; }
    .wztm-list { overflow-y: auto; padding: 4px; }
    .wztm-group { margin: 6px 4px 2px; padding: 0 4px 2px; font-size: 11px; font-weight: 700; color: #1f5fb4; border-bottom: 1px solid #e3e8f0; }
    .wztm-item {
      display: block; width: 100%; box-sizing: border-box; margin: 1px 0; padding: 5px 8px; text-align: left; cursor: pointer;
      background: none; border: 1px solid transparent; border-radius: 3px; color: inherit; font: inherit;
    }
    .wztm-item b { display: block; font-weight: 600; }
    .wztm-item span { display: block; font-size: 11px; color: #6d6d6d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .wztm-item:hover, .wztm-item:focus { outline: none; border-color: #a8d8f8; background: linear-gradient(180deg, #f2f8fd 0%, #dcecfc 100%); }
    .wztm-all b { color: #1f5fb4; }
    @keyframes wztipFlash { 0%, 100% { outline-color: rgba(255, 170, 40, 0); } 50% { outline-color: rgba(255, 170, 40, 0.95); } }
    .wztip-flash { outline-style: solid !important; outline-width: 3px !important; outline-offset: 3px !important; animation: wztipFlash 0.7s ease-in-out 4 !important; }
    html.wz-style-modern .wztm { background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 12px; box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22); }
    html.wz-style-modern .wztm-head { color: #1f1f1f; }
    html.wz-style-modern .wztm-group { color: #6d6d6d; border-bottom: none; text-transform: uppercase; letter-spacing: .5px; font-size: 10.5px; }
    html.wz-style-modern .wztm-item { border-radius: 8px; }
    html.wz-style-modern .wztm-item:hover, html.wz-style-modern .wztm-item:focus { border-color: transparent; background: rgba(128, 128, 128, 0.12); }
    html.wz-style-modern .wztm-all b { color: #1f6fd1; }
    html.wz-style-bubble .wztm {
      background: radial-gradient(ellipse at 50% -10%, #ffffff 0%, rgba(255, 255, 255, 0) 60%), linear-gradient(180deg, #ffffff 0%, #f6f3fa 100%);
      border: 2px solid rgba(255, 255, 255, 0.95); border-radius: 22px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), 0 0 22px rgba(255, 150, 190, 0.4), 0 12px 28px rgba(0, 0, 0, 0.2);
    }
    html.wz-style-bubble .wztm-head { color: #b04a74; border-bottom-color: rgba(0, 0, 0, 0.06); }
    html.wz-style-bubble .wztm-group { color: #b04a74; border-bottom: none; }
    html.wz-style-bubble .wztm-item { border-radius: 14px; }
    html.wz-style-bubble .wztm-item:hover, html.wz-style-bubble .wztm-item:focus {
      border-color: rgba(255, 255, 255, 0.95); background: linear-gradient(180deg, #fff6fa 0%, #ffe3ee 100%);
      box-shadow: 0 0 0 1px rgba(200, 120, 160, 0.2), 0 0 12px rgba(255, 150, 190, 0.45);
    }
    html.wz-style-bubble .wztm-all b { color: #b04a74; }
    html.wz-style-comic .wztm { background: #fffdf7; border: 2.5px solid #3b2f2f; border-radius: 16px; box-shadow: 4px 4px 0 rgba(59, 47, 47, 0.85); color: #3b2f2f; }
    html.wz-style-comic .wztm-head { color: #3b2f2f; border-bottom: 2px solid rgba(59, 47, 47, 0.2); font-family: "Comic Sans MS", "Segoe UI", sans-serif; }
    html.wz-style-comic .wztm-group { color: #3b2f2f; border-bottom: 2px dashed rgba(59, 47, 47, 0.2); }
    html.wz-style-comic .wztm-item { border-radius: 10px; border-width: 2px; }
    html.wz-style-comic .wztm-item span { color: #7a6a60; }
    html.wz-style-comic .wztm-item:hover, html.wz-style-comic .wztm-item:focus { border-color: #3b2f2f; background: #ffe08a; }
    html.wz-style-comic .wztm-all b { color: #3b2f2f; }

    /* Modern look: flat card */
    html.wz-style-modern .wztip { background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22); }
    html.wz-style-modern .wztip-tail { background: #ffffff; border-color: rgba(0, 0, 0, 0.12); }
    html.wz-style-modern .wztip.above .wztip-tail { background: #ffffff; }
    html.wz-style-modern .wztip-title { color: #1f1f1f; }
    html.wz-style-modern .wztip-i { background: #1f6fd1; box-shadow: none; font: 700 11px "Segoe UI", sans-serif; }
    html.wz-style-modern .wztip-x { border-radius: 6px; }
    html.wz-style-modern .wztip-x:hover { background: #c42b1c; border-color: transparent; }
    html.wz-style-modern .wzhover { background: #2b2b2b; color: #ffffff; border: none; border-radius: 6px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); }

    /* Bubble look: a soft, glowing 3D bubble */
    html.wz-style-bubble .wztip {
      background: radial-gradient(ellipse at 50% -20%, #ffffff 0%, rgba(255, 255, 255, 0) 70%), linear-gradient(180deg, #ffffff 0%, #fff3f8 100%);
      border: 2px solid rgba(255, 255, 255, 0.95); border-radius: 20px; color: #4a3a4a;
      box-shadow: 0 0 0 1px rgba(200, 120, 160, 0.25), 0 0 18px rgba(255, 150, 190, 0.45), 0 8px 20px rgba(0, 0, 0, 0.16), inset 0 -3px 6px rgba(200, 120, 160, 0.1);
    }
    html.wz-style-bubble .wztip-tail { background: #ffffff; border-color: rgba(255, 255, 255, 0.95); }
    html.wz-style-bubble .wztip.above .wztip-tail { background: #fff3f8; }
    html.wz-style-bubble .wztip-title { color: #b04a74; }
    html.wz-style-bubble .wztip-i {
      background: radial-gradient(circle at 50% 35%, #ffd0de 0%, #ff8fb0 55%, #e8467a 100%);
      box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.15), 0 0 8px rgba(255, 110, 150, 0.55); font: 700 11px "Segoe UI", sans-serif;
    }
    html.wz-style-bubble .wztip-x { border-radius: 50%; }
    html.wz-style-bubble .wztip-x:hover { background: radial-gradient(circle at 50% 35%, #ffc2d3 0%, #ff7aa0 60%, #e8467a 100%); border-color: transparent; box-shadow: 0 0 8px rgba(255, 110, 150, 0.6); }
    html.wz-style-bubble .wzhover {
      background: linear-gradient(180deg, #ffffff 0%, #fff3f8 100%); border-radius: 14px; border: 2px solid rgba(255, 255, 255, 0.95);
      box-shadow: 0 0 0 1px rgba(200, 120, 160, 0.25), 0 0 12px rgba(255, 150, 190, 0.4), 0 3px 8px rgba(0, 0, 0, 0.14);
    }

    /* Comic look: a comic speech bubble with a soft ink outline */
    html.wz-style-comic .wztip { background: #fffdf7; border: 2.5px solid #3b2f2f; border-radius: 16px;
      box-shadow: 3px 3px 0 rgba(59, 47, 47, 0.85); color: #3b2f2f; }
    html.wz-style-comic .wztip-tail { background: #fffdf7; border-left: 2.5px solid #3b2f2f; border-top: 2.5px solid #3b2f2f; top: -8px; }
    html.wz-style-comic .wztip.above .wztip-tail { background: #fffdf7; top: auto; bottom: -8px; }
    html.wz-style-comic .wztip-title { color: #3b2f2f; font-family: "Comic Sans MS", "Segoe UI", sans-serif; }
    html.wz-style-comic .wztip-i { background: #ffe08a; box-shadow: 0 0 0 2px #3b2f2f; color: #3b2f2f; font: 700 11px "Segoe UI", sans-serif; }
    html.wz-style-comic .wztip-x { border-radius: 50%; color: #3b2f2f; }
    html.wz-style-comic .wztip-x:hover { background: #ffab9e; border: 2px solid #3b2f2f; color: #3b2f2f; line-height: 13px; }
    html.wz-style-comic .wztip-foot { color: #7a6a60; }
    html.wz-style-comic .wzhover { background: #fffdf7; color: #3b2f2f; border-radius: 10px; border: 2px solid #3b2f2f; box-shadow: 2px 2px 0 rgba(59, 47, 47, 0.85); }

    /* Mac look: a soft frosted popover with a blue accent */
    html.wz-style-mac .wztip, html.wz-style-mac .wztm {
      background: rgba(255, 255, 255, 0.9); -webkit-backdrop-filter: blur(20px) saturate(1.6); backdrop-filter: blur(20px) saturate(1.6);
      border: 0.5px solid rgba(0, 0, 0, 0.14); border-radius: 12px; color: #1d1d1f;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22), 0 0 0 0.5px rgba(0, 0, 0, 0.05);
      font-family: -apple-system, "SF Pro Text", "Segoe UI", sans-serif;
    }
    html.wz-style-mac .wztip-tail, html.wz-style-mac .wztip.above .wztip-tail { background: rgba(255, 255, 255, 0.96); border-color: rgba(0, 0, 0, 0.12); }
    html.wz-style-mac .wztip-title, html.wz-style-mac .wztm-head { color: #1d1d1f; }
    html.wz-style-mac .wztip-i { background: #0a84ff; box-shadow: none; font: 700 11px -apple-system, "Segoe UI", sans-serif; }
    html.wz-style-mac .wztip-x { border-radius: 50%; }
    html.wz-style-mac .wztip-x:hover { background: #ff5f57; border-color: transparent; color: #ffffff; }
    html.wz-style-mac .wztip-foot b, html.wz-style-mac .wztm-all b { color: #0a84ff; }
    html.wz-style-mac .wztm-group { color: #6e6e73; border-bottom: none; text-transform: uppercase; letter-spacing: .5px; font-size: 10.5px; }
    html.wz-style-mac .wztm-item { border-radius: 8px; }
    html.wz-style-mac .wztm-item:hover, html.wz-style-mac .wztm-item:focus { border-color: transparent; background: rgba(10, 132, 255, 0.14); }
    html.wz-style-mac .wzhover { background: rgba(40, 40, 42, 0.92); color: #ffffff; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); }
    html.wz-style-mac .wztour-nav button { border-radius: 8px; }
    html.wz-style-mac .wztour-nav .wztour-next { border-color: transparent; background: #0a84ff; text-shadow: none; }

    /* Crystal look: cool see-through glass */
    html.wz-style-crystal .wztip, html.wz-style-crystal .wztm {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(214, 236, 255, 0.66) 100%);
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.85); border-radius: 18px; color: #17324d;
      box-shadow: 0 0 0 1px rgba(60, 120, 190, 0.3), 0 0 22px rgba(90, 170, 255, 0.4), 0 10px 26px rgba(0, 30, 70, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }
    html.wz-style-crystal .wztip-tail, html.wz-style-crystal .wztip.above .wztip-tail { background: rgba(236, 246, 255, 0.92); border-color: rgba(255, 255, 255, 0.85); }
    html.wz-style-crystal .wztip-title, html.wz-style-crystal .wztm-head, html.wz-style-crystal .wztm-group, html.wz-style-crystal .wztm-all b { color: #1c5aa0; }
    html.wz-style-crystal .wztip-i { background: radial-gradient(circle at 50% 35%, #bfe3ff 0%, #4fa3f0 55%, #1f6fd1 100%); box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.15), 0 0 8px rgba(90, 170, 255, 0.6); }
    html.wz-style-crystal .wztip-x:hover { background: radial-gradient(circle at 50% 35%, #d2ecff 0%, #6bb5f5 60%, #2f82e0 100%); border-color: transparent; box-shadow: 0 0 8px rgba(90, 170, 255, 0.6); }
    html.wz-style-crystal .wztm-item:hover, html.wz-style-crystal .wztm-item:focus { border-color: rgba(255, 255, 255, 0.9); background: linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(190, 224, 255, 0.7) 100%); box-shadow: 0 0 12px rgba(90, 170, 255, 0.45); }
    html.wz-style-crystal .wzhover { background: linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(214, 236, 255, 0.75) 100%); color: #17324d; border: 1px solid rgba(255, 255, 255, 0.85); box-shadow: 0 0 12px rgba(90, 170, 255, 0.4), 0 3px 8px rgba(0, 30, 70, 0.2); }
  `;

  let tips = [];
  // Tips only pop up by themselves on a fresh setup (nothing saved yet).
  // Everyone else only sees them after pressing the ? button.
  const AUTO_KEY = 'wzTipsAuto';
  let autoShow = false;
  try {
    let mode = localStorage.getItem(AUTO_KEY);
    if (mode === null) {
      mode = localStorage.length === 0 ? '1' : '0';
      localStorage.setItem(AUTO_KEY, mode);
    }
    autoShow = mode === '1';
  } catch (e) { autoShow = false; }
  let asked = false; // the ? button was pressed this time

  let seen = loadSeen();
  let current = null;
  let pausedUntil = 0;
  let started = false;
  let timer = 0;

  function loadSeen() {
    try {
      const list = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
      return new Set(Array.isArray(list) ? list : []);
    } catch (e) { return new Set(); }
  }
  function saveSeen() {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen))); } catch (e) {}
  }

  function injectStyle() {
    if (document.getElementById('wztip-style')) return;
    const s = document.createElement('style');
    s.id = 'wztip-style';
    s.textContent = STYLE;
    (document.head || document.documentElement).appendChild(s);
  }

  // look for a selector in the page and inside every shadow root; a visible match wins over a hidden one
  function deep(sel, root) {
    root = root || document;
    const found = [];
    const walk = (r) => {
      r.querySelectorAll(sel).forEach((e) => found.push(e));
      const all = r.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) if (all[i].shadowRoot) walk(all[i].shadowRoot);
    };
    walk(root);
    const seen = (e) => { const b = e.getBoundingClientRect(); return b.width > 1 && b.height > 1; };
    return found.find(seen) || found[0] || null;
  }

  function find(tip) {
    try { return tip.find() || null; } catch (e) { return null; }
  }

  // Is this element really on screen and not covered by something else?
  function onScreen(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const cx = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
    const cy = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
    if (r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) return false;
    let hit = document.elementFromPoint(cx, cy);
    while (hit && hit.shadowRoot) {
      const inner = hit.shadowRoot.elementFromPoint(cx, cy);
      if (!inner || inner === hit) break;
      hit = inner;
    }
    if (!hit) return false;
    if (hit === el || el.contains(hit)) return true;
    if (el.shadowRoot && el.shadowRoot.contains(hit)) return true;
    return false;
  }

  function place(box, el, side) {
    const r = el.getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    const pad = 8;
    let above = side === 'above';
    if (!above && r.bottom + 12 + h > window.innerHeight - pad) above = true;
    if (above && r.top - 12 - h < pad) above = false;
    const top = Math.max(pad, Math.min(window.innerHeight - h - pad, above ? r.top - 12 - h : r.bottom + 12));
    const cx = r.left + r.width / 2;
    let left = cx - 26;
    left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
    box.classList.toggle('above', above);
    box.style.top = `${Math.round(top)}px`;
    box.style.left = `${Math.round(left)}px`;
    box.style.setProperty('--wztip-tail', `${Math.round(Math.max(12, Math.min(w - 12, cx - left)))}px`);
  }

  function hide(markSeen, gap) {
    if (!current) return;
    const { box, tip, follow, auto } = current;
    current = null;
    clearInterval(follow);
    clearTimeout(auto);
    if (markSeen) { seen.add(tip.id); saveSeen(); }
    pausedUntil = Date.now() + (gap || GAP_AFTER_CLOSE);
    box.classList.remove('show');
    setTimeout(() => box.remove(), 260);
  }

  function show(tip, el, opts) {
    opts = opts || {};
    injectStyle();
    const box = document.createElement('div');
    box.className = 'wztip';
    box.setAttribute('role', 'tooltip');
    const left = tips.filter(t => !seen.has(t.id)).length;
    const tr = opts.tour || null;
    const foot = tr
      ? `<div class="wztour-nav"><button type="button" class="wztour-skip">Skip tour</button>
           ${tr.n === 0 && !tr.done ? '<button type="button" class="wztour-never">Don\'t show again</button>' : ''}
           <span class="wztour-count">${tr.n ? `${tr.i + 1} of ${tr.n}` : ''}</span>
           ${tr.n || tr.done ? `<button type="button" class="wztour-back"${tr.i <= 0 && !tr.done ? ' disabled' : ''}>Back</button>` : ''}
           <button type="button" class="wztour-next">${tr.nextLabel || 'Next'}</button></div>`
      : opts.pinned
      ? 'press <b>?</b> for the list of tips'
      : `${left > 1 ? `${left - 1} more tip${left - 1 === 1 ? '' : 's'} to find · ` : ''}press <b>?</b> to see tips again`;
    box.innerHTML = `
      <div class="wztip-tail"></div>
      <button type="button" class="wztip-x" title="Close">✕</button>
      <div class="wztip-title"><span class="wztip-i">i</span><span class="wztip-t"></span></div>
      <div class="wztip-body"></div>
      <div class="wztip-foot">${foot}</div>`;
    box.querySelector('.wztip-t').textContent = tip.title || 'Tip';
    box.querySelector('.wztip-body').textContent = (tip.text || '') + (opts.note ? ' ' + opts.note : '');
    box.querySelector('.wztip-x').addEventListener('click', (e) => { e.stopPropagation(); hide(true); });
    if (tr) {
      box.classList.add('wztour');
      let lastNav = 0;
      const on = (cls, fn) => { const b = box.querySelector(cls); if (b) b.addEventListener('click', (e) => { e.stopPropagation(); const t = Date.now(); if (t - lastNav < 450) return; lastNav = t; fn && fn(); }); };
      on('.wztour-next', tr.onNext); on('.wztour-back', tr.onBack); on('.wztour-skip', tr.onSkip); on('.wztour-never', () => { try { localStorage.setItem(tourCfg.key, '1'); } catch (e) {} tr.onSkip(); });
    }
    if (opts.center) box.classList.add('wztour-center');
    document.body.appendChild(box);
    if (!opts.center) place(box, el, tip.side);
    requestAnimationFrame(() => box.classList.add('show'));
    current = {
      tip, el, box, tour: !!tr,
      // keep pointing at the right spot, go away if the thing disappears
      follow: setInterval(() => {
        if (opts.center) return;
        if (!(opts.pinned ? inView(el) : onScreen(el))) { if (!tr) hide(false); return; }
        place(box, el, tip.side);
      }, 250),
      auto: tr ? 0 : setTimeout(() => hide(true), opts.pinned ? SHOW_FOR * 1.5 : SHOW_FOR)
    };
  }

  function check() {
    if (tourOn || current || Date.now() < pausedUntil || document.hidden) return;
    if (!autoShow && !asked) return;
    for (const tip of tips) {
      if (seen.has(tip.id)) continue;
      const el = find(tip);
      if (el && onScreen(el)) { show(tip, el); return; }
    }
  }

  // clicking anywhere else puts the tip away
  function onPointerDown(e) {
    if (!current || current.tour) return;
    const path = e.composedPath ? e.composedPath() : [];
    if (path.includes(current.box)) return;
    hide(true, GAP_AFTER_CLICK_AWAY);
  }
  function onKey(e) {
    if (e.key === 'Escape' && tourOn) { tourEnd(false); return; }
    if (tourOn && current && current.box && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const b = current.box.querySelector(e.key === 'ArrowRight' ? '.wztour-next' : '.wztour-back');
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if (e.key === 'Escape' && current) hide(true, GAP_AFTER_CLICK_AWAY);
  }

  // ---- hover tooltips: anything with a title gets a retro tooltip instead of the plain one ----
  let hoverEl = null, hoverTimer = 0, hoverBox = null, hoverHide = 0;
  let mouseX = 0, mouseY = 0;
  function endHover() {
    clearTimeout(hoverTimer);
    clearTimeout(hoverHide);
    if (hoverEl && hoverEl.hasAttribute('data-wz-title') && !hoverEl.hasAttribute('title')) {
      hoverEl.setAttribute('title', hoverEl.getAttribute('data-wz-title'));
    }
    hoverEl = null;
    if (hoverBox) { const b = hoverBox; hoverBox = null; b.classList.remove('show'); setTimeout(() => b.remove(), 160); }
  }
  function showHover(text) {
    injectStyle();
    const b = document.createElement('div');
    b.className = 'wzhover';
    b.textContent = text;
    document.body.appendChild(b);
    const w = b.offsetWidth, h = b.offsetHeight;
    let x = mouseX + 2, y = mouseY + 20;
    if (x + w > window.innerWidth - 4) x = window.innerWidth - w - 4;
    if (y + h > window.innerHeight - 4) y = mouseY - h - 8;
    b.style.left = `${Math.max(4, x)}px`;
    b.style.top = `${Math.max(4, y)}px`;
    hoverBox = b;
    requestAnimationFrame(() => b.classList.add('show'));
    hoverHide = setTimeout(endHover, 6000);
  }
  function onOver(e) {
    const path = e.composedPath ? e.composedPath() : [e.target];
    let el = null;
    for (const n of path) {
      if (!n || n.nodeType !== 1) continue;
      if (n.classList && (n.classList.contains('wztip') || n.classList.contains('wzhover'))) return;
      if (n.hasAttribute('data-tooltip')) break; // the launcher draws its own for these
      if (n.hasAttribute('title') || n.hasAttribute('data-wz-title')) { el = n; break; }
    }
    if (el === hoverEl) return;
    endHover();
    if (!el) return;
    const text = el.getAttribute('title') || el.getAttribute('data-wz-title');
    if (!text || !text.trim()) return;
    el.setAttribute('data-wz-title', text);
    el.removeAttribute('title'); // stops the plain browser tooltip
    hoverEl = el;
    hoverTimer = setTimeout(() => { if (hoverEl === el) showHover(text.trim()); }, 450);
  }
  function onMove(e) { mouseX = e.clientX; mouseY = e.clientY; }

  // ---- the tips index: a drop-down list of every tip; pick one to go straight to it ----
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // in the window at all (even if something see-through is on top)
  function inView(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 2 && r.height >= 2 && r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
  }
  function flash(el) {
    injectStyle();
    el.classList.remove('wztip-flash');
    void el.offsetWidth;
    el.classList.add('wztip-flash');
    setTimeout(() => el.classList.remove('wztip-flash'), 3000);
  }

  let showing = 0;
  async function showOne(id, extra) {
    const tip = tips.find((t) => t.id === id);
    if (!tip) return;
    const tr = extra && extra.tour;
    const ticket = ++showing;
    if (current) hide(false, 1);
    pausedUntil = Date.now() + 6000; // other tips wait
    if (typeof tip.go === 'function') { try { await tip.go(); } catch (e) {} }
    let el = null;
    for (let i = 0; i < 40 && ticket === showing; i++) { // a window may still be opening
      el = find(tip);
      if (el && inView(el) || (el && el.getBoundingClientRect().width > 1)) break;
      await wait(100);
    }
    if (!el && tr && ticket === showing) { (tr.dir < 0 ? tr.onBack : tr.onNext)(); return; }   // a step that is not on screen is skipped
    if (!el || ticket !== showing) return;
    scrollSafely(el);
    await wait(380);
    if (ticket !== showing || !inView(el)) return;
    const note = tip.offWhen && el.closest && el.closest(tip.offWhen) ? (tip.offNote || '') : '';
    if (current) hide(false, 1);
    show(tip, el, { pinned: true, note, tour: tr });
    flash(el);
    pausedUntil = Date.now() + SHOW_FOR * 1.5 + 2000;
  }

  // Scroll only the parts a person could scroll themselves (overflow auto/scroll).
  // scrollIntoView() also shoves "overflow: hidden" windows around, which left the game window
  // stuck part-way down with an empty black gap.
  function parentOf(n) { return n.parentElement || (n.parentNode && n.parentNode.host) || null; }
  function scrollSafely(el) {
    try {
      let p = parentOf(el);
      while (p && p !== document.documentElement && p !== document.body) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) {
          const r = el.getBoundingClientRect(), b = p.getBoundingClientRect();
          if (r.top < b.top || r.bottom > b.bottom) p.scrollTop += (r.top + r.height / 2) - (b.top + b.height / 2);
        }
        p = parentOf(p);
      }
    } catch (e) {}
  }
  // put anything that got scrolled by accident back at the top
  function unstick(root) {
    try {
      const se = document.scrollingElement || document.documentElement;
      if (se) { se.scrollTop = 0; se.scrollLeft = 0; }
      document.body.scrollTop = 0; document.body.scrollLeft = 0;
      const walk = (node) => {
        const all = node.querySelectorAll ? node.querySelectorAll('*') : [];
        for (let i = 0; i < all.length; i++) {
          const n = all[i];
          if (n.shadowRoot) walk(n.shadowRoot);
          if ((n.scrollTop || n.scrollLeft) && n.scrollHeight > 0) {
            const cs = getComputedStyle(n);
            if (cs.overflowY === 'hidden' || cs.overflowY === 'visible' || cs.overflowX === 'hidden') { n.scrollTop = 0; n.scrollLeft = 0; }
          }
        }
      };
      walk(root || document);
    } catch (e) {}
  }

  // ---- the first-start tour: a walk through the tips, one step at a time ----
  let tourCfg = null, tourOn = false;
  function setTour(cfg) { tourCfg = cfg; }
  const tourIds = () => tourCfg.steps.filter((id) => tips.some((t) => t.id === id));
  function centerCard(card, tr) {
    if (current) hide(false, 1);
    show({ id: 'tour-card', title: card.title, text: card.text }, null, { center: true, tour: tr });
  }
  function tourStart() {
    if (!tourCfg) return;
    ++showing;
    tourOn = true;
    if (current) hide(false, 1);
    centerCard(tourCfg.welcome, { i: 0, n: 0, nextLabel: 'Start the tour', onNext: () => tourStep(0, 1), onSkip: () => tourEnd(false) });
  }
  async function tourStep(i, dir) {
    if (!tourOn) return;
    const ids = tourIds(), n = ids.length;
    if (i < 0) { tourStart(); return; }
    if (i >= n) {
      ++showing;
      centerCard(tourCfg.done, { i: n, n: 0, done: true, nextLabel: 'Finish', onNext: () => tourEnd(true), onBack: () => tourStep(n - 1, -1), onSkip: () => tourEnd(true) });
      return;
    }
    await showOne(ids[i], { tour: {
      i, n, dir, nextLabel: i === n - 1 ? 'Next' : 'Next',
      onNext: () => tourStep(i + 1, 1), onBack: () => tourStep(i - 1, -1), onSkip: () => tourEnd(false)
    } });
  }
  function tourEnd(finished) {
    tourOn = false;
    ++showing;
    if (current) hide(false, 1);
    tourIds().forEach((id) => seen.add(id)); saveSeen();
    pausedUntil = Date.now() + 4000;
    unstick(); setTimeout(unstick, 400); setTimeout(unstick, 1200);
    if (tourCfg.onEnd) { try { tourCfg.onEnd(finished); } catch (e) {} }
  }
  // the installer leaves a flag for each program, so every new setup plays the tour (and the tips) again
  function freshSetup() {
    return new Promise((resolve) => {
      try {
        const kind = window.ipc && typeof window.ipc.invoke === 'function' ? 'game' : 'launcher';
        const invoke = kind === 'game' ? (c, d) => window.ipc.invoke(c, d)
          : (typeof require === 'function' ? (c, d) => require('electron').ipcRenderer.invoke(c, d) : null);
        if (!invoke) return resolve(false);
        invoke('bj-fresh-install', kind).then((yes) => resolve(yes === true), () => resolve(false));
      } catch (e) { resolve(false); }
    });
  }
  function tourIfFirst() {
    if (!tourCfg) return;
    freshSetup().then((fresh) => {
      if (fresh) {
        try { localStorage.removeItem(tourCfg.key); localStorage.removeItem(SEEN_KEY); localStorage.setItem(AUTO_KEY, '1'); } catch (e) {}
        autoShow = true; seen = new Set();
      }
      tourIfFirstRun();
    });
  }
  function tourIfFirstRun() {
    let done = false;
    try { done = localStorage.getItem(tourCfg.key) === '1'; } catch (e) {}
    if (done) return;
    // start after a short delay whatever the window is doing (it shows as soon as the window is seen)
    const attempt = () => {
      if (tourOn) return;
      let finished = false;
      try { finished = localStorage.getItem(tourCfg.key) === '1'; } catch (e) {}
      if (finished) return;
      try { tourStart(); } catch (e) { setTimeout(attempt, 2000); }
    };
    setTimeout(attempt, tourCfg.delay || 3200);
  }

  let menu = null, menuAnchor = null;
  function closeMenu() {
    if (!menu) return;
    const m = menu;
    menu = null; menuAnchor = null;
    window.removeEventListener('pointerdown', menuOutside, true);
    window.removeEventListener('keydown', menuKey, true);
    window.removeEventListener('resize', closeMenu);
    m.classList.remove('show');
    setTimeout(() => m.remove(), 160);
  }
  function menuOutside(e) {
    const path = e.composedPath ? e.composedPath() : [];
    if (menu && !path.includes(menu) && !path.includes(menuAnchor)) closeMenu();
  }
  function menuKey(e) {
    if (!menu) return;
    const items = Array.from(menu.querySelectorAll('.wztm-item'));
    const at = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); const a = menuAnchor; closeMenu(); if (a) a.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[at + 1] || items[0]).focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[at - 1] || items[items.length - 1]).focus(); }
  }
  function openMenu(anchor) {
    closeMenu();
    endHover();
    injectStyle();
    const groups = [];
    tips.forEach((t) => {
      const name = t.where || 'Other';
      let g = groups.find((x) => x.name === name);
      if (!g) { g = { name, items: [] }; groups.push(g); }
      g.items.push(t);
    });
    const m = document.createElement('div');
    m.className = 'wztm';
    m.setAttribute('role', 'menu');
    m.innerHTML = `
      <div class="wztm-head"><span class="wztip-i">i</span>Tips<small>pick one to go to it</small></div>
      <div class="wztm-list">
        ${tourCfg ? '<button type="button" class="wztm-item wztm-tour" role="menuitem"><b>Take the tour</b><span>A quick walk through everything, one step at a time.</span></button>' : ''}
        <button type="button" class="wztm-item wztm-all" role="menuitem"><b>Show all the tips, one by one</b><span>They pop up as you use Banana Jam.</span></button>
        ${groups.map((g) => `<div class="wztm-group">${esc(g.name)}</div>` + g.items.map((t) => `
          <button type="button" class="wztm-item" role="menuitem" data-id="${esc(t.id)}"><b>${esc(t.title)}</b><span>${esc(t.text)}</span></button>`).join('')).join('')}
      </div>`;
    m.addEventListener('click', (e) => {
      const item = e.target.closest('.wztm-item');
      if (!item) return;
      e.stopPropagation();
      closeMenu();
      if (item.classList.contains('wztm-tour')) tourStart();
      else if (item.classList.contains('wztm-all')) replay();
      else showOne(item.getAttribute('data-id'));
    });
    document.body.appendChild(m);
    // open on the side with more room (a button in the bottom corner opens upwards), and never leave the window
    const r = anchor.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 16, above = r.top - 16;
    const up = below < 240 && above > below;
    const room = Math.max(120, up ? above : below);
    m.style.maxHeight = `${Math.round(room)}px`;
    const mh = Math.min(m.offsetHeight, room);
    const top = up ? r.top - 6 - mh : r.bottom + 6;
    m.style.top = `${Math.round(Math.max(8, top))}px`;
    m.style.left = `${Math.round(Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)))}px`;
    menu = m; menuAnchor = anchor;
    window.addEventListener('pointerdown', menuOutside, true);
    window.addEventListener('keydown', menuKey, true);
    window.addEventListener('resize', closeMenu);
    requestAnimationFrame(() => m.classList.add('show'));
    const first = m.querySelector('.wztm-item');
    if (first) first.focus({ preventScroll: true });
  }
  function helpMenu(el) {
    if (!el || el.__wzTips) return;
    el.__wzTips = true;
    el.setAttribute('aria-haspopup', 'menu');
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (menu && menuAnchor === el) closeMenu(); else openMenu(el);
    });
  }

  function register(list) {
    (list || []).forEach((t) => {
      if (!t || !t.id) return;
      if (typeof t.find === 'string') { const sel = t.find; t = Object.assign({}, t, { find: () => deep(sel) }); }
      if (typeof t.find !== 'function') return;
      const i = tips.findIndex(x => x.id === t.id);
      if (i >= 0) tips[i] = t; else tips.push(t);
    });
  }

  function replay() {
    asked = true;
    seen = new Set();
    saveSeen();
    if (current) hide(false, 1);
    pausedUntil = 0;
    setTimeout(check, 300);
  }

  function helpButton(el) {
    if (!el || el.__wzTips) return;
    el.__wzTips = true;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      replay();
    });
  }

  function start() {
    if (started) return;
    started = true;
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerdown', endHover, true);
    window.addEventListener('mouseover', onOver, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('wheel', endHover, { capture: true, passive: true });
    document.addEventListener('mouseleave', endHover);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', () => { if (current && current.el) place(current.box, current.el, current.tip.side); });
    // wait a moment after start-up so the window can finish drawing
    pausedUntil = Date.now() + 2500;
    timer = setInterval(check, 1000);
    tourIfFirst();
  }

  function stop() {
    clearInterval(timer);
    started = false;
    if (current) hide(false);
  }

  window.WzTips = { unstick, register, setTour, tour: tourStart, helpButton, helpMenu, showOne, openMenu, closeMenu, replay, start, stop, deep, STYLE };
})();
