/**
 * BACKEND MODULE - Auth Controller (Dev 4)
 */
const { register, login } = require('../services/AuthService');
const { success, error } = require('../utils/response');
const { requireFields } = require('../utils/validator');

async function registerHandler(req, res) {
  try {
    requireFields(req.body, ['username', 'password', 'userPubKey']);
    const result = await register(req.body);
    return success(res, result, 201);
  } catch (err) {
    return error(res, err.message);
  }
}

async function loginHandler(req, res) {
  try {
    requireFields(req.body, ['username', 'password']);
    const result = await login(req.body);
    return success(res, result);
  } catch (err) {
    return error(res, err.message, 401);
  }
}

module.exports = { registerHandler, loginHandler };
