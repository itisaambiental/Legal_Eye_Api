import ErrorUtils from '../../utils/Error.js'

/**
 * @typedef {Object} JobStateResponse
 * @property {number} status - The HTTP status of the response.
 * @property {Object} data - The data containing the job state details.
 * @property {string} data.message - Human-readable message describing the job state.
 * @property {number} [data.jobProgress] - The progress of the job (for active or completed states).
 * @property {string} [data.error] - The error message if the job failed.
 */

/**
 * Generic Queue Service for managing and interacting with different Bull queues.
 */
class QueueService {
  /**
   * Mapping of job states to human-readable messages and handlers for additional data.
   * This reduces verbosity and eliminates conditional logic in `getJobState`.
   */
  static responseMap = {
    waiting: { message: 'The job is waiting to be processed' },
    active: {
      message: 'Job is still processing',
      /**
       * @param {import('bull').Job} job - The Bull job instance.
       */
      handler: (job) => ({ jobProgress: job.progress() })
    },
    completed: {
      message: 'Job completed successfully',
      /**
       * @param {import('bull').Job} job - The Bull job instance.
       */
      handler: (job) => ({ jobProgress: job.progress() })
    },
    failed: {
      message: 'Job failed',
      /**
       * @param {import('bull').Job} job - The Bull job instance.
       */
      handler: (job) => ({ error: job.failedReason || 'Unknown error' })
    },
    delayed: { message: 'Job is delayed and will be processed later' },
    paused: { message: 'Job is paused and will be resumed once unpaused' },
    stuck: { message: 'Job is stuck and cannot proceed' },
    default: { message: 'Job is in an unknown state' }
  }

  /**
   * Fetches the state of a job and maps it to a human-readable response.
   * @param {import('bull').Job} job - The Bull job instance.
   * @returns {Promise<JobStateResponse>} - An object containing status and data (message and additionalData).
   * @throws {ErrorUtils} - If an error occurs while fetching the job state.
   */
  static async getJobState (job) {
    try {
      const state = await job.getState()
      const { message, handler } =
        QueueService.responseMap[state] || QueueService.responseMap.default
      const additionalData = handler ? handler(job) : {}
      return {
        status: 200,
        data: {
          message,
          ...additionalData
        }
      }
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to retrieve job state')
    }
  }

  /**
   * Retrieves jobs in specific states from a given queue.
   * @param {import('bull').Queue} queue - The Bull queue instance.
   * @param {Array<string>} states - Array of job states to retrieve (e.g., ['waiting', 'active']).
   * @returns {Promise<Array<import('bull').Job>>} - Array of jobs in the specified states.
   * @throws {ErrorUtils} - If an error occurs while retrieving jobs.
   */
  static async getJobsByStates (queue, states = []) {
    try {
      const jobs = await queue.getJobs(states)
      return jobs
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to retrieve jobs by states')
    }
  }

  /**
 * Cancels a job by either moving it to the failed state or removing it from the queue.
 * Jobs in 'completed' or 'failed' states cannot be modified.
 * @param {import('bull').Job} job - The Bull job instance.
 * @returns {Promise<boolean>} - True if the job was successfully canceled.
 * @throws {ErrorUtils} - If the job cannot be canceled or removed.
 */
  static async cancelJob (job) {
    try {
      const isActive = await job.isActive()
      const isCompleted = await job.isCompleted()
      const isFailed = await job.isFailed()
      if (isCompleted || isFailed) {
        throw new ErrorUtils(
          400,
          `Job cannot be canceled. Jobs in '${isCompleted ? 'completed' : 'failed'}' state cannot be modified.`
        )
      }
      if (isActive) {
        await job.moveToFailed({ message: 'Job was canceled' }, true)
      } else {
        await job.discard()
        await job.remove()
      }
      return true
    } catch (error) {
      if (error instanceof ErrorUtils) {
        throw error
      }
      throw new ErrorUtils(500, 'Failed to cancel job')
    }
  }
}

export default QueueService
