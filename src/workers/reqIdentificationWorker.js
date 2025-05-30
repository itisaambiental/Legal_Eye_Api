import reqIdentificationQueue from '../queues/reqIdentificationQueue.js'

reqIdentificationQueue.process(async (job, done) => {
  console.log(job.data)
})

export default reqIdentificationQueue
