import express from 'express'
import UserRoutes from './routes/User.routes.js'
import cors from 'cors'
const app = express()

app.use(cors())
app.use(express.json())
app.use('/api', UserRoutes)

app.use((req, res, next) => {
  res.status(404).json({
    message: 'endpoint not found'
  })
})
export { app }