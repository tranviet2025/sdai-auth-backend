// ============================================================
// POST /api/admin/create-user
// Headers: { Authorization: Bearer <admin-token> }
// Body: { username, password, expiresAt (optional) }
// Dùng để tạo user mới qua admin
// ============================================================

const { connectToDatabase, JWT_SECRET, jwt, bcrypt } = require('../lib/db');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-secret-change-this';

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(corsHeaders).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Verify admin secret
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return res.status(401).setHeaders(corsHeaders).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { username, password, expiresAt, note } = req.body;

    if (!username || !password) {
      return res.status(400).setHeaders(corsHeaders).json({
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
      return res.status(400).setHeaders(corsHeaders).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
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

    return res.status(201).setHeaders(corsHeaders).json({
      success: true,
      message: 'User created successfully',
      userId: result.insertedId.toString(),
      username: newUser.username,
      expiresAt: newUser.expiresAt,
    });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).setHeaders(corsHeaders).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};
