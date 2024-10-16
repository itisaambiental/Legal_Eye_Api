import { app } from './app.js'
import { PORT } from './config/variables.config.js'
import { initializeAdmin } from './config/init.config.js'

const serverPort = PORT || 3000

if (process.env.NODE_ENV !== 'test') {
  initializeAdmin()
}

const server = app.listen(serverPort, () => {
  console.log('Server running on port', serverPort)
})

export { app, server }
