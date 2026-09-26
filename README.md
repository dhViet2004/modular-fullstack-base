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

## Yêu cầu

- Node.js 22 trở lên
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
pnpm db:seed
pnpm dev
```

Sau khi đã đăng ký tài khoản cần dùng làm admin, thêm email vào `backend/.env` rồi chạy lại `pnpm db:seed`:

```env
RBAC_ADMIN_EMAIL=admin@example.com
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

- [x] Chốt kiến trúc module `route → controller → service → repository`
- [x] Hoàn thiện schema nền tảng cho identity, session, RBAC và audit
- [x] Auth password, JWT session, refresh rotation, logout và giao diện quản trị RBAC
- [ ] Email verification với public URL từ cấu hình
- [x] Authorization phía server và test ma trận route
- [x] Audit log append-only cho sự kiện bảo mật và quản trị
- [ ] Worker pg-boss chạy tách biệt API process
- [ ] Files/storage với giới hạn upload trước khi buffer
- [ ] CI chạy format, lint, typecheck, test, build và migration drift check

Các rủi ro và bài học từ phiên bản cũ nằm trong `review-source/`; baseline mới phải giải quyết chúng bằng test và bằng chứng kiểm chứng, không kế thừa các dấu tick cũ.
