import ErrorUtils from '../../../utils/Error.js'
import articlesQueue from '../../../queues/articlesQueue.js'
/**
 * Service class for handling Article Jobs operations.
 */
class ArticlesWorkerService {
/**
 * Fetch the job from the queue and return the job state.
 * @param {string} jobId - The job ID.
 * @returns {Object} - The job state and relevant data.
 */
  static async getStatusJob (jobId) {
    try {
      const job = await articlesQueue.getJob(jobId)
      if (!job) {
        return {
          status: 404,
          data: { message: 'Job not found' }
        }
      }
      const state = await job.getState()
      switch (state) {
        case 'waiting':
        case 'active': {
          const progress = job.progress()
          return {
            status: 200,
            data: {
              message: 'Job is still processing',
              jobProgress: progress
            }
          }
        }
        case 'completed': {
          return {
            status: 200,
            data: {
              message: 'Job completed successfully'
            }
          }
        }
        case 'failed': {
          const failedReason = job.failedReason || 'Unknown error'
          return {
            status: 500,
            data: {
              message: 'Job failed',
              error: failedReason
            }
          }
        }
        case 'delayed': {
          return {
            status: 200,
            data: {
              message: 'Job is delayed and will be processed later'
            }
          }
        }
        case 'paused': {
          return {
            status: 200,
            data: {
              message: 'Job is paused and will be resumed once unpaused'
            }
          }
        }
        case 'stuck': {
          return {
            status: 500,
            data: {
              message: 'Job is stuck and cannot proceed'
            }
          }
        }
        default:
          return {
            status: 500,
            data: { message: 'Job is in an unknown state' }
          }
      }
    } catch (error) {
      throw new ErrorUtils(500, 'Failed to retrieve status records for job', [
        { jobId }
      ])
    }
  }
}

export default ArticlesWorkerService
