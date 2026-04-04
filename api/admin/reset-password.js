// ============================================================
// POST /api/admin/reset-password
// Headers: { Authorization: Bearer <ADMIN_SECRET> }
// Body: { username, newPassword }
// Dùng để reset mật khẩu user qua admin
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

    const { username, newPassword } = req.body || {};

    if (!username || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username and newPassword are required',
      });
    }

    const client = await connectToDatabase();
    const db = client.db('sdai_plugin');
    const usersCollection = db.collection('users');

    // Check user exists
    const existing = await usersCollection.findOne({ username: username.toLowerCase().trim() });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`,
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await usersCollection.updateOne(
      { username: username.toLowerCase().trim() },
      { $set: { passwordHash, updatedAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      username: existing.username,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message,
    });
  }
};
