# ReWear — Backend (Express + Prisma + MongoDB Atlas)

## Cấu trúc thư mục

```
backend/
├── prisma/
│   └── schema.prisma      # Mô hình dữ liệu MongoDB
├── src/
│   ├── index.ts           # Khởi chạy HTTP server
│   ├── app.ts             # Cấu hình Express (middleware, mount routes)
│   ├── lib/
│   │   └── prisma.ts      # Singleton PrismaClient
│   ├── routes/            # Định nghĩa route (mỏng)
│   ├── controllers/       # (sau) xử lý request → service
│   ├── services/          # (sau) nghiệp vụ + gọi Prisma
│   ├── middleware/        # (sau) auth, validate, rate-limit
│   └── types/             # (sau) DTO, helpers
├── .env.example
├── package.json
└── tsconfig.json
```

**Quy ước gợi ý:** `routes` → `controllers` → `services` → `prisma`. Giữ route file nhẹ, logic trong service để dễ test.

## Chuỗi kết nối Atlas

1. Tạo cluster trên [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Database user + Network Access (IP hoặc `0.0.0.0/0` khi dev).
3. Copy connection string, gán vào `DATABASE_URL` trong `.env` (xem `.env.example`).

## Lệnh

```bash
cd backend
npm install
cp .env.example .env   # chỉnh DATABASE_URL
npx prisma generate
npx prisma db push      # đẩy schema lên Atlas (Mongo không dùng migrate SQL như Postgres)
npm run dev
```

`npm run dev` chạy **`tsx watch`** — sửa file `.ts`/`.json` trong `src/` sẽ tự khởi động lại server (reload dev, không cần nodemon).

- `GET http://localhost:4000/health` — kiểm tra API sống.

## Schema (tóm tắt)

| Model | Vai trò |
|--------|---------|
| **User** | Tài khoản, hồ sơ (avatar, chiều cao/cân), `reuseCount`, `co2KgSaved`, `recycleTipsUnlocked` |
| **Garment** | Món tủ đồ: category, ảnh gốc / tái chế, brand, material, size, color, care, `isMarkedOld` |
| **RecycleSave** | Mỗi lần «Lưu» ảnh tái chế (đếm + liên kết `garment` tuỳ chọn) |
| **UpcycleIdea** | Gợi ý tái sinh (CMS) |
| **Badge** / **UserBadge** | Huy hiệu + gán cho user |

Chi tiết field xem `prisma/schema.prisma`.
