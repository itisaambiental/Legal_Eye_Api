import { PdfReader } from 'pdfreader'
import { createWorker } from 'tesseract.js'
import ErrorUtils from '../../utils/Error.js'

class DocumentService {
  static worker = null

  static async initializeWorker () {
    if (!this.worker) {
      this.worker = await createWorker('eng+spa')
        .catch(error => {
          console.error('Worker Initialization Error:', error.message)
          throw new ErrorUtils(500, 'Worker Initialization Error', 'Failed to initialize the OCR worker')
        })
    }
  }

  static async terminateWorker () {
    if (this.worker) {
      await this.worker.terminate()
        .catch(error => {
          console.error('Worker Termination Error:', error.message)
          throw new ErrorUtils(500, 'Worker Termination Error', 'Failed to terminate the OCR worker')
        })
        .finally(() => {
          this.worker = null
        })
    }
  }

  static async process ({ document }) {
    try {
      await this.initializeWorker()

      let text = ''
      if (document.mimetype === 'application/pdf') {
        if (!(document.buffer instanceof Buffer)) {
          return { success: false, error: 'The document buffer is not valid' }
        }

        text = await this.extractTextFromPDF(document.buffer)
      } else if (['image/png', 'image/jpg', 'image/jpeg'].includes(document.mimetype)) {
        text = await this.extractTextFromImage(document.buffer)
      } else {
        return { success: false, error: 'Allowed types are: pdf, png, jpg, jpeg' }
      }

      if (text.trim()) {
        return { success: true, data: text }
      } else {
        return { success: false, error: 'Failed to process the document' }
      }
    } catch (error) {
      return { success: false, error: error.message || 'Failed to process the document' }
    } finally {
      await this.terminateWorker()
    }
  }

  static extractTextFromPDF (document) {
    return new Promise((resolve, reject) => {
      let text = ''
      new PdfReader().parseBuffer(document, (error, item) => {
        if (error) {
          console.error(`Error reading PDF: ${error.message}`)
          reject(new ErrorUtils(500, 'PDF Reading Error'))
        } else if (!item) {
          resolve(text)
        } else if (item.text) {
          text += `${item.text} `
        }
      })
    })
  }

  static async extractTextFromImage (document) {
    return this.worker.recognize(document)
      .then(({ data }) => data.text)
      .catch(error => {
        console.error('Image Processing Error:', `Error extracting text from image: ${error.message}`)
        throw new ErrorUtils(500, 'Error extracting text from image')
      })
  }
}

export default DocumentService
