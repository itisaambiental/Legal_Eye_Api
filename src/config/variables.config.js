/**
 * Loads environment variables from a .env file into process.env.
 * Exports the required environment variables for use throughout the application.
 */

import dotenv from 'dotenv'
dotenv.config()

/**
 * Destructures and exports environment variables from process.env.
 * These variables are used for application configuration.
 * @type {Object}
 */
export const {
  PORT,
  JWT_SECRET,
  JWT_EXPIRATION,
  DB_PORT,
  HOST_DATABASE,
  PASSWORD_DATABASE,
  USER_DATABASE,
  DATABASE,
  DATABASE_DEV,
  DATABASE_TEST,
  GMAIL_USER,
  GMAIL_PASS,
  NODE_ENV,
  REDIS_PASS,
  REDIS_USER,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASS_DEV,
  REDIS_USER_DEV,
  REDIS_HOST_DEV,
  REDIS_PORT_DEV,
  REDIS_PASS_TEST,
  REDIS_USER_TEST,
  REDIS_HOST_TEST,
  REDIS_PORT_TEST,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_REGION,
  S3_BUCKET_NAME,
  ADMIN_GMAIL,
  ADMIN_ROLE,
  ADMIN_NAME,
  ADMIN_PASSWORD_TEST,
  MICROSOFT_GRAPH_API,
  OPENAI_API_KEY,
  LLAMA_API_KEY
} = process.env
