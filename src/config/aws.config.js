/**
 * @description Initializes and exports AWS clients
 */

import { AWS_REGION, AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID } from './variables.config.js'
import { TextractClient } from '@aws-sdk/client-textract'
import { S3Client } from '@aws-sdk/client-s3'

/**
 * AWS configuration object used for initializing AWS SDK clients.
 * @constant {Object}
 * @property {string} region - The AWS region.
 * @property {Object} credentials - AWS credentials object.
 * @property {string} credentials.accessKeyId - AWS access key ID.
 * @property {string} credentials.secretAccessKey - AWS secret access key.
 */
const awsConfig = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
}

/**
 * AWS Textract client instance.
 * Used for extracting text from documents.
 * @constant {TextractClient}
 */
const textractClient = new TextractClient(awsConfig)

/**
 * AWS S3 client instance.
 * Used for interacting with Amazon S3 storage service.
 * @constant {S3Client}
 */
const s3Client = new S3Client(awsConfig)

export { textractClient, s3Client }
