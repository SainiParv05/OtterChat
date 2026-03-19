/**
 * BACKEND MODULE - Database Config (Dev 4)
 */
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/otterchat';
  await mongoose.connect(uri);
  console.log('[DB] Connected to MongoDB');
}

module.exports = { connectDB };
