import { BaseAcmSuiteService } from './BaseAcmSuite.service.js'
import ErrorUtils from '../../../utils/Error.js'

/**
 * AcmSuiteService provides methods to interact with the ACM Suite API endpoints.
 * Extends BaseAcmSuiteService to inherit authentication and session management.
 */
export class AcmSuiteService extends BaseAcmSuiteService {
  /**
 * Sends a LegalBasis object to create a new guideline in ACM Suite.
 * @param {Object} legalBasis - Parameters for creating a legal basis.
 * @param {string} legalBasis.legalName - The legal basis name.
 * @param {string} legalBasis.abbreviation - The legal basis abbreviation.
 * @param {number} legalBasis.classificationId - ID of the legal classification.
 * @param {number} legalBasis.jurisdictionId - ID of the jurisdiction.
 * @param {number} [legalBasis.stateId] - ID of the state.
 * @param {number} [legalBasis.municipalityId] - ID of the municipality.
 * @param {string} legalBasis.lastReform - The date of the last reform.
 * @returns {Promise<number>} The ID of the created legal basis in ACM Suite.
 * @throws {ErrorUtils} If the request fails or the creation is not successful.
 */
  async sendLegalBasis (legalBasis) {
    try {
      const response = await this.api.post('/catalogs/guideline', {
        guideline: legalBasis.legalName,
        initials_guideline: legalBasis.abbreviation,
        last_date: legalBasis.lastReform,
        id_application_type: legalBasis.jurisdictionId,
        id_legal_c: legalBasis.classificationId,
        id_state: legalBasis.stateId,
        id_city: legalBasis.municipalityId
      })
      const { success, data, message } = response.data
      if (success && data?.id_guideline) {
        return data.id_guideline
      }
      throw new ErrorUtils(500, message)
    } catch (error) {
      console.error(error)
      if (error.response?.data?.message) {
        throw new ErrorUtils(500, error.response.data.message)
      }
      throw new ErrorUtils(500, 'Failed to create LegalBasis')
    }
  }

  /**
 * Sends an article to ACM Suite under a specific guideline.
 * @param {number} legalBasisId - The ID of the legal basis.
 * @param {Object} article - The article object.
 * @param {string} article.article_name - The title of the article.
 * @param {string} article.description - The full content of the article.
 * @param {number} article.article_order - The display order for the article.
 * @returns {Promise<void>} Resolves if successful; throws an error if failed.
 * @throws {ErrorUtils} If the request fails or the creation is not successful.
 */
  async sendArticle (legalBasisId, article) {
    try {
      const response = await this.api.post(`/catalogs/guideline/${legalBasisId}/legal_basi`, {
        legal_basis: article.article_name,
        legal_quote: article.description,
        publish: false,
        order: article.article_order
      })
      const { success, message } = response.data
      if (!success) {
        throw new ErrorUtils(500, message)
      }
    } catch (error) {
      if (error.response?.data?.message) {
        throw new ErrorUtils(500, error.response.data.message)
      }
      throw new ErrorUtils(500, 'Failed to create Article')
    }
  }

  /**
 * Fetches the classification ID from ACM Suite based on a given classification name.
 * @param {string} classification - The classification name to find.
 * @returns {Promise<number>} The ID of the classification.
 * @throws {ErrorUtils} If the request fails or the response is not as expected.
 */
  async getClassificationId (classification) {
    try {
      const response = await this.api.get('/source/legal_classification')
      const { success, data, message } = response.data
      if (success && Array.isArray(data)) {
        const found = data.find(item => item.legal_classification.toLowerCase() === classification.toLowerCase())
        if (found) {
          return found.id_legal_c
        }
        if (data.length > 0) {
          return data[0].id_legal_c
        }
        throw new ErrorUtils(500, 'Failed to fetch classification ID')
      }
      throw new ErrorUtils(500, message)
    } catch (error) {
      if (error.response?.data?.message) {
        throw new ErrorUtils(500, error.response.data.message)
      }
      throw new ErrorUtils(500, 'Failed to fetch classification ID')
    }
  }

  /**
 * Retrieves the application type ID (jurisdiction) from ACM Suite based on a given jurisdiction name.
 * @param {string} jurisdiction - The name of the jurisdiction to find.
 * @returns {Promise<number>} The ID of the jurisdiction.
 * @throws {ErrorUtils} If the request fails or the jurisdiction is not found.
 */
  async getJurisdictionId (jurisdiction) {
    try {
      const response = await this.api.get('/source/application_type')
      const { success, data, message } = response.data
      if (success && Array.isArray(data)) {
        const found = data.find(item => item.application_type.toLowerCase() === jurisdiction.toLowerCase())
        if (found) {
          return found.id_application_type
        }
        if (data.length > 0) {
          return data[0].id_application_type
        }
        throw new ErrorUtils(500, 'Failed to fetch jurisdiction ID')
      }
      throw new ErrorUtils(500, message)
    } catch (error) {
      if (error.response?.data?.message) {
        throw new ErrorUtils(500, error.response.data.message)
      }
      throw new ErrorUtils(500, 'Failed to fetch jurisdiction ID')
    }
  }

  /**
 * Retrieves the state ID from ACM Suite based on a given state name and country ID.
 * @param {string} state - The name of the state to find.
 * @param {number} [countryId=1] - The ID of the country to filter states.
 * @returns {Promise<number>} The ID of the state.
 * @throws {ErrorUtils} If the request fails or the state is not found.
 */
  async getStateId (state, countryId = 1) {
    try {
      const response = await this.api.get('/source/state', {
        params: {
          'filters[id_country]': countryId
        }
      })
      const { success, data, message } = response.data
      if (success && Array.isArray(data)) {
        const found = data.find(item => item.state.toLowerCase() === state.toLowerCase())
        if (found) {
          return found.id_state
        }
        if (data.length > 0) {
          return data[0].id_state
        }
        throw new ErrorUtils(500, 'Failed to fetch state ID')
      }
      throw new ErrorUtils(500, message)
    } catch (error) {
      if (error.response?.data?.message) {
        throw new ErrorUtils(500, error.response.data.message)
      }
      throw new ErrorUtils(500, 'Failed to fetch state ID')
    }
  }

  /**
 * Retrieves the municipality ID from ACM Suite based on a given municipality name and state ID.
 * @param {number} stateId - ID of the state to filter cities.
 * @param {string} municipality - The name of the municipality to find.
 * @returns {Promise<number>} The ID of the municipality.
 * @throws {ErrorUtils} If the request fails or the municipality is not found.
 */
  async getMunicipalityId (stateId, municipality) {
    try {
      const response = await this.api.get('/source/city', {
        params: {
          'filters[id_state]': stateId
        }
      })
      const { success, data, message } = response.data
      if (success && Array.isArray(data)) {
        const found = data.find(item => item.city.toLowerCase() === municipality.toLowerCase())
        if (found) {
          return found.id_city
        }
        if (data.length > 0) {
          return data[0].id_city
        }
        throw new ErrorUtils(500, 'Failed to fetch municipality ID')
      }
      throw new ErrorUtils(500, message)
    } catch (error) {
      if (error.response?.data?.message) {
        throw new ErrorUtils(500, error.response.data.message)
      }
      throw new ErrorUtils(500, 'Failed to fetch municipality ID')
    }
  }
}

export default AcmSuiteService
