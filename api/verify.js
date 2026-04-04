// ============================================================
// POST /api/verify
// Headers: { Authorization: Bearer <token> }
// Returns: { success: true, user } OR { success: false, message }
// Dùng thay thế WebSocket - gọi mỗi 5 phút để giữ session
// ============================================================

const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { connectToDatabase, JWT_SECRET } = require('../lib/db');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function setHeaders(res) {
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
}

module.exports = async (req, res) => {
  setHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập / Not authenticated',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Phiên đã hết hạn, vui lòng đăng nhập lại / Session expired, please login again',
      });
    }

    // Check user still exists and is active in MongoDB
    const client = await connectToDatabase();
    const db = client.db('sdai_plugin');
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản không hợp lệ / Invalid account',
      });
    }

    // Check expiry
    if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã hết hạn / Account has expired',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        username: user.username,
        expiresAt: user.expiresAt || null,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server / Server error: ' + error.message,
    });
  }
};
