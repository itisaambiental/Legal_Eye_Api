/**
 * Entry point of the application.
 * Initializes the server and starts listening on the specified port.
 * Also initializes the admin user if not in test environment.
 */

import { app } from './app.js'
import { PORT } from './config/variables.config.js'
import { initializeAdmin } from './config/init.config.js'

const serverPort = PORT || 3000

/**
 * Initialize the admin user if not in test environment.
 */
if (process.env.NODE_ENV !== 'test') {
  initializeAdmin()
}

/**
 * Start the server and listen on the specified port.
 */
const server = app.listen(serverPort, () => {
  console.log('Server running on port', serverPort)
})

export { app, server }
