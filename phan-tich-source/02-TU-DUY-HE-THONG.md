# 02. Tư duy hệ thống

Mục tiêu của báo cáo này là nhìn CoreStack như **một hệ thống hoàn chỉnh** thay vì từng file: cái gì phụ thuộc cái gì, dữ liệu đi qua đâu, lỗi lan truyền như thế nào, và chỗ nào là điểm nghẽn.

## 1. Các thành phần của hệ thống

```mermaid
flowchart LR
  subgraph Client["Trình duyệt"]
    FE["Next.js 15 App Router<br/>features/*, TanStack Query, Axios<br/>token trong localStorage"]
  end

  subgraph API["backend: server.ts (1 process)"]
    EX["Express 5<br/>helmet, cors, rate-limit"]
    MW["authenticate -> authorize -> validate"]
    MOD["modules: auth, oauth, users, files, mail, jobs, audit"]
    BOSS_IN["pg-boss in-process<br/>work() + schedule()"]
  end

  subgraph WORKER["backend: worker.ts (tuỳ chọn)"]
    BOSS_W["pg-boss work() + schedule()"]
  end

  PG[("PostgreSQL 16<br/>bảng nghiệp vụ (Prisma)<br/>+ schema pgboss (queue, cron)")]
  ST[("Storage<br/>local ./storage hoặc Cloudflare R2")]
  SMTP["SMTP server"]
  GOOGLE["Google OAuth2 / JWKS"]

  FE -->|"REST /api/v1, Bearer JWT"| EX --> MW --> MOD
  MOD -->|Prisma| PG
  MOD -->|"jobProducer.send"| PG
  BOSS_IN -->|"poll job"| PG
  BOSS_W -->|"poll job"| PG
  BOSS_IN --> SMTP
  BOSS_W --> SMTP
  MOD -->|"put/get/delete"| ST
  MOD -->|"token exchange, JWKS"| GOOGLE
  FE -->|"redirect GET /auth/google"| EX
```

Nhận xét quan trọng về hình trên:

- **PostgreSQL là trái tim và cũng là điểm lỗi đơn** (single point of failure): nó vừa là database nghiệp vụ, vừa là hàng đợi (pg-boss), vừa là nơi lưu lịch cron. Mất Postgres thì auth, jobs, mail, cleanup đều dừng. Ở quy mô hiện tại, đây là lựa chọn hợp lý (spec yêu cầu không dùng Redis), miễn là hiểu rõ hệ quả khi vận hành.
- **API server và worker đều chạy pg-boss** (`server.ts` gọi `jobService.start()`, `registerJobs()`, `registerSchedules()`). Nghĩa là API server cũng là consumer của mọi hàng đợi. Điều này trái với đặc tả ("`server.ts` chỉ HTTP API") và trái với `docs/architecture/jobs.md`. Xem ARCH-002.
- **Ba loại trạng thái nằm trong RAM của process API**: `states` Map của Google OAuth, `handoffs` Map của handoff code, và bộ đếm của `express-rate-limit`. Hệ quả: chỉ chạy đúng với **một** instance API; restart là mất trạng thái. `docs/architecture/auth.md` có thừa nhận điều này cho handoff, nhưng không nói về `states` và rate limit.

## 2. Quan hệ và phụ thuộc giữa các module backend

```mermaid
flowchart TD
  auth --> audit
  auth --> jobs["jobs (producer)"]
  auth --> users_rbac["users/rbac (permissionService)"]
  auth --> users_pw["users/password (policy)"]
  auth --> oauth
  oauth --> auth
  users --> auth_sessions["auth/sessions (sessionRepository)"]
  users --> audit
  users --> jobs
  files --> audit
  files --> jobs
  files --> core_storage["core/storage"]
  jobs --> files
  jobs --> mail
  jobs --> users_maint["users (maintenance job)"]
  mail --> auth_challenges["auth/challenges (issue OTP)"]
  middleware_authorize["middleware/authorize"] --> users_rbac
  middleware_authenticate["middleware/authenticate"] --> auth_sessions
```

Có hai **vòng phụ thuộc** đáng chú ý:

1. `auth` ↔ `users`: `auth.service` cần `permissionService` (users), còn `users/password.service` và `users/user.service` cần `sessionRepository` (auth). ESM cho phép, nhưng về mặt thiết kế, hai module này không còn ranh giới rõ; muốn tách `auth` sang dự án khác (như `docs/architecture/oauth-module.md` mô tả) sẽ kéo theo `users`.
2. `jobs` ↔ `files`/`mail`: `jobs` vừa là hạ tầng (producer) vừa import handler nghiệp vụ. Đây là kiểu phụ thuộc chấp nhận được nếu tách rõ `jobs/core` và `jobs/handlers`, nhưng hiện tại `job.service` (hạ tầng) và `job.controller` (API quản trị) nằm chung.

## 3. Luồng nghiệp vụ quan trọng

### 3.1 Đăng nhập bằng mật khẩu và làm mới token

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as API
  participant DB as PostgreSQL

  B->>A: POST /auth/login {email, password}
  A->>A: authRateLimit (10 lần/15 phút/IP)
  A->>DB: user + passwordCredential
  A->>A: argon2 verify, kiểm tra temporaryExpiresAt, emailVerifiedAt
  A->>DB: identityService.resolve, bootstrap SUPER_ADMIN (nếu đủ điều kiện)
  A->>DB: đếm session active (>= 5 -> SESSION_LIMIT_REACHED)
  A->>DB: upsert Device (fingerprint "anonymous" vì FE không gửi)
  A->>DB: insert Session (refreshTokenHash)
  A->>DB: insert AuditLog LOGIN_SUCCESS
  A-->>B: accessToken (15 phút), refreshToken, session, user (roles, permissions)
  B->>B: lưu cả 4 giá trị vào localStorage

  Note over B,A: 15 phút sau, nhiều query song song trên dashboard
  B->>A: GET /users/me (401 hết hạn)
  B->>A: GET /files (401)
  B->>A: POST /auth/refresh {sessionId, refreshToken} (lần 1)
  B->>A: POST /auth/refresh {sessionId, refreshToken} (lần 2, cùng token cũ)
  A->>DB: lần 1: rotate -> hash mới
  A-->>B: lần 1: OK
  A-->>B: lần 2: 401 INVALID_REFRESH_TOKEN (hash đã đổi)
  B->>B: interceptor: clear() + location.assign("/login")
```

Điểm cần rút ra: backend làm rotation đúng, nhưng frontend **không có hàng đợi refresh** (ERR-003), nên một hành vi đúng ở backend lại gây đăng xuất ngoài ý muốn ở frontend. Đây là ví dụ kinh điển của việc lỗi chỉ lộ ra khi nhìn toàn hệ thống.

### 3.2 Google OAuth và handoff

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as API
  participant G as Google

  B->>A: GET /api/v1/auth/google
  A->>A: tạo state + PKCE verifier, lưu vào Map states (RAM, hết hạn 10 phút, KHÔNG dọn)
  A-->>B: 302 accounts.google.com (state, code_challenge)
  B->>G: đăng nhập
  G-->>B: 302 /api/v1/auth/google/callback?code&state
  B->>A: GET callback
  A->>A: lấy + xoá state khỏi Map
  A->>G: POST /token (code, code_verifier)
  A->>G: verify id_token bằng JWKS (issuer, audience, email_verified)
  A->>A: authService.complete(...)
  A->>A: oauthHandoffService.issue() -> code 60 giây trong Map handoffs
  A-->>B: 302 FRONTEND/auth/google/callback?code=...
  B->>A: POST /auth/google/exchange {code}
  A-->>B: tokens + user
```

Luồng này đúng về bảo mật. Vấn đề nằm ở **vòng đời của `states`**: mỗi lần gọi `GET /auth/google` thêm một phần tử, chỉ bị xoá khi callback về. Ai gọi endpoint này liên tục (không có rate limit) sẽ làm Map lớn vô hạn (SEC-005).

### 3.3 Upload tệp có khử trùng lặp

```mermaid
flowchart TD
  U["multer memoryStorage<br/>(không giới hạn kích thước)"] --> S["fileService.upload<br/>kiểm tra size <= 20MB, MIME"]
  S --> H["sha256(buffer)"]
  H --> Q{"StoredObject<br/>theo hash?"}
  Q -- có --> TX
  Q -- không --> PUT["storage.put(key ngẫu nhiên)"]
  PUT --> CR{"create StoredObject"}
  CR -- unique conflict --> DEL["storage.delete(key)<br/>findUniqueOrThrow(hash)"] --> TX
  CR -- ok --> TX["transaction:<br/>referenceCount +1, pendingDeleteAt=null<br/>create File(ownerId, name)"]
  TX --> R["201 File + object"]
```

Luồng này được thiết kế tốt (xử lý race hai upload cùng hash). Điểm yếu là **thứ tự kiểm tra**: kích thước chỉ được kiểm tra sau khi multer đã đọc toàn bộ tệp vào RAM (SEC-004).

### 3.4 Xoá tệp và dọn orphan

```
DELETE /files/:id
  -> softDelete (transaction): File.deletedAt = now; StoredObject.referenceCount -1; pendingDeleteAt = now
  -> AuditLog FILE_DELETED

Job files.cleanup-orphans (cron 0 2 * * *) hoặc POST /files/orphans/cleanup {force}
  -> tìm StoredObject referenceCount = 0 và (pendingDeleteAt <= cutoff hoặc createdAt <= cutoff)
  -> với mỗi object: storage.delete(key)   <-- xoá vật lý TRƯỚC
                     transaction: kiểm tra lại referenceCount === 0, xoá File đã soft-delete, xoá StoredObject
```

Có một **khoảng trống giữa `storage.delete` và transaction**: nếu trong khoảng đó một upload cùng hash hoặc một lệnh "Dùng lại" tăng `referenceCount`, transaction sẽ bỏ qua (đúng), nhưng tệp vật lý đã mất. Kết quả: bản ghi `StoredObject` tồn tại, download lỗi 500 (ERR-005). Quy tắc chung: **thay đổi trạng thái trong DB trước, xoá tài nguyên ngoài sau**, hoặc đánh dấu "đang xoá" rồi mới xoá.

### 3.5 Đăng ký tài khoản và xác minh email

```
POST /auth/register -> tạo User (chưa verify) + PasswordCredential -> challenge EMAIL_VERIFY (20 phút)
                    -> job mail.send (link = req.protocol://req.host/api/v1/auth/register/verify?...)
GET  /auth/register/verify -> consume challenge -> emailVerifiedAt = now -> redirect FE
POST /auth/login -> nếu emailVerifiedAt null -> 403 EMAIL_NOT_VERIFIED
```

Ba mắt xích yếu nối nhau thành một "ngõ cụt" (ERR-006): không có API gửi lại link; đăng ký lại bị 409; đăng nhập OTP cho user đã tồn tại không set `emailVerifiedAt`. Sau 20 phút, nếu người dùng chưa bấm link (hoặc SMTP chưa cấu hình nên mail không đi), tài khoản đó bị kẹt vĩnh viễn trừ khi admin can thiệp trực tiếp DB.

### 3.6 Lịch công việc động

```
seed -> 5 bản ghi ScheduledJob
server.ts / worker.ts khởi động -> registerJobs (work() cho 9 queue) -> syncSchedulesFromDb -> boss.schedule(queue, cron, payload)
API /jobs/schedules (chỉ authenticate) -> create/update/delete -> boss.schedule/unschedule theo queue
POST /jobs/schedules/:id/run -> boss.send(queue, payload)
```

Hai điểm nghẽn tư duy ở đây:

1. pg-boss định danh lịch theo **tên queue**, còn bảng `ScheduledJob` cho phép nhiều bản ghi cùng queue. Hai lịch cùng queue sẽ ghi đè nhau và `unschedule` của bản ghi này xoá cron của bản ghi kia (ARCH-002).
2. Vì API jobs không kiểm tra quyền và cho phép nhập `queue` tự do, bất kỳ ai đăng nhập được cũng có thể đẩy payload vào `mail.send` (gửi email từ hệ thống) hoặc `users.update-inactive` (SEC-001).

## 4. Luồng dữ liệu end-to-end: một request được bảo vệ

```mermaid
sequenceDiagram
  participant B as Browser
  participant I as Axios interceptor
  participant A as Express
  participant DB as PostgreSQL

  B->>I: usersApi.list()
  I->>A: GET /api/v1/users (Authorization: Bearer)
  A->>A: helmet, cors, json(1mb), requestContext (x-request-id)
  A->>A: authenticate: jwtVerify(HS256)
  A->>DB: session.findFirst(id, revokedAt null, expiresAt > now) include user
  A->>A: authorize("users.read")
  A->>DB: user.findUniqueOrThrow include roles.role, permissionOverrides.permission
  A->>DB: role.findMany(rank <= maxRank) include permissions.permission
  A->>A: Set permissions, kiểm tra
  A->>DB: user.findMany(skip, take) + user.count
  A-->>I: {success, data:{items,total,page,limit}, meta}
  I-->>B: r.data.data.items (bỏ total/page -> FE không phân trang, ERR-009)
```

Mỗi request được bảo vệ tốn **tối thiểu 3 query** trước khi chạm vào nghiệp vụ. Ở quy mô hiện tại điều này chấp nhận được; xem `09-HIEU-NANG-VA-KHA-NANG-MO-RONG.md`.

## 5. Luồng lỗi

- Backend: mọi lỗi đi qua `errorMiddleware`; `ZodError` → 400 `VALIDATION_ERROR`; `ApiError` → status/code tương ứng; lỗi khác → 500 và log stack. Đây là thiết kế đúng. Điểm chưa nhất quán: một số nơi `throw new Error(...)` thay vì `ApiError` (job.service `triggerNow`, `updateSchedule`, `deleteSchedule`; password-reset `confirm`) nên client nhận 500 thay vì 404/400.
- Job handler: `cleanupOrphans` nuốt mọi lỗi (`catch {}`), chỉ ghi chú "retry lần sau". Không log, không metric → vận hành không biết cleanup đang thất bại.
- Frontend: lỗi API được lấy qua `apiError()` hoặc tự bóc `err.response.data.error.message` lặp lại ở nhiều chỗ; nhiều nơi dùng `alert()`. Interceptor xử lý 401 quá "hung hăng" (ERR-002).

## 6. Điểm nghẽn, điểm lỗi đơn và ảnh hưởng dây chuyền

| Điểm | Loại | Ảnh hưởng dây chuyền |
| --- | --- | --- |
| PostgreSQL | SPOF | Mất DB: auth 500 (mọi request cần session lookup), jobs dừng, mail dừng, cleanup dừng |
| Process API duy nhất | Trạng thái in-memory | Restart giữa chừng OAuth → "Invalid OAuth state"; scale 2 instance → OAuth/handoff hỏng ngẫu nhiên; rate limit tính riêng từng instance |
| SMTP | Phụ thuộc ngoài | SMTP chết → job `mail.send` thất bại theo retry mặc định của pg-boss; đăng ký/OTP/magic link không hoàn tất; không có cảnh báo |
| Storage local trong container | Dữ liệu ephemeral | Không có volume trong compose/Dockerfile → redeploy mất tệp (OPS-002) |
| `jobService.started` cache promise bị reject | Lỗi khởi động | Nếu `boss.start()` fail lúc boot (DB chưa sẵn sàng), mọi `send()` sau đó fail cho đến khi restart (ERR-008) |
| Router `files`/`jobs` không authorize | Bảo mật | Một tài khoản MEMBER (hoặc user mới, rank 0) có thể gửi mail, xoá orphan, khoá user hàng loạt qua job |
| Migration thiếu | Triển khai | DB dựng từ migration → login lỗi cột `mustChangePassword`, seed lỗi bảng `ScheduledJob` (DB-001) |

## 7. Khả năng mở rộng, bảo trì, kiểm thử, triển khai, vận hành

| Tiêu chí | Đánh giá | Căn cứ |
| --- | --- | --- |
| Mở rộng tính năng | Trung bình | Module hoá tốt ở backend; nhưng permission catalog nằm rải rác ở 4 nơi (CODE-002) nên thêm quyền mới phải sửa nhiều chỗ |
| Mở rộng quy mô | Thấp | Trạng thái in-memory; scheduler in-process; không cache |
| Bảo trì | Thấp–Trung bình | 82/207 file viết 1 dòng; component FE 700–1100 dòng; tài liệu mâu thuẫn |
| Kiểm thử | Trung bình | Có 17 file test backend, nhưng không test authorize theo route, không test jobs/files API; FE 2 test |
| Triển khai | Thấp | Migration thiếu; Dockerfile FE thiếu ARG/config; không CI |
| Vận hành | Thấp | Log console, không structured; không health check DB; không metrics; không backup script |

## 8. Mức độ nhất quán giữa yêu cầu, thiết kế và code

| Yêu cầu (CODEX_PROJECT_SETUP) | Code thực tế | Trạng thái |
| --- | --- | --- |
| `server.ts` chỉ HTTP; `worker.ts` chạy jobs | `server.ts` khởi động cả worker+scheduler | Lệch |
| Storage `s3.storage.ts` hỗ trợ custom endpoint (MinIO) | Chỉ `r2.storage.ts` với endpoint Cloudflare cố định | Lệch (có tài liệu hoá) |
| Authorization = Permission + Rank + Policy ở mọi route | Chỉ users, mail có `authorize` | Lệch nghiêm trọng |
| Không hard-code role check | FE dùng `rank >= 100` / `name === "SUPER_ADMIN"` (chấp nhận được ở FE), backend dùng `role.name === "SUPER_ADMIN"` và `targetRank === 100` trong `user.service` | Một phần |
| < 300 dòng/file, hard limit 500 | 5 file FE > 500 dòng, lớn nhất 1100 | Lệch |
| Controller không gọi Prisma | `auth.controller`, `user.controller`, `mail.controller` gọi Prisma | Lệch |
| Docs mô tả kiến trúc | `docs/` 1–3 đoạn mỗi file, `jobs.md` mô tả sai | Lệch |
| README chỉ tick khi đã verify | Nhiều mục tick nhưng code cho thấy chưa đúng | Lệch |
