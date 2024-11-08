// EmailService.js

import transporter from '../../config/email.config.js'
import ErrorUtils from '../../utils/Error.js'
import { EMAIL_USER } from '../../config/variables.config.js'

/**
 * Service class for handling email operations.
 * Provides methods for sending different types of emails.
 */
class EmailService {
  /**
   * Sends an email using the configured transporter.
   * @param {Object} mailData - The email data.
   * @param {string} mailData.to - Recipient's email address.
   * @param {string} mailData.subject - Subject of the email.
   * @param {string} mailData.text - Content of the email.
   * @returns {Promise<Object>} - Information about the sent email.
   * @throws {ErrorUtils} - If an error occurs during email sending.
   */
  static async sendEmail ({ to, subject, text }) {
    try {
      const mailOptions = {
        from: EMAIL_USER,
        to,
        subject,
        text
      }

      const info = await transporter.sendMail(mailOptions)
      return info
    } catch (error) {
      console.error(error)
      throw new ErrorUtils(500, 'Error sending email')
    }
  }

  /**
   * Generates a welcome email for a new user.
   * @param {Object} user - The user data.
   * @param {string} user.name - The name of the user.
   * @param {string} user.gmail - The Gmail address of the user.
   * @param {string} password - The generated password for the user.
   * @returns {Object} - Welcome email data.
   */
  static generateWelcomeEmail (user, password) {
    return {
      to: user.gmail,
      subject: '¡Bienvenido a LegalEye!',
      text: `Hola ${user.name}, tu cuenta fue creada exitosamente. Tu contraseña es ${password}`
    }
  }

  /**
   * Generates a password reset email with a verification code.
   * @param {string} gmail - The Gmail address of the user.
   * @param {string} verificationCode - The verification code for password reset.
   * @returns {Object} - Password reset email data.
   */
  static generatePasswordResetEmail (gmail, verificationCode) {
    return {
      to: gmail,
      subject: 'Código de verificación',
      text: `Tu código de verificación es ${verificationCode}. Este código es válido por 1 minuto.`
    }
  }

  /**
   * Generates an email with a new password for the user.
   * @param {string} gmail - The Gmail address of the user.
   * @param {string} newPassword - The new password for the user.
   * @returns {Object} - New password email data.
   */
  static generatePasswordResetEmailSend (gmail, newPassword) {
    return {
      to: gmail,
      subject: 'Tu nueva contraseña:',
      text: `Tu nueva contraseña: ${newPassword}. Por favor utilice esto para iniciar sesión.`
    }
  }
}

export default EmailService
