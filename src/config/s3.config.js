/**
 * Initializes and exports the AWS S3 client.
 * Configures the client with AWS credentials and region from environment variables.
 */

import { AWS_REGION, AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID } from './variables.config.js'
import { S3Client } from '@aws-sdk/client-s3'

/**
 * The AWS S3 client configured with credentials and region.
 * @type {S3Client}
 */
const client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
})

export default client
