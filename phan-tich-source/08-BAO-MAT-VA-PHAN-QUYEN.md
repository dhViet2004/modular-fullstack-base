# 08. Bảo mật và phân quyền

## 1. Authentication

### 1.1 Điểm làm đúng (đáng học)

| Cơ chế | Bằng chứng | Vì sao đúng |
| --- | --- | --- |
| Mật khẩu argon2id | `core/security/password.ts` | Thuật toán khuyến nghị hiện nay; test `security.test.ts` kiểm tra prefix `argon2id` |
| Refresh token/OTP/magic link chỉ lưu SHA-256 | `session.service.ts`, `challenge.service.ts` | Lộ DB không lộ token |
| One-time-use atomic | `challengeRepository.consume` = `updateMany where consumedAt null` + kiểm tra `count===1` | Không cần lock vẫn chống double-consume |
| Giới hạn 5 lần thử sai, TTL 10/20 phút | `challenge.service.verify` | OTP 6 số + 5 lần → không thể brute-force |
| Access token 15 phút + kiểm tra session DB mỗi request | `authenticate.middleware.ts` `findActive(sid)` | Thu hồi có hiệu lực tức thì (test `auth.test.ts` "rejects an access token immediately after its session is revoked") |
| Refresh rotation | `session.service.refresh` → `rotate` | Token cũ vô hiệu sau khi dùng |
| Google OAuth: PKCE S256, state ngẫu nhiên, verify `id_token` với JWKS + issuer + audience + `email_verified === true` | `google-oauth.strategy.ts` | Chống CSRF/code injection; không tin email chưa xác minh (đúng spec mục 10) |
| Handoff code 60 giây, dùng một lần, không đưa token vào URL | `oauth-handoff.service.ts` | Token không lọt vào history/referrer/log proxy |
| Bootstrap SUPER_ADMIN serialize bằng advisory lock, allowlist theo `sub` ưu tiên | `super-admin-bootstrap.service.ts` | Chống race tạo 2 super admin |
| Không tiết lộ email tồn tại ở password-reset request | `password-reset.service.request` trả cùng response | Đúng |
| Mật khẩu tạm: 24h, `mustChangePassword`, revoke session cũ | `user.service.resetUserPassword`, `password.strategy.ts` | Luồng hợp lý |

### 1.2 Điểm yếu

| Vấn đề | Mã | Tóm tắt |
| --- | --- | --- |
| Link email dựng từ `Host` header | SEC-003 (High) | Host header poisoning → chiếm tài khoản qua magic link |
| Secret có default | SEC-006 (High) | Production thiếu env vẫn chạy với secret công khai |
| `states` Map không dọn, `/auth/google` không rate limit | SEC-005 (High) | DoS bộ nhớ |
| OTP/token/mật khẩu tạm plaintext trong payload pg-boss | SEC-008 (Medium) | Lộ qua DB/backup |
| User enumeration | SEC-010 (Low) | 409 khi đăng ký; timing; oracle `EMAIL_NOT_VERIFIED` |
| Không có account lockout, chỉ rate limit theo IP | — | Chấp nhận được với OTP 5 lần; với password, 10 lần/15 phút/IP là chặt (có thể gây OPS-003) |
| `authenticate` không kiểm tra `user.status` | — | Dựa vào việc block đã revoke session; job `UPDATE_INACTIVE_USERS` set SUSPENDED nhưng **không revoke session** → user SUSPENDED có session còn hạn vẫn dùng access token cho tới khi refresh (refresh có kiểm tra `status!=="ACTIVE"`). Ảnh hưởng thấp vì "inactive" nghĩa là không có session gần đây. |
| `verifyAccessToken` không kiểm tra `iss`/`aud` | — | Nhỏ; nên đặt issuer/audience cố định |
| Session sliding vô hạn | DB-004 | Cần absolute timeout |
| Refresh token 30 ngày trong localStorage | SEC-011 | XSS lấy được token dài hạn |

## 2. Authorization và RBAC

### 2.1 Mô hình

- Permission (chuỗi `resource.action`) gán cho Role; user có nhiều Role; **kế thừa theo rank**: user có maxRank R nhận mọi permission của mọi role có rank ≤ R (`permissionService.resolve`); override theo user ALLOW/DENY áp sau cùng.
- Policy (`rbac.policy.ts`): không tự thao tác; actor rank phải > target rank; không gán role rank ≥ 100; chỉ 1 SUPER_ADMIN; không khoá/gỡ SUPER_ADMIN cuối.
- `authorize(permission)` middleware chỉ kiểm tra permission; rank/policy kiểm tra trong service.

Đây là mô hình hợp lý cho quy mô dự án. Điểm cần lưu ý về **ngữ nghĩa kế thừa theo rank**: role tùy chỉnh rank 30 tự động có mọi quyền của MEMBER (10) và của mọi role khác có rank ≤ 30. Điều này khiến "rank" vừa là thứ bậc hành chính vừa là tập quyền — hai khái niệm thường tách rời. Với admin tạo role "AUDITOR rank 40" chỉ để đọc audit, họ sẽ bất ngờ khi AUDITOR có cả quyền của role "EDITOR rank 30".

### 2.2 Ma trận bảo vệ thực tế

| Route | Yêu cầu | Thực tế | Kết luận |
| --- | --- | --- | --- |
| `GET/POST/PATCH/DELETE /users/*` | permission + rank | `authorize` 16 route + policy trong service | Đúng, trừ `PATCH /users/:id` (SEC-007) |
| `/users/roles*` | `users.roles.read/assign` | `GET` dùng `users.read`; mutate dùng `users.roles.assign` | Lệch tên với FE (CODE-002) |
| `/users/:id/permissions/override` | rank policy | `assertCanAct` | Đúng |
| `/files/*` | `files.read/upload/delete/import/export` | **Không authorize** | Sai (SEC-002) |
| `/files/orphans/*` | quản trị | **Mở** | Sai (SEC-002) |
| `/jobs/*` | `jobs.read/create/update/delete/run` | **Không authorize, không validate** | Sai nghiêm trọng (SEC-001) |
| `/mail/*` | `mail.read/send` | `authorize` 6 route | Đúng |
| `/auth/sessions/:id` | chủ sở hữu | `findFirst where userId` | Đúng |
| `/auth/logout-all`, `/users/me/*` | chính mình | Đúng | |

### 2.3 Rủi ro leo thang quyền

1. **SEC-001**: MEMBER → gửi mail hệ thống, suspend hàng loạt, xoá audit, qua Jobs API.
2. **ADMIN tạo ADMIN**: `assertCanAssign(50, 50)` cho phép (README ghi là chủ ý). Hệ quả: một ADMIN bị lộ tài khoản có thể nhân bản thành nhiều ADMIN; "admin peer protection" sau đó lại bảo vệ các tài khoản này khỏi ADMIN khác. Chỉ SUPER_ADMIN gỡ được. Cần cân nhắc: gán role ngang cấp nên cần rank cao hơn.
3. **ADMIN cấp permission cho MEMBER role**: `roleService.updatePermissions` cho phép sửa role rank < 50 (gồm MEMBER) với **bất kỳ** permission (kể cả `users.roles.promote`, `system.settings.update`). Permission không có "rank yêu cầu" → ADMIN có thể biến MEMBER thành role đầy quyền; rank policy vẫn giới hạn *target* nhưng không giới hạn *hành động hệ thống* (mail, jobs, settings).
4. **Override ALLOW không giới hạn**: tương tự, ADMIN có thể ALLOW cho một MEMBER quyền `mail.send`, `jobs.*`… Nên giới hạn: chỉ được cấp permission mà chính actor đang có (principle of delegation).

## 3. Validation

| Nơi | Cơ chế | Đánh giá |
| --- | --- | --- |
| Body POST của auth/users/mail | Zod qua `validate()` | Tốt; `z.email()`, transform lowercase |
| Query `register/verify`, `magic-link/verify`, `google/callback` | `String(req.query.x)` | Không validate; `String(undefined)` = "undefined" → challenge không khớp → an toàn nhưng lỗi khó hiểu |
| Params `:id` | `String(q.params.id)` | Không kiểm tra định dạng cuid → query DB với chuỗi bất kỳ (an toàn với Prisma) |
| Jobs create/update | Kiểm tra `if(!x)` thủ công; `req.body` truyền thẳng | Thiếu (ERR-010) |
| Files reuse `newName` | `typeof === "string"` | Không giới hạn độ dài; tên file có thể 1MB (json limit) |
| Upload | multer không limits; MIME theo header | SEC-004, SEC-012 |
| Role name | regex `^[A-Z0-9_]+$`, rank 1..99 | Tốt |
| Email template HTML | ≤100KB, chỉ biến hợp lệ | Tốt |
| `x-request-id` | không | SEC-013 |

## 4. Secret và biến môi trường

- `.env.example` không chứa giá trị thật; quét pattern secret phổ biến (Google key, GitHub token, private key) trong repo: **không phát hiện**.
- `vitest.config.ts` hardcode `ACCESS_TOKEN_SECRET` dev — chấp nhận được cho test.
- `mail.config` chuẩn hoá SMTP password (bỏ khoảng trắng) và `GET /mail/config` mask user, không trả password: tốt.
- `logger.redact` che key khớp `/password|token|otp|secret/i` khi log object: tốt nhưng chỉ tác dụng khi ai đó gọi `logger.error(msg, obj)`; `console.error` ở OAuth controller bỏ qua.
- Vấn đề: default secret (SEC-006); `SUPER_ADMIN_GOOGLE_EMAILS` so khớp email có thể bị lợi dụng nếu allowlist đặt email mà kẻ khác tạo được tài khoản Google trùng (đã có cảnh báo trong docs: ưu tiên `sub`).

## 5. Session, cookie, token

- Không dùng cookie; access token Bearer; refresh token và sessionId gửi trong body `/auth/refresh`.
- `withCredentials: true` ở axios không cần thiết (không cookie) nhưng vô hại; CORS `credentials:true` với origin cụ thể — đúng.
- Frontend lưu 4 giá trị trong localStorage; đọc trong render (ERR-015); interceptor xử lý 401 sai (ERR-002) và không dedupe refresh (ERR-003).
- Session limit 5, không tự đá phiên cũ (đúng spec); FE có thông báo `SESSION_LIMIT_REACHED`.
- Device fingerprint: FE không gửi → model Device vô dụng; "Current" session hiển thị sai (ERR-013).

## 6. Upload, CORS, rate limit, injection

| Chủ đề | Hiện trạng | Đánh giá |
| --- | --- | --- |
| Path traversal | `LocalStorage.safe()` resolve + kiểm tra prefix `root + sep`; key server sinh `objects/xx/uuid` | Tốt |
| Kích thước upload | Kiểm tra sau khi buffer | SEC-004 |
| MIME | Header client + fallback theo đuôi | SEC-012 |
| Download | `Content-Disposition: attachment` | Tốt (chống render SVG/HTML inline) |
| CORS | origin = `FRONTEND_URL`, credentials, `methods` thiếu PUT | ERR-001 |
| Helmet | Mặc định | Ổn cho API |
| Rate limit | 10/15 phút/IP cho `/auth/*` trừ `refresh` và `google` | Thiếu ở `refresh` (brute force refresh token 32 byte không khả thi nhưng tốn DB) và `google` (SEC-005); toàn bộ API khác không có limit |
| SQL injection | Prisma parameterized; `$executeRaw` chỉ dùng literal cố định | An toàn |
| XSS backend | Template merge escape; `sendCustom` escape + `<br>` | Tốt |
| XSS frontend | Template preview trong `iframe sandbox=""` (tốt); `TemplateGallery` (dead) dùng `dangerouslySetInnerHTML`; markdown link `href` không lọc scheme (SEC-011) | Chấp nhận được, cần lọc scheme |
| Open redirect | Mọi redirect về `env.FRONTEND_URL` cố định | An toàn |
| Header `x-powered-by` | Đã tắt | Tốt |

## 7. Kịch bản truy cập trái phép / lộ dữ liệu (tổng hợp)

**Kịch bản A — Chiếm tài khoản qua magic link (SEC-003).** Tiền đề: API nhận `Host` từ client. Kẻ tấn công gửi `POST /auth/magic-link/request` với `Host: evil.example`. Nạn nhân bấm link trong email hợp lệ → token về `evil.example` → kẻ tấn công dùng token trên host thật → có phiên đăng nhập, kể cả bootstrap SUPER_ADMIN nếu email nằm trong allowlist? (Không: bootstrap chỉ với provider GOOGLE.) Vẫn chiếm được tài khoản thường và ADMIN.

**Kịch bản B — Gửi email phishing từ hệ thống (SEC-001).** MEMBER tạo lịch queue `mail.send` cron `* * * * *` payload `{kind:"auth", templateId:"magic-link", to:"…", title:"Cảnh báo bảo mật", message:"Nhấn để xác minh", actionUrl:"https://evil…", actionLabel:"Xác minh"}`. Email đi từ `MAIL_FROM` chính thức với mẫu đã tùy chỉnh của hệ thống.

**Kịch bản C — Phá chính sách lưu giữ (SEC-002).** Bất kỳ user gọi `POST /files/orphans/cleanup {force:true}` ngay sau khi người khác xoá nhầm file.

**Kịch bản D — Làm sập API (SEC-004/SEC-005).** Upload vài file 1GB song song, hoặc gọi `GET /auth/google` hàng triệu lần.

**Kịch bản E — Đọc OTP từ DB (SEC-008).** Người có quyền đọc bảng `pgboss.job`/`archive` thấy OTP đang hiệu lực và mật khẩu tạm.

## 8. Khuyến nghị bảo mật theo thứ tự

1. `authorize` cho mọi route files/jobs; whitelist queue; Zod cho jobs (SEC-001, SEC-002).
2. `API_PUBLIC_URL` thay `req.get("host")` (SEC-003).
3. `multer limits`; prune `states`; rate limit `/auth/google` và `/auth/refresh` (SEC-004, SEC-005).
4. Bắt buộc secret ở production (SEC-006).
5. Rank policy cho `PATCH /users/:id`; giới hạn quyền có thể cấp/override theo quyền của actor (SEC-007, mục 2.3).
6. Job mail chỉ mang id; đặt retention ngắn cho queue `mail.send` (SEC-008).
7. Cân nhắc refresh token trong cookie httpOnly + CSRF token (SEC-011), absolute session timeout (DB-004).
