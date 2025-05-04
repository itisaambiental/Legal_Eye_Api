/**
 * Optional user extractor middleware.
 * Extracts userId from JWT if present and valid. Does not block the request.
 *
 * @module OptionalUserExtractor
 */
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/variables.config.js'

/**
 * Extracts userId from JWT if present and valid. Does not block the request.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} _res - Express response object.
 * @param {import('express').NextFunction} next - Next middleware function.
 */
const OptionalUserExtractor = (req, _res, next) => {
  const authorization = req.get('authorization')
  let token = ''
  if (authorization && authorization.toLowerCase().startsWith('bearer')) {
    token = authorization.substring(7)
  }
  if (!token) return next()
  jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
    if (!err && decodedToken?.userForToken?.id) {
      req.userId = decodedToken.userForToken.id
    }
    next()
  })
}

export default OptionalUserExtractor
