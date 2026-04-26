# ReWear

ReWear là ứng dụng thời trang bền vững, giúp người dùng quản lý tủ đồ cá nhân, phối đồ với AI, theo dõi lịch mặc và nhận nhắc nhở các món đồ bị bỏ quên.

## Kiến trúc dự án

- `backend`: API server (Express + Prisma + MongoDB)
- `expo-app`: ứng dụng mobile (Expo + React Native)
- `.env`: file môi trường dùng chung cho cả backend và frontend

## Tính năng chính

- Đăng ký/đăng nhập, hồ sơ người dùng
- Quản lý tủ đồ (CRUD garment)
- Gợi ý phối đồ với AI
- Lưu outfit và lịch sử outfit đã mặc (`WearLog`)
- Chỉ số sử dụng đồ:
  - `wearCount` (số lần mặc)
  - `purchasePriceVnd` (giá mua)
  - Cost-per-Wear
- Local notification nhắc đồ bị bỏ quên (dựa trên `lastWornAt`/`createdAt`)

## Tech stack

- **Backend:** Node.js, Express, Prisma ORM, MongoDB Atlas, Zod
- **Frontend:** Expo, React Native, React Navigation
- **AI/Media:** Gemini API, Hugging Face (IDM-VTON), Cloudinary

## Yêu cầu môi trường

- Node.js 18+
- npm 9+
- MongoDB Atlas (hoặc MongoDB local)
- Thiết bị mobile / simulator để chạy Expo

## Cấu hình môi trường

Dự án dùng một file env chung ở root:

- `/.env`

Biến quan trọng:

- Backend: `DATABASE_URL`, `PORT`, `JWT_*`, `CLOUDINARY_*`, `GEMINI_*`, `HF_*`
- Frontend: `EXPO_PUBLIC_API_URL`

> Lưu ý bảo mật: không commit thông tin thật của secret/keys lên public repository.

## Cài đặt

Từ thư mục root:

```bash
cd backend && npm install
cd ../expo-app && npm install
```

## Chạy backend

```bash
cd backend
npm run dev
```

API mặc định: `http://localhost:4000`

### Prisma

```bash
cd backend
npm run db:generate
npm run db:push
```

## Chạy mobile app (Expo)

```bash
cd expo-app
npm start
```

Tuỳ nền tảng:

```bash
npm run android
npm run ios
npm run web
```

## Notification (đồ bị bỏ quên)

- Lịch local notification chạy hằng ngày theo giờ cấu hình trong:
  - `expo-app/src/lib/notifications.ts`
- Nội dung notification được build động theo món đồ bị bỏ quên lâu nhất.
- Khi đổi giờ cấu hình, logic sẽ tự reschedule (không cần xoá app).

## Cấu trúc thư mục (rút gọn)

```text
Rewear/
  backend/
    prisma/
    src/
  expo-app/
    src/
  .env
```

## Gợi ý phát triển tiếp

- Thêm `.env.example` (không chứa secret thật) để onboarding team
- Viết test cho các service chính (garment/outfit/notification logic)
- Thiết lập CI check `build` + `typecheck` cho cả backend và app

