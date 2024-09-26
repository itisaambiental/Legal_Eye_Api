import transporter from '../config/email.config.js'
import ErrorUtils from '../utils/Error.js'
import { GMAIL_USER } from '../config/variables.config.js'

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
}

export default EmailService
