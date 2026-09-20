# 04. Chất lượng code, kiểm thử và vận hành

## 1. Chất lượng code

### 1.1 Số liệu

Phạm vi đếm: file `.ts/.tsx` trong `backend/src` và `frontend/src`, bỏ `generated`. Số liệu đo bằng `wc` trên commit `d716b13`.

| Chỉ số | Giá trị | Ghi chú |
| --- | --- | --- |
| Tổng số file | 190 | |
| File bị nén (≤ 3 dòng nhưng > 200 ký tự) | 59 (31%) | VD `mail.controller.ts`: 3 dòng, 4.547 ký tự, dòng dài nhất 3.869 ký tự |
| File > 300 dòng (mục tiêu của đặc tả) | 8 | |
| File > 500 dòng (hard limit của đặc tả) | 5 | `file-manager.tsx` 1.100 · `role-manager.tsx` 746 · `jobs-manager.tsx` 740 · `lms-markdown-editor.tsx` 583 · `markdown-previewer.tsx` 541 |
| `globals.css` | 37 dòng, 18.845 ký tự | Dòng dài nhất 5.568 ký tự |
| Chỗ dùng `any` | 1 | `google-oauth.controller.ts:20` |
| `console.*` ngoài logger | 2 | `google-oauth.controller.ts:21`, `lms-markdown-editor.tsx:75` (`console.log`) |

### 1.2 Code bị nén (CODE-001)

Ví dụ thực tế, `backend/src/middleware/authorize.middleware.ts`, dòng 2 (nguyên văn):

```ts
export const authorize=(permission:string):RequestHandler=>async(_q,r,n)=>{try{if(!(await permissionService.resolve(r.locals.auth.userId)).has(permission))throw new ApiError(403,"FORBIDDEN","Permission denied");n()}catch(e){n(e)}};
```

Vì sao đây là vấn đề **thật** chứ không chỉ là thẩm mỹ:

1. **Không review được**: git diff theo dòng, nên sửa một ký tự thì cả file hiện là "thay đổi". Mentor và reviewer không thấy được thay đổi thực sự.
2. **Né luật kích thước**: đặc tả mục 40 giới hạn < 300 dòng/file. Nén code khiến số dòng luôn đạt, dù độ phức tạp thì không đổi.
3. **Che lỗi**: nhiều lỗi trong báo cáo nằm đúng ở các file nén (`auth.controller.ts`: SEC-003; `challenge.service.ts`; `mail.controller.ts`: SEC-014; `upload.service.ts`). Đọc một dòng 600 ký tự thì rất dễ bỏ sót.
4. **Không nhất quán**: file nén nằm cạnh file định dạng đẹp, có chú thích tiếng Việt (VD `role.service.ts`, `job.service.ts`). Codebase không có quy ước định dạng nào được áp dụng tự động. Repo không có Prettier, cũng không có pre-commit hook.

**Hướng xử lý**: thêm Prettier, format toàn bộ trong **một commit riêng** chỉ chứa định dạng (để các lần sửa lỗi sau có diff sạch), rồi thêm `lint-staged` và bước `prettier --check` trong CI.

### 1.3 Component quá lớn

`file-manager.tsx` (1.100 dòng) gộp cả thống kê, tìm kiếm, lọc, sắp xếp, upload, preview, dialog xóa, orphan stats và toast vào một component. Hệ quả: khó test, mỗi thay đổi state gây render lại toàn bộ, và nhiều người khó làm song song. Cách tách phù hợp quy mô: tách theo khối UI (`FileToolbar`, `FileTable`, `FilePreviewDialog`, `OrphanStatsCard`) và đưa logic lọc/sắp xếp ra hook `useFileFilters`. **Chưa cần** state management mới.

### 1.4 Phân tầng, trùng lặp, dead code

- **Phân tầng (CODE-006)**: đặc tả mục 40 cấm "Prisma query trong controller", nhưng `auth.controller.ts` (`requestOtp`, `requestMagic`, `revoke`), `user.controller.ts` (`me`) và `mail.controller.ts` (`list`, `send`, `sendTemplate`) đều gọi `prisma` trực tiếp. Ở frontend, các trang callback gọi `api.post` thẳng thay vì qua `features/*/api`.
- **Trùng lặp (CODE-002)**: danh sách permission nằm ở `prisma/seed.ts`, `permission.constants.ts` (chỉ có 6/26), `role-manager.tsx` (nhóm theo tiền tố) và `dashboard-shell.tsx`. Frontend kiểm tra `users.roles.read`, nhưng backend không có route nào dùng quyền này.
- **Kiểm tra quyền phía FE bị lặp 3 lần**: `checkPermission`, `checkAnyPermission` và `usePermissions` (`lib/auth/use-permission.ts`) viết lại cùng logic "là SUPER_ADMIN thì trả true". Ngoài ra, FE coi `rank >= 100` là toàn quyền, trong khi backend không có quy tắc này (SUPER_ADMIN có đủ quyền vì seed gán đủ, không phải vì rank).
- **Dead code (CODE-003)**: `TemplateGallery` (không được render), `mailController.templates` (không có route), `mail/templates/auth-action.template.ts` và `security-alert.template.ts` (chỉ `mailController.templates` dùng), `app/(auth)/otp/page.tsx` (bị redirect ở `next.config.ts`), `core/events/*`, `core/database/transaction.ts`, `components/ui/button.tsx`, `components/shared/loading.tsx`, interface `MarkdownImporter`, 4 schema (`importMarkdownSchema`, `fileIdSchema`, `blockUserSchema`, `magicVerifySchema`), và `core/http/status-code.ts` (khai báo `StatusCode` nhưng không nơi nào import; code vẫn viết số 400/401/404 trực tiếp).

### 1.5 Xử lý lỗi

| Mẫu | Ví dụ | Vấn đề |
| --- | --- | --- |
| Ném `Error` thường thay vì `ApiError` | `job.service.ts:71,129,153` ("Lịch trình không tồn tại"); `password-reset.service.ts:24` | Client nhận 500 thay vì 404 |
| Lỗi thư viện có mã 4xx bị đổi thành 500 | `error.middleware.ts` | ERR-019 |
| Nuốt lỗi im lặng | `deduplicate.service.ts:56` `catch {}`; `server.ts` bắt lỗi khởi động job rồi chạy tiếp | OPS-005; API vẫn chạy khi hàng đợi hỏng (ERR-008) |
| `catch` bỏ qua lỗi, trả thông điệp chung | `auth.controller.ts` (`verifyRegistration`, `verifyMagic`) | Chấp nhận được về bảo mật, nhưng không log nên khó điều tra |
| Có cấu trúc lỗi chung | `ApiError(status, code, message, details)` + `errorMiddleware` + `ZodError` → 400 | **Tốt**, chỉ cần dùng nhất quán |

### 1.6 Naming và tính nhất quán

- Tên file kebab-case, type PascalCase, hằng số UPPER_SNAKE, permission dạng `resource.action`: đúng quy ước của đặc tả.
- Thông điệp lỗi lẫn hai ngôn ngữ ngay trong backend ("Authentication required", "Invalid challenge" bên cạnh "Không tìm thấy vai trò"). UI cũng lẫn: `session-list.tsx` toàn tiếng Anh, `app/layout.tsx` đặt `lang="en"`, trong khi đa số màn hình là tiếng Việt (CODE-005).
- Tên biến một ký tự (`q`, `r`, `n`, `c`, `x`, `m`, `f`) dùng tràn lan ở các file nén, nhất là các controller.

### 1.7 Dấu hiệu code do AI sinh mà thiếu kiểm soát

Dự án được xây dựng cùng AI agent (`AGENTS.md`, `CODEX_PROJECT_SETUP.md`). Dùng AI không có gì sai. Các dấu hiệu dưới đây cho thấy **khâu kiểm soát đầu ra** còn yếu:

1. **Hai phong cách trong cùng codebase**: file nén một dòng cạnh file định dạng đẹp có chú thích tiếng Việt, đúng kiểu nhiều phiên sinh code khác nhau.
2. **Checklist tick nhanh hơn thực tế**: README tick `db:migrate` pass (DB-001), `pnpm lint` pass (nhiều khả năng fail, CODE-004), PUT permission cho role (ERR-001), "Storage failure handled" (OPS-005), "Markdown import/export hoạt động" (ERR-022). Sau review v1, các mục này vẫn chưa được sửa (DOC-001).
3. **Tính năng "có vỏ, không ruột"**: `MarkdownImporter` không có implementation; job import chỉ normalize rồi bỏ kết quả; `runOnServer` lưu nhưng không dùng; 20/26 permission không được kiểm tra.
4. **Test mô tả lại code thay vì yêu cầu**: test Google linking khẳng định hành vi dễ bị khai thác (SEC-017); test jobs mock `prisma` và `boss` sâu nên không phát hiện được handler đọc sai payload (ERR-004).
5. **Đổi hướng nhưng không dọn**: gỡ UI OTP/magic link nhưng giữ trang `otp/page.tsx`, redirect trong `next.config.ts` và toàn bộ endpoint backend (ARCH-004).

## 2. Kiểm thử

### 2.1 Hiện trạng

| File | Loại | DB thật | Số test | Bao phủ |
| --- | --- | --- | --- | --- |
| `unit/rbac.test.ts` | Unit, mock Prisma | Không | 15 | Policy rank, kế thừa, override, CRUD role |
| `unit/temporary-password.test.ts` | Unit, mock | Không | 5 | Mật khẩu tạm 24h, xóa cờ khi đổi mật khẩu |
| `unit/scheduled-jobs.test.ts` | Unit, mock | Không | 6 | Handler maintenance, `triggerNow` |
| `unit/file-service.test.ts` | Unit, mock | Không | 5 | MIME, size, reuse |
| `unit/r2-storage.test.ts` | Unit, mock S3 client | Không | 4 | Endpoint, put/delete, 404 |
| 5 file unit nhỏ khác | Unit | Không | 11 | Hash, OTP, template, schema mail, markdown, bootstrap |
| `integration/auth.test.ts` | Integration + supertest | Có | 8 | Login, sai mật khẩu, blocked, session limit, refresh sai, logout, thu hồi |
| `integration/challenges.test.ts` | Integration | Có | 6 | OTP/magic hết hạn, dùng lại |
| `integration/registration.test.ts` | Integration | Có | 3 | Đăng ký, xác minh một lần, hết hạn |
| `integration/password-reset.test.ts` | Integration | Có | 2 | Không lộ email, đổi mật khẩu một lần |
| `integration/files.test.ts` | Integration | Có | 3 | Dedup, không xóa object còn tham chiếu, retention |
| `integration/google-identity-sync.test.ts` | Integration | Có | 3 | Tạo user, subject ổn định, liên kết tài khoản |
| `integration/health.test.ts` | Integration | Không | 1 | `/health` |
| FE `markdown-converter.test.ts`, `client.test.ts` | Unit | — | 6 | Chuyển đổi bảng; khởi tạo axios |

Tổng cộng **72 test backend** (46 unit, 26 integration) và **6 test frontend**. Điểm tốt: có test integration chạy trên PostgreSQL thật (`vitest.config.ts` ép dùng DB `corestack_test`, chạy tuần tự), và các test auth kiểm tra đúng những ca âm tính quan trọng (sai mật khẩu, token đã thu hồi, challenge dùng lại).

### 2.2 Luồng quan trọng chưa được test

| Luồng | Vì sao quan trọng | Lỗi lọt qua |
| --- | --- | --- |
| **Phân quyền theo route** (user thường gọi route quản trị) | Là rủi ro số 1 của hệ thống | SEC-001, SEC-002, ARCH-003 |
| Jobs API qua HTTP | Chưa có test route nào | SEC-001, ERR-010 |
| Files API qua HTTP (upload thật qua multer) | Test hiện gọi service trực tiếp | SEC-004, ERR-019 |
| Handler pg-boss với đúng dạng dữ liệu `Job[]` | Test gọi hàm maintenance trực tiếp, bỏ qua `job.registry.ts` | ERR-004 |
| Liên kết Google vào tài khoản **chưa xác minh** | Test hiện có khẳng định sai hướng | SEC-017 |
| Refresh thành công + rotation + hai refresh đồng thời | Chỉ có test refresh sai | ERR-003 |
| Interceptor frontend với 401 từ route công khai | FE gần như không có test | ERR-002 |
| CORS preflight cho mọi method đang dùng | Chỉ lộ ra ở trình duyệt | ERR-001 |
| Quên mật khẩu sau khi mật khẩu tạm hết hạn | Hai luồng song song không nhất quán | ERR-017 |
| Migration khớp schema | Không có CI | DB-001 |

### 2.3 Đề xuất test tối thiểu (theo rủi ro, không theo % coverage)

1. **Ma trận phân quyền** (supertest): tạo 3 user (không role, MEMBER, ADMIN), gọi mọi route ghi của `/jobs`, `/files/orphans`, `/users/roles` và assert 403 cho người không đủ quyền. Một file test này đã bắt được SEC-001, SEC-002 và ARCH-003.
2. **Test "mọi route ghi đều có authorize"**: duyệt router stack, liệt kê route `POST/PUT/PATCH/DELETE` không có middleware `authorize` (trừ whitelist auth công khai).
3. **Test liên kết an toàn**: tạo user chưa xác minh có mật khẩu, đăng nhập Google, rồi assert đăng nhập bằng mật khẩu cũ thất bại.
4. **Test interceptor** (Vitest + axios-mock-adapter hoặc mock adapter tự viết): 401 từ `/auth/login` không redirect; hai 401 song song chỉ gọi refresh một lần.
5. **Test CORS**: `OPTIONS` với `Access-Control-Request-Method: PUT` phải trả method này trong header.

### 2.4 Giới hạn của lần review này

Máy review không có `node_modules`, và nguyên tắc review không cho cài package, nên **chưa chạy** `pnpm lint`, `typecheck`, `test`, `build`. Mọi kết luận về kết quả của các lệnh này là suy luận từ code và được ghi "Chưa đủ DL".

## 3. Build, triển khai, CI/CD

| Hạng mục | Hiện trạng | Vấn đề |
| --- | --- | --- |
| CI | **Không có** (không có `.github/` hay pipeline nào) | Không gì chặn được lỗi quay lại; mọi "pass" trong README là chạy tay |
| Backend Dockerfile | Multi-stage, `pnpm install --frozen-lockfile`, `prisma generate`, build, `prune --prod` | `prisma` CLI bị prune nên không migrate được từ image; không có bước migrate (OPS-002) |
| Frontend Dockerfile | Multi-stage, `next build`, chạy `pnpm start` | Thiếu `ARG NEXT_PUBLIC_API_URL` (giá trị bị inline lúc build); `.dockerignore` loại `.env*`; không copy `next.config.ts` (OPS-001); `pnpm start` cần corepack tải pnpm khi container khởi động |
| docker-compose | Chỉ có PostgreSQL + volume | Đủ cho dev; không có service API/worker/volume storage |
| Migration | Chạy tay | DB-001 |
| Lockfile | Backend có cả `package-lock.json` và `pnpm-lock.yaml` | CODE-004 |
| Tách tiến trình | Đặc tả: `server.ts` chỉ HTTP, `worker.ts` chạy job | `server.ts:14-15` cũng khởi động worker và scheduler (ARCH-002) |

**Đề xuất CI tối thiểu** (một workflow, không cần công cụ mới): job backend có service `postgres:16`, chạy `pnpm install` → `prisma migrate deploy` → `prisma migrate diff --exit-code` → `lint` → `typecheck` → `test`; job frontend chạy `lint` → `typecheck` → `test` → `build`.

## 4. Logging và monitoring

| Có | Thiếu |
| --- | --- |
| Logger bọc `console` và redact key chứa `password/token/otp/secret` (`core/logger/logger.ts`) | Không có request log (method, path, status, thời gian) |
| Request ID được gắn vào response header | Log không kèm requestId; `x-request-id` từ client không được validate (SEC-013) |
| Audit log cho login, logout, đổi mật khẩu, role, file | Không audit thao tác jobs, cleanup orphan, sửa template mail |
| `/health` trả `ok` | Không kiểm tra DB (OPS-004) |
| `ScheduledJob.lastRunAt/lastStatus` | Chỉ cập nhật khi **chạy tay** (`job.service.ts:76,81`), và "SUCCESS" nghĩa là *đã đưa vào hàng đợi*, không phải *đã chạy xong*. Lịch tự động không ghi gì, nên UI Jobs có thể gây hiểu nhầm |

## 5. Rủi ro khi lên production

| Kiểm tra | Trạng thái | Liên quan |
| --- | --- | --- |
| DB mới dựng từ migration chạy được | Không | DB-001 |
| Phân quyền server cho mọi chức năng quản trị | Không | SEC-001, SEC-002, ARCH-003 |
| Link trong email không phụ thuộc request | Không | SEC-003 |
| Giới hạn upload trước khi đọc vào RAM | Không | SEC-004 |
| Liên kết tài khoản an toàn | Không | SEC-017 |
| Secret bắt buộc ở production | Không | SEC-006 |
| Chạy được nhiều instance API | Không | ARCH-001 |
| Worker tách khỏi API | Không | ARCH-002 |
| File upload bền vững qua các lần deploy | Không (local) / Chưa kiểm chứng (R2, chưa có credentials) | OPS-002 |
| Image frontend trỏ đúng API | Không | OPS-001 |
| Rate limit đúng IP sau proxy | Phụ thuộc cấu hình | OPS-003 |
| Có CI chặn lỗi | Không | TEST-001 |
| Backup/restore DB có quy trình | Không thấy tài liệu | — |
| HTTPS, secure header | Helmet có; HTTPS do hạ tầng | — |

**Kết luận**: dự án **chưa sẵn sàng production**. Phải xử lý xong nhóm "Làm ngay" và "Trước khi deploy" trong `05-LO-TRINH-CAI-THIEN.md`. Phần lớn là các sửa đổi nhỏ và cục bộ, không cần thay đổi kiến trúc.
