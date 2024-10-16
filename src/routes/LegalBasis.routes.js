import { Router } from 'express'
import UserExtractor from '../middleware/access_token.js'
import { createLegalBasis } from '../controllers/LegalBasis.controller..js'
import { upload } from '../config/multer.config.js'

const router = Router()

// Route to create a new LegalBasis
router.post('/fundamento/create', upload.single('document'), UserExtractor, createLegalBasis)

export default router
