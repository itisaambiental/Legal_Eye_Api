// Legal_Eye_Api/src/services/legalBasis/acmSuite/BaseAcmSuiteService.js

import axios from 'axios'
import { ACM_SUITE_API_URL, ACM_SUITE_EMAIL, ACM_SUITE_PASSWORD } from '../../../config/variables.config.js'
import ErrorUtils from '../../../utils/Error.js'

console.log(ACM_SUITE_API_URL, ACM_SUITE_EMAIL, ACM_SUITE_PASSWORD)

/**
 * BaseAcmSuiteService is responsible for authenticating with the ACM Suite API, storing and refreshing access tokens.
 */
export class BaseAcmSuiteService {
  constructor () {
    this.token = null
    this.refreshTokenValue = null
    this.refreshingPromise = null
    this.email = ACM_SUITE_EMAIL
    this.password = ACM_SUITE_PASSWORD
    this.api = axios.create({
      baseURL: ACM_SUITE_API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  /**
 * Authenticates and configures the ACM Suite service.
 * Performs login and sets up request and response interceptors.
 * Automatically attaches Authorization headers and refreshes token if needed.
 * @returns {Promise<void>}
 * @throws {ErrorUtils} If login or token refresh fails.
 */
  async auth () {
    const { accessToken, refreshToken } = await this.login()
    this.token = accessToken
    this.refreshTokenValue = refreshToken
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config
        const isUnauthorized = error.response?.status === 401
        if (isUnauthorized && !originalRequest._retry) {
          originalRequest._retry = true
          try {
            if (this.refreshingPromise) {
              const { accessToken, refreshToken } = await this.refreshingPromise
              this.token = accessToken
              this.refreshTokenValue = refreshToken
            } else {
              this.refreshingPromise = this.refreshToken()
              const { accessToken, refreshToken } = await this.refreshingPromise
              this.token = accessToken
              this.refreshTokenValue = refreshToken
            }
            originalRequest.headers.Authorization = `Bearer ${this.token}`
            return this.api(originalRequest)
          } finally {
            this.refreshingPromise = null
          }
        }
        throw new ErrorUtils(500, error.response?.data?.message)
      }
    )
  }

  /**
 * Logs in to the ACM Suite API and retrieves access and refresh tokens.
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 * @throws {ErrorUtils} If login fails or response is invalid.
 */
  async login () {
    try {
      const response = await this.api.post('/login', {
        email: this.email,
        password: this.password
      })
      const { success, data, message } = response.data
      if (!success) {
        throw new ErrorUtils(401, message)
      }
      const { access_token: accessToken, refresh_token: refreshToken } = data
      return { accessToken, refreshToken }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new ErrorUtils(401, error.response?.data?.message)
      }
      throw new ErrorUtils(500, 'Failed to login to ACM Suite')
    }
  }

  /**
 * Refreshes the access token using the stored refresh token.
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 * @throws {ErrorUtils} If refresh token is invalid or refresh fails.
 */
  async refreshToken () {
    try {
      const response = await this.api.post('/refresh-token', {
        refresh_token: this.refreshTokenValue
      })
      const { success, data, message } = response.data
      if (!success || !data?.access_token || !data?.refresh_token) {
        throw new ErrorUtils(401, message || 'Unauthorized during token refresh')
      }
      const { access_token: accessToken, refresh_token: refreshToken } = data
      return { accessToken, refreshToken }
    } catch (error) {
      if (error.response?.status === 401) {
        throw new ErrorUtils(401, error.response?.data?.message)
      }
      throw new ErrorUtils(500, 'Failed to refresh token in ACM Suite')
    }
  }
}
