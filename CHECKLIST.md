# CHECKLIST

> Theo dõi công việc theo phiên. `README.md` giữ checklist roadmap cấp sản phẩm; `CODEX_PROJECT_SETUP.md` giữ yêu cầu nền tảng.

## Trạng thái hiện tại

- **Phase hiện tại:** Phase 6 — Authorization
- **Đang làm:** Module 03 — Authorization; đã chốt thiết kế RBAC và permission catalog
- **Bước tiếp theo:** Thêm model `Role`, `Permission`, `UserRole`, `RolePermission` vào Prisma schema
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
- [ ] Tạo worker entrypoint — chỉ triển khai khi bắt đầu background jobs
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

- [~] Tạo role
- [~] Tạo permission
- [x] Tạo authenticate middleware
- [ ] Tạo authorize middleware
- [ ] Viết RBAC tests

## Phase 7 — Documentation

- [x] Viết architecture docs nền tảng
- [x] Viết hướng dẫn tự code Module 01 — Users foundation
- [ ] Viết API docs
- [ ] Viết database docs
- [x] Viết local setup docs trong `README.md`
- [ ] Viết deployment docs

## Blockers

- Không có blocker hiện tại.

## Quyết định đã chốt

- `CHECKLIST.md` theo dõi công việc theo phiên; `README.md` theo dõi roadmap và trạng thái nghiệm thu sản phẩm.
- `CLAUDE.md` import `AGENTS.md` để giữ một nguồn quy tắc chung.
- Frontend và backend là hai app độc lập, không dùng monorepo workspace.
- Backend dùng luồng `route → controller → service → repository → Prisma`.
- Route chỉ khai báo URL/middleware; controller xử lý HTTP mapping; service chứa business logic; repository gọi Prisma.
- Không tạo trước module hoặc file rỗng; chỉ scaffold khi bắt đầu triển khai nghiệp vụ tương ứng.
- `server.ts` chỉ chạy HTTP API; worker chạy trong entrypoint riêng khi Phase background jobs bắt đầu.
