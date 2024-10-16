// services/DocumentService.js

import { PdfReader } from 'pdfreader'
import { createWorker } from 'tesseract.js'
import fs from 'fs'
import ErrorUtils from '../utils/Error.js'
import { fromPath } from 'pdf2pic'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

class DocumentService {
  static async process ({ document }) {
    try {
      if (document.mimetype === 'application/pdf') {
        if (!(document.buffer instanceof Buffer)) {
          console.error('Invalid document buffer')
          return { success: false, error: 'The document buffer is not valid' }
        }

        const pdfText = await this.extractTextFromPDF(document.buffer)

        if (pdfText.trim()) {
          return { success: true, data: pdfText }
        } else {
          const ocrText = await this.extractTextFromPDFImages(document.buffer)
          return { success: true, data: ocrText }
        }
      } else if (['image/png', 'image/jpg', 'image/jpeg'].includes(document.mimetype)) {
        const imageText = await this.extractTextFromImage(document.buffer)
        return { success: true, data: imageText }
      } else {
        console.error('Unsupported file type')
        return { success: false, error: 'Allowed types are: pdf, png, jpg, jpeg' }
      }
    } catch (error) {
      console.error('Document Processing Error:', error)
      return { success: false, error: error.message || 'Failed to process the document' }
    }
  }

  static extractTextFromPDF (pdfBuffer) {
    return new Promise((resolve, reject) => {
      let text = ''
      new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
        if (err) {
          reject(new ErrorUtils(500, 'PDF Reading Error', `Error reading PDF: ${err.message}`))
        } else if (!item) {
          resolve(text)
        } else if (item.text) {
          text += `${item.text} `
        }
      })
    })
  }

  static async extractTextFromPDFImages (pdfBuffer) {

  }

  static async extractTextFromImage (imageBuffer) {
    const worker = await createWorker('eng')
    const { data, jobId } = await worker.recognize(imageBuffer)
    await worker.terminate(jobId)
    return data.text
  }
}

export default DocumentService
