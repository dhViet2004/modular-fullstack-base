# CoreStack

Baseline fullstack có thể tái sử dụng, gồm hai ứng dụng độc lập:

- `frontend/`: Next.js 15, React 19, Tailwind CSS, TanStack Query, Axios, React Hook Form và Zod.
- `backend/`: Express 5 ESM, Prisma, PostgreSQL, Zod và Vitest.

Hai app dùng `pnpm` riêng, có lockfile riêng và có thể build/deploy độc lập. Repository không dùng monorepo workspace.

Kiến trúc và quy tắc phân loại module: [`docs/01-KIEN-TRUC-CODE-BASE.md`](docs/01-KIEN-TRUC-CODE-BASE.md).

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
- [ ] Hoàn thiện schema nền tảng cho identity, session, RBAC và audit
- [ ] Auth password và email verification với public URL từ cấu hình
- [ ] Authorization phía server và test ma trận route
- [ ] Worker pg-boss chạy tách biệt API process
- [ ] Files/storage với giới hạn upload trước khi buffer
- [ ] CI chạy format, lint, typecheck, test, build và migration drift check

Các rủi ro và bài học từ phiên bản cũ nằm trong `review-source/`; baseline mới phải giải quyết chúng bằng test và bằng chứng kiểm chứng, không kế thừa các dấu tick cũ.
