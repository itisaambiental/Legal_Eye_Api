import { app } from './app.js'
import { PORT } from './config/variables.config.js'
import { initializeAdmin } from './config/init.config.js'

app.use((req, res, next) => {
  res.status(404).json({
    message: 'endpoint not found'
  })
})
if (process.env.NODE_ENV !== 'test') {
  initializeAdmin()
}
const server = app.listen(PORT, () => {
  console.log('Server running on port', PORT)
})

export { app, server }
