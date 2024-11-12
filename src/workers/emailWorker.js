// emailWorker.js

import emailQueue from '../queues/emailQueue.js'
import EmailService from '../services/email/Email.service.js'

/**
 * Worker for processing email jobs from the email queue.
 * Listens to the email queue and sends emails using the EmailService.
 * Handles successful job completion and error cases.
 * @type {process}
 */
emailQueue.process(async (job, done) => {
  try {
    /**
     * Destructure the job data to get email details.
     * @param {Object} job.data - The job data containing email details.
     * @param {string} job.data.to - Recipient's email address.
     * @param {string} job.data.subject - Subject of the email.
     * @param {string} job.data.text - Content of the email.
     */
    const { to, subject, text } = job.data
    await EmailService.sendEmail({ to, subject, text })
    done()
  } catch (error) {
    console.error('Error sending email:', error)
    done(error)
  }
})

export default emailQueue
