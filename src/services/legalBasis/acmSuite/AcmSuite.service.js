// Legal_Eye_Api/src/services/legalBasis/acmSuite/AcmSuite.service.js

import { BaseAcmSuiteService } from './BaseAcmSuite.service.js'
import ErrorUtils from '../../../utils/Error'

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
   * @param {string|Date|null} legalBasis.lastReform - The date of the last reform.
   * @returns {Promise<{ success: boolean, id?: number, error?: string }>}
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
        return { success: true, id: data.id_guideline }
      }
      return { success: false, error: message }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to send LegalBasis')
    }
  }

  /**
   * Sends an article to ACM Suite under a specific guideline.
   * @param {number} legalBasisId - The ID of the legal basis
   * @param {Object} article - The article object.
   * @param {string} article.article_name - The title of the article.
   * @param {string} article.description - The full content of the article.
   * @param {number} article.article_order - The display order for the article.
   * @returns {Promise<{ success: boolean, id?: number, error?: string }>}
   */
  async sendArticle (legalBasisId, article) {
    try {
      const response = await this.api.post(`/catalogs/guideline/${legalBasisId}/legal_basi`, {
        legal_basis: article.description,
        legal_quote: article.article_name,
        publish: false,
        order: article.article_order
      })
      const { success, data, message } = response.data
      if (success && data?.id_legal_basis) {
        return { success: true, id: data.id_legal_basis }
      }
      return { success: false, error: message }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to send Article')
    }
  }

  /**
   * Fetches all legal classifications from ACM Suite.
   * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
   */
  async getByClassifications () {
    try {
      const response = await this.api.get('/source/legal_classification')
      const { success, data, message } = response.data

      if (success && Array.isArray(data)) {
        return { success: true, data }
      }

      return { success: false, error: message || 'Unexpected response format' }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to fetch legal classifications')
    }
  }

  /**
   * Retrieves the list of available application types (jurisdictions) from ACM Suite.
   * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
   */
  async getByJurisdiction () {
    try {
      const response = await this.api.get('/source/application_type')
      const { success, data, message } = response.data

      if (success && Array.isArray(data)) {
        return { success: true, data }
      }

      return { success: false, error: message || 'Unexpected response format' }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to fetch jurisdiction types')
    }
  }

  /**
   * Retrieves the list of all countries available in ACM Suite.
   * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
   */
  async getAllCountries () {
    try {
      const response = await this.api.get('/source/country')
      const { success, data, message } = response.data

      if (success && Array.isArray(data)) {
        return { success: true, data }
      }

      return { success: false, error: message || 'Unexpected response format' }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to fetch countries')
    }
  }

  /**
 * Retrieves the list of states for a given country from ACM Suite.
 * @param {number} countryId - ID of the country to filter states.
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
  async getStatesByCountry (countryId) {
    try {
      const response = await this.api.get('/source/state', {
        params: {
          'filters[id_country]': countryId
        }
      })

      const { success, data, message } = response.data

      if (success && Array.isArray(data)) {
        return { success: true, data }
      }

      return { success: false, error: message || 'Unexpected response format' }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to fetch states by country')
    }
  }

  /**
 * Retrieves the list of cities for a given state from ACM Suite.
 * @param {number} stateId - ID of the state to filter cities.
 * @returns {Promise<{ success: boolean, data?: Array, error?: string }>}
 */
  async getCitiesByState (stateId) {
    try {
      const response = await this.api.get('/source/city', {
        params: {
          'filters[id_state]': stateId
        }
      })

      const { success, data, message } = response.data

      if (success && Array.isArray(data)) {
        return { success: true, data }
      }

      return { success: false, error: message || 'Unexpected response format' }
    } catch (error) {
      if (error.response?.data?.message) {
        return { success: false, error: error.response.data.message }
      }
      throw new ErrorUtils(500, 'Failed to fetch cities by state')
    }
  }
}
