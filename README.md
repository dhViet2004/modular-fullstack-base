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
- [x] PostgreSQL tự khởi động lại để giữ ổn định các luồng Auth/Mail
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
- [x] User profile có `displayName` và `avatarUrl`
- [x] Migration thêm `User.avatarUrl` đã áp dụng cho database development và test
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
- [x] Bootstrap `SUPER_ADMIN` từ verified Google email hoặc immutable Google `sub`
- [x] `SUPER_ADMIN_BOOTSTRAP_ONCE` chỉ cho phép bootstrap administrator đầu tiên
- [x] Bootstrap role idempotent và an toàn khi OAuth callback đồng thời
- [x] Google bootstrap ưu tiên hơn legacy password bootstrap khi seed
- [x] Seed idempotent
- [x] Single Super Admin Policy: Ẩn và chặn tuyệt đối việc gán vai trò SUPER_ADMIN
- [x] Phân vai trò theo rank: Cho phép Admin (rank 50) gán vai trò ADMIN (rank 50) cho Member

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

- [x] Đăng ký user bằng email/password
- [x] Password policy và hash credential khi đăng ký
- [x] Gửi link xác minh email hết hạn sau 20 phút
- [x] Link xác minh email one-time-use, không dùng lại lần hai
- [x] Quên mật khẩu gửi OTP 6 số qua email, hết hạn sau 10 phút và chỉ dùng một lần
- [x] Đặt lại mật khẩu bằng OTP và thu hồi toàn bộ phiên đăng nhập cũ
- [x] Chặn password login trước khi email được xác minh
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
- [x] Magic Link dùng one-time handoff và redirect frontend, không hiển thị token phiên trong trình duyệt

---

# 12. Google OAuth2

- [x] Google config
- [x] Authorization route
- [x] Callback route
- [x] State validation
- [x] PKCE nếu áp dụng
- [x] Verify provider email
- [x] Verify Google ID token issuer và audience
- [x] Lưu Google `sub` trong `AuthIdentity.providerAccountId`
- [x] Resolve/link identity an toàn
- [x] Create user nếu cần
- [x] Google login lần đầu tạo user và lưu identity theo Google `sub`
- [x] Các lần Google login sau resolve đúng user cũ theo `sub`
- [x] Google email đã xác minh liên kết với tài khoản email/password hiện hữu và đồng bộ trạng thái xác minh
- [x] Đồng bộ Google display name và avatar khi login
- [x] Auth response trả profile và roles đã resolve từ database
- [x] Bootstrap `SUPER_ADMIN` không dùng dữ liệu role từ frontend
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
- [x] Access token bị từ chối ngay khi session tương ứng đã thu hồi
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
- [x] Level/Rank Hierarchy: Cấp bậc cao hơn tự động kế thừa toàn bộ quyền của các cấp bậc bên dưới (SUPER_ADMIN > ADMIN > MEMBER)
- [x] Super Admin duy nhất: Toàn hệ thống chỉ cho phép duy nhất 1 Super Admin, chặn chỉ định thêm
- [x] Admin peer protection: Quản trị viên ngang hàng không được sửa quyền, khóa tài khoản hoặc can thiệp lẫn nhau
- [x] Phân quyền động (Dynamic Permission Overrides): Cho phép cấu hình ALLOW (cấp thêm) hoặc DENY (tước quyền) trực tiếp cho từng người dùng
- [x] API & UI quản trị phân quyền động (`GET /users/:id/permissions`, `POST /users/:id/permissions/override`, `DELETE /users/:id/permissions/override/:permissionId`)
- [x] Sub-menu / Tab navigation trên UI: Chuyển đổi giữa "Danh sách người dùng" và "Nhóm quyền & Vai trò"
- [x] Dropdown accordion menu "Người dùng & Phân quyền" trên Sidebar: Click để mở/đóng danh sách gồm 2 menu con "Người dùng" (`/users?tab=users`) và "Phân quyền" (`/users?tab=roles`), tự động active và sync URL query
- [x] Quản lý nhóm quyền (Vai trò / Roles): Tạo vai trò mới với Tên và Rank tùy chỉnh (`POST /api/v1/users/roles`)
- [x] Cấu hình quyền hạn cho vai trò: Gán/gỡ permissions theo module cho từng vai trò (`PUT /api/v1/users/roles/:id/permissions`)
- [x] Xóa vai trò tùy chỉnh và bảo vệ vai trò hệ thống cốt lõi (`DELETE /api/v1/users/roles/:id`)
- [x] Icon gán vai trò nhanh tại từng dòng người dùng (`FiShield`), mở modal phân vai trò trực tiếp (`AssignRoleModal`)
- [x] Phân giải quyền hạn thời gian thực & cờ Permission trên Frontend: API auth & `/users/me` trả về danh sách permissions đầy đủ (kế thừa thứ bậc + override); Frontend hook `usePermissions` lọc hiển thị các menu sidebar và các button thao tác tương ứng trên UI
- [x] Rank policy
- [x] ADMIN không chỉnh SUPER_ADMIN
- [x] ADMIN không chỉnh rank >= mình
- [x] ADMIN không promote SUPER_ADMIN
- [x] User không tự block
- [x] Không block SUPER_ADMIN cuối cùng
- [x] RBAC tests (13 unit tests bao gồm role creation, permission assignment, rank inheritance, single super admin, admin peer protection, dynamic overrides)

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
- [x] Quản trị viên cấp lại mật khẩu tạm thời ngẫu nhiên 12 ký tự cho người dùng (`POST /api/v1/users/:id/reset-password`)
- [x] Mật khẩu tạm thời có hiệu lực tối đa 24 giờ (`temporaryExpiresAt = now + 24h`)
- [x] Tự động thu hồi toàn bộ phiên đăng nhập cũ của người dùng khi được cấp mật khẩu tạm
- [x] Gửi email bảo mật chứa mật khẩu tạm và thời hạn 24 giờ về hòm thư người dùng
- [x] Kiểm tra thời hạn mật khẩu tạm khi đăng nhập (quá 24h từ chối 401 `TEMPORARY_PASSWORD_EXPIRED`)
- [x] Bắt buộc đổi mật khẩu mới (`mustChangePassword: true`) khi đăng nhập bằng mật khẩu tạm trước khi sử dụng hệ thống
- [x] Modal giao diện bắt buộc đổi mật khẩu trên frontend (MustChangePasswordModal)
- [x] Tự động gỡ cờ `mustChangePassword` và xóa `temporaryExpiresAt` sau khi đổi mật khẩu mới thành công

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
- [x] Lưu và cập nhật 3 mẫu email HTML linh động trong database
- [x] Merge biến an toàn và dùng mẫu đã lưu cho OTP/Magic Link/Security Alert

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
- [x] Lên lịch công việc định kỳ động (Dynamic Scheduled Jobs) lưu trong cơ sở dữ liệu: thêm, sửa, cập nhật, xóa lịch trình (Cron pattern)
- [x] Tích hợp Job Scheduler & Workers chạy trực tiếp theo Web Server (`server.ts`) in-process hoặc chạy qua Worker độc lập (`worker.ts`)
- [x] Hỗ trợ các tác vụ định kỳ tự động: Xóa tệp mồ côi quá hạn, dọn OTP/Magic link, thu hồi phiên đăng nhập hết hạn, dọn dẹp AuditLog cũ (`system.cleanup-audit`), cập nhật trạng thái người dùng không hoạt động (`users.update-inactive`)
- [x] Kích hoạt chạy ngay thủ công (Trigger Run Now) đưa tác vụ vào hàng đợi tức thì
- [x] Giao diện quản lý Lịch trình Công việc (Jobs Dashboard UI) với thống kê, giải thích biểu thức Cron, bật/tắt nhanh và điều khiển trực quan

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
- [x] Cloudflare R2 upload and download verified end-to-end
- [x] MIME validation fallback theo file extension cho markdown/image/document
- [x] File upload error feedback và authenticated blob download trong Frontend UI
- [x] Dev server watch `.env` (`--watch-path=.env`) để đồng bộ cấu hình storage
- [x] Tái sử dụng (reuse/duplicate) tệp tin đã có sẵn qua API POST /files/:id/reuse và UI, tận dụng cơ chế Content Hash Deduplication để không tiêu tốn thêm dung lượng đĩa vật lý (0 byte phát sinh)

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
- [x] API và UI giám sát tệp mồ côi thời gian thực, hỗ trợ kích hoạt dọn dẹp theo thời hạn 10 ngày hoặc thủ công

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
- [x] Trình soạn thảo bài giảng LMS chuyên dụng (LMS Lecture Editor) với thanh công cụ giáo án (H1-H3, Callout Lưu ý, Mẹo hay, Trọng tâm, Bảng dữ liệu, Code block) và Live Preview trực quan
- [x] Chuyển đổi dữ liệu hai chiều Excel (.xlsx, .csv) & Google Sheets (TSV/CSV) <-> Bảng Markdown (Markdown Table)
- [x] Chuyển đổi hai chiều Google Docs / HTML <-> Bài giảng Markdown LMS, hỗ trợ xuất và sao chép định dạng Rich Text tương thích 100% dán vào Google Docs

---

# 21. Audit

- [x] Audit module
- [x] Login success/failed
- [x] Logout
- [x] Password changed
- [x] User blocked/unblocked
- [x] Ghi nhận AuditLog hành động FILE_REUSED khi người dùng nhân bản tệp tin
- [x] Role assigned/removed
- [x] `SUPER_ADMIN_BOOTSTRAPPED` audit event
- [x] Session revoked
- [x] File deleted
- [x] Không log sensitive secrets

---

# 22. Frontend providers / Auth

- [x] Axios client
- [x] Axios interceptors
- [x] Axios client và interceptors phân tách an toàn, tránh circular dependency và ReferenceError khi khởi tạo
- [x] QueryClient
- [x] Query key factory
- [x] RHF + Zod forms
- [x] Login page/mutation
- [x] Trang đăng ký email/password và kết quả xác minh email
- [x] Form đăng ký hiển thị rõ password policy và lỗi validation thay vì khóa nút âm thầm
- [x] Thay liên kết đăng nhập bằng mã email trên form login bằng luồng Quên mật khẩu
- [x] Trang Quên mật khẩu hỗ trợ gửi OTP, xác minh và đặt mật khẩu mới
- [x] Gỡ trang đăng nhập OTP `/otp`; URL cũ redirect về trang đăng nhập
- [x] Gỡ trang đăng nhập Magic Link `/magic-link`; URL cũ redirect sang đăng ký user
- [x] Tinh gọn trang login còn một form, không hiển thị thanh tab phương thức đăng nhập
- [x] Layout auth một cột ổn định trong browser/webview, không phụ thuộc CSS `:has()`
- [x] Frontend dev server phục vụ đầy đủ CSS/JS chunks cho trang đăng nhập
- [x] Tách cache Next.js dev `.next-dev` khỏi production build `.next` để tránh lỗi Webpack module/chunk
- [x] Google login action
- [x] Google callback lưu profile cùng local auth session
- [x] Sidebar hiển thị tên, role và Google avatar của user đang đăng nhập
- [x] Avatar có initials fallback khi remote image lỗi
- [x] Next Image cho phép và tối ưu ảnh từ `lh3.googleusercontent.com`
- [x] Logout/logout-all
- [x] Refresh handling
- [x] Infinite refresh loop prevented

---

# 23. Frontend Sessions / Users / Files / Mail

- [x] Session list
- [x] Revoke session
- [x] SESSION_LIMIT_REACHED UI cho đăng nhập Password và OTP
- [x] Users list/detail/update
- [x] Block/unblock UI
- [x] Assign/remove role UI
- [x] Change password UI
- [x] File upload/list/download/delete
- [x] Markdown import/export UI
- [x] Giao diện Quản lý tệp tin tiếng Việt: thống kê lưu trữ, tìm kiếm, lọc theo định dạng, sắp xếp, xem trước ảnh/văn bản và hộp thoại xác nhận xóa
- [x] Tích hợp react-icons (Feather) thay thế toàn bộ ký tự emoji/unicode trên Files, Dashboard và Sidebar
- [x] Mail compose/send UI
- [x] Mail delivery history UI
- [x] Mail navigation menu
- [x] Mail feature tabs: Gửi mail / Mẫu email / Cấu hình
- [x] SMTP configuration status UI
- [x] Auth Action template preview
- [x] Security Alert template preview
- [x] Apply built-in template to compose form
- [x] Trình soạn HTML, chèn biến, xem trước và lưu 3 mẫu email

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

- [x] Client ID supplied
- [x] Client Secret supplied
- [x] Callback registered
- [x] Real login tested end-to-end — callback/handoff redirect về dashboard thành công
- [x] Verified Google profile name, database role và avatar hiển thị trong sidebar
- [x] Google avatar qua Next Image Optimizer trả `HTTP 200 image/png`

SMTP:

- [x] Credentials supplied
- [x] OTP mail tested end-to-end — nhận mã qua email và đăng nhập thành công
- [x] Magic Link mail tested end-to-end — nhận email, one-time handoff và redirect dashboard thành công
- [ ] Registration verification mail tested — chưa xác minh end-to-end
- [ ] Security Alert mail tested — chưa xác minh end-to-end

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

# 28. Agent roadmap workflow

- [x] Repository role instructions trong `AGENTS.md`
- [x] Project skill `.agents/skills/roadmap-checklist/SKILL.md`
- [x] Agent kiểm tra `CODEX_PROJECT_SETUP.md` trước và sau mỗi feature/bug fix
- [x] Agent cập nhật checklist `README.md` sau khi implementation và verification hoàn tất
- [x] Không tick task chưa verify; task bị chặn giữ `[ ]` kèm lý do `BLOCKED`
- [x] Skill metadata cho phép implicit invocation
- [x] Nội dung skill, role và metadata được chuẩn hóa bằng tiếng Việt

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
