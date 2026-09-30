// Banana Jam: the colour wheel, the tips, the icon list, the look settings and the ready-made presets are shared by the game window and the launcher.
// Their source lives with the game window; this copies them next to the launcher's scripts.
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const files = [
  ['assets/client/gui/components/util/WzColorPicker.js', 'assets/scripts/wz-color-picker.js'],
  ['assets/client/gui/components/util/WzTips.js', 'assets/scripts/wz-tips.js'],
  ['assets/client/gui/components/util/WzIcons.js', 'assets/scripts/wz-icons.js'],
  ['assets/client/gui/components/util/WzStyle.js', 'assets/scripts/wz-style.js'],
  ['assets/client/gui/components/util/WzPresets.js', 'assets/scripts/wz-presets.js'],
  ['assets/client/gui/components/util/WzShare.js', 'assets/scripts/wz-share.js'],
  ['assets/client/gui/components/util/WzFonts.js', 'assets/scripts/wz-fonts.js']
]
for (const [from, to] of files) {
  fs.copyFileSync(path.join(root, from), path.join(root, to))
}
console.log('Shared scripts copied.')
