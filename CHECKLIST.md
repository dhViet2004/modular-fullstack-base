# CHECKLIST

> Theo dõi công việc theo phiên. `README.md` giữ checklist roadmap cấp sản phẩm; `CODEX_PROJECT_SETUP.md` giữ yêu cầu nền tảng.

## Trạng thái hiện tại

- **Phase hiện tại:** Phase 13 — CI
- **Đang làm:** Kiểm chứng workflow GitHub Actions
- **Bước tiếp theo:** Chạy workflow trên pull request hoặc push
- **Blocker:** Không có

## Quy ước trạng thái

- `[x]` Đã implement và verify.
- `[~]` Đang thực hiện.
- `[ ]` Chưa làm.
- `BLOCKED:` Bị chặn bởi môi trường hoặc credential bên ngoài.

---

## Phase 0 — Agent rules và project setup

- [x] Tạo `AGENTS.md`
- [x] Tạo `CLAUDE.md`
- [x] Tạo `CODEX_PROJECT_SETUP.md`
- [x] Tạo `CHECKLIST.md`
- [x] Tạo, cấu hình implicit invocation và validate skill `roadmap-checklist`
- [x] Tạo role riêng cho backend tại `.agents/roles/backend.md`
- [x] Tạo role riêng cho frontend tại `.agents/roles/frontend.md`
- [x] Tạo README cơ bản
- [x] Chuẩn hóa README dùng `pnpm` trực tiếp sau bước kích hoạt Corepack
- [x] Kiểm tra toàn bộ tài liệu không mâu thuẫn

## Phase 1 — Repository structure

- [x] Tạo `frontend/`
- [x] Tạo `backend/`
- [x] Tạo `docs/`
- [x] Tạo `.gitignore`
- [x] Tạo frontend package và lockfile riêng
- [x] Tạo backend package và lockfile riêng
- [x] Tạo README cho frontend
- [x] Tạo README cho backend

## Phase 2 — Backend skeleton

- [x] Tạo Express app
- [x] Tạo server entrypoint
- [x] Tạo worker entrypoint — triển khai cùng background email verification job
- [x] Tạo config/env và validation bằng Zod
- [x] Tạo error middleware nền tảng
- [x] Tạo API routes
- [x] Tạo health endpoint
- [x] Tách liveness `/health` và readiness `/ready` kiểm tra PostgreSQL
- [x] Viết và chạy health integration test
- [x] Verify backend lint, typecheck, test và build

## Phase 3 — Frontend skeleton

- [x] Tạo Next.js App Router
- [x] Tạo TanStack Query provider
- [x] Tạo Axios API client
- [x] Tạo layout cơ bản
- [x] Tạo trang home
- [x] Viết và chạy test nền tảng
- [x] Verify frontend lint, typecheck, test và build

## Phase 4 — Database

- [x] Tạo Prisma schema baseline
- [x] Tạo migration đầu tiên
- [x] Tạo seed kiểm tra kết nối
- [x] Tạo Prisma client wrapper
- [x] Verify Prisma schema và generate client
- [x] Verify migrate trên PostgreSQL thật
- [x] Verify seed trên PostgreSQL thật
- [x] Tạo và build Docker migration target riêng

## Phase 5 — Authentication

- [x] Mở rộng `User` model cho authentication
- [x] Tạo password authentication
- [x] Tạo session
- [x] Tạo refresh token rotation
- [x] Tạo logout và revoke session
- [x] Tạo auth tests

## Phase 6 — Authorization

- [x] Tạo role
- [x] Tạo permission
- [x] Tạo authenticate middleware
- [x] Tạo authorize middleware
- [x] Viết RBAC tests
- [x] Tự động chuyển tài khoản có `users:read` tới giao diện quản trị sau đăng nhập

## Phase 7 — Documentation

- [x] Viết architecture docs nền tảng
- [x] Viết hướng dẫn tự code Module 01 — Users foundation
- [x] Viết API docs
- [x] Viết database docs
- [x] Viết local setup docs trong `README.md`
- [x] Viết deployment docs

## Phase 8 — Audit Log

- [x] Chốt phạm vi, event catalog và transaction policy
- [x] Thêm model `AuditLog` và migration
- [x] Thêm permission `audit:read` và cập nhật seed
- [x] Tạo audit repository/service và test
- [x] Tích hợp audit vào login/logout
- [x] Tạo API đọc audit log có cursor pagination
- [x] Tạo frontend quản trị audit log
- [x] Verify migration, seed, backend và frontend
- [x] Đồng bộ API docs và database docs

## Phase 9 — Email Verification

- [x] Chốt token policy, public URL và API contract
- [x] Thêm config TTL/cooldown và model token
- [x] Tạo migration và generate Prisma Client
- [x] Tạo token utility, repository/service và test
- [x] Chốt và tích hợp mail delivery
- [x] Tạo request/verify API và audit events
- [x] Tạo frontend request/verify flow
- [x] Verify migration, backend, frontend và smoke test
- [x] Đồng bộ API docs và database docs

## Phase 10 — Google OAuth

- [x] Chốt Authorization Code + PKCE flow và API contract
- [x] Thêm Google config, model và migration
- [x] Tạo state/PKCE utility và test
- [x] Tạo Google token client và ID token verification
- [x] Tạo repository/service liên kết hoặc tạo user
- [x] Tạo start/callback API và audit events
- [x] Tạo frontend Google login/callback flow
- [x] Verify migration, backend, frontend và smoke test
- [x] Đồng bộ API/database docs và roadmap

## Phase 11 — Worker pg-boss

- [x] Cài pg-boss, tạo lệnh cài schema/queue riêng và worker entrypoint
- [x] Chuyển yêu cầu gửi email xác minh sang queue chỉ chứa `userId`
- [x] Worker tạo token và gửi SMTP; queue retry khi lỗi
- [x] Cập nhật UI, API và deployment docs cho phản hồi `202` bất đồng bộ
- [x] Verify lint, typecheck, test, build, cài queue và khởi động worker

## Phase 12 — Files/storage

- [x] Upload/download riêng tư bằng local storage, giới hạn 5 MiB trước khi buffer và test HTTP
- [x] Cloudflare R2 storage cho production
- [x] Verify đầy đủ và nghiệm thu Files/storage — upload/download R2 thật trả đúng nội dung

## Phase 13 — CI

- [x] Tạo workflow riêng cho backend và frontend với pnpm lockfile độc lập
- [x] Backend chạy PostgreSQL, Prisma migrate/seed, kiểm tra drift, format, lint, typecheck, test và build
- [x] Frontend chạy lint, typecheck, test và build
- [~] Kiểm chứng workflow trên GitHub Actions — actionlint và lệnh local đã đạt; chờ run trên push/PR

## Bổ sung phân vai giao diện

- [x] Seed role `SUPER_ADMIN`, giữ `ADMIN` và `MEMBER`; kiểm tra seed trên database
- [x] Điều hướng sau đăng nhập, dashboard và menu theo role/permission; kiểm tra backend/frontend

## Blockers

- Không có blocker hiện tại.

## Quyết định đã chốt

- `CHECKLIST.md` theo dõi công việc theo phiên; `README.md` theo dõi roadmap và trạng thái nghiệm thu sản phẩm.
- `CLAUDE.md` import `AGENTS.md` để giữ một nguồn quy tắc chung.
- Frontend và backend là hai app độc lập, không dùng monorepo workspace.
- Backend dùng luồng `route → middleware → controller → service → Prisma`; repository là optional khi có persistence responsibility rõ ràng.
- Route chỉ khai báo URL/middleware; controller xử lý HTTP mapping; service chứa business logic và được phép gọi Prisma trực tiếp; repository chỉ dùng khi cần thiết.
- Không tạo trước module hoặc file rỗng; chỉ scaffold khi bắt đầu triển khai nghiệp vụ tương ứng.
- `server.ts` chỉ chạy HTTP API; worker chạy trong entrypoint riêng khi Phase background jobs bắt đầu.
- [x] Giao diện quản lý tệp Markdown cho tài khoản
- [x] Cập nhật bố cục responsive, trạng thái lưu và danh sách bản lưu cho giao diện Files
- [x] Thêm chế độ Review Markdown với nút biểu tượng con mắt
- [x] Giữ header navigation cố định khi cuộn trang
- [~] CRUD qu?n l? file: ?? th?m metadata API v? UI t?o/c?p nh?t/x?a; backend test b? ch?n do Prisma Client native engine ?ang kh?a tr?n Windows
- [x] Ho?n t?t CRUD file v?i metadata b?n v?ng, migration v? giao di?n FE

## Session/device limits

- [x] Gi?i h?n s? phi�n ho?t d?ng theo user b?ng MAX_ACTIVE_SESSIONS_PER_USER v� revoke phi�n cu nh?t
- [x] C?p nh?t t�i li?u authentication/API v� c?u h�nh m�i tru?ng
Session account security UI va API doi mat khau da cap nhat.
- [x] Gi?i h?n t?i ?a 10 t?p l?u tr? cho m?i user v? ki?m tra l?i v??t quota
- [x] Refactor module users: gop Prisma vao service, xoa repository pass-through, da verify backend
