// EmailService.js

import transporter from '../../config/email.config.js'
import ErrorUtils from '../../utils/Error.js'
import { EMAIL_USER, APP_URL } from '../../config/variables.config.js'

/**
 * @typedef {Object} EmailData
 * @property {string} to - Recipient's email address.
 * @property {string} subject - Subject of the email.
 * @property {string} text - Plain text content of the email.
 * @property {string} html - HTML content of the email.
 */

/**
 * Service class for handling email operations.
 * Provides methods for sending different types of emails.
 */
class EmailService {
  /**
   * Sends an email using the configured transporter.
   * @param {EmailData} mailData - The email data.
   * @returns {Promise<void>} - Resolves when the email is sent successfully.
   * @throws {ErrorUtils} - Throws an error if the email fails to send.
   */
  static async sendEmail ({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: EMAIL_USER,
        to,
        subject,
        text,
        html
      }

      await transporter.sendMail(mailOptions)
    } catch (error) {
      throw new ErrorUtils(500, 'Error sending email', error)
    }
  }

  /**
   * Generates a welcome email for a new user.
   * @param {Object} user - The user data.
   * @param {string} user.name - The name of the user.
   * @param {string} user.gmail - The Gmail address of the user.
   * @param {string} password - The generated password for the user.
   * @returns {EmailData} - Returns an object containing email data.
   */
  static generateWelcomeEmail (user, password) {
    return {
      to: user.gmail,
      subject: '¡Bienvenido a Isa Legal!',
      text: `Hola ${user.name}, tu cuenta fue creada exitosamente. 
             Tu contraseña es: ${password}. 
             Para iniciar sesión, visita: ${APP_URL}`,
      html: `<p>Hola <strong>${user.name}</strong>, tu cuenta fue creada exitosamente.</p>
             <p>Tu contraseña es: <strong>${password}</strong></p>
             <p>Para iniciar sesión, <a href="${APP_URL}" target="_blank">haz clic aquí</a>.</p>`
    }
  }

  /**
   * Generates a password reset email with a verification code.
   * @param {string} gmail - The Gmail address of the user.
   * @param {string} verificationCode - The verification code for password reset.
   * @returns {EmailData} - Returns an object containing email data.
   */
  static generatePasswordResetEmail (gmail, verificationCode) {
    return {
      to: gmail,
      subject: 'Código de verificación',
      text: `Tu código de verificación es: ${verificationCode}. 
             Este código es válido por 1 minuto.`,
      html: `<p>Tu código de verificación es: <strong>${verificationCode}</strong></p>
             <p>Este código es válido por <strong>1 minuto</strong>.</p>`
    }
  }

  /**
   * Generates an email with a new password for the user.
   * @param {string} gmail - The Gmail address of the user.
   * @param {string} newPassword - The new password for the user.
   * @returns {EmailData} - Returns an object containing email data.
   */
  static generatePasswordResetEmailSend (gmail, newPassword) {
    return {
      to: gmail,
      subject: 'Tu nueva contraseña',
      text: `Tu nueva contraseña es: ${newPassword}. 
             Para iniciar sesión, visita: ${APP_URL}`,
      html: `<p>Tu nueva contraseña es: <strong>${newPassword}</strong></p>
             <p>Para iniciar sesión, <a href="${APP_URL}" target="_blank">haz clic aquí</a>.</p>`
    }
  }
}

export default EmailService
