# 🚀 SDAi Auth Backend - Hướng Dẫn Deploy Vercel

## Tổng quan

Backend này thay thế server trả phí `http://47.121.208.161/prod-api` bằng:
- **Vercel** (serverless functions - MIỄN PHÍ)
- **MongoDB Atlas** (database - MIỄN PHÍ tier M0)
- **JWT** (token-based authentication - không cần WebSocket)

---

## Bước 1: Tạo MongoDB Atlas Database

1. Truy cập [https://cloud.mongodb.com](https://cloud.mongodb.com)
2. Tạo **Free Cluster (M0)**
3. Tạo Database User (username & password)
4. Trong **Network Access**, thêm IP `0.0.0.0/0` (cho phép Vercel kết nối)
5. Copy **Connection String** (dạng: `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/`)
6. Tạo database tên: `sdai_plugin`, collection: `users`

---

## Bước 2: Deploy lên Vercel

### Cách 1: Qua GitHub (Khuyến nghị)

```bash
# 1. Tạo repo GitHub mới (ví dụ: sdai-auth-backend)
# 2. Copy thư mục vercel-auth-backend vào repo
# 3. Push lên GitHub
git init
git add .
git commit -m "Initial SDAi auth backend"
git remote add origin https://github.com/USERNAME/sdai-auth-backend.git
git push -u origin main

# 4. Truy cập https://vercel.com/new
# 5. Import GitHub repo vừa tạo
# 6. Thêm Environment Variables (xem Bước 3)
# 7. Click Deploy
```

### Cách 2: Vercel CLI

```bash
cd vercel-auth-backend
npm install
npx vercel login
npx vercel --prod
```

---

## Bước 3: Cấu hình Environment Variables trên Vercel

Trong Vercel Dashboard → Settings → Environment Variables, thêm:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority` |
| `JWT_SECRET` | Chuỗi ngẫu nhiên dài (ví dụ: `abc123xyz789...`) |
| `JWT_EXPIRES` | `72h` |
| `ADMIN_SECRET` | Mật khẩu admin để tạo user (tự đặt) |

---

## Bước 4: Cập nhật URL trong Plugin

Sau khi deploy, Vercel sẽ cấp URL dạng: `https://sdai-auth-xxxxx.vercel.app`

Mở file: `setup/342b5c2308cb6de5286f.js`

Tìm dòng:
```javascript
var VERCEL_AUTH_URL = "https://sdai-auth.vercel.app";
```

Thay bằng URL thật của bạn:
```javascript
var VERCEL_AUTH_URL = "https://TÊN-DỰ-ÁN-CỦA-BẠN.vercel.app";
```

---

## Bước 5: Tạo User trong MongoDB

Dùng API admin để tạo user mới:

```bash
# Thay ADMIN_SECRET, USERNAME, PASSWORD
curl -X POST https://YOUR-URL.vercel.app/api/admin/create-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -d '{
    "username": "user1",
    "password": "matkhau123",
    "expiresAt": "2026-12-31",
    "note": "VIP user"
  }'
```

Hoặc dùng **Postman / Thunder Client** với:
- Method: POST
- URL: `https://YOUR-URL.vercel.app/api/admin/create-user`
- Header: `Authorization: Bearer YOUR_ADMIN_SECRET`
- Body (JSON): `{ "username": "...", "password": "..." }`

---

## Cấu trúc API

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/login` | POST | Đăng nhập - trả JWT token |
| `/api/logout` | POST | Đăng xuất |
| `/api/verify` | POST | Xác minh token (thay WebSocket) |
| `/api/admin/create-user` | POST | Tạo user mới (cần Admin Secret) |

---

## Test API

```bash
# Test login
curl -X POST https://YOUR-URL.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user1", "password": "matkhau123"}'

# Test verify (thay TOKEN)
curl -X POST https://YOUR-URL.vercel.app/api/verify \
  -H "Authorization: Bearer TOKEN"
```

---

## Lưu ý

- **JWT Token** hết hạn sau 72 giờ (có thể điều chỉnh `JWT_EXPIRES`)
- **Session Polling**: Plugin tự động gọi `/api/verify` mỗi 5 phút
- **Offline mode**: Nếu mạng lỗi, plugin vẫn hoạt động với token cũ
- **Free tier**: MongoDB Atlas M0 = 512MB storage, Vercel = 100GB bandwidth/tháng

---

## Sơ đồ hoạt động

```
Plugin → POST /api/login (username + password)
Vercel → check MongoDB → trả JWT token
Plugin → lưu token vào localStorage
Plugin → mỗi 5 phút POST /api/verify (bearer token)
Vercel → kiểm tra token hợp lệ → trả {success: true/false}
Plugin → nếu false → tự động đăng xuất
```
