/**
 * Configures and exports the Multer middleware for handling file uploads.
 */

import multer from 'multer'

/**
 * The Multer upload middleware configured with default settings.
 * @type {multer.Multer}
 */
export const upload = multer()
