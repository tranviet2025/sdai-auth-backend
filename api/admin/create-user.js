// ============================================================
// POST /api/admin/create-user
// Headers: { Authorization: Bearer <ADMIN_SECRET> }
// Body: { username, password, expiresAt (optional), note (optional) }
// Dùng để tạo user mới qua admin
// ============================================================

const bcrypt = require('bcryptjs');
const { connectToDatabase } = require('../../lib/db');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function setHeaders(res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-change-this';

module.exports = async (req, res) => {
  setHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Verify admin secret
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - Invalid admin secret',
      });
    }

    const { username, password, expiresAt, note } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    const client = await connectToDatabase();
    const db = client.db('sdai_plugin');
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existing = await usersCollection.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Username '${username}' already exists`,
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user document
    const newUser = {
      username: username.toLowerCase().trim(),
      passwordHash,
      isActive: true,
      createdAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      lastLoginAt: null,
      lastLoginMac: '',
      loginCount: 0,
      note: note || '',
    };

    const result = await usersCollection.insertOne(newUser);

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId: result.insertedId.toString(),
      username: newUser.username,
      expiresAt: newUser.expiresAt,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};
