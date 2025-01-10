/**
 * Module for configuring Nodemailer transport.
 * Sets up email transport based on the environment variables and current environment.
 * Supports development, test, and production environments.
 * @module EmailTransporter
 */

import nodemailer from 'nodemailer'
import { NODE_ENV, AWS_USER_EMAIL, EMAIL_PASS } from './variables.config.js'

/**
 * Determine if the environment is development or test.
 * @type {boolean}
 */
const isDevelopmentOrTest = NODE_ENV === 'development' || NODE_ENV === 'test'

/**
 * Nodemailer transport configuration object.
 * Adjusts settings based on the current environment.
 * @type {object}
 */
const transporterConfig = {
  host: 'email-smtp.us-east-1.amazonaws.com',
  port: isDevelopmentOrTest ? 587 : 465,
  secure: !isDevelopmentOrTest,
  auth: {
    user: AWS_USER_EMAIL,
    pass: EMAIL_PASS
  }
}

/**
 * Creates a Nodemailer transporter with the defined configuration.
 * @type {nodemailer.Transporter}
 */
const transporter = nodemailer.createTransport(transporterConfig)

export default transporter
