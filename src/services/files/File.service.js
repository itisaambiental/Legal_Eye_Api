import ErrorUtils from '../../utils/Error.js'
import { S3_BUCKET_NAME } from '../../config/variables.config.js'
import client from '../../config/s3.config.js'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

/**
 * Service class for handling file uploads and retrievals.
 * Interacts with AWS S3 to upload files and generate presigned URLs for file access.
 */
class FileService {
  /**
   * Uploads a file to the specified S3 bucket.
   * Generates a unique file name to prevent overwriting existing files.
   * @param {Object} file - The file object to upload.
   * @param {Buffer} file.buffer - The file buffer.
   * @param {string} file.originalname - The original name of the file.
   * @param {string} file.mimetype - The MIME type of the file.
   * @returns {Promise<Object>} - An object containing the response and unique file name.
   * @throws {ErrorUtils} - If an error occurs during file upload.
   */
  static async uploadFile (file) {
    try {
      const uniqueId = uuidv4()
      const uniqueFileName = `${uniqueId}_${file.originalname}`
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype
      }
      const command = new PutObjectCommand(uploadParams)
      const response = await client.send(command)
      return { response, uniqueFileName }
    } catch (error) {
      console.error('Error uploading file:', error.message)
      throw new ErrorUtils(500, 'Error uploading file')
    }
  }

  /**
   * Generates a presigned URL for accessing a file in the S3 bucket.
   * The URL is valid for a specified duration.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<string>} - The presigned URL for the file.
   * @throws {ErrorUtils} - If an error occurs while generating the presigned URL.
   */
  static async getFile (fileKey) {
    try {
      const getObjectParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new GetObjectCommand(getObjectParams)
      const urlExpiration = 432000
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: urlExpiration })
      return presignedUrl
    } catch (error) {
      console.error('Error generating presigned URL:', error.message)
      throw new ErrorUtils(500, 'Error generating presigned URL')
    }
  }

  /**
 * Fetches the content of a file from the S3 bucket.
 * @param {string} fileKey - The key of the file in the S3 bucket.
 * @returns {Promise<Object>} - An object containing the buffer and mimetype of the file.
 * @throws {ErrorUtils} - If an error occurs while retrieving the file content.
 */
  static async getFileContent (fileKey) {
    try {
      const getObjectParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new GetObjectCommand(getObjectParams)
      const { Body, ContentType } = await client.send(command)
      const streamToBuffer = async (stream) => {
        return new Promise((resolve, reject) => {
          const chunks = []
          stream.on('data', (chunk) => chunks.push(chunk))
          stream.on('end', () => resolve(Buffer.concat(chunks)))
          stream.on('error', reject)
        })
      }
      const buffer = await streamToBuffer(Body)
      return { buffer, mimetype: ContentType }
    } catch (error) {
      console.error('Error fetching file content:', error.message)
      throw new ErrorUtils(500, 'Error fetching file content')
    }
  }

  /**
 * Deletes a file from the specified S3 bucket.
 * @param {string} fileKey - The key of the file in the S3 bucket to delete.
 * @returns {Promise<Object>} - An object containing the response from S3.
 * @throws {ErrorUtils} - If an error occurs while deleting the file.
 */
  static async deleteFile (fileKey) {
    try {
      const deleteParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new DeleteObjectCommand(deleteParams)
      const response = await client.send(command)
      return { response }
    } catch (error) {
      console.error('Error deleting file:', error.message)
      throw new ErrorUtils(500, 'Error deleting file')
    }
  }
}

export default FileService
