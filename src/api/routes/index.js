const { Router } = require('express')

/**
 * Controllers.
 */
const FilesController = require('../controllers/FilesController')

/**
 * Express router.
 * @type {Router}
 * @const
 */
const router = Router()

/**
 * Health check endpoint for port verification.
 * @public
 */
router.get('/api/health', (request, response) => {
  response.status(200).json({ 
    success: true, 
    service: 'strawberry-jam-api',
    timestamp: Date.now()
  })
})

/**
 * AJ Classic close notification route.
 * @public
 */
router.post('/api/aj-classic-close', (request, response) => {
  try {
    console.log('[API] Received AJ Classic close notification');
    
    // Send message to parent process (main Electron process) via IPC
    if (process.send) {
      process.send({ type: 'aj-classic-closing' });
      console.log('[API] Sent aj-classic-closing message to main process');
    } else {
      console.warn('[API] process.send is not available - running in main process?');
    }
    
    response.status(200).json({ success: true, message: 'AJ Classic close notification received' });
  } catch (error) {
    console.error('[API] Error handling AJ Classic close notification:', error);
    response.status(500).json({ success: false, error: error.message });
  }
})

/**
 * Banana Jam: plugin list and open/close for the in-game Mod Menu.
 * The game asks this route; the launcher does the work.
 * A custom header is needed, so a normal web page cannot call it by accident.
 * @public
 */
const bjPending = new Map()
let bjSeq = 0
process.on('message', (message) => {
  if (message && message.type === 'bj-plugins-reply') {
    const item = bjPending.get(message.id)
    if (item) {
      bjPending.delete(message.id)
      clearTimeout(item.timer)
      item.response.status(200).json(message.data || { success: false })
    }
  }
})
router.get('/crossdomain.xml', (request, response) => {
  response.type('text/x-cross-domain-policy').send('<?xml version="1.0"?><cross-domain-policy><site-control permitted-cross-domain-policies="master-only"/><allow-access-from domain="*" secure="false"/><allow-http-request-headers-from domain="*" headers="X-BJ,Content-Type" secure="false"/></cross-domain-policy>')
})
router.post('/api/bj/plugins', (request, response) => {
  if (request.get('X-BJ') !== '1') {
    return response.status(403).json({ success: false })
  }
  const body = request.body || {}
  const action = body.action
  if ((action !== 'list' && action !== 'toggle') || !process.send) {
    return response.status(400).json({ success: false })
  }
  const name = typeof body.name === 'string' ? body.name.slice(0, 120) : ''
  const id = ++bjSeq
  const timer = setTimeout(() => {
    bjPending.delete(id)
    response.status(504).json({ success: false })
  }, 4000)
  bjPending.set(id, { response, timer })
  process.send({ type: 'bj-plugins', id, action, name })
})

/**
 * Animal Jam files route.
 * @public
 */
router.get(/^\/(\d{4})\/ajclient\.swf$/, async (request, response) => FilesController.game(request, response))
router.all('*', async (request, response) => FilesController.index(request, response))

module.exports = router
