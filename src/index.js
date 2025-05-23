/**
 * Entry point of the application.
 * Initializes the server and starts listening on the specified port.
 * Also initializes the admin user if not in test environment.
 */

import { app } from './app.js'
import { PORT } from './config/variables.config.js'
import { initializeAdmin } from './config/init.config.js'

const serverPort = Number(PORT || 3000)

/**
 * Variable to hold the server instance, initialized only if not in test environment.
 */

/**
 * Configure the Server.
 * @type {import('http').Server}
 */
let server

/**
 * Initialize the admin user if not in test environment.
 */
if (process.env.NODE_ENV !== 'test') {
  initializeAdmin()

  /**
   * Start the server and listen on the specified port.
   */
  server = app.listen(serverPort, () => {
    console.log('Server running on portt:', serverPort)
  })
}

export { app, server }
