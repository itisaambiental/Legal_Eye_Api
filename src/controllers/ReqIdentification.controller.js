import ReqIdentificationService from '../services/reqIdentification/ReqIdentification.service.js'
import HttpException from '../services/errors/HttpException.js'
import UserService from '../services/users/User.service.js'

/**
 * Controller for requirement identifications operations.
 * @module ReqIdentificationController
 */

/**
 * Creates a new requirement identification.
 * @function createReqIdentification
 * @param {import('express').Request} req - Request object, expects { reqIdentificationName, reqIdentificationDescription, legalBasisIds, intelligenceLevel } in body and userId in request.
 * @param {import('express').Response} res - Response object.
 * @returns {Object} - The created requirement identification data.
 */
export const createReqIdentification = async (req, res) => {
  const { userId } = req
  const { reqIdentificationName, reqIdentificationDescription, legalBasisIds, intelligenceLevel } = req.body
  try {
    const isAuthorized = await UserService.userExists(userId)
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    const { reqIdentificationId, jobId } = await ReqIdentificationService.create(userId, {
      reqIdentificationName,
      reqIdentificationDescription,
      legalBasisIds,
      intelligenceLevel
    })
    return res.status(201).json({ reqIdentificationId, jobId })
  } catch (error) {
    if (error instanceof HttpException) {
      return res.status(error.status).json({
        message: error.message,
        ...(error.errors && { errors: error.errors })
      })
    }
    return res.status(500).json({ message: 'Internal Server Error' })
  }
}

// /**
//  * Retrieves all requirements identifications.
//  * @function getAllReqIdentifications
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const getAllReqIdentifications = async (req, res) => {
//   const { userId } = req
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const list = await ReqIdentificationService.getAll()
//     return res.status(200).json({ reqIdentifications: list })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Retrieves a single requirements identification by ID.
//  * @function getReqIdentificationById
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const getReqIdentificationById = async (req, res) => {
//   const { userId } = req
//   const { id } = req.params
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const entity = await ReqIdentificationService.getById(Number(id))
//     return res.status(200).json({ reqIdentification: entity })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Detects and links requirements for an identification.
//  * @function detectRequirements
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const detectRequirements = async (req, res) => {
//   const { userId } = req
//   const { identificationId, subjectId, aspectIds } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { linkedCount } =
//         await ReqIdentificationService.detectAndLinkRequirements({
//           identificationId: Number(identificationId),
//           subjectId: Number(subjectId),
//           aspectIds: aspectIds.map(Number)
//         })
//     return res.status(200).json({ linkedCount })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Updates name and description of a requirements identification.
//  * @function updateReqIdentificationById
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const updateReqIdentificationById = async (req, res) => {
//   const { userId } = req
//   const { id } = req.params
//   const { identificationName, identificationDescription } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const updated = await ReqIdentificationService.updateById({
//       id: Number(id),
//       identificationName,
//       identificationDescription
//     })
//     return res.status(200).json({ reqIdentification: updated })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res
//         .status(err.status)
//         .json({
//           message: err.message,
//           ...(err.errors && { errors: err.errors })
//         })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Deletes a requirements identification by ID.
//  * @function deleteReqIdentificationById
//  * @param {import('express').Request} req
//  */
// export const deleteReqIdentificationById = async (req, res) => {
//   const { userId } = req
//   const { id } = req.params
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.deleteById(Number(id))
//     return success
//       ? res.sendStatus(204)
//       : res.status(404).json({ message: 'Not found' })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Deletes all requirements identifications.
//  * @function deleteAllReqIdentifications
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const deleteAllReqIdentifications = async (req, res) => {
//   const { userId } = req
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     await ReqIdentificationService.deleteAll()
//     return res.sendStatus(204)
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Marks a requirements identification as 'Completed'.
//  * @function markReqIdentificationCompleted
//  * @param {import('express').Request} req - Expects { id } in params.
//  * @param {import('express').Response} res
//  */
// export const markReqIdentificationCompleted = async (req, res) => {
//   const { userId } = req
//   const { id } = req.params
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.markAsCompleted(
//       Number(id)
//     )
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Marks a requirements identification as 'Failed'.
//  * @function markReqIdentificationFailed
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const markReqIdentificationFailed = async (req, res) => {
//   const { userId } = req
//   const { id } = req.params
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.markAsFailed(Number(id))
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// // ——— Link / unlink endpoints ———

// /**
//  * Links a requirement to an identification.
//  * @function linkRequirement
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const linkRequirement = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.linkRequirement({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Unlinks a requirement from an identification.
//  * @function unlinkRequirement
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const unlinkRequirement = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.unlinkRequirement({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Retrieves all requirements linked to an identification.
//  * @function getLinkedRequirements
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const getLinkedRequirements = async (req, res) => {
//   const { userId } = req
//   const { identificationId } = req.params
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const list = await ReqIdentificationService.getLinkedRequirements(
//       Number(identificationId)
//     )
//     return res.status(200).json({ requirements: list })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Links metadata for a requirement.
//  * @function linkMetadata
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const linkMetadata = async (req, res) => {
//   const { userId } = req
//   const {
//     identificationId,
//     requirementId,
//     requirementNumber,
//     requirementTypeId
//   } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.linkMetadata({
//       identificationId,
//       requirementId,
//       requirementNumber,
//       requirementTypeId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Unlinks metadata for a requirement.
//  * @function unlinkMetadata
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const unlinkMetadata = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.unlinkMetadata({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Retrieves metadata linked to a requirement.
//  * @function getLinkedMetadata
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const getLinkedMetadata = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const metadata = await ReqIdentificationService.getLinkedMetadata({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ metadata })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Links a legal basis to a requirement.
//  * @function linkLegalBasis
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const linkLegalBasis = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId, legalBasisId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.linkLegalBasis({
//       identificationId,
//       requirementId,
//       legalBasisId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//    * Unlinks a legal basis from a requirement.
//    * @function unlinkLegalBasis
//    * @param {import('express').Request} req – Expects { identificationId, requirementId, legalBasisId } in body.
//    * @param {import('express').Response} res
//    */
// export const unlinkLegalBasis = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId, legalBasisId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.unlinkLegalBasis({
//       identificationId,
//       requirementId,
//       legalBasisId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//    * Retrieves all legal bases linked to a requirement.
//    * @function getLinkedLegalBases
//    * @param {import('express').Request} req – Expects { identificationId, requirementId } in query.
//    * @param {import('express').Response} res
//    */
// export const getLinkedLegalBases = async (req, res) => {
//   const { userId } = req
//   const identificationId = Number(req.query.identificationId)
//   const requirementId = Number(req.query.requirementId)
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const bases = await ReqIdentificationService.getLinkedLegalBases({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ legalBases: bases })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Links an article under a legal basis to a requirement.
//  * @function linkArticle
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const linkArticle = async (req, res) => {
//   const { userId } = req
//   const {
//     identificationId,
//     requirementId,
//     legalBasisId,
//     articleId,
//     articleType
//   } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.linkArticle({
//       identificationId,
//       requirementId,
//       legalBasisId,
//       articleId,
//       articleType
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//    * Unlinks an article from a requirement under a legal basis.
//    * @function unlinkArticle
//    * @param {import('express').Request} req – Expects { identificationId, requirementId, legalBasisId, articleId } in body.
//    * @param {import('express').Response} res
//    */
// export const unlinkArticle = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId, legalBasisId, articleId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.unlinkArticle({
//       identificationId,
//       requirementId,
//       legalBasisId,
//       articleId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//    * Retrieves all articles linked to a requirement under a legal basis.
//    * @function getLinkedArticles
//    * @param {import('express').Request} req – Expects identificationId and requirementId in query.
//    * @param {import('express').Response} res
//    */
// export const getLinkedArticles = async (req, res) => {
//   const { userId } = req
//   const identificationId = Number(req.query.identificationId)
//   const requirementId = Number(req.query.requirementId)
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const articles = await ReqIdentificationService.getLinkedArticles({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ articles })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//  * Links a legal verb translation to a requirement in an identification.
//  * @function linkLegalVerb
//  * @param {import('express').Request} req
//  * @param {import('express').Response} res
//  */
// export const linkLegalVerb = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId, legalVerbId, translation } =
//     req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.linkLegalVerb({
//       identificationId,
//       requirementId,
//       legalVerbId,
//       translation
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//    * Unlinks a legal verb translation from a requirement in an identification.
//    * @function unlinkLegalVerb
//    * @param {import('express').Request} req – Expects { identificationId, requirementId, legalVerbId } in body.
//    * @param {import('express').Response} res
//    */
// export const unlinkLegalVerb = async (req, res) => {
//   const { userId } = req
//   const { identificationId, requirementId, legalVerbId } = req.body
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const { success } = await ReqIdentificationService.unlinkLegalVerb({
//       identificationId,
//       requirementId,
//       legalVerbId
//     })
//     return res.status(200).json({ success })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }

// /**
//    * Retrieves all legal verb translations linked to a requirement in an identification.
//    * @function getLinkedLegalVerbs
//    * @param {import('express').Request} req – Expects identificationId and requirementId in query.
//    * @param {import('express').Response} res
//    */
// export const getLinkedLegalVerbs = async (req, res) => {
//   const { userId } = req
//   const identificationId = Number(req.query.identificationId)
//   const requirementId = Number(req.query.requirementId)
//   try {
//     if (!(await UserService.userExists(userId))) {
//       return res.status(403).json({ message: 'Unauthorized' })
//     }
//     const legalVerbs = await ReqIdentificationService.getLinkedLegalVerbs({
//       identificationId,
//       requirementId
//     })
//     return res.status(200).json({ legalVerbs })
//   } catch (err) {
//     if (err instanceof HttpException) {
//       return res.status(err.status).json({ message: err.message })
//     }
//     return res.status(500).json({ message: 'Internal Server Error' })
//   }
// }
