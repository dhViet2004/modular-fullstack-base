# 05. Danh sách lỗi và rủi ro

Quy ước mã: `SEC` bảo mật/phân quyền, `ERR` lỗi logic/runtime/nghiệp vụ, `DB` dữ liệu/migration, `ARCH` kiến trúc, `CODE` chất lượng code, `OPS` triển khai/vận hành, `TEST` kiểm thử, `DOC` tài liệu, `PERF` hiệu năng.
Độ chắc chắn: **Cao** = đọc code là đủ kết luận; **Trung bình** = suy luận từ API thư viện/hành vi trình duyệt, chưa chạy được; **Thấp** = giả thuyết cần kiểm chứng.

## 1. Bảng tổng hợp

| Mã | Mức độ | Nhóm | Vị trí | Vấn đề | Ảnh hưởng | Hướng xử lý |
| --- | --- | --- | --- | --- | --- | --- |
| DB-001 | Critical | Migration | `backend/prisma/schema.prisma` vs `prisma/migrations/*` | `ScheduledJob`, enum `JobTaskType`, cột `mustChangePassword`, `temporaryExpiresAt` không có migration | DB dựng bằng `migrate deploy` thiếu bảng/cột → login lỗi, seed lỗi | Tạo migration bù bằng `prisma migrate dev --create-only`, commit; thêm CI kiểm tra drift |
| SEC-001 | Critical | Authorization | `backend/src/modules/jobs/job.routes.ts` | Toàn bộ API jobs chỉ `authenticate`; `queue` tự do | Mọi user đăng nhập gửi mail từ hệ thống, chạy job khóa/suspend user, xóa audit, xóa orphan | `authorize(jobs.*)`; whitelist queue theo `taskType`; Zod schema |
| SEC-002 | High | Authorization | `backend/src/modules/files/file.routes.ts` | Không `authorize`; `POST /files/orphans/cleanup {force}` mở cho mọi người | Xóa vật lý orphan bỏ qua retention 10 ngày; lộ thống kê hệ thống; permission `files.*` vô nghĩa | Thêm `authorize(files.read/upload/delete)`; cleanup/stats cần `system.settings.update` |
| SEC-003 | High | Auth | `auth.controller.ts` (`register`, `requestMagic`) | Link xác minh/magic link dựng từ `req.get("host")` | Host header poisoning → nạn nhân nhận link trỏ về domain kẻ tấn công → chiếm tài khoản qua magic link | Dùng `APP_URL`/`API_PUBLIC_URL` từ env |
| SEC-004 | High | DoS | `file.routes.ts`, `file.service.ts` | multer memoryStorage không `limits`; kiểm tra size sau khi đã buffer | Upload nhiều GB làm cạn RAM process API | `multer({limits:{fileSize}})`, bắt `MulterError` → 413 |
| SEC-005 | High | DoS/Memory | `oauth/google/google-oauth.strategy.ts`, `google-oauth.routes.ts` | Map `states` chỉ xóa khi callback; `GET /auth/google` không rate limit | Gọi liên tục → Map tăng vô hạn → OOM | Prune theo TTL; rate limit; hoặc lưu state vào DB |
| SEC-006 | High | Secret | `config/env.ts` | `ACCESS_TOKEN_SECRET`, `DATABASE_URL` có giá trị mặc định | Production quên set vẫn chạy với secret công khai → giả mạo JWT | Bắt buộc khi `NODE_ENV=production`; fail-fast |
| ERR-001 | High | Runtime | `app.ts` (`cors methods`) vs `user.routes.ts:19`, `mail.routes.ts` | CORS không cho `PUT`; 2 route dùng PUT | Trình duyệt chặn preflight → không lưu được quyền vai trò và mẫu email khi FE/BE khác origin | Thêm `PUT` (hoặc dùng default của `cors`) |
| ERR-002 | High | Logic FE | `frontend/src/lib/axios/interceptors.ts` | Mọi 401 (kể cả sai mật khẩu, OTP sai, exchange lỗi) → `clear()` + `location.assign("/login")` | Người dùng nhập sai mật khẩu bị reload trang, không thấy thông báo; callback OAuth/magic không hiện lỗi | Chỉ refresh/redirect khi request đã có Bearer và không phải route `/auth/*` public |
| ERR-003 | High | Race FE | `interceptors.ts` + `session.service.ts` (rotate) | Không dedupe refresh; nhiều 401 song song → nhiều refresh cùng token cũ | Sau 15 phút idle mở dashboard → bị logout ngẫu nhiên | Một promise refresh dùng chung; hàng đợi request chờ |
| ERR-004 | Medium | Runtime | `jobs/job.registry.ts` | Handler pg-boss nhận `Job[]` nhưng đọc `"data" in job` trên mảng | Payload (`retentionDays`, `inactiveDays`, `targetStatus`, `force`) luôn bị bỏ qua | Nhận `jobs` mảng, lặp `job.data` như `mailSendJob` |
| ERR-005 | Medium | Race | `files/storage/deduplicate.service.ts` | Xóa storage trước transaction DB | Upload/reuse xen giữa → StoredObject còn, file vật lý mất → download 500 | Đánh dấu/xóa DB trước, xóa storage sau; hoặc lock |
| ERR-006 | Medium | Nghiệp vụ | `registration.service.ts`, `identity.service.ts`, `password.strategy.ts` | Không có resend verify; đăng ký lại 409; OTP login không set `emailVerifiedAt` | Tài khoản chưa xác minh sau 20 phút bị kẹt vĩnh viễn | API resend; cho đăng ký lại nếu chưa verify; OTP/magic set verified |
| ERR-007 | Medium | Nghiệp vụ | `registration.service.ts`, `identity.service.ts` | User mới không được gán MEMBER | Rank 0, không quyền, dashboard trống; kết hợp SEC-001/002 vẫn dùng được files/jobs | Gán MEMBER mặc định trong transaction tạo user |
| ERR-008 | Medium | Runtime | `jobs/job.service.ts` (`start`) | `started ??= boss.start()` cache cả promise reject | Boot khi DB chưa sẵn sàng → mail/job lỗi vĩnh viễn đến khi restart | Reset `started` khi reject; retry có backoff |
| ERR-009 | Medium | Logic FE | `features/users/api/users.api.ts`, `user-list.tsx` | Bỏ `total/page`, không phân trang | Chỉ thấy 20 user đầu; thống kê sai | Truyền page/limit, hiển thị `total`, nút phân trang |
| ERR-010 | Medium | Validation | `jobs/job.controller.ts` | Không Zod; `taskType`, `cron` không kiểm tra | 500 khi taskType sai; cron hỏng vẫn lưu | Zod schema; validate cron; ràng buộc queue theo taskType |
| ERR-011 | Medium | Nghiệp vụ | `auth/identities/identity.service.ts` | Google login ghi đè `displayName`/`avatarUrl` mỗi lần | Mất chỉnh sửa tên của user/admin | Chỉ điền khi trống, hoặc có cờ "sync profile" |
| SEC-007 | Medium | Authorization | `users/user.service.ts` (`update`) | `PATCH /users/:id` không qua `rbacPolicy` | ADMIN sửa tên SUPER_ADMIN/peer | Gọi `assertCanAct` (trừ self) |
| SEC-008 | Medium | Lộ dữ liệu | `auth.controller.ts` (`requestOtp`), `user.service.ts` (`resetUserPassword`), `password-reset.service.ts` | OTP, token magic link, mật khẩu tạm nằm plaintext trong payload job pg-boss (lưu Postgres, có archive) | Ai đọc được DB/backup thấy OTP/mật khẩu tạm | Job chỉ nhận id challenge; render secret ở worker từ nguồn bảo mật, hoặc mã hóa payload; rút ngắn archive |
| SEC-009 | Medium | Dependency | `frontend/package.json` (`xlsx ^0.18.5`) | Bản npm không còn được vá (CVE-2023-30533, CVE-2024-22363) | Parse file Excel người dùng chọn → prototype pollution/ReDoS phía client | Dùng bản từ CDN SheetJS ≥0.20.2, hoặc `exceljs`/`papaparse` |
| ARCH-001 | Medium | Scale | `oauth-handoff.service.ts`, `google-oauth.strategy.ts`, `rate-limit.middleware.ts` | Trạng thái trong RAM process | Chỉ 1 instance; restart mất state | Lưu vào DB (bảng challenge) hoặc store chung |
| ARCH-002 | Medium | Thiết kế | `job.service.ts`, `server.ts`, `schema.prisma` (`ScheduledJob`) | Khóa lịch pg-boss = tên queue; nhiều bản ghi cùng queue; `runOnServer` không đọc; server chạy scheduler trái spec/docs | Lịch ghi đè lẫn nhau; tắt 1 lịch tắt luôn lịch khác cùng queue; UI đánh lừa | `queue` unique hoặc schedule key = id; tách worker; bỏ `runOnServer` |
| OPS-001 | Medium | Docker | `frontend/Dockerfile` | Không `ARG NEXT_PUBLIC_API_URL`; không copy `next.config.ts` | Image trỏ localhost; redirects/images config mất | Thêm ARG/ENV lúc build; copy config hoặc dùng `output: "standalone"` |
| OPS-002 | Medium | Deploy | `backend/Dockerfile`, `docker-compose.yml` | Prune devDeps → mất `prisma` CLI; không bước migrate; storage local không volume | Không migrate được trong image; tệp mất khi redeploy | Stage migrate riêng; volume cho storage; dùng R2 ở prod |
| OPS-003 | Medium | Vận hành | `.env.example` (`TRUST_PROXY=false`), `rate-limit.middleware.ts` | Sau reverse proxy mà quên bật `TRUST_PROXY` → mọi người chung 1 IP | 10 lần login/15 phút cho toàn site → khóa đăng nhập diện rộng | Tài liệu hóa; cảnh báo khi thấy `X-Forwarded-For` mà trust proxy tắt |
| CODE-001 | Medium | Chất lượng | 82/207 file `*.ts(x)` | Viết trên 1 dòng (tới 3.869 ký tự/dòng); 5 file > 500 dòng | Không đọc/review/diff được; vi phạm hard limit spec | Prettier + lint-staged; tách component |
| CODE-002 | Medium | Trùng lặp | `seed.ts`, `permission.constants.ts`, `role-manager.tsx`, `dashboard-shell.tsx`, `dashboard/page.tsx` | Catalog permission ở 5 nơi; drift (`users.roles.read` chỉ có FE) | Thêm quyền phải sửa 5 chỗ; UI và API lệch nhau | Một registry, sinh seed/constants/type |
| CODE-003 | Medium | Dead code | Nhiều file (xem chi tiết) | ~15 đơn vị code chết: tab upload FE, `TemplateGallery`, `mailController.templates`, 2 template file, `otp/page.tsx`, `eventBus`, `transaction.ts`, 3 schema, `MarkdownImporter`, `Button`, `Loading`, `runOnServer`… | Gây hiểu nhầm, tăng chi phí bảo trì | Xóa hoặc nối lại |
| TEST-001 | Medium | Kiểm thử | `backend/tests`, `frontend/src/**/*.test.ts` | Không test authorize theo route, jobs API, files API, refresh thành công/race, OAuth, storage failure (README tick); FE 2 test | Lỗi SEC-001/002, ERR-001/002 lọt qua "test pass" | Test route-level authz matrix; test interceptor; test cleanup order |
| DB-002 | Medium | Index/constraint | `schema.prisma` | Thiếu index `File.objectId`; `ScheduledJob.queue` không unique; không check `referenceCount >= 0`, `rank` range | Cleanup quét File theo objectId chậm khi lớn; dữ liệu lệch không bị chặn | Thêm index/unique/check |
| DOC-001 | Medium | Tài liệu | `README.md`, `docs/architecture/jobs.md`, `docs/api/*` | Checklist tick sai (migrate, PUT roles, storage failure test, "server chỉ HTTP"); docs mâu thuẫn code | Người sau tin nhầm | Sửa docs theo code; quy trình tick sau khi test tự động |
| SEC-010 | Low | Enumeration | `registration.service.ts` (409), `password.strategy.ts` | 409 `EMAIL_ALREADY_EXISTS`; timing argon2 chỉ khi có user; `EMAIL_NOT_VERIFIED` là oracle mật khẩu | Dò email tồn tại | Trả 202 chung; verify hash giả khi không có user |
| SEC-011 | Low | Token/XSS | `lib/auth/auth-client.ts`, `markdown-previewer.tsx` | Refresh token trong localStorage; link markdown không lọc `javascript:` | XSS (self-XSS) lấy token dài hạn | httpOnly cookie cho refresh; sanitize href |
| SEC-012 | Low | Upload | `file.service.ts` | MIME theo header client; SVG cho phép | Upload nội dung giả MIME | Sniff magic bytes; cân nhắc bỏ SVG |
| SEC-013 | Low | Logging | `request-context.middleware.ts`, `logger.ts` | `x-request-id` từ client không validate; log không có requestId; console không structured | Khó điều tra; log injection nhẹ | Validate UUID; pino/JSON |
| SEC-014 | Low | Nghiệp vụ | `mail.controller.ts` | `/mail/send` gửi mail tùy ý tới bất kỳ ai; `send-template otp` tạo LOGIN_OTP thật | Lạm dụng làm relay spam; OTP ngoài ý muốn | Giới hạn người nhận/nhật ký; tách "preview" khỏi "issue OTP" |
| ERR-012 | Low | Race | `session.service.ts`, `registration.service.ts` | Đếm session rồi tạo không atomic; findUnique rồi create | Vượt giới hạn 5 phiên; 500 thay vì 409 | Lock/transaction; bắt P2002 |
| ERR-013 | Low | Logic FE | `session-list.tsx`, `auth.controller.ts` (`info`) | "Current" = phần tử đầu; FE không gửi fingerprint | Hiển thị sai phiên; mọi phiên cùng device | So `sessionId` localStorage; gửi fingerprint hoặc bỏ Device |
| ERR-014 | Low | UX/Validation | `settings/page.tsx`, `must-change-password-modal.tsx` | try/finally không catch; modal yêu cầu 8 ký tự, backend 12 | Đổi mật khẩu sai không báo; thông báo mâu thuẫn | catch + hiển thị; đồng bộ policy |
| ERR-015 | Low | Hydration | `user-list.tsx`, `user-detail.tsx`, `role-manager.tsx`, `assign-role-modal.tsx` | `authClient.getUser()` trong render | Hydration mismatch, nút nhấp nháy | Đọc trong `useEffect`/context |
| ERR-016 | Low | Validation | `role.service.ts` | `permissionIds` không kiểm tra tồn tại | FK error → 500 | Kiểm tra trước; bắt P2003 → 400 |
| CODE-004 | Low | Lint/Deps | `google-oauth.controller.ts`, `backend/package-lock.json` + `pnpm-lock.yaml`, `frontend/package.json` | `catch (error: any)` + `console.error`; 2 lockfile; version `^` không nhất quán | `pnpm lint` có thể fail (chưa chạy được); lockfile lệch | Sửa `unknown`; xóa `package-lock.json`; pin version |
| CODE-005 | Low | i18n/Text | `sessions/page.tsx`, `settings/page.tsx`, `session-list.tsx` | Tiếng Anh lẫn Việt; text "Email OTP and magic links are enabled" đã lỗi thời | Trải nghiệm không nhất quán | Thống nhất ngôn ngữ; cập nhật text |
| CODE-006 | Low | Tầng | `auth.controller.ts`, `user.controller.ts`, `mail.controller.ts`; FE `settings/page.tsx`, callback pages | Controller gọi Prisma; page gọi axios | Trái dependency direction spec | Chuyển vào service/hook |
| PERF-001 | Low | Query | `authenticate.middleware.ts`, `authorize.middleware.ts` | ≥3 query mỗi request bảo vệ, không cache | Chấp nhận được hiện tại; tăng tải khi nhiều user | Cache permission theo request; cân nhắc TTL ngắn |
| PERF-002 | Low | Bộ nhớ | `download.service.ts`, `file.controller.ts` (`importMarkdown`) | Buffer toàn bộ file; payload job chứa toàn bộ markdown | RAM theo số request đồng thời × 20MB | Stream; job nhận id file |
| OPS-004 | Low | Quan sát | `app.ts` (`/health`), `logger.ts` | Health không kiểm tra DB; không request log; không metrics | Orchestrator không biết DB chết | Health kiểm tra `SELECT 1`; request logger |
| DB-003 | Low | Test data | `tests/integration/*.test.ts` | `deleteMany()` toàn bảng | Xóa sạch dữ liệu nếu DATABASE_URL trỏ nhầm (vitest đã ép `corestack_test`) | Dùng transaction rollback/tenant test |
| DB-004 | Low | Chính sách | `session.service.ts` (`refresh` gia hạn `expiresAt`) | Sliding session vô hạn | Phiên không bao giờ hết nếu dùng liên tục | Thêm absolute timeout |

Thống kê: Critical 2, High 8, Medium 22, Low 18. Tổng 50.

---

## 2. Phân tích chi tiết

### DB-001 — Schema Prisma không có migration tương ứng

- **Mức độ**: Critical. **Loại**: Migration/triển khai. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `backend/prisma/schema.prisma` khai báo `model ScheduledJob`, `enum JobTaskType`, và trong `PasswordCredential` có `mustChangePassword Boolean @default(false)`, `temporaryExpiresAt DateTime?`. Thư mục `prisma/migrations/` chỉ có 3 migration: `20260915000000_init` (không có các cột/bảng này), `20260917000000_add_user_avatar`, `20260918000000_add_email_templates`. `grep -rn "ScheduledJob\|mustChangePassword\|temporaryExpiresAt\|JobTaskType" prisma/migrations/` không trả về kết quả. Lịch sử git: `5091d83` thêm `model ScheduledJob` vào schema nhưng không thêm migration.
- **Nguyên nhân**: Trong quá trình phát triển, schema được áp dụng bằng cách khác (`prisma db push`, hoặc `migrate dev` sinh migration nhưng không commit). README vẫn tick "`db:migrate` pass".
- **Ảnh hưởng**: Trên môi trường mới chạy `pnpm db:migrate:deploy` (đúng như `docs/deployment/backend.md` hướng dẫn): bảng `ScheduledJob` không tồn tại → `pnpm db:seed` lỗi; cột `mustChangePassword` không tồn tại → `POST /auth/login` lỗi 500 (vì `auth.service.ts` `select: { mustChangePassword: true }`); `GET /users/me` lỗi. Toàn bộ hệ thống không dùng được.
- **Tình huống kích hoạt**: Deploy lần đầu lên staging/production; CI tạo DB test bằng migration; đồng đội clone repo và chạy theo README.
- **Hướng xử lý**: Chạy `prisma migrate dev --create-only` trên DB đã đúng để sinh migration bù, kiểm tra SQL, commit. Thêm bước CI `prisma migrate diff --from-migrations --to-schema-datamodel --exit-code` để chặn drift. Bỏ thói quen `db push` ngoài môi trường thử nghiệm.

### SEC-001 — API Jobs không phân quyền và cho phép ghi vào bất kỳ hàng đợi

- **Mức độ**: Critical. **Loại**: Authorization / privilege escalation. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `backend/src/modules/jobs/job.routes.ts` chỉ có `jobRoutes.use(authenticate)`; không có `authorize(...)` nào (đếm: 0). `job.controller.ts` `createSchedule` nhận `queue`, `cron`, `payload` tự do. `job.service.ts` `createSchedule` gọi `boss.schedule(queue, cron, payload)`; `triggerNow` gọi `boss.send(job.queue, payload)`. `job.registry.ts` đăng ký handler cho `mail.send` (gửi email với `to`, `title`, `message` từ payload), `users.update-inactive`, `system.cleanup-audit`, `files.cleanup-orphans`. Seed có `jobs.read/create/update/delete/run` nhưng không nơi nào dùng.
- **Nguyên nhân**: Router được thêm ở commit `5091d83` cùng nhiều tính năng khác, sao chép mẫu từ `file.routes.ts` (cũng không authorize) thay vì `user.routes.ts`. Frontend ẩn menu Jobs theo `jobs.read` nên khi test bằng UI với tài khoản admin không phát hiện.
- **Ảnh hưởng**: Bất kỳ tài khoản đăng nhập nào (kể cả user mới rank 0) có thể: (1) tạo lịch `queue: "mail.send"`, `payload: {kind:"auth", to:"victim@…", title, message, otp}` với cron mỗi phút → dùng SMTP của hệ thống gửi email tùy ý (phishing từ domain tin cậy); (2) chạy ngay `users.update-inactive` → SUSPENDED mọi user không hoạt động 180 ngày; (3) chạy `system.cleanup-audit` → xóa audit cũ hơn 90 ngày (payload bị bỏ qua theo ERR-004 nhưng giá trị mặc định vẫn phá hoại); (4) xóa/sửa lịch hệ thống.
- **Tình huống kích hoạt**: Một MEMBER dùng DevTools gọi `POST /api/v1/jobs/schedules` với Bearer token của mình.
- **Hướng xử lý**: `authorize(Permission.JOBS_*)` cho từng route; Zod schema; **ánh xạ `taskType → queue` cố định ở server** (không nhận `queue` từ client); không cho phép `mail.send` là queue lập lịch; ghi audit cho thao tác jobs.

### SEC-002 — API Files không phân quyền; cleanup orphan mở cho mọi người

- **Mức độ**: High. **Loại**: Authorization. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `file.routes.ts`: `fileRoutes.use(authenticate)` rồi các route `GET /orphans/stats`, `POST /orphans/cleanup`, `POST /upload`, `DELETE /:id`… không có `authorize`. `file.controller.cleanupOrphans` đọc `q.body.force`. Seed định nghĩa `files.read/upload/delete/import/export`, MEMBER không có `files.delete` nhưng vẫn xóa được file của mình.
- **Nguyên nhân**: Ownership check (`findOwned`) được xem là đủ; hai endpoint orphan được thêm sau (commit `57f815d`) cho dashboard mà không xét quyền.
- **Ảnh hưởng**: Mọi user gọi `POST /files/orphans/cleanup {force:true}` xóa vật lý toàn bộ orphan ngay lập tức, phá chính sách giữ 10 ngày (mục 24 spec). Thống kê hệ thống lộ ra ngoài. Toàn bộ nhóm quyền `files.*` chỉ tác dụng ẩn/hiện UI.
- **Tình huống kích hoạt**: user A xóa nhầm file rồi nhờ admin khôi phục; user B (bất kỳ) đã gọi cleanup force → mất vĩnh viễn.
- **Hướng xử lý**: `authorize` từng route theo permission đã seed; stats/cleanup cần quyền quản trị (`system.settings.*`); FE cũng đang không hiển thị nút cleanup (tab upload chết) nên có thể bỏ endpoint force.

### SEC-003 — Link xác minh và magic link dựng từ Host header

- **Mức độ**: High. **Loại**: Auth / account takeover. **Độ chắc chắn**: Cao về code; mức khai thác phụ thuộc reverse proxy có chuẩn hóa `Host` hay không.
- **Bằng chứng**: `auth.controller.ts` `register`: `const baseUrl=\`${req.protocol}://${req.get("host")}\``; `requestMagic`: `const actionUrl=\`${req.protocol}://${req.get("host")}/api/v1/auth/magic-link/verify?email=…&token=…\``. Link này được đưa vào email qua job `mail.send`.
- **Nguyên nhân**: Không có biến cấu hình URL công khai của API (chỉ có `FRONTEND_URL`, `GOOGLE_CALLBACK_URL`).
- **Ảnh hưởng**: Kẻ tấn công gửi `POST /auth/magic-link/request {email: victim}` kèm header `Host: attacker.com`. Nạn nhân nhận email "Đăng nhập an toàn" hợp lệ từ hệ thống, nút trỏ tới `http://attacker.com/api/v1/auth/magic-link/verify?email=…&token=…`. Khi nạn nhân bấm, token về tay kẻ tấn công; kẻ tấn công mở link thật → đăng nhập thành công (magic link tự tạo phiên, và tự tạo user nếu chưa có). Rate limit 10 lần/15 phút không ngăn được vì chỉ cần 1 request.
- **Tình huống kích hoạt**: API expose trực tiếp ra Internet, hoặc proxy chuyển tiếp `Host` nguyên vẹn (cấu hình nginx `proxy_set_header Host $host` phổ biến cũng chuyển Host của client).
- **Hướng xử lý**: Thêm `API_PUBLIC_URL` vào `env.ts` (bắt buộc ở production) và dựng mọi link từ đó; hoặc trỏ link thẳng về `FRONTEND_URL` rồi FE gọi API.

### SEC-004 — Upload không giới hạn kích thước ở tầng multer

- **Mức độ**: High. **Loại**: DoS bộ nhớ. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `file.routes.ts`: `const upload = multer({ storage: multer.memoryStorage() });` không có `limits`. `file.service.ts` mới kiểm tra `if (file.size > env.FILE_MAX_SIZE_MB * 1024 * 1024)`.
- **Nguyên nhân**: Hiểu "kiểm tra size" là nghiệp vụ nên đặt ở service; không biết multer sẽ đọc hết body vào RAM trước.
- **Ảnh hưởng**: Một request multipart 2 GB được đọc toàn bộ vào Buffer trước khi bị từ chối. Vài request song song làm process chết (OOM). `express.json({limit:"1mb"})` không áp dụng cho multipart.
- **Tình huống kích hoạt**: Bất kỳ user đăng nhập gửi file lớn; hoặc script tự động.
- **Hướng xử lý**: `multer({ storage, limits: { fileSize: storageConfig.maxBytes, files: 1 } })`, map `MulterError LIMIT_FILE_SIZE` → 413 `FILE_TOO_LARGE` trong error middleware; cân nhắc `diskStorage`/stream cho file lớn.

### SEC-005 — Rò rỉ bộ nhớ Map `states` và thiếu rate limit ở `/auth/google`

- **Mức độ**: High. **Loại**: DoS. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `google-oauth.strategy.ts`: `const states=new Map<…>()`; `authorize()` gọi `states.set(state,{verifier,expires:Date.now()+600_000})`; chỉ `callback()` gọi `states.delete(state)`; không có prune. `google-oauth.routes.ts`: `googleOAuthRoutes.get("/",controller.authorize)` không có `authRateLimit` (chỉ `/exchange` có). So sánh: `oauth-handoff.service.ts` có `prune()` khi issue.
- **Nguyên nhân**: Thiếu vòng đời cho entry hết hạn.
- **Ảnh hưởng**: Mỗi lần gọi `GET /api/v1/auth/google` tạo ~200 byte không bao giờ được giải phóng nếu người dùng không hoàn tất (đóng tab, bot). Hàng triệu request → OOM. Đây cũng là endpoint không cần đăng nhập.
- **Tình huống kích hoạt**: Bot quét, hoặc đơn giản là lưu lượng thật lâu dài.
- **Hướng xử lý**: Prune theo TTL như `handoffs`; giới hạn kích thước Map; rate limit; lâu dài lưu state vào DB.

### SEC-006 — Secret có giá trị mặc định

- **Mức độ**: High. **Loại**: Secret management. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `config/env.ts`: `ACCESS_TOKEN_SECRET:z.string().min(32).default("development_only_secret_change_me_123")`, `DATABASE_URL:z.string().default("postgresql://postgres:postgres@localhost:5432/corestack")`. Không có ràng buộc theo `NODE_ENV`.
- **Nguyên nhân**: Ưu tiên "chạy được ngay" cho dev.
- **Ảnh hưởng**: Production quên set biến vẫn khởi động bình thường; secret nằm công khai trong repo → ai cũng ký được JWT HS256 hợp lệ (`sub`, `sid` bất kỳ). May mắn là `authenticate` còn tra session trong DB nên cần `sid` thật, nhưng `sid` là cuid có thể lộ qua API sessions của chính kẻ tấn công… kết hợp `sub` của nạn nhân thì `session.userId!==payload.sub` chặn được. Rủi ro vẫn cao vì bất kỳ thay đổi nào ở `authenticate` sẽ mở toang.
- **Hướng xử lý**: `superRefine`: nếu `NODE_ENV==="production"` thì `ACCESS_TOKEN_SECRET` không được bằng default và `DATABASE_URL` bắt buộc; fail-fast khi khởi động.

### ERR-001 — CORS không cho phép PUT

- **Mức độ**: High. **Loại**: Runtime/tính năng hỏng. **Độ chắc chắn**: Cao (hành vi chuẩn của trình duyệt với preflight).
- **Bằng chứng**: `app.ts`: `cors({origin:appConfig.origin,credentials:true,methods:["GET","POST","PATCH","DELETE"]})`. `user.routes.ts:19`: `userRoutes.put("/roles/:id/permissions", …)`. `mail.routes.ts`: `mailRoutes.put("/templates/:id", …)`. Frontend: `usersApi.updateRolePermissions` dùng `api.put`, `mailApi.updateTemplate` dùng `api.put`. FE chạy ở `localhost:3000`, API ở `localhost:4000` (khác origin), có header `Authorization` → luôn preflight.
- **Nguyên nhân**: Danh sách methods viết tay khi mới chỉ có 4 method; hai route PUT thêm sau không cập nhật.
- **Ảnh hưởng**: Trình duyệt trả lỗi CORS cho "Lưu cấu hình quyền" (RoleManager) và "Lưu mẫu" (TemplateEditor). README tick cả hai tính năng.
- **Hướng xử lý**: Thêm `"PUT"` (và `OPTIONS` không cần vì `cors` tự xử lý); hoặc bỏ tùy chọn `methods` để dùng mặc định.

### ERR-002 — Interceptor xử lý mọi 401 như hết hạn phiên

- **Mức độ**: High. **Loại**: Logic frontend. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `interceptors.ts`: điều kiện `status===401 && c && !c._retry && !c.url?.includes("/auth/refresh")` → nếu không có refresh token thì `authClient.clear(); window.location.assign("/login")`. Backend trả 401 cho `INVALID_CREDENTIALS` (login), `OTP_INVALID`, `PASSWORD_RESET_INVALID`, `INVALID_OAUTH_HANDOFF`, `TEMPORARY_PASSWORD_EXPIRED`.
- **Nguyên nhân**: Coi 401 đồng nghĩa "token hết hạn".
- **Ảnh hưởng**: Ở trang login, nhập sai mật khẩu → trang reload về `/login`, thông báo "Email hoặc mật khẩu không chính xác" (đã code trong `login-form.tsx`) không hiển thị. Ở `forgot-password`, nhập sai OTP → mất toàn bộ form. Ở callback Google/magic link, code hết hạn → bị đẩy về `/login` thay vì hiện thông báo đã chuẩn bị sẵn. Thông báo "Mật khẩu tạm đã hết hạn" không bao giờ tới người dùng.
- **Tình huống kích hoạt**: Mọi lần nhập sai.
- **Hướng xử lý**: Chỉ xử lý refresh/redirect khi request gốc có header `Authorization` (tức đã đăng nhập) và URL không thuộc nhóm public `/auth/login|otp|password-reset|register|*/exchange`; mọi 401 khác trả về cho caller.

### ERR-003 — Không dedupe refresh token

- **Mức độ**: High. **Loại**: Race condition frontend. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `interceptors.ts` gọi `api.post("/auth/refresh", t)` trực tiếp trong mỗi lần 401; không có biến `refreshPromise`/hàng đợi (grep `isRefreshing|refreshPromise|pending` không có). Backend `session.service.ts` `refresh` → `sessionRepository.rotate` thay `refreshTokenHash` ngay lập tức. `dashboard/page.tsx` bắn 6 query đồng thời khi mount.
- **Nguyên nhân**: Viết interceptor tối giản.
- **Ảnh hưởng**: Sau khi access token hết hạn (15 phút), mở dashboard → ≥2 request 401 cùng lúc → ≥2 refresh với cùng refresh token cũ → request đầu rotate, các request sau nhận `INVALID_REFRESH_TOKEN` → `clear()` + đẩy về login. Người dùng cảm nhận là "hệ thống tự đăng xuất".
- **Hướng xử lý**: Giữ một promise refresh dùng chung; các request 401 khác `await` promise đó rồi retry với token mới. Backend có thể thêm grace period cho token cũ (tuỳ chính sách).

### ERR-004 — Handler job đọc payload sai chữ ký pg-boss

- **Mức độ**: Medium. **Loại**: Runtime/nghiệp vụ. **Độ chắc chắn**: Trung bình–Cao (dựa trên API pg-boss ≥10: handler `work()` nhận `Job[]`; chính `mail-send.job.ts` trong repo cũng viết theo mảng).
- **Bằng chứng**: `job.registry.ts`: `boss.work("system.cleanup-audit", async (job) => { const data = (job && typeof job === "object" && "data" in job) ? job.data : {}; … })` — với `job` là mảng, `"data" in job` là `false` → `data = {}`. Tương tự `users.update-inactive`. Trong khi `mailSendJob=async(jobs:{data:…}[])=>{for(const {data} of jobs)…}`.
- **Ảnh hưởng**: `retentionDays`, `inactiveDays`, `targetStatus` cấu hình trên UI/seed không có tác dụng; luôn 90 ngày / 180 ngày / SUSPENDED. `payload {force:true}` cho cleanup orphan cũng bị bỏ qua (handler gọi `fileCleanupJob()` không tham số). `scheduled-jobs.test.ts` chỉ test hàm handler trực tiếp, không test qua registry nên không phát hiện.
- **Hướng xử lý**: `boss.work(name, async (jobs) => { for (const job of jobs) await handler(job.data) })`; thêm test cho registry với mock boss.

### ERR-005 — Thứ tự xóa trong cleanup orphan

- **Mức độ**: Medium. **Loại**: Race/toàn vẹn dữ liệu. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `deduplicate.service.ts` `cleanupOrphans`: `await storage.delete(object.storageKey); await prisma.$transaction(async tx => { const current = …; if (!current || current.referenceCount !== 0) return; … })`.
- **Ảnh hưởng**: Nếu giữa hai bước có upload cùng hash (`uploadService` thấy object tồn tại → chỉ tăng refCount, không put lại file) hoặc `POST /files/:id/reuse`, transaction bỏ qua nhưng file vật lý đã bị xóa → File mới trỏ tới object không có dữ liệu → download 500 vĩnh viễn. Xác suất thấp nhưng hậu quả không tự hồi phục; tăng khi SEC-002 cho phép cleanup force bất kỳ lúc nào.
- **Hướng xử lý**: Trong transaction: kiểm tra `referenceCount === 0`, xóa `StoredObject` (hoặc set `pendingDeleteAt`+ trạng thái DELETING) trước; sau commit mới `storage.delete`; nếu delete storage thất bại, ghi vào bảng "dangling keys" để dọn sau.

### ERR-006 — Tài khoản chưa xác minh bị kẹt

- **Mức độ**: Medium. **Loại**: Nghiệp vụ. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `registration.service.ts` → 409 nếu email tồn tại; challenge `EMAIL_VERIFY` TTL 20 phút; không có route resend trong `auth.routes.ts`. `password.strategy.ts` → 403 nếu `!user.emailVerifiedAt`. `auth.controller.requestOtp` truyền `user?.id` → `identity.service.resolve` đi nhánh `if(result.userId)return prisma.user.findUniqueOrThrow` (không set `emailVerifiedAt`).
- **Ảnh hưởng**: Người dùng đăng ký, mail chậm/không đến (SMTP chưa cấu hình rất phổ biến ở base project) → 20 phút sau không thể làm gì: login 403, đăng ký lại 409, quên mật khẩu (OTP) đổi được mật khẩu nhưng vẫn 403 vì chưa verify. Chỉ can thiệp DB mới gỡ được.
- **Hướng xử lý**: `POST /auth/register/resend`; cho phép đăng ký lại (ghi đè credential) nếu `emailVerifiedAt` null; OTP/magic link thành công thì set `emailVerifiedAt` (họ đã chứng minh sở hữu email).

### ERR-007 — Không gán vai trò mặc định cho user mới

- **Mức độ**: Medium. **Loại**: Nghiệp vụ/RBAC. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `registration.service.ts` `prisma.user.create({data:{email,displayName,passwordCredential:{create…}}})`; `identity.service.ts` `tx.user.upsert(...)` — không có `roles:{create:…}`. `grep MEMBER backend/src` chỉ ra `role.constants.ts`, `role.service.ts`, `rbac.policy.ts`.
- **Ảnh hưởng**: User mới có `roles: []`, `permissions: []`, rank 0. Dashboard hiện "Chưa có menu quản trị được cấp quyền". Admin phải gán tay từng người. Đồng thời vì SEC-001/002, user này vẫn gọi được API files/jobs.
- **Hướng xử lý**: Gán `MEMBER` trong cùng transaction tạo user; cấu hình `DEFAULT_ROLE` qua env.

### ERR-008 — `jobService.start()` cache promise bị reject

- **Mức độ**: Medium. **Loại**: Runtime. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `job.service.ts`: `start() { return (this.started ??= this.boss.start()); }`; `send()`/`schedule()` gọi `await this.start()`. `server.ts` bắt lỗi start và tiếp tục chạy API.
- **Ảnh hưởng**: Nếu Postgres chưa sẵn sàng lúc API boot (rất thường gặp với docker compose không `depends_on: condition`), `boss.start()` reject; `this.started` giữ promise reject; mọi `jobProducer.send` (đăng ký, OTP, reset mật khẩu, khóa user…) đều ném lỗi → 500, cho tới khi restart. Đăng ký user đã tạo xong nhưng mail không gửi → dẫn tới ERR-006.
- **Hướng xử lý**: `.catch(err => { this.started = undefined; throw err })`; retry có backoff khi boot; health check báo trạng thái boss.

### ERR-009 — Frontend bỏ phân trang danh sách user

- **Mức độ**: Medium. **Loại**: Logic FE. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `users.api.ts`: `list: () => api.get("/users").then((r) => r.data.data.items as User[])`; `user.controller.list` mặc định `limit 20`; `user-list.tsx` không có state page; thống kê dùng `q.data?.length`.
- **Ảnh hưởng**: Từ user thứ 21 trở đi không xuất hiện; tìm kiếm chỉ lọc trong 20 bản ghi; "Tổng số người dùng" sai.
- **Hướng xử lý**: API trả `{items,total,page,limit}` → hook nhận page; UI phân trang; tìm kiếm server-side.

### ERR-010 — Jobs API không validate

- **Mức độ**: Medium. **Loại**: Validation. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `job.controller.ts` `createSchedule`: `if (!name || !taskType || !queue || !cron) throw 400`; `taskType` truyền thẳng vào Prisma enum; `updateSchedule` truyền `req.body` nguyên vẹn vào `jobService.updateSchedule`. Không import `validate`.
- **Ảnh hưởng**: `taskType: "FOO"` → Prisma ném lỗi → 500 INTERNAL_ERROR; `cron: "abc"` → bản ghi được tạo, `boss.schedule` lỗi chỉ được log; UI hiện lịch "đang chạy" nhưng không chạy. `updateSchedule` cho phép đổi `lastRunAt/lastStatus` từ client (repository chấp nhận các trường này).
- **Hướng xử lý**: Zod schema cho create/update (chỉ whitelist trường), validate cron (thư viện `cron-parser`), ánh xạ queue từ taskType.

### ERR-011 — Google login ghi đè hồ sơ

- **Mức độ**: Medium. **Loại**: Nghiệp vụ. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `identity.service.ts`: `if(found) return prisma.user.update({where:{id:found.userId}, data:profile(result)})` với `profile` = `{displayName, avatarUrl}` khi provider GOOGLE.
- **Ảnh hưởng**: Admin đổi `displayName` cho user (`PATCH /users/:id`) → lần Google login sau bị ghi đè lại tên Google. Không có cách tắt.
- **Hướng xử lý**: Chỉ điền khi trống; hoặc lưu `googleDisplayName` riêng.

### SEC-007 — `PATCH /users/:id` không qua rank policy

- **Mức độ**: Medium. **Loại**: Authorization. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `user.service.ts`: `update: userRepository.update`; `user.controller.update` gọi thẳng. Các thao tác khác (`setBlocked`, `role`, `resetUserPassword`, `overridePermission`) đều gọi `rbacPolicy.assertCanAct`.
- **Ảnh hưởng**: ADMIN (có `users.update`) đổi tên hiển thị của SUPER_ADMIN hoặc ADMIN khác, trái quy tắc "ADMIN không chỉnh user rank ≥ mình". Frontend disable nút nhưng API mở.
- **Hướng xử lý**: Thêm policy (cho phép self); mở rộng khi có thêm trường nhạy cảm (email, status).

### SEC-008 — Bí mật nằm trong payload job

- **Mức độ**: Medium. **Loại**: Lộ dữ liệu. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `auth.controller.requestOtp`: `jobProducer.send("mail.send", {…, otp, …})`; `requestMagic`: `actionUrl` chứa token; `registration.service`: link chứa token; `password-reset.service`: `otp`; `user.service.resetUserPassword`: `message: …Mật khẩu tạm thời: ${tempPassword}…`. pg-boss lưu job (data JSON) trong schema `pgboss` của cùng Postgres và archive sau khi hoàn tất theo cấu hình mặc định.
- **Ảnh hưởng**: Người có quyền đọc DB, bản backup, hoặc log truy vấn thấy OTP đang hiệu lực, token magic link, mật khẩu tạm 24h. README ghi "Không log sensitive secrets" nhưng DB thì có.
- **Hướng xử lý**: Job chỉ mang `challengeId`/`userId`; worker lấy secret ở nơi an toàn (hoặc sinh secret ngay tại worker rồi ghi hash); đặt `deleteAfterSeconds` ngắn cho queue `mail.send`; hoặc mã hóa payload.

### SEC-009 — `xlsx` phiên bản npm có lỗ hổng không được vá

- **Mức độ**: Medium. **Loại**: Dependency. **Độ chắc chắn**: Cao về phiên bản; ảnh hưởng phụ thuộc file người dùng nạp.
- **Bằng chứng**: `frontend/package.json`: `"xlsx": "^0.18.5"`. SheetJS ngừng phát hành lên npm từ 0.18.5; CVE-2023-30533 (prototype pollution) và CVE-2024-22363 (ReDoS) được vá ở 0.19.3/0.20.2 chỉ trên CDN của SheetJS. `markdown-converter.ts` gọi `XLSX.read(buffer)` với file do người dùng chọn.
- **Ảnh hưởng**: Chạy phía trình duyệt của chính người dùng (self-DoS/self-pollution). `pnpm audit` sẽ báo.
- **Hướng xử lý**: Cài từ `https://cdn.sheetjs.com/xlsx-0.20.x/xlsx-0.20.x.tgz`, hoặc thay bằng `exceljs`/`papaparse` cho CSV.

### ARCH-001 — Trạng thái trong RAM process

- **Mức độ**: Medium (đã tài liệu hóa một phần). **Loại**: Scale/vận hành. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `handoffs` Map, `states` Map, store mặc định của `express-rate-limit`. `docs/architecture/auth.md` thừa nhận cho handoff.
- **Ảnh hưởng**: Không chạy được ≥2 replica sau load balancer (OAuth thất bại ngẫu nhiên); restart giữa luồng OAuth → lỗi; rate limit chia theo instance.
- **Hướng xử lý**: Ở quy mô hiện tại, lưu state/handoff vào bảng `VerificationChallenge` (type mới) là đủ, không cần Redis.

### ARCH-002 — Thiết kế lịch job

- **Mức độ**: Medium. **Loại**: Thiết kế. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `job.service.ts` `schedule(name=queue, cron)` và `unschedule(current.queue)`; `schema.prisma` `ScheduledJob.queue String` không unique; `runOnServer` chỉ xuất hiện ở repository/controller/schema, không có logic đọc; `server.ts` gọi `registerJobs()`+`registerSchedules()`; `docs/architecture/jobs.md` viết "Schedules live in the worker".
- **Ảnh hưởng**: Tạo 2 lịch cùng queue → pg-boss chỉ giữ cron cuối; tắt 1 lịch → `unschedule(queue)` tắt cả 2; UI hiển thị badge "Server" vô nghĩa; chạy thêm `worker.ts` thì cả hai process cùng consume (ổn) nhưng mục đích tách worker không đạt.
- **Hướng xử lý**: `queue` unique hoặc dùng `boss.schedule(\`${queue}:${job.id}\`)` với queue riêng; bỏ `runOnServer`; server không đăng ký worker (hoặc có cờ `JOBS_INPROCESS`).

### OPS-001 — Dockerfile frontend

- **Mức độ**: Medium. **Loại**: Triển khai. **Độ chắc chắn**: Trung bình (chưa build được).
- **Bằng chứng**: `frontend/Dockerfile`: không có `ARG NEXT_PUBLIC_API_URL`; runtime stage copy `package.json`, `pnpm-lock.yaml`, `node_modules`, `.next`, `public` — không copy `next.config.ts`. `docs/deployment/frontend.md` nói "Set NEXT_PUBLIC_API_URL at build time" nhưng Dockerfile không có cơ chế.
- **Ảnh hưởng**: `docker build` không nhận `--build-arg` → giá trị `NEXT_PUBLIC_*` bị inline lúc `next build` là `undefined` → `client.ts` fallback `http://localhost:4000/api/v1`, `login-form.tsx` link Google thành `undefined/auth/google`. Thiếu `next.config.ts` khi `next start` → redirects `/otp`, `/magic-link` và `images.remotePatterns` cho avatar Google có thể không được áp dụng.
- **Hướng xử lý**: `ARG NEXT_PUBLIC_API_URL` + `ENV` trước `pnpm build`; copy `next.config.ts`; hoặc `output: "standalone"` và copy `.next/standalone`.

### OPS-002 — Dockerfile backend và compose

- **Mức độ**: Medium. **Loại**: Triển khai. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `backend/Dockerfile`: `pnpm prune --prod` (xóa `prisma` CLI là devDependency), `CMD ["node","dist/server.js"]`, không có bước migrate; `docker-compose.yml` chỉ có Postgres; `LOCAL_STORAGE_PATH=./storage` không có volume; image chạy root.
- **Ảnh hưởng**: Không thể `prisma migrate deploy` bên trong image production; storage local mất khi container thay thế; không có worker service.
- **Hướng xử lý**: Stage/job migrate riêng (image build có prisma CLI) hoặc `pnpm add prisma` vào dependencies; volume cho `/app/storage`; `USER node`; thêm service `api`, `worker` vào compose cho local.

### OPS-003 — `TRUST_PROXY` và rate limit sau reverse proxy

- **Mức độ**: Medium. **Loại**: Vận hành. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `.env.example` `TRUST_PROXY=false`; `app.ts` `if(appConfig.trustProxy) app.set("trust proxy",1)`; `rate-limit.middleware.ts` `limit:10` cho mọi route auth theo `req.ip`.
- **Ảnh hưởng**: Deploy sau nginx/Cloudflare mà quên bật → `req.ip` là IP proxy → toàn bộ người dùng chia 10 lượt đăng nhập/15 phút → "hệ thống không cho đăng nhập". Ngược lại, bật `trust proxy` khi không có proxy → giả mạo `X-Forwarded-For` vượt rate limit.
- **Hướng xử lý**: Tài liệu vận hành rõ; kiểm tra khởi động (cảnh báo nếu production mà `TRUST_PROXY=false`).

### CODE-001 — Định dạng và kích thước file

- **Mức độ**: Medium. **Loại**: Chất lượng/bảo trì. **Độ chắc chắn**: Cao.
- **Bằng chứng**: 82/207 file `.ts/.tsx` có ≤3 dòng nhưng >150 byte (ví dụ `mail.controller.ts` 4.547 byte trên 3 dòng, dòng dài nhất 3.869 ký tự; `auth.routes.ts` 2.160 byte/2 dòng; `settings/page.tsx` 2.249 byte/1 dòng). 5 file > 500 dòng (`file-manager.tsx` 1100, `role-manager.tsx` 746, `jobs-manager.tsx` 740, `lms-markdown-editor.tsx` 583, `markdown-previewer.tsx` 541) vi phạm hard limit 500 của spec mục 40. Không có `.prettierrc`, không có `format` script.
- **Ảnh hưởng**: Không review được trên GitHub (spec nói README để mentor review); `git diff` một thay đổi nhỏ hiện cả dòng 3.8K ký tự; không đặt breakpoint theo dòng; ESLint không bắt được vì lint không kiểm tra format.
- **Hướng xử lý**: Thêm Prettier, chạy một lần toàn repo (một commit riêng "format only"), lint-staged + husky; quy tắc `max-lines` trong ESLint.

### CODE-002 — Permission catalog rải rác

- **Mức độ**: Medium. **Loại**: Trùng lặp/drift. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `seed.ts` 26 chuỗi; `permission.constants.ts` 6 hằng; `role-manager.tsx` `PERMISSION_GROUPS` liệt kê lại 26 chuỗi; `dashboard-shell.tsx` và `dashboard/page.tsx` chuỗi literal; `users.roles.read` được FE dùng nhưng backend không kiểm tra ở đâu (`GET /users/roles` dùng `users.read`).
- **Ảnh hưởng**: User có `users.roles.read` nhưng không có `users.read` thấy menu "Roles & Permissions" rồi nhận 403. Thêm quyền mới phải sửa 5 nơi.
- **Hướng xử lý**: `backend/src/modules/users/rbac/permission.registry.ts` là nguồn duy nhất; seed import từ đó; FE nhận danh sách từ API `GET /users/roles` (đã có `permissions`) để dựng nhóm.

### CODE-003 — Dead code

- **Mức độ**: Medium. **Loại**: Bảo trì. **Độ chắc chắn**: Cao (grep không thấy tham chiếu).
- **Danh sách**: (1) `file-manager.tsx` khối `activeTab === "upload"` (~180 dòng, dropzone + 3 nút cleanup) — không có `setActiveTab("upload")`; (2) `mail-manager.tsx` `TemplateGallery` + `void TemplateGallery;`; (3) `mail.controller.templates` không được route; (4) `mail/templates/auth-action.template.ts`, `security-alert.template.ts` chỉ được (3) dùng; (5) `app/(auth)/otp/page.tsx` (bị `next.config` redirect đè), `magic-link/page.tsx` chỉ redirect; (6) `core/events/event-bus.ts`, `events.ts`; (7) `core/database/transaction.ts`; (8) `files/schemas/import-markdown.schema.ts` (`importMarkdownSchema`), `upload.schema.ts` (`fileIdSchema`), `magic-link.schema.ts` (`magicVerifySchema`); (9) `MarkdownImporter<T>`; (10) `components/ui/button.tsx`, `components/shared/loading.tsx`; (11) `core/http/status-code.ts`, `users/user.types.ts` (`AuthzUser`); (12) `ScheduledJob.runOnServer`; (13) `lib/query/query-keys.ts` `jobKeys` bị `use-jobs.ts` định nghĩa lại; (14) job `files.import-markdown` xử lý xong không lưu gì (`markdownImportJob` chỉ `normalizeMarkdown`).
- **Hướng xử lý**: Xóa hoặc nối lại; bật `noUnusedLocals`, ESLint `import/no-unused-modules` hoặc `knip`.

### TEST-001 — Độ phủ kiểm thử

- **Mức độ**: Medium. Xem chi tiết ở `10-KIEM-THU-VA-DO-TIN-CAY.md`.
- **Bằng chứng tiêu biểu**: README tick "Storage failure handled" và "Cleanup tests" nhưng `files.test.ts` không có test storage lỗi; không có test nào gọi `/api/v1/jobs/*`, `/api/v1/files/*` qua HTTP; không có test interceptor FE.

### DB-002 — Index và constraint

- **Mức độ**: Medium. **Độ chắc chắn**: Cao.
- **Bằng chứng**: `File` chỉ có `@@index([ownerId, deletedAt, createdAt])`, không có index `objectId` dù `cleanupOrphans` chạy `tx.file.deleteMany({where:{objectId}})` và Prisma không tự tạo index FK trên Postgres; `ScheduledJob.queue` không unique (ARCH-002); `StoredObject.referenceCount` không có check ≥0; `Role.rank` không ràng buộc 1..100.
- **Hướng xử lý**: `@@index([objectId])`; `@unique` queue; check constraint qua migration SQL thủ công.

### DOC-001 — Tài liệu và checklist không phản ánh code

- **Mức độ**: Medium. **Độ chắc chắn**: Cao.
- **Bằng chứng**: README tick "`db:migrate` pass" (DB-001), "Cấu hình quyền hạn cho vai trò (PUT …)" (ERR-001), "Storage failure handled", "Cleanup tests" (TEST-001), "Gỡ trang đăng nhập OTP `/otp`" (file vẫn còn). `docs/architecture/jobs.md`: "Schedules live in the worker; the HTTP server has no business setInterval jobs" trong khi `server.ts` đăng ký scheduler. `docs/api/users.md`, `docs/api/files.md` không mô tả role CRUD, override, reset-password, reuse, orphans. `docs/deployment/backend.md` chỉ dẫn `db:migrate:deploy` sẽ thất bại thực tế.
- **Hướng xử lý**: Chỉ tick khi có test tự động tương ứng; docs sinh từ OpenAPI nếu có thể.

### Các vấn đề mức Low

**SEC-010 — User enumeration.** `registration.service.ts` trả 409 `EMAIL_ALREADY_EXISTS`; `password.strategy.ts` chỉ chạy argon2 khi có credential (timing khác biệt) và trả `EMAIL_NOT_VERIFIED` sau khi đã xác nhận mật khẩu đúng (oracle). Đề xuất: đăng ký luôn trả 202 "đã gửi email"; verify với hash giả khi không có user; kiểm tra verified trước khi so mật khẩu hoặc trả cùng thông báo.

**SEC-011 — Token trong localStorage và link markdown.** `auth-client.ts` lưu refresh token 30 ngày trong localStorage; bất kỳ XSS nào lấy được và refresh vô hạn (DB-004). `markdown-previewer.tsx` `href={linkMatch[2]}` không chặn `javascript:`; chỉ chủ file xem được nên là self-XSS. Đề xuất: refresh token trong cookie httpOnly (spec đã dự trù), sanitize scheme.

**SEC-012 — MIME theo client.** `file.service.ts` tin `file.mimetype`; cho phép `image/svg+xml`. Download dùng `attachment` nên trình duyệt không render inline; rủi ro thấp. Đề xuất: sniff magic bytes (`file-type`), cân nhắc bỏ SVG.

**SEC-013 — Request id và logging.** `requestContext` echo `x-request-id` từ client không validate (có thể chứa ký tự lạ vào log); logger không kèm requestId; console không JSON. Đề xuất: pino + validate UUID.

**SEC-014 — Mail admin.** `/mail/send` cho ADMIN gửi bất kỳ nội dung tới bất kỳ địa chỉ (relay nội bộ, có audit); `send-template kind=otp` tạo `LOGIN_OTP` thật cho email nhập. Đề xuất: tách preview khỏi issue OTP; giới hạn domain người nhận.

**ERR-012 — Race nhỏ.** `session.service.create` đếm rồi tạo (vượt 5 phiên khi login song song); `registration` findUnique rồi create (P2002 → 500). Đề xuất: bắt `P2002` → 409; transaction serializable hoặc chấp nhận.

**ERR-013 — Session UI.** `session-list.tsx` gắn "Current" cho `i===0` (sắp theo `lastActiveAt`); FE không gửi `fingerprint` nên mọi session cùng Device "anonymous"/"Browser". Đề xuất: so với `corestack.session` trong localStorage; hoặc bỏ Device nếu không dùng.

**ERR-014 — Form đổi mật khẩu.** `settings/page.tsx` `try{…}finally{…}` không `catch` → lỗi 401 (mật khẩu hiện tại sai) đi vào interceptor (ERR-002) → reload; `must-change-password-modal.tsx` kiểm tra 8 ký tự trong khi backend yêu cầu 12. Đề xuất: Zod schema chung cho policy, hiển thị lỗi.

**ERR-015 — Hydration.** `user-list.tsx`, `user-detail.tsx`, `role-manager.tsx`, `assign-role-modal.tsx` gọi `authClient.getUser()` trong render (server render null, client render có user). Đề xuất: `AuthProvider` context nạp trong `useEffect` (như `dashboard-shell` đã làm).

**ERR-016 — permissionIds.** `role.service.create/updatePermissions` không kiểm tra id tồn tại → FK violation → 500. Đề xuất: `permission.findMany({where:{id:{in}}})` so số lượng → 400.

**CODE-004 — Lint và dependency.** `google-oauth.controller.ts` `catch (error: any)` (typescript-eslint recommended coi `no-explicit-any` là lỗi; chưa chạy được để xác nhận) và `console.error` thay vì `logger`; backend có cả `package-lock.json` và `pnpm-lock.yaml`; frontend pin cứng mọi version trừ `react-icons`, `xlsx` dùng `^`.

**CODE-005 — Ngôn ngữ và text lỗi thời.** `sessions/page.tsx`, `session-list.tsx`, `settings/page.tsx` tiếng Anh; phần còn lại tiếng Việt; "Passwordless sign-in: Email OTP and magic links are enabled" không còn đúng sau khi gỡ trang OTP.

**CODE-006 — Vi phạm tầng.** Controller gọi Prisma: `auth.controller.ts` (`requestOtp`, `requestMagic`, `revoke`), `user.controller.ts` (`me`, `roles`), `mail.controller.ts` (toàn bộ). FE page gọi axios: `settings/page.tsx`, hai callback page.

**PERF-001 — Chi phí authorize.** Mỗi request: 1 query session (+user), 1 query user+roles+overrides, 1 query roles≤rank+permissions. Không cache. Chấp nhận được với vài trăm user; xem `09`.

**PERF-002 — Buffer.** Download đọc cả file vào RAM; import markdown đẩy toàn bộ nội dung (tới 20MB) vào payload job. Đề xuất: stream `res`; job nhận `fileId`.

**OPS-004 — Quan sát.** `/health` chỉ trả `{status:"ok"}` không kiểm tra DB/boss; không request logging; không metrics.

**DB-003 — Test xóa toàn bảng.** `files.test.ts` `prisma.file.deleteMany(); prisma.storedObject.deleteMany();`; `auth.test.ts` xóa toàn bộ sessions/devices/identities/credentials/userRoles. `vitest.config.ts` ép `DATABASE_URL` sang `corestack_test` nên an toàn, nhưng thói quen này nguy hiểm.

**DB-004 — Sliding session.** `session.service.refresh` gọi `rotate(id, hash, expiry())` với `expiry()` = now + 30 ngày → phiên gia hạn mãi. Cần quyết định absolute lifetime (ví dụ 90 ngày kể từ `createdAt`).
