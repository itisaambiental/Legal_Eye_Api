import emailQueue from '../queues/emailQueue.js'
import EmailService from '../services/email/Email.service.js'
import HttpException from '../services/errors/HttpException.js'

/**
 * Worker for processing email jobs from the email queue.
 * Listens to the email queue and sends emails using the EmailService.
 * Handles successful job completion and error cases.
 *
 * @param {import('bull').Job} job - The job object containing data to be processed.
 * @param {import('bull').ProcessCallbackFunction} done - Callback function to signal job completion.
 * @throws {HttpException} - Throws an error if any step in the job processing fails.
 */
emailQueue.process(async (job, done) => {
  try {
    /**
     * Destructure the job data to get email details.
     * @type {import('../services/email/Email.service.js').EmailData}
     */
    const { to, subject, text, html } = job.data
    await EmailService.sendEmail({ to, subject, text, html })
    done()
  } catch (error) {
    if (error instanceof HttpException) {
      return done(error)
    }
    return done(
      new HttpException(500, 'Unexpected error sending email')
    )
  }
})

export default emailQueue
