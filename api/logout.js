// ============================================================
// POST /api/logout
// Headers: { Authorization: Bearer <token> }
// Returns: { success: true, message }
// ============================================================

const { connectToDatabase, JWT_SECRET, jwt } = require('../lib/db');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeaders(corsHeaders).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Logout is always success even if token is invalid
  // The client will clear localStorage on its own
  return res.status(200).setHeaders(corsHeaders).json({
    success: true,
    message: 'Đăng xuất thành công / Logout successful',
  });
};
