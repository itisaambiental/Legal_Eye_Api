import { app } from './app.js'
import { PORT } from './config/variables.config.js'
import { initializeAdmin } from './config/init.config.js'

if (process.env.NODE_ENV !== 'test') {
  initializeAdmin()
}
const server = app.listen(PORT, () => {
  console.log('Server running on port', PORT)
})

export { app, server }
