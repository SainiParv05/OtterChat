/**
 * BACKEND MODULE - Auth Service (Dev 4)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'otterchat-secret-change-in-prod';
const JWT_EXPIRES = '7d';

async function register({ username, password, userPubKey, sigPubKey }) {
  const existing = await User.findOne({ username });
  if (existing) throw new Error('Username already taken');

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = uuidv4();

  const user = await User.create({ userId, username, passwordHash, userPubKey, sigPubKey });
  const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return { userId, token };
}

async function login({ username, password }) {
  const user = await User.findOne({ username });
  if (!user) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const token = jwt.sign({ userId: user.userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return { userId: user.userId, token, userPubKey: user.userPubKey, sigPubKey: user.sigPubKey };
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function getUserById(userId) {
  return User.findOne({ userId });
}

module.exports = { register, login, verifyToken, getUserById };
