import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../config/variables.config.js'

const UserExtractor = (req, res, next) => {
  const authorizacion = req.get('authorization')

  let token = ''
  if (authorizacion && authorizacion.toLowerCase().startsWith('bearer')) {
    token = authorizacion.substring(7)
  }

  let decodedToken
  try {
    decodedToken = jwt.verify(token, JWT_SECRET)
  } catch (e) {
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
