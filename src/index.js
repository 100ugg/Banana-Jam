// Banana Jam: keep settings in the same folder even though the app is now named "Banana Jam"
const path = require('path')
const { app } = require('electron')
app.setPath('userData', path.join(app.getPath('appData'), 'bananajam'))

const Electron = require('./electron')

new Electron()
  .create()
