# 01. Tổng quan dự án

## 1. Mục tiêu dự án

Theo `CODEX_PROJECT_SETUP.md` (mục 1) và `README.md`, CoreStack là một **nền tảng fullstack dùng lại được** ("base project") để khởi tạo các sản phẩm khác. Nó không giải một bài toán nghiệp vụ cụ thể; nó giải bài toán hạ tầng: xác thực đa phương thức, phân quyền theo vai trò và cấp bậc, quản lý tệp có khử trùng lặp, gửi email, tác vụ nền, và nhật ký kiểm toán.

Điểm cần lưu ý ngay từ đầu: đây là sản phẩm được một AI agent (Codex) tạo ra theo đặc tả và checklist (`AGENTS.md`, `.agents/skills/roadmap-checklist/`). Điều này giải thích nhiều đặc điểm của code sẽ được phân tích ở các báo cáo sau (phong cách không đồng nhất, checklist đánh dấu hoàn thành nhưng thực tế chưa đúng).

## 2. Đối tượng sử dụng (actor)

| Actor | Cách xuất hiện trong code | Ghi chú |
| --- | --- | --- |
| Người dùng chưa đăng nhập | Các route `/auth/*` không cần token | Đăng ký, đăng nhập, quên mật khẩu, Google, magic link |
| Người dùng đã đăng nhập nhưng **chưa có vai trò** | User mới tạo qua đăng ký hoặc OAuth (không được gán MEMBER) | Rank 0, không permission; vẫn dùng được API files và jobs vì hai router này không kiểm tra quyền (xem SEC-001, SEC-002) |
| MEMBER (rank 10) | `prisma/seed.ts` | Chỉ có `files.read`, `files.upload`, `sessions.read`, `sessions.revoke` |
| ADMIN (rank 50) | `prisma/seed.ts` | Mọi quyền trừ `users.roles.promote` |
| SUPER_ADMIN (rank 100) | Bootstrap qua Google allowlist hoặc seed bằng env | Chỉ một tài khoản; bảo vệ bởi `rbac.policy.ts` |
| Hệ thống (worker/scheduler) | `server.ts` (in-process) và `worker.ts` | Chạy job pg-boss theo cron trong bảng `ScheduledJob` |

## 3. Chức năng chính

| Nhóm | Chức năng | Vị trí chính |
| --- | --- | --- |
| Auth | Đăng ký + xác minh email; đăng nhập mật khẩu; OTP; magic link; Google OAuth (PKCE); quên mật khẩu bằng OTP; refresh token rotation; quản lý phiên/thiết bị; mật khẩu tạm bắt buộc đổi | `backend/src/modules/auth`, `modules/oauth` |
| Users/RBAC | Danh sách/chi tiết/cập nhật; khóa/mở khóa; gán/gỡ vai trò; tạo vai trò tùy chỉnh; cấu hình permission cho vai trò; override ALLOW/DENY theo user; kế thừa quyền theo rank | `modules/users` |
| Files | Upload có khử trùng lặp SHA-256; download theo quyền sở hữu; soft delete; tái sử dụng (0 byte); orphan cleanup 10 ngày; import/export Markdown | `modules/files` |
| Mail | Gửi mail tùy ý; gửi theo mẫu; 3 mẫu HTML lưu DB; lịch sử gửi (ghi vào AuditLog); xem cấu hình SMTP | `modules/mail` |
| Jobs | Lịch cron động lưu DB; bật/tắt; chạy ngay; 6 loại tác vụ dọn dẹp/bảo trì | `modules/jobs` |
| Audit | Ghi 19 loại sự kiện | `modules/audit` |
| Frontend | Dashboard theo quyền; quản lý user/role; file manager + trình soạn Markdown LMS (Excel/Google Docs hai chiều); quản lý jobs; quản lý mail | `frontend/src/features/*` |

## 4. Công nghệ đang dùng

| Lớp | Thư viện | Phiên bản (lockfile) | Nhận xét |
| --- | --- | --- | --- |
| Backend runtime | Node 22 (Docker), TypeScript ESM | 5.9.2 | Cấu hình `NodeNext`, `strict` |
| HTTP | Express | 5.1.0 | Express 5 (async handler tự bắt lỗi, nhưng code vẫn bọc try/catch thủ công) |
| ORM | Prisma + generator `prisma-client` mới | 6.15.0 | Output vào `src/generated/prisma` (gitignored) |
| Queue/scheduler | pg-boss | 12.7.0 | Dùng PostgreSQL làm queue; handler nhận **mảng** job |
| Auth | jose (HS256 JWT, verify id_token Google), argon2 (argon2id) | 6.1.0 / 0.44.0 | Đúng lựa chọn |
| Validation | zod | 4.1.5 | Dùng `z.email()` (API zod 4) |
| Upload | multer | 2.0.2 | memoryStorage, **không đặt `limits`** |
| Storage | @aws-sdk/client-s3 (Cloudflare R2) | 3.883.0 | Chỉ R2, không cấu hình được endpoint tùy ý (MinIO) như spec |
| Mail | nodemailer | 7.0.6 | |
| Frontend | Next.js 15.5.2, React 19.1.1, TanStack Query 5.87, Axios 1.12, react-hook-form 7.62, Tailwind 4.1 | | |
| Frontend khác | react-icons ^5.5, **xlsx ^0.18.5** | | `xlsx` trên npm không còn được vá (xem SEC-009) |
| Test | vitest 3.2.4, supertest 7.1.4 | | |
| Hạ tầng | docker-compose (chỉ Postgres 16), 2 Dockerfile | | Không có CI/CD |

## 5. Tình trạng hoàn thiện

Đánh giá theo ba lớp:

1. **Bề mặt tính năng**: rất rộng, vượt cả đặc tả (trình soạn LMS, jobs UI, template editor, mật khẩu tạm). README đánh dấu gần như 100% checklist.
2. **Tính đúng đắn của nền tảng**: có lỗi chặn khiến hệ thống không triển khai được đúng cách:
   - Schema Prisma có `ScheduledJob`, `mustChangePassword`, `temporaryExpiresAt` nhưng **không có migration** tương ứng (DB-001). `prisma migrate deploy` trên DB mới sẽ tạo schema thiếu, và login sẽ lỗi ngay.
   - Hai tính năng dùng HTTP `PUT` bị CORS chặn khi frontend và backend khác origin (ERR-001).
   - Router `jobs` và `files` không kiểm tra permission nào (SEC-001, SEC-002).
3. **Chất lượng kỹ thuật**: không đồng nhất. Có những phần rất tốt (bootstrap SUPER_ADMIN dùng advisory lock, one-time handoff cho OAuth, hash mọi token, rotation refresh), đi cùng những phần cẩu thả (82/207 file source viết trên một dòng, interceptor 401 reload trang ngay cả khi sai mật khẩu).

Kết luận: **dự án ở mức "prototype có nhiều tính năng", chưa phải "base project sẵn sàng tái sử dụng"**. Muốn đạt mục tiêu đề ra cần một vòng sửa lỗi nền tảng (xem `12-LO-TRINH-CAI-THIEN.md`) trước khi thêm bất kỳ tính năng nào.

## 6. Điểm mạnh tổng quan

- **Thiết kế auth đúng hướng**: mọi phương thức đăng nhập đi qua một pipeline chung (`authService.complete`); token/OTP/magic-link đều lưu hash; challenge one-time-use được bảo đảm bằng `updateMany ... consumedAt: null` (atomic); refresh token rotation; access token bị vô hiệu ngay khi session bị thu hồi (kiểm tra DB mỗi request).
- **Google OAuth làm cẩn thận**: PKCE S256, kiểm tra `state`, verify `id_token` bằng JWKS với issuer/audience, không đưa token vào URL (dùng handoff code 60 giây, dùng một lần).
- **Bootstrap SUPER_ADMIN** dùng `pg_advisory_xact_lock` trong transaction, kèm audit trong cùng transaction: đây là tư duy đúng về race condition.
- **Mô hình file** tách `File` (logic) và `StoredObject` (vật lý) với `referenceCount`, xử lý race khi hai upload cùng hash.
- **RBAC** có policy tách riêng (`rbac.policy.ts`), có test, có kế thừa theo rank và override theo user.
- Frontend có phân tách `features/`, hook, API client, query key factory (dù không nhất quán).

## 7. Hạn chế tổng quan

- **Phân quyền chỉ áp dụng ở 2/6 router** (users, mail). Files và jobs mở cho mọi người đã đăng nhập; jobs cho phép đẩy payload vào bất kỳ hàng đợi nào, kể cả `mail.send`.
- **Migration không đồng bộ schema** (Critical) và README vẫn đánh dấu "db:migrate pass".
- **Trạng thái in-memory** (OAuth state, handoff, rate limit) khiến hệ thống chỉ chạy đúng với một instance; `states` Map không bao giờ được dọn.
- **Frontend**: token trong `localStorage`; interceptor xử lý 401 sai; không có hàng đợi refresh; component 700–1100 dòng.
- **Chất lượng code không đồng nhất**: một nửa số file bị nén thành một dòng, không có Prettier, không có CI.
- **Tài liệu và checklist không phản ánh đúng code** (docs nói scheduler ở worker, code chạy trong server; README tick nhiều mục chưa đúng).
