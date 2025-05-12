import HttpException from '../errors/HttpException.js'
import { S3_BUCKET_NAME, AWS_REGION } from '../../config/variables.config.js'
import { s3Client } from '../../config/aws.config.js'
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

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
   * @typedef {Object} FileFetchResult
   * @property {string} file - The file data encoded in Base64.
   * @property {string} contentType - The MIME type of the file.
   */

  /**
   * @typedef {Object} DeleteFileResult
   * @property {import('@aws-sdk/client-s3').DeleteObjectCommandOutput} response - The response from AWS S3 after deleting the file.
   */

  /**
   * Uploads a file to the specified S3 bucket.
   * Generates a unique file name to prevent overwriting existing files.
   * @param {Object} file - The file object to upload.
   * @param {Buffer} file.buffer - The file buffer.
   * @param {string} file.originalname - The original name of the file.
   * @param {string} file.mimetype - The MIME type of the file.
   * @returns {Promise<UploadFileResult>} - An object containing the S3 response and unique file name.
   * @throws {HttpException} - If an error occurs during file upload.
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
      const response = await s3Client.send(command)
      return { response, uniqueFileName }
    } catch (error) {
      throw new HttpException(500, 'Error uploading file', error.message)
    }
  }

  /**
   * Generates a presigned URL for accessing a file in the S3 bucket.
   * The URL is valid for a specified duration.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<string>} - The presigned URL for accessing the file.
   * @throws {HttpException} - If an error occurs while generating the presigned URL.
   */
  static async getFile (fileKey) {
    try {
      const getObjectParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new GetObjectCommand(getObjectParams)
      const urlExpiration = 432000
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: urlExpiration
      })
      return presignedUrl
    } catch (error) {
      throw new HttpException(
        500,
        'Error generating presigned URL',
        error.message
      )
    }
  }

  /**
   * Returns a permanent public URL for a file in the S3 bucket.
   * This URL does not expire and requires public access permissions on S3.
   *
   * @param {string} fileKey - The file path in the S3 bucket.
   * @returns {string} - The public URL of the file.
   *
   */
  static getPermanentFileUrl (fileKey) {
    return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`
  }

  /**
   * Fetches a file from a given URL and returns its buffer and content type.
   * @param {string} url - The URL of the file.
   * @returns {Promise<FileFetchResult>} - The file buffer and content type.
   * @throws {HttpException} - If the file cannot be fetched.
   */
  static async getFileFromUrl (url) {
    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      return {
        file: Buffer.from(response.data).toString('base64'),
        contentType: response.headers['content-type']
      }
    } catch (error) {
      throw new HttpException(
        error.response?.status || 500,
        'Error fetching file',
        error.message
      )
    }
  }

  /**
   * Deletes a file from the specified S3 bucket.
   * @param {string} fileKey - The key of the file in the S3 bucket to delete.
   * @returns {Promise<DeleteFileResult>} - An object containing the S3 response for the deletion.
   * @throws {HttpException} - If an error occurs while deleting the file.
   */
  static async deleteFile (fileKey) {
    try {
      const deleteParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileKey
      }
      const command = new DeleteObjectCommand(deleteParams)
      const response = await s3Client.send(command)
      return { response }
    } catch (error) {
      throw new HttpException(500, 'Error deleting file', error.message)
    }
  }
}

export default FileService
