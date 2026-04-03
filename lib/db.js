// ============================================================
// SDAi Plugin - Authentication Backend for Vercel + MongoDB
// Deploy này lên Vercel, kết nối MongoDB Atlas free tier
// ============================================================

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// MongoDB connection (set in Vercel env vars)
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'sdai-plugin-secret-change-this';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '72h'; // 72 hours

let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();
  cachedClient = client;
  return client;
}

module.exports = { connectToDatabase, JWT_SECRET, JWT_EXPIRES, bcrypt, jwt };
