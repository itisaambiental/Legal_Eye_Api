import requirementsIdentificationQueue from '../queues/requirementsIdentificationQueue.js'
import ErrorUtils from '../utils/Error.js'

requirementsIdentificationQueue.process(10, async (job, done) => {
  try {
    console.log('Processing requirements identification job:', job.id)
    setTimeout(() => {
      console.log(`Terminated worker for job ID: ${job.id}`)
      done(null)
    }, 600000)
  } catch (error) {
    if (error instanceof ErrorUtils) {
      return done(error)
    }
    return done(
      new ErrorUtils(500, 'Unexpected error requirements identification processing')
    )
  }
})

export default requirementsIdentificationQueue
