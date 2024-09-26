import axios from 'axios'
import { MICROSOFT_GRAPH_API } from '../config/variables.config.js'
import ErrorUtils from './Error.js'

// Function to call Microsoft Graph API and get user email
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
    console.error('Error in Microsoft API call:', error.message)
    throw new ErrorUtils(500, 'Microsoft API call failed')
  }
}
