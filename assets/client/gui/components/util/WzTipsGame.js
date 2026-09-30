/*
 * Banana Jam: the retro tips for the game window (login screen, Settings and in-game).
 * The list is in the order the tips should appear.
 */
(function () {
  if (!window.WzTips) return;
  const T = window.WzTips;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = (el) => !!el && el.getClientRects().length > 0;
  // Settings panel helpers: open it, pick a tab, open one section's pop-up
  const panelOpen = () => { const p = T.deep('#settings-panel'); return !!p && p.classList.contains('show'); };
  async function closeAll() {
    const done = T.deep('.wz-pop-done');
    if (done) { done.click(); await wait(200); }
    if (panelOpen()) { const b = T.deep('#settings-btn'); if (b) { b.click(); await wait(350); } }
  }
  const settings = (tab, section) => async () => {
    if (!panelOpen()) { const b = T.deep('#settings-btn'); if (b) { b.click(); await wait(450); } }
    const tb = T.deep(`.settings-tab[data-tab="${tab}"]`);
    if (tb && !tb.classList.contains('active')) { tb.click(); await wait(200); }
    const pop = T.deep('.wz-pop-dim');
    if (pop) { const d = T.deep('.wz-pop-done'); if (d) { d.click(); await wait(200); } }
    if (section) {
      const root = T.deep('#settings-panel');
      const head = root && Array.from(root.querySelectorAll('.wz-fold-head')).find((h) => h.textContent.trim().toLowerCase().indexOf(section) === 0);
      if (head) { head.click(); await wait(300); }
    }
  };
  const login = async () => { await closeAll(); };

  T.register([
    { id: 'g-help', where: 'Login screen', go: login, find: '#wz-help-btn', title: 'Tips', text: 'Press this ? any time to see these tips again.', side: 'above' },
    { id: 'g-mode', where: 'Login screen', go: login, find: '#wz-mode-btn', title: 'Light or dark', text: 'Switch between light and dark. This window, the launcher and the Mod Menu all change together.', side: 'above' },
    { id: 'g-settings', where: 'Login screen', go: login, find: '#settings-btn', title: 'Settings', text: 'Change the theme, colours, pictures and more.', side: 'above' },
    { id: 'g-game-ui', where: 'Settings → General', go: settings('general'), find: '#game-ui-toggle', title: 'Game UI', text: 'Turn this off to hide the small buttons over the game. Move your mouse to the bottom-left corner to bring them back.' },
    { id: 'g-logs', where: 'Login screen', find: '#devtools-btn', title: 'Debug logs', text: 'Shows what Banana Jam is doing. Handy if something goes wrong.', side: 'above' },
    { id: 'g-save-account', where: 'Login screen', go: login, find: '.account-add-button', title: 'Save account', text: 'Type your username and password, then press this to save them for next time.' },
    { id: 'g-accounts', where: 'Login screen', go: login, find: '.saved-account-slot:not(.empty)', title: 'Saved accounts', text: 'Click one to fill in the login. Right-click it to pin or delete it.' },
    { id: 'g-custom-theme', where: 'Settings → Theme', go: settings('theme'), find: '#custom-theme-color-item', title: 'Custom theme', text: 'Turn this on to use your own colours and pictures. Off gives you the Default look, in light or dark.' },
    { id: 'g-share', where: 'Settings → Theme', go: settings('theme'), find: '#wz-share-btn', title: 'Same colours as the launcher', text: 'Click the lock to make the game and the launcher use the same colours. Change them in either place and the other follows.' },
    { id: 'g-presets', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '#wz-preset-select', title: 'Presets', text: 'Save how it looks as a preset. Download it to share, or upload one a friend made.' },
    { id: 'g-look', where: 'Settings → Theme', go: settings('theme', 'look'), find: '#wz-look-select', title: 'Look', text: 'Changes the shape of everything in this window. Mac is the new starting look.' },
    { id: 'g-fonts', where: 'Settings → Theme', go: settings('theme', 'look'), find: '#wz-font-select', title: 'Font', text: 'Change the text style. Pick one that comes with Banana Jam, one from your PC, or upload your own.' },
    { id: 'g-colour-box', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '.wz-part-row:not(.is-auto) .wz-part-color', title: 'Colour box', text: 'Click a colour box to open the colour wheel. You can drag the wheel around.' },
    { id: 'g-lock', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '.wz-part-lock', title: 'Lock', text: 'Locked: this part keeps its own colour. Unlocked: it follows the main colour.' },
    { id: 'g-login-picture', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '#wz-login-img-upload', title: 'Background picture', text: 'Upload a picture for behind the login box. Then use the sliders to blur, zoom and move it.' },
    { id: 'g-border-picture', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '#wz-border-img-upload', title: 'Border picture', text: 'Upload a picture for around the game. It has the same blur, zoom and move sliders.' },
    { id: 'g-mod-menu', where: 'In the game', go: login, find: '#wz-mod-btn', title: 'Mod Menu', text: 'Opens the Mod Menu. It sits at the top of the buttons in the corner. You can also press F10.' },
    { id: 'g-tray', where: 'In the game', go: login, find: '#arrow-container', title: 'Tray', text: 'Click the arrow for full screen and log out.' }
  ]);


  T.setTour({
    key: 'bjTourGameV7',
    welcome: { title: 'What is new', text: 'A quick look at what is new in the game window. You can skip it any time, and take it again from the ? button.' },
    done: { title: 'That is everything new!', text: 'Press the ? button any time for every tip, or to take this tour again.' },
    steps: ['g-mode', 'g-game-ui', 'g-look', 'g-presets'],
    delay: 3600,
    onEnd: () => { closeAll(); }
  });

  // wire the ? button once the login screen has drawn it
  const wire = setInterval(() => {
    const btn = T.deep('#wz-help-btn');
    if (btn) { T.helpMenu(btn); clearInterval(wire); }
  }, 500);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => T.start());
  else T.start();
})();
