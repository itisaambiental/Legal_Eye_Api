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
      console.error('Error sending email:', error)
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

  /**
 * Generates an email notifying the user that the article extraction was successful.
 * @param {string} gmail - The Gmail address of the user.
 * @param {string} legalBasisName - The name of the legal basis.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @returns {EmailData}
 */
  static generateArticleExtractionSuccessEmail (gmail, legalBasisName, legalBasisId) {
    const articleUrl = `${APP_URL}/legal_basis/${legalBasisId}/articles`

    return {
      to: gmail,
      subject: 'Extracción de artículos completada con éxito',
      text: `La extracción de artículos para el fundamento legal "${legalBasisName}" ha sido exitosa.
Puedes consultar los artículos en: ${articleUrl}`,
      html: `<p>La extracción de artículos para el fundamento legal 
             <strong>${legalBasisName}</strong> ha sido <strong>exitosa</strong>.</p>
           <p style="margin-top: 20px;">
             <a href="${articleUrl}" target="_blank"
               style="display: inline-block; padding: 10px 20px; background-color: #113c53; color: white;
               text-decoration: none; border-radius: 5px;">
               Ver artículos
             </a>
           </p>`
    }
  }

  /**
 * Generates an email notifying the user that the article extraction failed.
 * @param {string} gmail - The Gmail address of the user.
 * @param {string} legalBasisName - The name of the legal basis.
 * @param {string} reason - Reason why the extraction failed.
 * @returns {EmailData}
 */
  static generateArticleExtractionFailureEmail (gmail, legalBasisName, reason) {
    return {
      to: gmail,
      subject: 'Error en la extracción de artículos',
      text: `La extracción de artículos para el fundamento legal "${legalBasisName}" ha fallado.
Razón: ${reason}`,
      html: `<p>La extracción de artículos para el fundamento legal 
             <strong>${legalBasisName}</strong> ha <strong>fallado</strong>.</p>
           <p>Razón: <em>${reason}</em></p>`
    }
  }

  /**
 * Generates an email notifying the user that the legal basis failed to be sent.
 * @param {string} gmail - The Gmail address of the user.
 * @param {string} legalBasisName - The name of the legal basis.
 * @returns {EmailData}
 */
  static generateSendLegalBasisFailureEmail (gmail, legalBasisName) {
    return {
      to: gmail,
      subject: 'Error al enviar el fundamento legal a ACM Suite',
      text: `Ocurrió un error al intentar enviar el fundamento legal "${legalBasisName}" a ACM Suite.`,
      html: `<p><strong>Ocurrió un error</strong> al intentar enviar el fundamento legal <strong>${legalBasisName}</strong> a ACM Suite.</p>`
    }
  }

  /**
 * Generates an email notifying the user that all legal bases were sent successfully.
 * @param {string} gmail - The Gmail address of the user.
 * @returns {EmailData}
 */
  static generateAllLegalBasisSentSuccessEmail (gmail) {
    return {
      to: gmail,
      subject: 'Todos los fundamentos legales fueron enviados exitosamente',
      text: 'Todos los fundamentos legales seleccionados han sido enviados correctamente a ACM Suite.',
      html: '<p><strong>Todos los fundamentos legales seleccionados</strong> han sido <strong>enviados exitosamente</strong> a ACM Suite.</p>'
    }
  }

  /**
 * Generates an email notifying the user that all legal bases failed to be sent.
 * @param {string} gmail - The Gmail address of the user.
 * @returns {EmailData}
 */
  static generateAllLegalBasisFailedEmail (gmail) {
    return {
      to: gmail,
      subject: 'Error al enviar los fundamentos legales a ACM Suite',
      text: 'Ocurrió un error y ninguno de los fundamentos legales seleccionados pudo ser enviado a ACM Suite.',
      html: '<p><strong>Ocurrió un error</strong> y <strong>ninguno</strong> de los fundamentos legales seleccionados pudo ser enviado a ACM Suite.</p>'
    }
  }
}

export default EmailService
