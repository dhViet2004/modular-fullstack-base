# CODEX PROJECT SETUP

## 1. Mục tiêu

Xây dựng một fullstack base project có thể tái sử dụng cho nhiều dự án.

Project gồm:

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Node.js, Express, TypeScript ESM.
- Database: PostgreSQL và Prisma.
- Authentication: password, Google OAuth, OTP hoặc magic link.
- Authorization: RBAC.
- Background jobs: worker riêng.
- Storage: local storage ở development và S3-compatible storage ở production.

## 2. Cấu trúc repository

```text
project/
├── frontend/
├── backend/
├── docs/
├── .agents/
├── AGENTS.md
├── CLAUDE.md
├── CHECKLIST.md
├── CODEX_PROJECT_SETUP.md
└── README.md
```

Frontend và backend là hai app độc lập.

Không sử dụng:

- `apps/`
- `packages/`
- pnpm workspace ở root
- Prisma schema ở root
- Business logic trong frontend

## 3. Frontend rules

Frontend dùng:

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- React Hook Form.
- Zod.
- TanStack Query.
- Axios.

Quy tắc:

- `src/app/` chỉ chứa routing, layout và page composition.
- Business UI đặt trong `src/features/`.
- Component dùng chung đặt trong `src/components/`.
- API client đặt trong `src/lib/`.
- Không gọi Axios trực tiếp rải rác trong page.
- Form dùng React Hook Form + Zod.
- Query key phải được tổ chức tập trung.
- Frontend chỉ ẩn/hiện UI theo quyền; backend mới là nơi kiểm tra quyền thật.

## 4. Backend rules

Backend dùng:

- Express.
- TypeScript ESM.
- Prisma.
- PostgreSQL.
- Zod.
- Vitest.
- Supertest.

Dependency direction:

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma
```

Quy tắc:

- Route không chứa business logic.
- Controller không gọi Prisma trực tiếp.
- Business rule đặt trong service.
- Validation dùng Zod schema và middleware.
- Thay đổi database phải có migration.
- Thay đổi auth, permission hoặc persistence phải có test.
- Không log password, token, OTP, secret hoặc credential.
- `/health` chỉ kiểm tra process API; `/ready` kiểm tra các dependency bắt buộc như PostgreSQL.
- `server.ts` chỉ chạy HTTP API; worker được tạo thành entrypoint riêng khi bắt đầu background jobs.

## 5. Database rules

Prisma phải nằm trong:

```text
backend/prisma/
```

Khi thay đổi schema:

1. Sửa `backend/prisma/schema.prisma`.
2. Tạo migration.
3. Generate Prisma Client.
4. Cập nhật seed nếu cần.
5. Chạy test backend.
6. Không reset database production.

Khi deploy bằng container, migration phải chạy bằng bước hoặc image target riêng trước khi khởi động phiên bản API mới. Không tự chạy migration phá hủy dữ liệu trong lúc API startup.

## 6. Verification

Trước khi báo hoàn thành, agent phải chạy các lệnh phù hợp:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Không cần chạy tất cả nếu task không liên quan, nhưng agent phải giải thích lệnh nào đã chạy và lệnh nào không chạy.

## 7. Không được làm

- Không tự mở rộng phạm vi task.
- Không tự đổi kiến trúc.
- Không tự thêm dependency nếu chưa cần.
- Không sửa production config nếu chưa được yêu cầu.
- Không xóa dữ liệu.
- Không reset database.
- Không dùng force push.
- Không đánh dấu task hoàn thành nếu chưa verify.
- Không báo `DONE` khi còn lỗi nội bộ chưa xử lý.

## 8. Definition of Done

Một task chỉ được xem là hoàn thành khi:

- Code đã implement.
- Test phù hợp đã pass.
- Lint/typecheck/build phù hợp đã pass.
- Checklist đã được cập nhật.
- Không có thay đổi ngoài scope.
- Agent đã báo cáo blocker nếu có.
