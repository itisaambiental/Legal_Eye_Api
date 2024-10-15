import nodemailer from 'nodemailer'
import { NODE_ENV, GMAIL_PASS, GMAIL_USER } from './variables.config.js'

const isDevelopmentOrTest = NODE_ENV === 'development' || NODE_ENV === 'test'

const transporter = nodemailer.createTransport({
  host: isDevelopmentOrTest ? 'smtp.gmail.com' : 'smtp.gmail.com',
  port: isDevelopmentOrTest ? 587 : 587,
  secure: NODE_ENV === 'production',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
})

export default transporter
