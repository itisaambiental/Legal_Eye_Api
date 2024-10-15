import { app } from './app.js'
import { PORT } from './config/variables.config.js'
import { initializeAdmin } from './config/init.config.js'

const DEFAULT_PORT = 3000
const serverPort = PORT || DEFAULT_PORT

if (process.env.NODE_ENV !== 'test') {
  initializeAdmin()
}

const server = app.listen(serverPort, () => {
  console.log('Server running on port', serverPort)
})

export { app, server }
