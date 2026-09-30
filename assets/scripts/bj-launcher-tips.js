/*
 * Banana Jam: the retro tips for the launcher window.
 * The list is in the order the tips should appear.
 *
 * The ? button at the top right opens a list of every tip (the tips index).
 * Picking one goes to that place (opening the right tab or Settings section)
 * and shows its tip there. "where" is the heading it sits under in that list,
 * and "go" opens the right place first.
 */
(function () {
  if (!window.WzTips) return;
  const T = window.WzTips;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  async function waitFor(sel, ms) {
    const end = Date.now() + (ms || 3000);
    while (Date.now() < end) {
      const el = document.querySelector(sel);
      if (shown(el)) return el;
      await wait(80);
    }
    return null;
  }

  // close any pop-up window (Settings, plugins ...) so the main window can be seen
  async function closePopups() {
    const btn = Array.from(document.querySelectorAll('#modalContainer .modal-close-btn:not(.bjt-pop-x)')).find(shown);
    if (btn) { btn.click(); await wait(260); }
  }
  // the main window, on one of its tabs
  const mainWindow = (tabId) => async () => {
    await closePopups();
    if (tabId) {
      const tab = document.getElementById(tabId);
      if (tab && !tab.classList.contains('active')) { tab.click(); await wait(200); }
    }
  };
  // Settings, on a tab, with a section of the Theme tab opened
  const settings = (tab, section) => async () => {
    if (!shown(document.querySelector('#modalContainer .settings-tab'))) {
      await closePopups();
      const open = document.getElementById('settingsHeaderBtn');
      if (open) open.click();
    }
    const tabBtn = await waitFor(`#modalContainer .settings-tab[data-tab="${tab}"]`);
    if (tabBtn && !tabBtn.classList.contains('active')) { tabBtn.click(); await wait(150); }
    if (section) {
      const sec = await waitFor(`.bjt-sec[data-sec="${section}"]`);
      if (sec && !sec.classList.contains('open')) {
        const head = sec.querySelector('.bjt-head');
        if (head) head.click();
        await wait(120);
      }
    }
  };
  const OFF = { offWhen: '.bjt-off', offNote: '(Turn on Custom Theme first to use this.)' };

  T.register([
    { id: 'l-help', where: 'Top bar', go: mainWindow(), find: '#bjHelpBtn', title: 'Tips', text: 'Press this ? any time for the list of tips. Pick one to go straight to it.' },
    { id: 'l-play', where: 'Top bar', go: mainWindow(), find: '#playGameBtn', title: 'Play', text: 'Opens Animal Jam with Banana Jam switched on.' },
    { id: 'l-network', where: 'Top bar', go: mainWindow(), find: '#packetLoggingTab', title: 'Network', text: 'Shows the messages going between the game and the server.' },
    { id: 'l-plugins', where: 'Top bar', go: mainWindow(), find: '#pluginsTab', title: 'Plugins', text: 'Extra features you can open and use.' },
    { id: 'l-mode', where: 'Top bar', go: mainWindow(), find: '#bjModeBtn', title: 'Light or dark', text: 'Switch between light and dark. The launcher, the game and the Mod Menu all change together.' },
    { id: 'l-settings', where: 'Top bar', go: mainWindow(), find: '#settingsHeaderBtn', title: 'Settings', text: 'Change the theme, colours, picture and more.' },
    { id: 'l-command', where: 'Bottom bar', go: mainWindow(), find: '#input', title: 'Commands', text: 'Type a command here and press Enter.', side: 'above' },
    { id: 'l-fruit', where: 'Bottom bar', go: mainWindow(), find: '#fruitIcon', title: 'Your fruit', text: 'Pick a different fruit in Settings → Theme.', side: 'above' },
    { id: 'l-filter', where: 'Network tab', go: mainWindow('packetLoggingTab'), find: '#filterAllButton', title: 'Filter', text: 'Show all messages, only ones coming in, or only ones going out.' },
    { id: 'l-search', where: 'Network tab', go: mainWindow('packetLoggingTab'), find: '#packetSearch', title: 'Search', text: 'Type here to find a message.' },
    { id: 'l-plugin-tile', where: 'Plugins tab', go: mainWindow('pluginsTab'), find: '.plugin-grid-tile', title: 'Plugin', text: 'Click a plugin to open it. Right-click for more options.' },
    { id: 'l-custom-theme', where: 'Settings → Theme', go: settings('theme'), find: '#bjt-enabled-row', title: 'Custom theme', text: 'Turn this on to use your own colours and picture. Off gives you the Default look, in light or dark.' },
    { id: 'l-look', where: 'Settings → Theme', go: settings('theme', 'style'), find: '#bjt-look', title: 'Look', text: 'Changes the shape of everything. Mac is the new starting look.' },
    { id: 'l-buttons', where: 'Settings → Theme', go: settings('theme', 'style'), find: '#bjt-btns', title: 'Window buttons', text: 'Pick the style of the minimise, maximise and close buttons.' },
    { id: 'l-share', where: 'Settings → Theme', go: settings('theme'), find: '#bjt-share-btn', title: 'Same colours as the game', text: 'Click the lock to make the launcher and the game use the same colours. Change them in either place and the other follows.' },
    { id: 'l-fonts', where: 'Settings → Theme', go: settings('theme', 'style'), find: '#bjt-font', title: 'Font', text: 'Change the text style. Pick one that comes with Banana Jam, one from your PC, or upload your own.' },
    { id: 'l-presets', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '#bjt-preset', title: 'Presets', text: 'Pick a ready-made look, or save your own. Download one to share, or upload one a friend made.' },
    Object.assign({ id: 'l-lock', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '.bjt-lock', title: 'Lock', text: 'Locked: this part keeps its own colour. Unlocked: it follows the main colour.' }, OFF),
    Object.assign({ id: 'l-colour-box', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '.bjt-part input[type="color"]', title: 'Colour box', text: 'Click a colour box to open the colour wheel. You can drag the wheel around.' }, OFF),
    Object.assign({ id: 'l-picture', where: 'Settings → Theme', go: settings('theme', 'colours'), find: '#bjt-pic-upload', title: 'Background picture', text: 'Upload a picture for behind everything. Then blur, zoom and move it with the sliders.' }, OFF),
    { id: 'l-reset', where: 'Settings → Theme', go: settings('theme', 'more'), find: '#bjt-reset-colours', title: 'Reset', text: 'Puts the colours, or every setting, back to how they started. Click twice to be sure.' },
    { id: 'l-credits', where: 'Settings', go: settings('theme'), find: '#modalContainer .settings-tab[data-tab="about"]', title: 'Credits', text: 'Who made Banana Jam, and the projects it is built on.' }
  ]);


  // the tour that runs the first time Banana Jam starts (and from the ? menu)
  T.setTour({
    key: 'bjTourV7',
    welcome: { title: 'What is new', text: 'A quick look at what is new in this build. You can skip it any time, and take it again from the ? button.' },
    done: { title: 'That is everything new!', text: 'Press the ? button any time to see every tip, or to take this tour again.' },
    steps: ['l-mode', 'l-look', 'l-custom-theme', 'l-presets'],
    onEnd: () => { closePopups(); }
  });

  function wire() {
    const btn = document.getElementById('bjHelpBtn');
    if (btn) {
      btn.setAttribute('title', 'Tips: pick one to go straight to it');
      T.helpMenu(btn);
    }
    T.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
