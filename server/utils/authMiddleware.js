/**
 * BACKEND MODULE - JWT Auth Middleware (Dev 4)
 */
const { verifyToken } = require('../services/AuthService');
const { error } = require('../utils/response');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return error(res, 'Missing or invalid authorization header', 401);
  }

  const token = header.split(' ')[1];
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
}

module.exports = { authMiddleware };
