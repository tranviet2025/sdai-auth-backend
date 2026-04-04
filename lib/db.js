// ============================================================
// SDAi Plugin - Database Connection Helper
// MongoDB Atlas connection caching for Vercel Serverless
// ============================================================

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'sdai-plugin-secret-change-this';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '72h';

// Cache the client promise across hot reloads in serverless
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // Return cached client if still connected
  if (cachedClient && cachedDb) {
    try {
      // Ping to confirm connection is still alive
      await cachedDb.command({ ping: 1 });
      return cachedClient;
    } catch (e) {
      // Connection dropped - reset cache and reconnect
      console.log('MongoDB connection lost, reconnecting...');
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  cachedClient = client;
  cachedDb = client.db('sdai_plugin');

  return cachedClient;
}

module.exports = { connectToDatabase, JWT_SECRET, JWT_EXPIRES };
