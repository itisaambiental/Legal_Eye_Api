/**
 * Module for configuring Nodemailer transport.
 * Sets up email transport based on the environment variables and current environment.
 * Supports development, test, and production environments.
 * @module EmailTransporter
 */

import nodemailer from 'nodemailer'
import { NODE_ENV, EMAIL_HOST, AWS_USER_EMAIL, EMAIL_PASS } from './variables.config.js'

/**
 * Determine if the environment is production.
 * @type {boolean}
 */
const isProduction = NODE_ENV === 'production'

/**
 * Nodemailer transport configuration object.
 * Adjusts settings based on the current environment.
 * @type {Object}
 */
const transporterConfig = {
  host: EMAIL_HOST,
  port: isProduction ? 465 : 587,
  secure: isProduction,
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
