// getUserData.js

import axios from 'axios'
import { MICROSOFT_GRAPH_API } from '../config/variables.config.js'
import ErrorUtils from './Error.js'

/**
 * Calls the Microsoft Graph API to retrieve user email.
 * @param {string} accessToken - The Microsoft access token.
 * @returns {Promise<string>} - The user's email address.
 * @throws {ErrorUtils} - If the token is invalid or the API call fails.
 */
export async function getUserData (accessToken) {
  try {
    const graphUrl = `${MICROSOFT_GRAPH_API}/me`
    const { data } = await axios.get(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    const { mail, userPrincipalName } = data
    const userEmail = mail || userPrincipalName
    if (!userEmail) {
      throw new ErrorUtils(401, 'Invalid token')
    }

    return userEmail
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new ErrorUtils(401, 'Invalid token')
    }
    throw new ErrorUtils(500, 'Microsoft API call failed', error.message)
  }
}
