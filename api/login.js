// ============================================================
// POST /api/login
// Body: { username, password, mac }
// Returns: { success: true, token, message }  OR  { success: false, message }
// ============================================================

const { connectToDatabase, JWT_SECRET, JWT_EXPIRES, bcrypt, jwt } = require('../lib/db');

// CORS headers - cho phép plugin gọi từ CEP extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(corsHeaders).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password, mac } = req.body;

    if (!username || !password) {
      return res.status(400).set(corsHeaders).json({
        success: false,
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu / Please enter username and password',
      });
    }

    const client = await connectToDatabase();
    const db = client.db('sdai_plugin');
    const usersCollection = db.collection('users');

    // Find user
    const user = await usersCollection.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return res.status(401).set(corsHeaders).json({
        success: false,
        message: 'Tên đăng nhập không tồn tại / Username not found',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).set(corsHeaders).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa / Account has been disabled',
      });
    }

    // Check expiry
    if (user.expiresAt && new Date() > new Date(user.expiresAt)) {
      return res.status(403).set(corsHeaders).json({
        success: false,
        message: 'Tài khoản đã hết hạn / Account has expired',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).set(corsHeaders).json({
        success: false,
        message: 'Mật khẩu không đúng / Incorrect password',
      });
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user._id.toString(),
      username: user.username,
      mac: mac || '',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Log login event
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { lastLoginAt: new Date(), lastLoginMac: mac || '' },
        $inc: { loginCount: 1 },
      }
    );

    return res.status(200).set(corsHeaders).json({
      success: true,
      token: token,
      message: 'Đăng nhập thành công / Login successful',
      user: {
        username: user.username,
        expiresAt: user.expiresAt || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).set(corsHeaders).json({
      success: false,
      message: 'Lỗi server / Server error: ' + error.message,
    });
  }
};
