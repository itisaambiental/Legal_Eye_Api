import FileService from '../services/files/File.service.js'
import HttpException from '../services/errors/HttpException.js'
import UserService from '../services/users/User.service.js'

/**
 * Controller for file operations.
 * @module FilesController
 */

/**
 * Uploads a file to AWS S3 and returns its permanent URL.
 * @function uploadFile
 * @param {import('express').Request} req - Request object, expects file in `req.file`.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The permanent URL of the uploaded file.
 */
export const uploadFile = async (req, res) => {
  const { userId } = req
  const file = req.file
  try {
    if (!file) {
      return res.status(400).json({ message: 'File is required' })
    }
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { uniqueFileName } = await FileService.uploadFile(file)
    const url = FileService.getPermanentFileUrl(uniqueFileName)
    return res.status(201).json({ url })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

/**
 * Fetches a file from a given URL and returns it as a buffer.
 * @function getFile
 * @param {import('express').Request} req - Request object, expects `{ url }` in body.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The file buffer and content type.
 */
export const getFile = async (req, res) => {
  const { userId } = req
  const { url } = req.query
  if (!url) {
    return res.status(400).json({ message: 'URL is required' })
  }
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { file, contentType } = await FileService.getFileFromUrl(url)
    return res.status(200).json({ file, contentType })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}
