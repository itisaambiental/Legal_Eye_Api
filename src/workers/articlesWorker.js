import articlesQueue from '../queues/articlesQueue.js'
/**
 * Worker for processing Articles jobs from the Articles queue.
 * Listens to the Articles queue and processes the Articles data.
 * Handles successful job completion and error cases.
 * @type {process}
 */
articlesQueue.process(10, async (job, done) => {
  try {
    const { document, legalBasisId } = job.data
    console.log('Processing Job...', document, legalBasisId)
    done(null)
  } catch (error) {
    console.error('Error processing Articles', error)
    done(error)
  }
})

export default articlesQueue
