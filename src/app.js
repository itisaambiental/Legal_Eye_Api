/**
 * Sets up the Express application, including middleware and routes.
 */

import express from 'express'
import cors from 'cors'
import UserRoutes from './routes/User.routes.js'
import FilesRoutes from './routes/Files.routes.js'
import SubjectsRoutes from './routes/Subjects.routes.js'
import AspectsRoutes from './routes/Aspects.routes.js'
import LegalBasisRoutes from './routes/LegalBasis.routes.js'
import SendLegalBasisRoutes from './routes/SendLegalBasis.routes.js'
import ArticlesRoutes from './routes/Articles.routes.js'
import ExtractArticlesRoutes from './routes/ExtractArticles.routes.js'
import RequirementsRoutes from './routes/Requirements.routes.js'
import { NODE_ENV, APP_URL } from './config/variables.config.js'
/**
 * Configure the Express application.
 * @type {import('express').Application}
 */
const app = express()

/**
 * Middleware setup.
 */

const corsOptions =
  NODE_ENV === 'production'
    ? {
        origin: APP_URL
      }
    : {}

app.use(cors(corsOptions)) // Enable Cross-Origin Resource Sharing
app.use(express.json()) // Parse incoming JSON requests

/**
 * Route setup.
 */

app.use('/api', UserRoutes)
app.use('/api', FilesRoutes)
app.use('/api', SubjectsRoutes)
app.use('/api', AspectsRoutes)
app.use('/api', LegalBasisRoutes)
app.use('/api', SendLegalBasisRoutes)
app.use('/api', ArticlesRoutes)
app.use('/api', ExtractArticlesRoutes)
app.use('/api', RequirementsRoutes)

/**
 * Handle 404 Not Found errors.
 */
app.use((_req, res, _next) => {
  res.status(404).json({
    message: 'Endpoint not found'
  })
})

export { app }
