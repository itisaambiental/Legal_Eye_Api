/**
 * Routes module for file-related operations.
 * Defines the API endpoints for file management, including upload and retrieval.
 */

import { Router } from 'express'
import { upload } from '../config/multer.config.js'
import { uploadFile, getFile } from '../controllers/Files.controller.js'
import UserExtractor from '../middlewares/user_extractor.js'

/**
 * FileRouter
 * @type {Router}
 */
const router = Router()

/**
 * Route to upload a file to AWS S3.
 * @method POST
 * @path /files/upload
 * @description Uploads a file and returns its permanent URL.
 * @middleware UserExtractor
 * @middleware multer (for handling file upload)
 */
router.post('/files/', UserExtractor, upload.single('file'), uploadFile)

/**
 * Route to fetch a file from a given URL.
 * @method POST
 * @path /files/get
 * @description Fetches a file from a given URL and returns it as a base64 buffer.
 * @middleware UserExtractor
 */
router.get('/files/', UserExtractor, getFile)

export default router
