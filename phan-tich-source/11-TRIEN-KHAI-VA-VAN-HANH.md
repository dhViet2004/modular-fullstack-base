# 11. Triển khai và vận hành

## 1. Build và deploy

### 1.1 Backend

- Build: `tsc -p tsconfig.build.json` → `dist/` (kèm `dist/generated/prisma` vì `include: src/**/*.ts`). Chạy: `node --env-file=.env dist/server.js` (Node ≥20.6 hỗ trợ `--env-file`).
- `Dockerfile` đa tầng: cài deps → `db:generate` → build → `prune --prod` → image runtime copy `node_modules`, `dist`, `prisma`, `src/generated`.
  - Đúng: generate Prisma trước `COPY . .` để cache layer; `.dockerignore` loại `src/generated`, `.env`, `storage/*`.
  - Vấn đề (OPS-002): `pnpm prune --prod` bỏ `prisma` CLI → **không chạy được `prisma migrate deploy` trong image**; `CMD` chỉ chạy server (không worker); không `USER node`; không `HEALTHCHECK`; `ENV NODE_ENV=production` nhưng env còn lại phải truyền lúc run (đúng).
- Migration: `docs/deployment/backend.md` yêu cầu `pnpm db:migrate:deploy` trước khi start, nhưng migration thiếu (DB-001) → deploy mới sẽ hỏng ngay bước seed/login.

### 1.2 Frontend

- Build: `next build`; `distDir` đổi theo `NODE_ENV` (`.next-dev` khi dev) — mẹo tránh xung đột cache dev/prod; không phổ biến nhưng hợp lệ; `tsconfig` đã include `.next-dev/types`.
- `Dockerfile` (OPS-001): không `ARG NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` → giá trị build-time không thể truyền qua `docker build --build-arg`; runtime không copy `next.config.ts`; chạy `pnpm start` (`next start`) — cần `node_modules` đầy đủ (đã copy sau prune). Không `output: "standalone"` nên image lớn.
- `NEXT_PUBLIC_*` là build-time: mỗi môi trường (staging/prod) cần build image riêng — cần ghi rõ trong docs.

### 1.3 docker-compose

- Chỉ Postgres 16 với volume, healthcheck, `restart: unless-stopped`. Đúng spec. Không có service api/worker/mailhog cho dev; developer phải chạy 3 terminal (README có hướng dẫn).

## 2. CI/CD

- **Không có** pipeline nào (`.github/`, `.gitlab-ci.yml`, v.v. không tồn tại). README mục 25 "Validation cuối" là checklist chạy tay.
- Hệ quả: lint/typecheck/test không được chạy tự động → những mục README tick không được bảo vệ khỏi hồi quy; lỗi lint tiềm ẩn (`error: any`) không bị phát hiện.
- Đề xuất tối thiểu (GitHub Actions): job `backend` (postgres service → `pnpm i --frozen-lockfile` → `db:generate` → `migrate deploy` (sẽ phát hiện DB-001) → `lint` → `typecheck` → `test` → `build`), job `frontend` (`lint` → `typecheck` → `test` → `build` với `NEXT_PUBLIC_API_URL` giả), job `docker` build 2 image.

## 3. Logging, monitoring, alert

| Hạng mục | Hiện trạng | Thiếu |
| --- | --- | --- |
| Logging | `console.info/error` qua `logger` với redact key nhạy cảm; lỗi 500 log stack | Không structured (JSON), không level, không request log (method/path/status/latency), không requestId trong log dù đã sinh `x-request-id` |
| Job log | `logger.info` trong maintenance job; cleanup orphan **không log** lỗi | Không biết job thất bại |
| Monitoring | Không | Không metrics (Prometheus), không tracing |
| Health | `GET /health` trả tĩnh | Không kiểm tra DB/boss/storage; không tách liveness/readiness |
| Alert | Không | Mail thất bại, job thất bại, disk đầy đều im lặng |
| Audit | `AuditLog` đầy đủ sự kiện; có job dọn 90 ngày | Không có API/UI đọc audit (trừ mail) |

## 4. Backup và restore

- Không có script/tài liệu backup. Dữ liệu nằm ở: Postgres (volume `postgres_data`), storage local (`backend/storage`, gitignore), R2 (nếu bật).
- Rủi ro: storage local trong container không volume → mất khi container thay; `StoredObject` trong DB trỏ tới file không còn (không có job kiểm tra nhất quán DB↔storage).
- Đề xuất: `pg_dump` định kỳ + kiểm tra restore; với R2 bật versioning; thêm job `files.verify-integrity` (kiểm `storage.exists(key)` cho object mẫu).

## 5. Quản lý cấu hình môi trường

- Backend: `env.ts` (Zod) là điểm tốt; nhưng mọi biến có default (SEC-006); không có `env.production.example`; `TRUST_PROXY` mặc định false (OPS-003).
- `.env.example` có comment hướng dẫn (bootstrap, SMTP app password) — tốt.
- Frontend: 2 biến; `login-form.tsx` thiếu fallback.
- Thiếu: `API_PUBLIC_URL` (SEC-003), `DEFAULT_ROLE` (ERR-007), cấu hình retry pg-boss, `LOG_LEVEL`.
- Bí mật: không có secret manager; `.env` không được commit (đúng).

## 6. Rollback

- **Ứng dụng**: image không tag theo version rõ ràng trong repo (không có CI) → rollback thủ công bằng image cũ.
- **Database**: Prisma migrate không có down migration; rollback schema phải viết tay. Với DB-001, thậm chí chưa có "forward" đầy đủ. Mọi migration sau này cần nguyên tắc "expand → migrate data → contract" để cho phép chạy version cũ và mới song song.
- **Seed**: chạy lại seed có tác dụng phụ (reset mật khẩu bootstrap admin) → không được coi seed là idempotent hoàn toàn.

## 7. Rủi ro khi đưa lên production (checklist)

| # | Rủi ro | Mã | Chặn deploy? |
| --- | --- | --- | --- |
| 1 | Migration thiếu → login/seed lỗi | DB-001 | **Có** |
| 2 | Jobs/Files API không phân quyền | SEC-001, SEC-002 | **Có** |
| 3 | Host header poisoning link email | SEC-003 | **Có** nếu API public |
| 4 | Secret default | SEC-006 | **Có** |
| 5 | CORS chặn PUT | ERR-001 | Có (tính năng hỏng) |
| 6 | FE reload khi sai mật khẩu; logout ngẫu nhiên sau 15 phút | ERR-002, ERR-003 | Có (trải nghiệm) |
| 7 | Upload không giới hạn RAM; `states` leak | SEC-004, SEC-005 | Có |
| 8 | `TRUST_PROXY` sai → rate limit toàn site | OPS-003 | Tuỳ hạ tầng |
| 9 | Image FE trỏ localhost | OPS-001 | Có |
| 10 | Không migrate được trong image BE | OPS-002 | Có |
| 11 | Storage local mất dữ liệu | OPS-002 | Dùng R2 thì không |
| 12 | Không CI, không log/metrics/alert | — | Không chặn nhưng mù khi sự cố |
| 13 | Scheduler in-process, scale ngang hỏng OAuth | ARCH-001, ARCH-002 | Khi >1 instance |
| 14 | `xlsx` CVE | SEC-009 | Không chặn |

## 8. Đề xuất vận hành tối thiểu cho một "base project"

1. CI 3 job như mục 2; `prisma migrate diff` chặn drift.
2. Dockerfile BE: stage `migrate` riêng (có prisma CLI) hoặc entrypoint `migrate deploy && node dist/server.js`; `USER node`; `HEALTHCHECK`.
3. Dockerfile FE: `ARG NEXT_PUBLIC_API_URL`; `output: "standalone"`.
4. Logger JSON (pino) + request logger có `requestId`, `userId`; log lỗi job.
5. `/health` kiểm `SELECT 1` và trạng thái boss; `/ready` riêng.
6. Compose profile `dev` có api, worker, mailhog; profile `test` có postgres test.
7. Tài liệu vận hành: biến bắt buộc theo môi trường, `TRUST_PROXY`, cách rotate `ACCESS_TOKEN_SECRET`, backup/restore.
