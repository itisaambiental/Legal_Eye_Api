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
  APP_URL,
  JWT_SECRET,
  JWT_EXPIRATION,
  DB_PORT,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  DB_PORT_TEST,
  DB_HOST_TEST,
  DB_USER_TEST,
  DB_PASSWORD_TEST,
  DB_DATABASE_TEST,
  EMAIL_USER,
  AWS_USER_EMAIL,
  EMAIL_PASS,
  NODE_ENV,
  REDIS_PASS,
  REDIS_USER,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASS_TEST,
  REDIS_USER_TEST,
  REDIS_HOST_TEST,
  REDIS_PORT_TEST,
  EMAIL_HOST,
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
  ORGANIZATION_ID,
  PROJECT_ID,
  CONCURRENCY_EXTRACT_ARTICLES
} = process.env
