import requirementsIdentificationQueue from '../queues/requirementsIdentificationQueue.js'

requirementsIdentificationQueue.process(async (job, done) => {
  console.log('Processing job with data:', job.data)
  done(null)
})

export default requirementsIdentificationQueue
