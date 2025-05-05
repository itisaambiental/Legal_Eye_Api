import { S3_BUCKET_NAME } from '../../config/variables.config.js'
import { textractClient } from '../../config/aws.config.js'
import ErrorUtils from '../../utils/Error.js'
import {
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  JobStatus,
  BlockType,
  FeatureType
} from '@aws-sdk/client-textract'

/**
 * Service class for processing documents.
 * Handles PDF and image files, extracting text content.
 */
class DocumentService {
  /**
   * Processes the provided file, extracting text content.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<{success: boolean, text?: string, error?: string}>} - The processing result.
   */
  static async extractText (fileKey) {
    try {
      const jobId = await this.startExtractText(fileKey)
      const isComplete = await this.waitForJobCompletion(jobId)
      if (!isComplete) {
        return { success: false, error: 'Unexpected Error' }
      }
      const text = await this.getExtractedText(jobId)
      return { success: true, text }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Starts the text extraction process from a file stored in S3.
   * @param {string} fileKey - The key of the file in the S3 bucket.
   * @returns {Promise<string>} - The JobId of the extraction process.
   */
  static async startExtractText (fileKey) {
    try {
      const startCommand = new StartDocumentAnalysisCommand({
        DocumentLocation: {
          S3Object: { Bucket: S3_BUCKET_NAME, Name: fileKey }
        },
        FeatureTypes: [FeatureType.LAYOUT]
      })
      const { JobId } = await textractClient.send(startCommand)
      return JobId
    } catch (error) {
      throw new ErrorUtils(`Failed to start text extraction for ${fileKey}`)
    }
  }

  /**
 * Waits for the Textract job to complete.
 * @param {string} jobId - The Job ID of the document analysis.
 * @returns {Promise<boolean>} - Returns `true` if the job completes successfully, otherwise throws an error.
 */
  static async waitForJobCompletion (jobId) {
    let jobStatus = JobStatus.IN_PROGRESS
    const maxRetries = 60
    const secondsWait = 5000
    let retries = 0
    while (jobStatus === JobStatus.IN_PROGRESS) {
      if (retries >= maxRetries) {
        throw new ErrorUtils('Textract job timed out')
      }
      await new Promise(resolve => setTimeout(resolve, secondsWait))
      try {
        const command = new GetDocumentAnalysisCommand({ JobId: jobId })
        const response = await textractClient.send(command)
        jobStatus = response.JobStatus
        if (jobStatus === JobStatus.FAILED) {
          throw new ErrorUtils('Textract job failed')
        }
      } catch (error) {
        throw new ErrorUtils('Failed to check job status')
      }
      retries++
    }
    if (jobStatus === JobStatus.SUCCEEDED) {
      return true
    }
    throw new ErrorUtils('Unexpected job status')
  }

  /**
   * Retrieves the extracted text from Textract.
   * @param {string} jobId - The Job ID of the document analysis.
   * @returns {Promise<string>} - The full extracted text.
   */
  static async getExtractedText (jobId) {
    const extractedText = []
    let nextToken = null
    do {
      try {
        const commandParams = { JobId: jobId }
        if (nextToken) commandParams.NextToken = nextToken
        const command = new GetDocumentAnalysisCommand(commandParams)
        const response = await textractClient.send(command)
        const textBlocks = response.Blocks.filter(
          (block) => block.BlockType === BlockType.LINE && block.Text
        ).map((block) => block.Text.trim())
        extractedText.push(...textBlocks)
        nextToken = response.NextToken
      } catch (error) {
        throw new ErrorUtils('Failed to retrieve extracted text')
      }
    } while (nextToken)
    return extractedText.join('\n')
  }
}

export default DocumentService
