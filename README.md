# CoreStack — Fullstack Base Project

> Bài tập xây dựng nền tảng fullstack độc lập gồm Next.js frontend và Express/Prisma backend.
> README này đồng thời là checklist tiến độ để mentor có thể review trực tiếp trên GitHub.

## Tổng quan

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express 5, TypeScript ESM, Prisma |
| Database | PostgreSQL 16 |
| Xác thực | Password, Email OTP, Magic Link, Google OAuth2 |
| Phân quyền | RBAC, role rank, permission override |
| Hạ tầng | Docker Compose, pg-boss worker, SMTP, Local/R2 storage |

## Chạy dự án

Khởi động PostgreSQL:

```bash
docker compose up -d
```

Backend:

```bash
cd backend
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev
```

Worker (terminal riêng):

```bash
cd backend
pnpm dev:worker
```

- Frontend: `http://localhost:3000`
- Backend health check: `http://localhost:4000/health`
- API base URL: `http://localhost:4000/api/v1`

## Theo dõi tiến độ

> Chỉ đánh dấu `[x]` khi task đã được implement và kiểm tra.
> Các tích hợp cần tài khoản bên ngoài được giữ ở trạng thái chưa hoàn thành và ghi rõ nguyên nhân.

# PROJECT CHECKLIST — FRONTEND / BACKEND BASE

> Dùng cùng `CODEX_PROJECT_SETUP.md`.
>
> Chỉ tick `[x]` khi task đã implement và verify. Nếu bị block bởi credentials bên ngoài, giữ `[ ]` và ghi `BLOCKED: ...`.

---

# 1. Cấu trúc repository

- [x] Inspect repository và git status (repository chưa được khởi tạo Git)
- [x] Xác định code cũ cần giữ (chỉ có hai tài liệu đặc tả)
- [x] `frontend/` tồn tại
- [x] `backend/` tồn tại
- [x] `docs/` tồn tại
- [x] Không còn `apps/`
- [x] Không còn `packages/`
- [x] Không còn `pnpm-workspace.yaml`
- [x] Prisma nằm trong `backend/prisma`
- [x] Root `docker-compose.yml`
- [x] Root `.gitignore`
- [x] Root `README.md`

---

# 2. Frontend base

- [x] Next.js + TypeScript trong `frontend`
- [x] Tailwind CSS hoạt động
- [x] React Hook Form cài đặt
- [x] Zod + zodResolver cài đặt
- [x] TanStack Query cài đặt
- [x] Axios cài đặt
- [x] `frontend/.env.example`
- [x] `frontend/Dockerfile`
- [x] `frontend/package.json`
- [x] `frontend/pnpm-lock.yaml`
- [x] `src/app`
- [x] `src/features`
- [x] `src/components`
- [x] `src/lib`
- [x] Path alias hoạt động

---

# 3. Backend base

- [x] Express + TypeScript ESM trong `backend`
- [x] `backend/.env.example`
- [x] `backend/Dockerfile`
- [x] `backend/package.json`
- [x] `backend/pnpm-lock.yaml`
- [x] `src/app.ts`
- [x] `src/server.ts`
- [x] `src/worker.ts`
- [x] `src/config`
- [x] `src/core`
- [x] `src/middleware`
- [x] `src/modules`
- [x] `src/routes`
- [x] `tests/unit`
- [x] `tests/integration`
- [x] `GET /health`

---

# 4. PostgreSQL + Prisma

- [x] PostgreSQL service trong Docker Compose
- [x] Persistent volume
- [x] Healthcheck
- [x] Backend kết nối PostgreSQL
- [x] `backend/prisma/schema.prisma`
- [x] `backend/prisma/migrations/` (Prisma migrate diff sinh initial SQL thành công)
- [x] `backend/prisma/seed.ts`
- [x] Prisma Client wrapper
- [x] `db:generate` pass
- [x] `db:migrate` pass
- [x] `db:seed` pass

---

# 5. Prisma models

- [x] User
- [x] AuthIdentity
- [x] PasswordCredential
- [x] VerificationChallenge
- [x] Device
- [x] Session
- [x] Role
- [x] Permission
- [x] UserRole
- [x] RolePermission
- [x] UserPermissionOverride
- [x] StoredObject
- [x] File
- [x] AuditLog
- [x] Indexes
- [x] Unique constraints
- [x] Relations
- [x] Prisma validate pass

---

# 6. RBAC seed

- [x] SUPER_ADMIN rank 100
- [x] ADMIN rank 50
- [x] MEMBER rank 10
- [x] Seed user permissions
- [x] Seed file permissions
- [x] Seed session permissions
- [x] Seed system permissions
- [x] Seed audit permission
- [x] Role-permission mapping
- [x] Bootstrap superadmin bằng ENV
- [x] Seed idempotent

---

# 7. Backend core/security

- [x] ENV validation bằng Zod
- [x] App/Auth/Mail/Storage/Jobs config
- [x] ApiError + response helpers
- [x] Central error middleware
- [x] Helmet
- [x] Strict CORS
- [x] Rate limit middleware
- [x] Request context
- [x] Argon2id hash/verify
- [x] Secure token generator
- [x] Secure OTP generator
- [x] SHA-256 helper
- [x] Access token issue/verify
- [x] Không log secrets

---

# 8. Auth common pipeline

- [x] Auth module structure
- [x] Identity repository/service
- [x] Common strategy result type
- [x] Resolve User từ Identity
- [x] Validate User status
- [x] Check session limit
- [x] Resolve/create device
- [x] Create session
- [x] Issue access token
- [x] Issue refresh token
- [x] Login audit
- [x] Password/Google/OTP/Magic Link đều dùng pipeline chung

---

# 9. Password login

- [x] Login Zod schema
- [x] Password strategy
- [x] Find user/credential
- [x] Verify password
- [x] Reject blocked user
- [x] `POST /api/v1/auth/login`
- [x] Login rate limit
- [x] Test login success
- [x] Test invalid password
- [x] Test blocked user

---

# 10. OTP

- [x] VerificationChallenge repository/service
- [x] CSPRNG OTP
- [x] OTP hash
- [x] Expiry
- [x] Max attempts
- [x] One-time-use
- [x] Request rate limit
- [x] `POST /api/v1/auth/otp/request`
- [x] `POST /api/v1/auth/otp/verify`
- [x] Queue OTP email
- [x] Test expired OTP
- [x] Test consumed OTP

---

# 11. Magic Link

- [x] Secure random token
- [x] Token hash
- [x] Expiry
- [x] One-time-use
- [x] Rate limit
- [x] `POST /api/v1/auth/magic-link/request`
- [x] `GET /api/v1/auth/magic-link/verify`
- [x] Queue Magic Link email
- [x] Test invalid/expired token

---

# 12. Google OAuth2

- [x] Google config
- [x] Authorization route
- [x] Callback route
- [x] State validation
- [x] PKCE nếu áp dụng
- [x] Verify provider email
- [x] Resolve/link identity an toàn
- [x] Create user nếu cần
- [x] Common auth pipeline
- [x] Chống duplicate user do race condition

---

# 13. Sessions + Devices

- [x] Session repository/service
- [x] Device service
- [x] Refresh token generated
- [x] DB chỉ lưu refresh token hash
- [x] Session expiry
- [x] Session limit từ ENV
- [x] `SESSION_LIMIT_REACHED`
- [x] Refresh rotation
- [x] `POST /auth/refresh`
- [x] `POST /auth/logout`
- [x] `POST /auth/logout-all`
- [x] `GET /auth/sessions`
- [x] `DELETE /auth/sessions/:sessionId`
- [x] Browser/platform parsing
- [x] Test session limit
- [x] Test invalid refresh

---

# 14. Users + RBAC

- [x] Users module structure
- [x] List users + pagination
- [x] User detail
- [x] Update user
- [x] Role constants
- [x] Permission constants
- [x] Authenticate middleware
- [x] Authorize middleware
- [x] Multiple roles
- [x] Permission override
- [x] Rank policy
- [x] ADMIN không chỉnh SUPER_ADMIN
- [x] ADMIN không chỉnh rank >= mình
- [x] ADMIN không promote SUPER_ADMIN
- [x] User không tự block
- [x] Không block SUPER_ADMIN cuối cùng
- [x] RBAC tests

---

# 15. Role assignment / Block / Password

- [x] List roles/permissions API
- [x] Assign role
- [x] Remove role
- [x] Audit role changes
- [x] Block API
- [x] Block -> revoke sessions
- [x] Block -> audit + email
- [x] Unblock API
- [x] Unblock -> audit + email
- [x] Change password schema
- [x] Verify current password
- [x] Password policy
- [x] Argon2id new password
- [x] passwordChangedAt
- [x] Optional revoke other sessions
- [x] Audit + security email

---

# 16. Mail

- [x] Mail provider interface
- [x] SMTP provider
- [x] Mail service
- [x] Auth Action template
- [x] Security Alert template
- [x] HTML + plain text output
- [x] Business service không gọi SMTP trực tiếp
- [x] Mail management API
- [x] Mail send validation
- [x] Mail read/send permissions
- [x] Mail delivery audit history
- [x] Mail config status API (không expose SMTP password)
- [x] Built-in template catalog API
- [x] Send mail from Auth Action template
- [x] Send mail from Security Alert template

---

# 17. Jobs / Worker

- [x] pg-boss installed
- [x] Job service
- [x] Registry
- [x] Producer
- [x] Worker startup
- [x] Worker graceful shutdown
- [x] `mail.send`
- [x] `auth.cleanup-challenges`
- [x] `sessions.cleanup-expired`
- [x] `files.cleanup-orphans`
- [x] `files.import-markdown`
- [x] `files.export-markdown`

---

# 18. Storage + Files

- [x] Storage interface
- [x] Local storage
- [x] Cloudflare R2 storage (S3-compatible API)
- [x] R2 account endpoint and `auto` region configuration
- [x] Server-generated storage key
- [x] Path traversal protection
- [x] Files module structure
- [x] File size validation
- [x] MIME validation
- [x] Filename normalization
- [x] SHA-256 content hash
- [x] StoredObject lookup by hash
- [x] Reuse existing StoredObject
- [x] Create logical File
- [x] Reference count
- [x] Same-hash race handling
- [x] Download authorization qua logical File
- [x] Soft delete logical File
- [x] Decrement referenceCount
- [x] Audit file delete

---

# 19. Orphan cleanup

- [x] Orphan = referenceCount 0
- [x] Retention ENV
- [x] Default 10 ngày
- [x] Daily schedule
- [x] Referenced object không bị xóa
- [x] Orphan < 10 ngày không bị xóa
- [x] Orphan > 10 ngày được xóa
- [x] Storage failure handled
- [x] Cleanup tests

---

# 20. Markdown import/export

- [x] Markdown parser
- [x] UTF-8 import
- [x] Validate `.md`
- [x] Normalize Markdown
- [x] Reusable importer interface
- [x] Markdown export
- [x] SHA-256 exported content
- [x] Reuse/create StoredObject
- [x] Create logical File
- [x] Background job support

---

# 21. Audit

- [x] Audit module
- [x] Login success/failed
- [x] Logout
- [x] Password changed
- [x] User blocked/unblocked
- [x] Role assigned/removed
- [x] Session revoked
- [x] File deleted
- [x] Không log sensitive secrets

---

# 22. Frontend providers / Auth

- [x] Axios client
- [x] Axios interceptors
- [x] QueryClient
- [x] Query key factory
- [x] RHF + Zod forms
- [x] Login page/mutation
- [x] OTP page/request/verify
- [x] Magic Link page/request
- [x] Google login action
- [x] Logout/logout-all
- [x] Refresh handling
- [x] Infinite refresh loop prevented

---

# 23. Frontend Sessions / Users / Files / Mail

- [x] Session list
- [x] Revoke session
- [x] SESSION_LIMIT_REACHED UI
- [x] Users list/detail/update
- [x] Block/unblock UI
- [x] Assign/remove role UI
- [x] Change password UI
- [x] File upload/list/download/delete
- [x] Markdown import/export UI
- [x] Mail compose/send UI
- [x] Mail delivery history UI
- [x] Mail navigation menu
- [x] Mail feature tabs: Gửi mail / Mẫu email / Cấu hình
- [x] SMTP configuration status UI
- [x] Auth Action template preview
- [x] Security Alert template preview
- [x] Apply built-in template to compose form

---

# 24. Docs + Dockerfiles

- [x] Architecture docs
- [x] Auth docs
- [x] RBAC docs
- [x] Files docs
- [x] Jobs docs
- [x] API docs
- [x] Database docs
- [x] Deployment docs
- [x] Frontend Dockerfile builds độc lập
- [x] Backend Dockerfile builds độc lập
- [x] Backend image có Prisma assets

---

# 25. Validation cuối

Frontend, chạy trong `frontend/`:

- [x] `pnpm install`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test` nếu có
- [x] `pnpm build`
- [x] `pnpm dev` start được

Backend, chạy trong `backend/`:

- [x] `pnpm install`
- [x] `pnpm db:generate`
- [x] `pnpm db:migrate`
- [x] `pnpm db:seed`
- [x] `pnpm lint`
- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`
- [x] `pnpm dev` start được
- [x] `pnpm dev:worker` start được

---

# 26. External credentials

Google:

- [ ] Client ID supplied — BLOCKED: chưa có Google credentials
- [ ] Client Secret supplied — BLOCKED: chưa có Google credentials
- [ ] Callback registered — BLOCKED: cần cấu hình Google Console
- [ ] Real login tested — BLOCKED: cần Google credentials/callback

SMTP:

- [ ] Credentials supplied — BLOCKED: chưa có SMTP credentials
- [ ] OTP mail tested — BLOCKED: chưa có SMTP credentials
- [ ] Magic Link mail tested — BLOCKED: chưa có SMTP credentials
- [ ] Security Alert mail tested — BLOCKED: chưa có SMTP credentials

Cloudflare R2:

- [ ] Production credentials supplied — BLOCKED: chưa có Cloudflare R2 credentials
- [ ] Upload/download/delete tested — BLOCKED: chưa có Cloudflare R2 credentials

---

# 27. Definition of Done

- [x] Frontend độc lập
- [x] Backend độc lập
- [x] Không còn monorepo workspace
- [x] Prisma nằm backend
- [x] PostgreSQL local chạy
- [x] Auth common pipeline hoạt động
- [x] Session/device hoạt động
- [x] RBAC/rank/policy hoạt động
- [x] Mail + Jobs hoạt động (SMTP delivery thực tế thuộc mục credentials bên ngoài)
- [x] Files dedup/reuse hoạt động
- [x] Orphan cleanup 10 ngày hoạt động
- [x] Markdown import/export hoạt động
- [x] Audit hoạt động
- [x] Docs có
- [x] Dockerfiles độc lập
- [x] Frontend validation pass
- [x] Backend validation pass

---

# CODEX WORKFLOW

Mỗi task:

```text
1. Đọc task chưa tick.
2. Inspect code hiện tại.
3. Implement task nhỏ nhất.
4. Chạy verify phù hợp.
5. Pass -> [x].
6. Fail -> giữ [ ], sửa rồi chạy lại.
```

Không tick hàng loạt. Không báo DONE khi lint/typecheck/test/build còn lỗi do code nội bộ.
