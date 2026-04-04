#!/usr/bin/env node
// ============================================================
// Script tạo user mới cho SDAi Plugin
// Cách dùng:
//   node scripts/create-user.js <username> <password> [expiresAt] [note]
//
// Ví dụ:
//   node scripts/create-user.js user1 matkhau123
//   node scripts/create-user.js user1 matkhau123 "2027-01-01"
//   node scripts/create-user.js user1 matkhau123 "2027-01-01" "VIP user"
// ============================================================

const https = require('https');
const http = require('http');

// ---- CẤU HÌNH ----
// Thay đổi URL nếu cần (production hoặc local)
const BASE_URL = process.env.API_URL || 'https://sdai-auth-backend.vercel.app';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'Cachep12345';
// ------------------

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
╔══════════════════════════════════════════════╗
║   SDAi - Tạo User Mới (Create New User)      ║
╚══════════════════════════════════════════════╝

Cách dùng:
  node scripts/create-user.js <username> <password> [expiresAt] [note]

Ví dụ:
  node scripts/create-user.js user1 matkhau123
  node scripts/create-user.js vip_user pass123 "2027-12-31" "Khách VIP"
  node scripts/create-user.js demo demo2025 null "Demo account"

Biến môi trường (tùy chọn):
  API_URL       URL của API (mặc định: ${BASE_URL})
  ADMIN_SECRET  Admin secret key (mặc định: từ .env.local)
`);
  process.exit(1);
}

const [username, password, expiresAt, ...noteParts] = args;
const note = noteParts.join(' ') || '';

const body = JSON.stringify({
  username,
  password,
  expiresAt: (expiresAt && expiresAt !== 'null') ? expiresAt : undefined,
  note,
});

const url = new URL(`${BASE_URL}/api/admin/create-user`);
const isHttps = url.protocol === 'https:';
const lib = isHttps ? https : http;

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_SECRET}`,
    'Content-Length': Buffer.byteLength(body),
  },
};

console.log(`\n🔄 Đang tạo user '${username}' trên ${BASE_URL}...`);

const req = lib.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log(`\n✅ Tạo user thành công!`);
        console.log(`   Username  : ${result.username}`);
        console.log(`   User ID   : ${result.userId}`);
        console.log(`   Hết hạn   : ${result.expiresAt ? new Date(result.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}`);
        console.log(`   Status    : ${res.statusCode}`);
      } else {
        console.error(`\n❌ Lỗi: ${result.message}`);
        console.error(`   HTTP Status: ${res.statusCode}`);
        process.exit(1);
      }
    } catch (e) {
      console.error('\n❌ Không parse được response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('\n❌ Lỗi kết nối:', e.message);
  console.error('   Kiểm tra lại API_URL và kết nối mạng.');
  process.exit(1);
});

req.write(body);
req.end();
