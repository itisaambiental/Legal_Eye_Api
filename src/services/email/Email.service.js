import transporter from '../../config/email.config.js'
import ErrorUtils from '../../utils/Error.js'
import { GMAIL_USER } from '../../config/variables.config.js'

// Class to handle sending emails
class EmailService {
// Send email
  static async sendEmail ({ to, subject, text }) {
    try {
      const mailOptions = {
        from: GMAIL_USER,
        to,
        subject,
        text
      }

      const info = await transporter.sendMail(mailOptions)
      return info
    } catch (error) {
      throw new ErrorUtils(500, 'Error sending email')
    }
  }

  static generateWelcomeEmail (user, password) {
    return {
      to: user.gmail,
      subject: '¡Bienvenido a LegalEye!',
      text: `Hola ${user.name}, tu cuenta fue creada exitosamente. Tu contraseña es ${password}`
    }
  }

  static generatePasswordResetEmail (gmail, verificationCode) {
    return {
      to: gmail,
      subject: 'Código de verificación',
      text: `Tu código de verificación es ${verificationCode}. Este código es válido por 1 minuto.`
    }
  }

  static generatePasswordResetEmailSend (gmail, newPassword) {
    return {
      to: gmail,
      subject: 'Tu nueva contraseña:',
      text: `Tu nueva contraseña: ${newPassword}. Por favor utilice esto para iniciar sesión.`
    }
  }
}

export default EmailService
