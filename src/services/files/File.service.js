import ErrorUtils from '../../utils/Error.js'
import { S3_BUCKET_NAME } from '../../config/variables.config.js'
import client from '../../config/s3.config.js'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

/**
 * Service class for handling file uploads and retrievals.
 * Interacts with AWS S3 to upload files, generate presigned URLs, and manage file contents.
 */
class FileService {
  /**
   * @typedef {Object} UploadFileResult
   * @property {import('@aws-sdk/client-s3').PutObjectAclCommandOutput} response - The response from AWS S3 after uploading the file.
   * @property {string} uniqueFileName - The unique name assigned to the uploaded file.
   */

  /**
   * Uploads a file to the specified S3 bucket.
   * Generates a unique file name to prevent overwriting existing files.
   * @param {Object} file - The file object to upload.
   * @param {Buffer} file.buffer - The file buffer.
   * @param {string} file.originalname - The original name of the file.
   * @param {string} file.mimetype - The MIME type of the file.
   * @returns {Promise<UploadFileResult>} - An object containing the S3 response and unique file name.
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
      throw new ErrorUtils(500, 'Error uploading file', error.message)
    }
  }

  /**
   * Generates a presigned URL for accessing a file in the S3 bucket.
   * The URL is valid for a specified duration.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<string>} - The presigned URL for accessing the file.
   * @throws {ErrorUtils} - If an error occurs while generating the presigned URL.
   */
  static async getFile (fileKey) {
    try {
      const getObjectParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new GetObjectCommand(getObjectParams)
      const urlExpiration = 432000 // 5 days
      const presignedUrl = await getSignedUrl(client, command, { expiresIn: urlExpiration })
      return presignedUrl
    } catch (error) {
      throw new ErrorUtils(500, 'Error generating presigned URL', error.message)
    }
  }

  /**
   * @typedef {Object} FileContentResult
   * @property {Buffer} buffer - The binary content of the file as a buffer.
   * @property {string} mimetype - The MIME type of the file.
   */

  /**
   * Fetches the content of a file from the S3 bucket.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<FileContentResult>} - An object containing the file buffer and MIME type.
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
      throw new ErrorUtils(500, 'Error fetching file content', error.message)
    }
  }

  /**
   * @typedef {Object} DeleteFileResult
   * @property {import('@aws-sdk/client-s3').DeleteObjectCommandOutput} response - The response from AWS S3 after deleting the file.
   */

  /**
   * Deletes a file from the specified S3 bucket.
   * @param {string} fileKey - The key of the file in the S3 bucket to delete.
   * @returns {Promise<DeleteFileResult>} - An object containing the S3 response for the deletion.
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
      throw new ErrorUtils(500, 'Error deleting file', error.message)
    }
  }
}

export default FileService
