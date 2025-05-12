/**
 * Middleware for extracting and verifying the JWT token from the request.
 * Adds the user ID to the request object if the token is valid.
 * @module UserExtractor
 */

import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/variables.config.js'

/**
 * Extracts and verifies the JWT token from the 'Authorization' header.
 * If valid, sets the user ID in the request object; otherwise, returns a 401 error.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 */
const UserExtractor = (req, res, next) => {
  const authorization = req.get('authorization')
  let token = ''
  if (authorization && authorization.toLowerCase().startsWith('bearer')) {
    token = authorization.substring(7)
  }
  let decodedToken
  try {
    decodedToken = jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return res.status(401).send({ error: 'token missing or invalid' })
  }
  if (!token || !decodedToken.userForToken.id) {
    return res.status(401).send({ error: 'token missing or invalid' })
  }
  const { id: userId } = decodedToken.userForToken
  req.userId = userId
  next()
}

export default UserExtractor
