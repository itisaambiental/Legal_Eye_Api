// src/workers/reqIdentificationWorker.js
import reqIdentificationQueue from '../queues/reqIdentificationQueue.js'

reqIdentificationQueue.process('processReqIdentification', async (job) => {
  console.log('Processing reqIdentification job:', job.data)
  // aquí colocaremso la lógica de tu worker
  return Promise.resolve()
})
