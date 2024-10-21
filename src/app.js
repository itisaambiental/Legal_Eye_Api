/**
 * Sets up the Express application, including middleware and routes.
 */

import express from 'express'
import cors from 'cors'
import UserRoutes from './routes/User.routes.js'
import LegalBasisRoutes from './routes/LegalBasis.routes.js'

/**
 * Configure the Express application.
 * @type {Express}
 */
const app = express()

/**
 * Middleware setup.
 */
app.use(cors()) // Enable Cross-Origin Resource Sharing
app.use(express.json()) // Parse incoming JSON requests

/**
 * Route setup.
 */
app.use('/api', UserRoutes)
app.use('/api', LegalBasisRoutes)

/**
 * Handle 404 Not Found errors.
 */
app.use((req, res, next) => {
  res.status(404).json({
    message: 'Endpoint not found'
  })
})

export { app }
