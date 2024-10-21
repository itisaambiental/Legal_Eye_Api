/**
 * Module for configuring Nodemailer transport.
 * Sets up email transport based on the environment variables and current environment.
 * Supports development, test, and production environments.
 * @module EmailTransporter
 */

import nodemailer from 'nodemailer'
import { NODE_ENV, GMAIL_PASS, GMAIL_USER } from './variables.config.js'

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
  host: 'smtp.gmail.com',
  port: 587,
  secure: !isDevelopmentOrTest,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
}

/**
 * Creates a Nodemailer transporter with the defined configuration.
 * @type {import('nodemailer').Transporter}
 */
const transporter = nodemailer.createTransport(transporterConfig)

export default transporter
