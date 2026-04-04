#!/usr/bin/env node
// ============================================================
// Script đặt lại mật khẩu user cho SDAi Plugin
// Cách dùng:
//   node scripts/reset-password.js <username> <new-password>
//
// Ví dụ:
//   node scripts/reset-password.js user1 matkhau123
// ============================================================

const https = require('https');
const http = require('http');

const BASE_URL = process.env.API_URL || 'https://sdai-auth-backend.vercel.app';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'Cachep12345';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
╔══════════════════════════════════════════════╗
║   SDAi - Reset Mật Khẩu (Reset Password)     ║
╚══════════════════════════════════════════════╝

Cách dùng:
  node scripts/reset-password.js <username> <new-password>

Ví dụ:
  node scripts/reset-password.js user1 matkhau_moi
`);
  process.exit(1);
}

const [username, newPassword] = args;

const body = JSON.stringify({ username, newPassword });

const url = new URL(`${BASE_URL}/api/admin/reset-password`);
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

console.log(`\n🔄 Đang reset mật khẩu user '${username}' trên ${BASE_URL}...`);

const req = lib.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log(`\n✅ Reset mật khẩu thành công!`);
        console.log(`   Username  : ${result.username}`);
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
  process.exit(1);
});

req.write(body);
req.end();
