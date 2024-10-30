import pdf from 'pdf-parse-new'
import { createWorker } from 'tesseract.js'
import ErrorUtils from '../../utils/Error.js'

/**
 * Service class for processing documents.
 * Handles PDF and image files, extracting text content using OCR when necessary.
 */
class DocumentService {
  // Static worker instance for OCR processing
  static worker = null

  /**
   * Initializes the OCR worker if it hasn't been initialized yet.
   * Sets up the worker to recognize English and Spanish languages.
   * @throws {ErrorUtils} If the worker fails to initialize.
   */
  static async initializeWorker () {
    if (!this.worker) {
      try {
        this.worker = await createWorker('eng+spa')
      } catch (error) {
        console.error('Worker Initialization Error:', error.message)
        throw new ErrorUtils(500, 'Worker Initialization Error', 'Failed to initialize the OCR worker')
      }
    }
  }

  /**
   * Terminates the OCR worker if it exists.
   * Cleans up resources used by the worker.
   * @throws {ErrorUtils} If the worker fails to terminate.
   */
  static async terminateWorker () {
    if (this.worker) {
      try {
        await this.worker.terminate()
      } catch (error) {
        console.error('Worker Termination Error:', error.message)
        throw new ErrorUtils(500, 'Worker Termination Error', 'Failed to terminate the OCR worker')
      } finally {
        this.worker = null
      }
    }
  }

  /**
   * Processes the provided document, extracting text content.
   * Supports PDF, PNG, JPG, and JPEG file types.
   * @param {Object} params - Parameters object.
   * @param {Object} params.document - The document to process.
   * @param {Buffer} params.document.buffer - The file buffer.
   * @param {string} params.document.mimetype - The MIME type of the file.
   * @returns {Promise<Object>} - An object containing success status and data or error message.
   */
  static async process ({ document }) {
    try {
      await this.initializeWorker()

      let extractedText = ''
      const { buffer, mimetype } = document

      if (mimetype === 'application/pdf') {
        if (!(buffer instanceof Buffer)) {
          return { success: false, error: 'The document buffer is not valid' }
        }
        extractedText = await this.extractTextFromPDF(buffer)
      } else if (['image/png', 'image/jpg', 'image/jpeg'].includes(mimetype)) {
        extractedText = await this.extractTextFromImage(buffer)
      } else {
        return { success: false, error: 'Allowed types are: pdf, png, jpg, jpeg' }
      }

      if (extractedText.trim()) {
        return { success: true, data: extractedText }
      } else {
        return { success: false, error: 'Failed to extract text from the document' }
      }
    } catch (error) {
      console.error('Document Processing Error:', error.message)
      return { success: false, error: error.message || 'Failed to process the document' }
    } finally {
      await this.terminateWorker()
    }
  }

  /**
 * Extracts text content from a PDF buffer using pdf-parse-new.
 * @param {Buffer} buffer - The PDF file buffer.
 * @returns {Promise<string>} - The extracted text content.
 * @throws {ErrorUtils} If an error occurs during PDF parsing.
 */
  static async extractTextFromPDF (buffer) {
    const options = {
      verbosityLevel: 0
    }

    return pdf(buffer, options)
      .then((data) => {
        return data.text
      })
      .catch((error) => {
        console.error(`PDF Reading Error: ${error.message}`)
        throw new ErrorUtils(500, 'PDF Reading Error', 'Failed to read PDF document')
      })
  }

  /**
   * Extracts text content from an image buffer using Tesseract.js.
   * @param {Buffer} buffer - The image file buffer.
   * @returns {Promise<string>} - The extracted text content.
   * @throws {ErrorUtils} If an error occurs during image processing.
   */
  static async extractTextFromImage (buffer) {
    try {
      const { data } = await this.worker.recognize(buffer)
      return data.text
    } catch (error) {
      console.error('Image Processing Error:', error.message)
      throw new ErrorUtils(500, 'Image Processing Error', 'Error extracting text from image')
    }
  }
}

export default DocumentService
