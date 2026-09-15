# CODEX PROJECT SETUP — FRONTEND / BACKEND BASE

> Specification chính để Codex tạo lại project từ đầu theo cấu trúc đơn giản, dễ review và dễ deploy độc lập.
>
> **Không dùng monorepo workspace** (`apps/`, `packages/`, `pnpm-workspace.yaml`).

---

# 1. Mục tiêu

Tạo Fullstack Base Project với:

- Frontend: Next.js + TypeScript + Tailwind CSS + React Hook Form + Zod + TanStack Query + Axios.
- Backend: Node.js + Express + TypeScript ESM + PostgreSQL + Prisma + Zod.
- Backend modules: Auth, Users/RBAC, Mail, Files, Jobs, Audit.
- Frontend và Backend có thể build/deploy độc lập.

Cấu trúc root bắt buộc:

```text
project/
├── frontend/
├── backend/
├── docs/
├── docker-compose.yml
├── .gitignore
├── README.md (bao gồm checklist tiến độ)
└── CODEX_PROJECT_SETUP.md
```

Không tạo ở root:

```text
apps/
packages/
pnpm-workspace.yaml
prisma/
node_modules/ workspace
root package.json để điều phối workspace
```

---

# 2. Package manager

Dùng `pnpm`, nhưng hai app độc lập.

Frontend:

```bash
cd frontend
pnpm install
```

Backend:

```bash
cd backend
pnpm install
```

Mỗi app phải có `package.json` và lockfile riêng.

---

# 3. Frontend structure

Tạo:

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── otp/page.tsx
│   │   │   └── magic-link/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── users/page.tsx
│   │   │   ├── files/page.tsx
│   │   │   ├── sessions/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── layout.tsx
│   │   └── providers.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── users/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   ├── files/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schemas/
│   │   │   └── types/
│   │   └── sessions/
│   │       ├── api/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── types/
│   ├── components/
│   │   ├── ui/
│   │   └── shared/
│   ├── lib/
│   │   ├── axios/
│   │   │   ├── client.ts
│   │   │   └── interceptors.ts
│   │   ├── query/
│   │   │   ├── query-client.ts
│   │   │   └── query-keys.ts
│   │   └── auth/
│   │       └── auth-client.ts
│   ├── hooks/
│   ├── constants/
│   └── types/
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
└── README.md
```

Frontend rules:

- `app/` chỉ ưu tiên routing, layout và page composition.
- Business UI nằm trong `features/`.
- Không gọi Axios rải rác trực tiếp trong page/component.
- Flow chuẩn: `Component -> feature hook -> TanStack Query -> feature API -> Axios`.
- Dùng React Hook Form + Zod cho form.
- Dùng query key factory, không hard-code query keys khắp source.

---

# 4. Backend structure

Tạo:

```text
backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── worker.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── app.config.ts
│   │   ├── auth.config.ts
│   │   ├── mail.config.ts
│   │   ├── storage.config.ts
│   │   └── jobs.config.ts
│   ├── core/
│   │   ├── database/
│   │   │   ├── prisma.ts
│   │   │   └── transaction.ts
│   │   ├── http/
│   │   │   ├── api-error.ts
│   │   │   ├── api-response.ts
│   │   │   └── status-code.ts
│   │   ├── security/
│   │   │   ├── password.ts
│   │   │   ├── token.ts
│   │   │   ├── random.ts
│   │   │   └── hashing.ts
│   │   ├── storage/
│   │   │   ├── storage.interface.ts
│   │   │   ├── local.storage.ts
│   │   │   └── s3.storage.ts
│   │   ├── logger/
│   │   │   └── logger.ts
│   │   └── events/
│   │       ├── event-bus.ts
│   │       └── events.ts
│   ├── middleware/
│   │   ├── authenticate.middleware.ts
│   │   ├── authorize.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── request-context.middleware.ts
│   │   └── error.middleware.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── mail/
│   │   ├── files/
│   │   ├── jobs/
│   │   └── audit/
│   └── routes/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   └── integration/
├── storage/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```

Prisma phải nằm trong `backend/prisma/`, không đặt ở root.

Backend dependency direction:

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

Không cho `Controller -> Prisma` hay `Route -> Prisma`.

---

# 5. Docs structure

Tạo:

```text
docs/
├── architecture/
│   ├── overview.md
│   ├── auth.md
│   ├── rbac.md
│   ├── files.md
│   └── jobs.md
├── api/
│   ├── auth.md
│   ├── users.md
│   └── files.md
├── database/
│   ├── schema.md
│   └── relationships.md
└── deployment/
    ├── frontend.md
    ├── backend.md
    └── docker.md
```

---

# 6. PostgreSQL + Docker

Root `docker-compose.yml` chỉ bắt buộc PostgreSQL ở base version.

Yêu cầu:

- persistent volume;
- healthcheck;
- database/user/password từ environment hoặc defaults cho local dev;
- không cần Redis;
- có thể thêm MinIO sau.

---

# 7. Backend dependencies

Cài tối thiểu:

```text
express
zod
@prisma/client
prisma
argon2
jose hoặc jsonwebtoken
helmet
cors
express-rate-limit
pg-boss
nodemailer
multer hoặc upload middleware phù hợp
ua-parser-js nếu cần
vitest
supertest
```

Backend phải là ESM.

---

# 8. Frontend dependencies

Cài tối thiểu:

```text
next
react
react-dom
typescript
tailwindcss
react-hook-form
@hookform/resolvers
zod
@tanstack/react-query
axios
```

---

# 9. Auth module

Tạo:

```text
backend/src/modules/auth/
├── auth.routes.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.types.ts
├── strategies/
│   ├── password.strategy.ts
│   ├── google.strategy.ts
│   ├── otp.strategy.ts
│   └── magic-link.strategy.ts
├── identities/
│   ├── identity.service.ts
│   └── identity.repository.ts
├── challenges/
│   ├── challenge.service.ts
│   └── challenge.repository.ts
├── sessions/
│   ├── session.service.ts
│   ├── session.repository.ts
│   └── device.service.ts
└── schemas/
    ├── login.schema.ts
    ├── otp.schema.ts
    ├── magic-link.schema.ts
    └── refresh-token.schema.ts
```

Mọi phương thức login phải đi chung pipeline:

```text
Password / Google / OTP / Magic Link
                ↓
         Resolve Identity
                ↓
             User
                ↓
       Validate User Status
                ↓
       Check Session Limit
                ↓
      Resolve/Create Device
                ↓
          Create Session
                ↓
      Access + Refresh Token
                ↓
             Audit
```

Không tạo User riêng cho từng phương thức login.

---

# 10. Auth Identity

Provider enum:

```text
PASSWORD
GOOGLE
EMAIL_OTP
MAGIC_LINK
```

Một User có thể có nhiều AuthIdentity.

Không auto-link Google account chỉ dựa vào email chưa được Google xác minh.

---

# 11. Password authentication

Tạo `PasswordCredential` riêng khỏi User.

Fields:

```text
id
userId
passwordHash
passwordChangedAt
createdAt
updatedAt
```

Password dùng Argon2id.

Route:

```text
POST /api/v1/auth/login
```

Phải rate-limit và không tiết lộ user tồn tại hay không qua error quá chi tiết.

---

# 12. Verification challenge

OTP, Magic Link, Verify Email và Password Reset dùng chung `VerificationChallenge`.

Fields:

```text
id
userId?
email
type
tokenHash
attempts
expiresAt
consumedAt?
ipAddress?
userAgent?
createdAt
```

Types:

```text
LOGIN_OTP
MAGIC_LINK
EMAIL_VERIFY
PASSWORD_RESET
```

Challenge one-time-use và token/OTP lưu hash.

---

# 13. OTP

Routes:

```text
POST /api/v1/auth/otp/request
POST /api/v1/auth/otp/verify
```

Yêu cầu:

- CSPRNG;
- expiry;
- max attempts;
- one-time-use;
- rate-limit;
- không trả OTP trong API response;
- gửi mail qua Jobs.

---

# 14. Magic Link

Routes:

```text
POST /api/v1/auth/magic-link/request
GET /api/v1/auth/magic-link/verify
```

Token phải secure random, lưu hash, có expiry, one-time-use, rate-limit và gửi qua mail job.

---

# 15. Google OAuth2

Routes:

```text
GET /api/v1/auth/google
GET /api/v1/auth/google/callback
```

Dùng Authorization Code, state validation, PKCE nếu flow/library áp dụng.

Callback phải verify provider identity rồi đi qua common auth pipeline.

Không hard-code secret.

---

# 16. Session + Device

Session fields:

```text
id
userId
deviceId?
refreshTokenHash
ipAddress?
userAgent?
createdAt
lastActiveAt
expiresAt
revokedAt?
```

Device fields:

```text
id
userId
fingerprint?
name?
platform?
browser?
firstSeenAt
lastSeenAt
```

Config:

```env
AUTH_MAX_ACTIVE_SESSIONS=5
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
```

Nếu đạt giới hạn, trả `SESSION_LIMIT_REACHED`, không tự kick session cũ.

Routes:

```text
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:sessionId
```

Refresh token phải lưu hash và hỗ trợ rotation.

---

# 17. Users + RBAC module

Tạo:

```text
backend/src/modules/users/
├── user.routes.ts
├── user.controller.ts
├── user.service.ts
├── user.repository.ts
├── user.types.ts
├── rbac/
│   ├── role.service.ts
│   ├── permission.service.ts
│   ├── role.constants.ts
│   ├── permission.constants.ts
│   └── rbac.policy.ts
├── password/
│   ├── password.service.ts
│   └── password.policy.ts
└── schemas/
    ├── update-user.schema.ts
    ├── change-password.schema.ts
    ├── block-user.schema.ts
    └── update-role.schema.ts
```

Roles:

```text
SUPER_ADMIN = 100
ADMIN = 50
MEMBER = 10
```

Một user có thể có nhiều role.

Authorization phải dựa trên:

```text
Permission + Rank + Business Policy
```

Không hard-code `if (user.role === "admin")` rải rác.

---

# 18. Permissions

Seed tối thiểu:

```text
users.read
users.create
users.update
users.block
users.unblock
users.roles.read
users.roles.assign
users.roles.promote
users.roles.demote
files.read
files.upload
files.delete
files.import
files.export
sessions.read
sessions.revoke
system.settings.read
system.settings.update
audit.read
```

RBAC business rules:

- MEMBER không tự nâng role.
- ADMIN không promote lên SUPER_ADMIN.
- ADMIN không chỉnh user có rank >= mình.
- User không tự block chính mình.
- Không block SUPER_ADMIN cuối cùng.
- Role change phải audit.

---

# 19. Block / Unblock

User status:

```text
ACTIVE
BLOCKED
SUSPENDED
```

Block flow:

```text
permission
→ rank policy
→ status BLOCKED
→ revoke all sessions
→ audit
→ queue security email
```

Unblock flow tương tự và đưa status về ACTIVE.

---

# 20. Change Password

Flow:

```text
verify current password
→ validate password policy
→ Argon2id hash
→ update PasswordCredential
→ passwordChangedAt
→ optional revoke other sessions
→ audit
→ queue security email
```

Không gửi SMTP trực tiếp từ business service.

---

# 21. Mail module

Tạo:

```text
backend/src/modules/mail/
├── mail.service.ts
├── mail.provider.ts
├── mail.types.ts
├── providers/
│   └── smtp.provider.ts
└── templates/
    ├── auth-action.template.ts
    └── security-alert.template.ts
```

Chỉ có hai template nền:

**Auth Action** cho OTP, Magic Link, Verify Email, Reset Password.

Input hỗ trợ:

```text
title
message
otp?
actionUrl?
actionLabel?
expiresIn?
```

**Security Alert** cho Password Changed, New Device Login, Account Blocked/Unblocked, Role Changed.

Input hỗ trợ:

```text
title
message
device?
ipAddress?
timestamp?
supportText?
```

Mỗi template trả `subject`, `html`, `text`.

---

# 22. Jobs module

Dùng `pg-boss`.

Tạo:

```text
backend/src/modules/jobs/
├── job.service.ts
├── job.registry.ts
├── producers/
│   └── job.producer.ts
├── handlers/
│   ├── mail-send.job.ts
│   ├── file-cleanup.job.ts
│   ├── auth-cleanup.job.ts
│   └── session-cleanup.job.ts
└── schedules/
    └── schedules.ts
```

`server.ts` chỉ HTTP API.

`worker.ts` chạy background/scheduled jobs.

Không dùng `setInterval()` cho business scheduled jobs.

Jobs:

```text
mail.send
files.cleanup-orphans
files.import-markdown
files.export-markdown
auth.cleanup-challenges
sessions.cleanup-expired
```

---

# 23. Files module

Tạo:

```text
backend/src/modules/files/
├── file.routes.ts
├── file.controller.ts
├── file.service.ts
├── file.repository.ts
├── file.types.ts
├── storage/
│   ├── upload.service.ts
│   ├── download.service.ts
│   └── deduplicate.service.ts
├── markdown/
│   ├── markdown-import.service.ts
│   ├── markdown-export.service.ts
│   └── markdown.parser.ts
└── schemas/
    ├── upload.schema.ts
    ├── import-markdown.schema.ts
    └── export-markdown.schema.ts
```

Tách logical File và physical StoredObject.

StoredObject:

```text
id
hash
storageKey
size
mimeType
referenceCount
createdAt
pendingDeleteAt?
```

File:

```text
id
objectId
ownerId
name
extension?
createdAt
updatedAt
deletedAt?
```

Upload flow:

```text
receive file
→ SHA-256
→ find StoredObject by hash
→ reuse nếu tồn tại
→ upload nếu chưa tồn tại
→ create logical File
```

Authorization dựa vào logical File, không dựa vào hash/storage key.

---

# 24. Orphan cleanup

Khi logical File bị delete, giảm `referenceCount`.

Physical object chỉ bị xóa nếu:

```text
referenceCount = 0
AND
createdAt <= NOW - FILE_ORPHAN_RETENTION_DAYS
```

Default:

```env
FILE_ORPHAN_RETENTION_DAYS=10
```

Job chạy 1 lần/ngày.

---

# 25. Markdown import/export

Import:

```text
.md
→ validate
→ UTF-8 parse
→ normalize
→ reusable domain importer
```

Export:

```text
domain data
→ Markdown
→ SHA-256
→ reuse/create StoredObject
→ create logical File
→ download
```

Không hard-code chỉ cho Users.

---

# 26. Storage abstraction

Tạo:

```text
backend/src/core/storage/
├── storage.interface.ts
├── local.storage.ts
└── s3.storage.ts
```

Interface có `put`, `get`, `delete`, `exists`.

Development:

```env
STORAGE_DRIVER=local
```

Production-ready:

```env
STORAGE_DRIVER=s3
```

S3 phải hỗ trợ custom endpoint để dùng MinIO.

---

# 27. Audit module

Tạo:

```text
backend/src/modules/audit/
├── audit.service.ts
├── audit.repository.ts
├── audit.types.ts
└── audit.constants.ts
```

AuditLog fields:

```text
id
actorUserId?
action
entityType
entityId?
metadata?
ipAddress?
userAgent?
createdAt
```

Events tối thiểu:

```text
AUTH_LOGIN_SUCCESS
AUTH_LOGIN_FAILED
AUTH_LOGOUT
PASSWORD_CHANGED
USER_BLOCKED
USER_UNBLOCKED
ROLE_ASSIGNED
ROLE_REMOVED
SESSION_REVOKED
FILE_DELETED
```

Không log password/token/OTP/magic-link secret.

---

# 28. Prisma schema

Models tối thiểu:

```text
User
AuthIdentity
PasswordCredential
VerificationChallenge
Device
Session
Role
Permission
UserRole
RolePermission
UserPermissionOverride
StoredObject
File
AuditLog
```

Dùng ID convention nhất quán, ưu tiên `cuid()`.

Tạo index/unique hợp lý cho email, provider account, challenge, session, file hash, role, permission và audit time.

---

# 29. Prisma seed

Seed:

```text
SUPER_ADMIN 100
ADMIN 50
MEMBER 10
```

Seed permissions và role-permission mapping.

Bootstrap super admin qua:

```env
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

Chỉ tạo khi cả hai được cung cấp. Password phải Argon2id. Seed phải idempotent.

---

# 30. API response format

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

Không throw string.

Error codes tối thiểu:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
INVALID_CREDENTIALS
ACCOUNT_BLOCKED
SESSION_EXPIRED
SESSION_LIMIT_REACHED
INVALID_REFRESH_TOKEN
OTP_INVALID
OTP_EXPIRED
MAGIC_LINK_INVALID
MAGIC_LINK_EXPIRED
USER_NOT_FOUND
ROLE_NOT_FOUND
INSUFFICIENT_ROLE_RANK
FILE_NOT_FOUND
FILE_TOO_LARGE
FILE_TYPE_NOT_ALLOWED
```

---

# 31. Frontend Axios + Query + Forms

Tạo Axios instance tập trung trong `frontend/src/lib/axios/`.

Yêu cầu:

- base URL từ ENV;
- timeout;
- credentials nếu dùng cookie;
- normalize API error;
- refresh handling;
- không infinite refresh loop;
- refresh fail thì clear auth state và redirect login.

TanStack Query:

```text
authKeys
userKeys
fileKeys
sessionKeys
```

Forms dùng React Hook Form + Zod + zodResolver.

Frontend và Backend có schema riêng; không dùng shared package.

Nếu sau này cần đồng bộ mạnh hơn, dùng OpenAPI generated client/types.

---

# 32. Frontend feature scope

Auth:

```text
login
logout
logout all
OTP request/verify
Magic Link request
Google login
session list/revoke
SESSION_LIMIT_REACHED UI
```

Users:

```text
list/detail/update
block/unblock
assign/remove role
change password
```

Files:

```text
upload
list
download
delete
markdown import/export
```

Backend luôn là nơi authorization cuối cùng.

---

# 33. Security rules

Bắt buộc:

- Argon2id password.
- Refresh token hash.
- OTP hash.
- Magic-link hash.
- Access token TTL ngắn.
- Refresh token rotation.
- Helmet.
- strict CORS.
- rate limit login/OTP/magic link.
- server-side Zod validation.
- request body limit.
- production cookies secure.
- httpOnly nếu refresh token nằm cookie.
- blocked user không refresh được.
- block user revoke sessions.
- OTP/Magic Link one-time-use.
- file size/MIME validation.
- path traversal protection.
- server-generated storage key.

---

# 34. Environment files

Frontend `.env.example`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Backend `.env.example`:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/corestack
ACCESS_TOKEN_SECRET=change_me
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
AUTH_MAX_ACTIVE_SESSIONS=5
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=no-reply@example.com
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./storage
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
FILE_MAX_SIZE_MB=20
FILE_ORPHAN_RETENTION_DAYS=10
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

Validate backend ENV bằng Zod.

---

# 35. Scripts

Frontend `package.json`:

```text
dev
build
start
lint
typecheck
test
```

Backend `package.json`:

```text
dev
dev:worker
build
start
start:worker
lint
typecheck
test
db:generate
db:migrate
db:migrate:deploy
db:seed
db:studio
```

---

# 36. Dockerfiles

Tạo `frontend/Dockerfile` build được chỉ với context `./frontend`.

Tạo `backend/Dockerfile` build được chỉ với context `./backend`, bao gồm Prisma assets.

Không yêu cầu Docker build đọc file từ app còn lại.

---

# 37. Local development

Database:

```bash
docker compose up -d
```

Frontend:

```bash
cd frontend
pnpm install
pnpm dev
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

Worker:

```bash
cd backend
pnpm dev:worker
```

---

# 38. Deployment target

```text
Frontend Next.js
      ↓ HTTPS
Backend Express API
      ↓
PostgreSQL

Backend Worker
      ↓
PostgreSQL

Backend
      ↓
S3 / MinIO
```

Frontend và Backend phải deploy được độc lập trên hai platform khác nhau.

---

# 39. Tests tối thiểu

Backend dùng Vitest + Supertest.

Auth:

```text
login success
invalid password
blocked user
session limit
invalid refresh token
OTP expired
OTP consumed
```

RBAC:

```text
permission denied
ADMIN cannot promote SUPER_ADMIN
lower rank cannot edit higher rank
SUPER_ADMIN valid action
```

Files:

```text
SHA-256 dedup
StoredObject reuse
referenced object not orphan-deleted
new orphan retained
old orphan cleaned
```

---

# 40. Coding rules

Mục tiêu `< 300 dòng/file`, hard limit `500 dòng/file`.

Không:

- God Service;
- giant utils.ts;
- giant global types.ts;
- business logic trong route;
- Prisma query trong controller;
- SMTP trực tiếp từ business service;
- setInterval cho scheduled jobs;
- hard-code role checks rải rác.

Naming:

```text
files: kebab-case
class/type: PascalCase
function/variable: camelCase
constant: UPPER_SNAKE_CASE
permission: resource.action
```

---

# 41. Health endpoint

Tạo:

```text
GET /health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok"
  }
}
```

---

# 42. Nếu repository đang có scaffold monorepo cũ

Nếu hiện tại có:

```text
apps/
packages/
prisma/ ở root
pnpm-workspace.yaml
root package.json workspace
```

thì đó là cấu trúc cũ.

Codex phải:

1. Inspect git status.
2. Xác định code nào chỉ là scaffold cũ và code nào là code người dùng cần giữ.
3. Migrate `apps/web -> frontend` nếu phù hợp.
4. Migrate `apps/api -> backend` nếu phù hợp.
5. Migrate `root prisma -> backend/prisma`.
6. Loại bỏ dependency vào `packages/contracts` và `packages/shared`; copy schema/type cần thiết về đúng app trước khi xóa.
7. Xóa `apps/`, `packages/`, `pnpm-workspace.yaml` sau khi migration an toàn.
8. Không xóa docs/spec/checklist/git history.

Nếu repository sạch, tạo trực tiếp `frontend/`, `backend/`, `docs/` từ đầu.

---

# 43. Implementation order

```text
1. Inspect repository
2. Clean/migrate old scaffold nếu cần
3. Tạo root structure
4. Setup frontend
5. Setup backend
6. Setup PostgreSQL Docker
7. Setup Prisma
8. Prisma models + seed
9. Backend core/config/security
10. Auth common pipeline
11. Password auth
12. OTP
13. Magic Link
14. Google OAuth2
15. Sessions/devices
16. Users/RBAC
17. Block/unblock/change password
18. Mail
19. Jobs/worker
20. Files/storage/dedup
21. Orphan cleanup
22. Markdown import/export
23. Audit
24. Frontend providers + features
25. Docs
26. Tests
27. Dockerfiles
28. Lint/typecheck/test/build
29. Fix generated errors
```

---

# 44. Codex execution rules

Codex phải thực thi trực tiếp trong repository:

- tạo file/folder;
- cài dependency;
- sửa config;
- chạy Prisma;
- chạy validation commands;
- sửa lỗi scaffold do chính Codex tạo;
   - cập nhật checklist tiến độ trong `README.md`.

Không chỉ mô tả hoặc in code ra chat.

Không tick checklist trước khi implement/verify.

Nếu thiếu Google/SMTP/S3 credentials, scaffold đầy đủ và ghi `BLOCKED BY CREDENTIALS` cho test thực tế, nhưng tiếp tục các phần khác.

---

# 45. Acceptance criteria

Frontend, trong `frontend/`:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

phải pass; `pnpm dev` phải start được.

Backend, trong `backend/`:

```bash
pnpm install
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

phải pass.

Khi PostgreSQL sẵn sàng:

```bash
pnpm db:migrate
pnpm db:seed
```

phải pass; `pnpm dev` và `pnpm dev:worker` phải start được.

---

# 46. Definition of Done

Project base chỉ hoàn thành khi:

```text
frontend độc lập
backend độc lập
Prisma nằm trong backend
PostgreSQL local chạy được
Auth common pipeline hoạt động
Session/device management hoạt động
RBAC + rank + policy hoạt động
Mail abstraction + 2 templates tồn tại
Jobs worker hoạt động
Files dedup/reuse hoạt động
Orphan cleanup 10 ngày hoạt động
Markdown import/export tồn tại
Audit hoạt động
Docs tồn tại
Dockerfiles độc lập
Frontend lint/typecheck/build pass
Backend lint/typecheck/test/build pass
```

External credentials chưa có được phép để trạng thái blocked, nhưng code integration phải scaffold hoàn chỉnh.

---

# 47. Final tree

Kết quả cuối phải gần như:

```text
project/
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── tsconfig.json
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── tests/
│   ├── storage/
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── tsconfig.json
├── docs/
├── docker-compose.yml
├── .gitignore
├── README.md (bao gồm checklist tiến độ)
└── CODEX_PROJECT_SETUP.md
```

Không quay lại `apps/`, `packages/`, `pnpm-workspace.yaml`.

---

# START

Codex hãy đọc toàn bộ file này và checklist trong `README.md`, inspect repository, sau đó tạo lại project theo cấu trúc mới. Thực hiện từng task nhỏ, chỉ tick `[x]` sau khi đã implement và verify. Cuối cùng chạy lint, typecheck, test và build cho từng app độc lập.
