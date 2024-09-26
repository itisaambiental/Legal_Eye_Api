import emailQueue from '../config/emailQueue.js'
import EmailService from '../services/Email.service.js'

// Email Worker
emailQueue.process(async (job, done) => {
  try {
    const { to, subject, text } = job.data
    await EmailService.sendEmail({ to, subject, text })
    done()
  } catch (error) {
    console.error('Error enviando el correo:', error)
    done(error)
  }
})

export default emailQueue
