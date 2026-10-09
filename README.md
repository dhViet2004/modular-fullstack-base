# CoreStack

Baseline fullstack có thể tái sử dụng, gồm hai ứng dụng độc lập:

- `frontend/`: Next.js 15, React 19, Tailwind CSS, TanStack Query, Axios, React Hook Form và Zod.
- `backend/`: Express 5 ESM, Prisma, PostgreSQL, Zod và Vitest.

Hai app dùng `pnpm` riêng, có lockfile riêng và có thể build/deploy độc lập. Repository không dùng monorepo workspace.

Kiến trúc và quy tắc phân loại module: [`docs/01-KIEN-TRUC-CODE-BASE.md`](docs/01-KIEN-TRUC-CODE-BASE.md).

Hướng dẫn tự code module đầu tiên: [`docs/02-MODULE-01-USERS.md`](docs/02-MODULE-01-USERS.md).

Thiết kế password authentication và session: [`docs/03-MODULE-02-AUTHENTICATION.md`](docs/03-MODULE-02-AUTHENTICATION.md).

Thiết kế role và permission RBAC: [`docs/04-MODULE-03-AUTHORIZATION.md`](docs/04-MODULE-03-AUTHORIZATION.md).

Tài liệu HTTP API: [`docs/05-API.md`](docs/05-API.md).

Tài liệu database: [`docs/06-DATABASE.md`](docs/06-DATABASE.md).

Hướng dẫn deployment: [`docs/07-DEPLOYMENT.md`](docs/07-DEPLOYMENT.md).

Thiết kế audit log: [`docs/08-MODULE-04-AUDIT.md`](docs/08-MODULE-04-AUDIT.md).

Thiết kế email verification: [`docs/09-MODULE-05-EMAIL-VERIFICATION.md`](docs/09-MODULE-05-EMAIL-VERIFICATION.md).

Thiết kế Google OAuth: [`docs/10-MODULE-06-GOOGLE-OAUTH.md`](docs/10-MODULE-06-GOOGLE-OAUTH.md).

Thiết kế Files/storage: [`docs/11-MODULE-07-FILES.md`](docs/11-MODULE-07-FILES.md).

## Yêu cầu

- Node.js 22.12 trở lên (theo yêu cầu của pg-boss)
- pnpm 9.15.9
- Docker Desktop với Linux engine đang chạy

Kích hoạt đúng phiên bản pnpm một lần sau khi cài Node.js:

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

## Chạy local

Khởi động PostgreSQL:

```bash
docker compose up -d postgres
```

Backend:

```bash
cd backend
copy .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm jobs:install
pnpm db:seed
pnpm dev
```

Chạy worker ở terminal backend riêng bằng `pnpm worker`; API chỉ đưa job vào queue, worker mới gửi email xác minh. Khởi tạo queue bằng `pnpm jobs:install` sau Prisma migration ở mỗi môi trường trước khi mở API và worker.

Sau khi đã đăng ký tài khoản cần dùng làm admin, thêm email vào `backend/.env` rồi chạy lại `pnpm db:seed`:

```env
RBAC_SUPER_ADMIN_EMAIL=owner@example.com
RBAC_SUPER_ADMIN_EMAIL=owner@example.com
```

Frontend ở terminal khác:

```bash
cd frontend
copy .env.example .env.local
pnpm install
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend liveness: `http://localhost:4000/health`
- Backend readiness (kiểm tra PostgreSQL): `http://localhost:4000/ready`
- API base: `http://localhost:4000/api/v1`

Nếu cổng `3000`/`4000` đang được dự án khác sử dụng, có thể chạy frontend ở `3002` bằng `pnpm dev --port 3002` và backend ở `4001`. Đồng bộ cấu hình local:

```env
# backend/.env
PORT=4001
CORS_ORIGIN=http://localhost:3002
PUBLIC_WEB_URL=http://localhost:3002
GOOGLE_REDIRECT_URI=http://localhost:4001/api/v1/auth/google/callback

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1
NEXT_PUBLIC_API_ORIGIN=http://localhost:4001
```

Khởi động lại backend sau khi đổi `.env`; khởi động lại frontend nếu chưa nhận cấu hình mới. Khai báo chính xác `GOOGLE_REDIRECT_URI` trong Google Cloud Console. Kiểm tra `GET http://localhost:4001/api/v1` trả tên `CoreStack API` trước khi thử Google OAuth; phản hồi `NotFoundException` có thể đến từ API của dự án khác đang chiếm cổng.

Khi triển khai bằng Docker, chạy migration bằng target riêng trước khi khởi động API image:

```bash
docker build --target migration -t corestack-backend-migration ./backend
docker run --rm --env-file backend/.env corestack-backend-migration
```

## Kiểm tra chất lượng

Chạy trong từng thư mục app:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Backend có thêm `pnpm format:check` và `pnpm db:generate`.

GitHub Actions chạy hai job độc lập theo `.github/workflows/ci.yml`. Backend dùng PostgreSQL sạch để deploy migration rồi so database với Prisma schema bằng `prisma migrate diff --exit-code`; frontend chạy lint, typecheck, test và build.

## Baseline checklist

Chỉ đánh dấu `[x]` khi đã chạy lệnh kiểm chứng trên working tree hiện tại.

### Cấu trúc và tooling

- [x] Hai app độc lập, không có root workspace/package orchestrator
- [x] Mỗi app có `package.json` và `pnpm-lock.yaml` riêng
- [x] Frontend có App Router, Tailwind, Query provider và Axios client
- [x] Backend có Express 5 ESM, config Zod, Prisma client và error middleware
- [x] Backend tách liveness `/health` và readiness `/ready` kiểm tra PostgreSQL
- [x] Docker Compose khai báo PostgreSQL 16, healthcheck và persistent volume
- [x] Dockerfile độc lập cho frontend và backend
- [x] Backend Dockerfile có migration target riêng cho deployment

### Kiểm chứng ngày 20/09/2026

- [x] Frontend lint
- [x] Frontend typecheck
- [x] Frontend test (1 test)
- [x] Frontend production build
- [x] Backend format check
- [x] Backend lint
- [x] Backend typecheck
- [x] Backend test (3 integration tests)
- [x] Backend build
- [x] Prisma Client generate
- [x] Backend dev server và `GET /health` trả HTTP 200
- [x] PostgreSQL container healthy
- [x] Migration deploy trên database trống
- [x] Seed trên database thật
- [x] `git diff --check`

## Roadmap tiếp theo

- [x] Ch?t ki?n tr?c module `route ? middleware ? controller ? service ? Prisma`; repository l? optional khi c? persistence responsibility r? r?ng
- [x] Hoàn thiện schema nền tảng cho identity, session, RBAC và audit
- [x] Auth password, JWT session, refresh rotation, logout và giao diện theo role/permission
- [x] Email verification với public URL từ cấu hình
- [x] Google OAuth Authorization Code + PKCE
- [x] Authorization phía server và test ma trận route
- [x] Audit log append-only cho sự kiện bảo mật và quản trị
- [x] Worker pg-boss chạy tách biệt API process
- [x] Files/storage với giới hạn upload trước khi buffer — local và Cloudflare R2 đã kiểm chứng
- [~] CI chạy format, lint, typecheck, test, build và migration drift check — workflow đã tạo và lint YAML đạt; chờ run trên GitHub Actions
- [~] Phase A — Shared Design System: A.1/A.2 DONE; A.3 AppShell/role navigation VERIFIED (lint/typecheck/test/build, 55 tests và Chrome 320/390/768/1280/1600px, drawer/session/logout); breakpoint UI PROPOSAL, visual/asset PARTIAL; Product & Handoff BLOCKED do quota, chưa thay nội dung screens
- [x] A.4 — Permission Guard Cleanup: `/super-admin` chỉ mount cấu hình sau guard loading/user/SUPER_ADMIN; UI loading/401/403/allowed rõ ràng; lint/typecheck/test/build và Chrome PASS, 62 tests/9 files; giữ authentication/API/backend authorization
- [x] B.1 — Public & Auth: đủ 17 frame chức năng; confirmPassword client-only, verify thủ công, OAuth redirect ngay và phân biệt guest/expired/restore-error; lint/typecheck/test/build và Chrome PASS, 90 tests/45 screenshots; visual VISUAL_PARTIAL, countdown resend chờ deadline từ backend; chi tiết trong `docs/figma/SCREEN_MAPPING.md` và `docs/figma/DESIGN_SYSTEM.md`
- [x] B.2 — MEMBER: 17/17 frame Dashboard/Info/Sessions/Files PASS; deep-link query, confirmation, current-session logout, replace ID/preview và private cache theo account; giữ Security/Google OAuth và backend/RBAC/contracts. Lint/typecheck/104 frontend tests/build và Chrome A.1–B.2 PASS; 25 backend tests + 11 contract probes PASS; 53 B.2 screenshots, 51 Chrome assertions; visual VISUAL_PARTIAL. Nghiệm thu: `docs/figma/SCREEN_MAPPING.md` mục 14 và `docs/figma/DESIGN_SYSTEM.md` mục 16; quota upload đồng thời là technical debt.

- [x] B.3 — ADMIN: 14/14 frame FUNCTIONAL_DONE (Dashboard 2, Users 6, Audit 6); Users search/filter/sort cục bộ, Audit applied filters/cursor/retry, drawer chỉ đọc và account-scoped cancellation; giữ SUPER_ADMIN + roles:manage cho cấp/gỡ ADMIN và backend/auth/contracts. Frontend lint/typecheck/127 tests/build, backend lint/typecheck/41 tests/build/format và Chrome A.1–B.3 PASS; 104 Chrome assertions, 42 B.3 screenshots dùng API fixtures. VISUAL_PARTIAL, không có chức năng BLOCKED. Nghiệm thu: `docs/figma/SCREEN_MAPPING.md` mục 15, `docs/figma/DESIGN_SYSTEM.md` mục 17; artifacts local `tmp/phase-b3-acceptance/`. Fixtures/auth/DB mocks không xác nhận integration live.

- [x] B.4 — SUPER_ADMIN: 14/14 FUNCTIONAL_DONE (Dashboard 2, Role Actions 5, Email Verification 6, RBAC Matrix 1). Confirmation/ref lock, account-scoped requests và 401 retry isolation; role PATCH success tách GET refetch failure; email PATCH timeout/network/5xx được GET reconcile, không retry ghi khi trạng thái chưa rõ. Matrix chỉ đọc từ default catalog; backend/Prisma/contracts/catalog giữ nguyên. Frontend lint/typecheck/154 tests/build, backend lint/typecheck/56 tests/build/format và Chrome A.1–B.4 PASS; 104 B.4 assertions, 44 screenshots với API fixtures. VISUAL_PARTIAL; không có chức năng BLOCKED. Nghiệm thu: `docs/figma/SCREEN_MAPPING.md` mục 16, `docs/figma/DESIGN_SYSTEM.md` mục 18; artifacts local `tmp/phase-b4-acceptance/`. Fixtures/auth/DB mocks không xác nhận integration live. Technical debt: invalid setting body trả 500, setting chưa có version/ETag và quota upload đồng thời B.2.

- [x] Hợp nhất Account Dashboard/Info: MEM-01/MEM-02 cùng `/account`, giữ hồ sơ/ngày tháng/roles/permissions/bảo mật và quick links; bỏ navigation Info trùng, link cũ `?tab=info` canonicalize bằng replace. Sessions/Security được tổ chức trong tab account, Files và menu ADMIN/SUPER_ADMIN giữ route/permission; AuthProvider/hooks/backend/contracts/RBAC không đổi. Frontend lint/typecheck/158 tests/build và Chrome A.1–B.4 PASS; MEMBER 57 assertions, responsive/keyboard/deep links/Back/Forward. VISUAL_PARTIAL; artifacts `tmp/account-merge-acceptance/`, mapping mục 14 và design mục 19 trong `docs/figma/`.
- [x] Account self-service tabs (2026-10-10): `/account` dùng bốn tab nội bộ `info`, `roles`, `security`, `sessions`; sidebar chỉ còn `Tài khoản của tôi` và `Tệp của tôi`; session desktop luôn là bảng kể cả 1 phiên, mobile là card. Giữ EmailVerificationNotice, password/session API, confirm/revoke, self ownership và menu quản trị; không đổi backend, Prisma, API contract, RBAC hoặc `/admin`/`/super-admin`. Frontend lint/typecheck/168 tests/build/format PASS; Chrome A.1–B.4 PASS, Account 180 assertions gồm ba role, 0/1/3 sessions tại 320/390/768/1280/1440px và keyboard/Back/Forward/Login/Logout/isolation. Artifacts: `tmp/account-tabs-acceptance/`; HTTP fixtures không xác nhận live backend.

Các rủi ro và bài học từ phiên bản cũ nằm trong `review-source/`; baseline mới phải giải quyết chúng bằng test và bằng chứng kiểm chứng, không kế thừa các dấu tick cũ.

- [x] Giao di?n qu?n l� t?p Markdown: import, luu server v� export
- [x] CRUD Files: danh s?ch, t?o, c?p nh?t, t?i xu?ng v? x?a file

- [x] Qu?n l� phi�n v� gi?i h?n thi?t b? ho?t d?ng theo user
      Account security UI va API doi mat khau da cap nhat.
- [x] Files/storage gi?i h?n t?i ?a 10 t?p m?i user
