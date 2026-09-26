# Deployment Guide

Tài liệu này mô tả quy trình triển khai hiện được repository hỗ trợ: PostgreSQL, migration Prisma, Express backend và Next.js frontend chạy thành các workload độc lập.

## 1. Kiến trúc triển khai

```text
Browser
  -> HTTPS frontend
  -> HTTPS backend API
  -> PostgreSQL

Deployment pipeline
  -> migration image
  -> backend image
  -> frontend image
```

Migration phải hoàn thành trước khi phiên bản backend mới nhận traffic. API không tự chạy migration khi startup.

Sau Prisma migration, chạy `node dist/jobs-install.js` một lần để cài schema/queue pg-boss. API và worker dùng chung PostgreSQL; chạy worker bằng `node dist/worker.js` trong workload riêng. API không xử lý job và cả hai runtime không tự chạy migration pg-boss.

Repository hiện chưa cung cấp production Docker Compose, Kubernetes manifest hoặc cấu hình cho một cloud cụ thể. Các phần đó chỉ nên được thêm khi đã chọn môi trường deploy thật.

File API dùng local storage ở development/test và Cloudflare R2 ở production. Production cần `STORAGE_R2_ENDPOINT`, `STORAGE_R2_BUCKET`, `STORAGE_R2_ACCESS_KEY_ID`, `STORAGE_R2_SECRET_ACCESS_KEY`; thiếu biến sẽ fail-fast. Cấp quyền đọc/ghi object trong bucket riêng tư. API chỉ dùng filesystem tạm của container để staging upload có giới hạn 5 MiB, sau đó xóa file tạm.

## 2. Điều kiện production

- Registry có thể lưu backend và frontend image.
- PostgreSQL có persistent storage, backup và kết nối TLS khi nhà cung cấp hỗ trợ.
- Một reverse proxy hoặc load balancer kết thúc HTTPS.
- Secret manager hoặc cơ chế inject environment variable an toàn.
- Domain frontend và backend đã được xác định trước khi build frontend.

Không commit file `.env`, JWT private key, database password hoặc token vào Git.

## 3. Biến môi trường backend

| Biến | Bắt buộc | Ví dụ | Ghi chú |
| --- | --- | --- | --- |
| `NODE_ENV` | Có | `production` | Bật secure cookie |
| `PORT` | Không | `4000` | Mặc định `4000` |
| `DATABASE_URL` | Có | `postgresql://...` | Chuỗi kết nối PostgreSQL |
| `CORS_ORIGIN` | Có | `https://app.example.com` | Phải đúng origin frontend |
| `JWT_PRIVATE_KEY_BASE64` | Có | Secret | PKCS#8 private key dạng Base64 |
| `JWT_PUBLIC_KEY_BASE64` | Có | Secret/config | SubjectPublicKeyInfo dạng Base64 |
| `JWT_ISSUER` | Không | `corestack-api` | Phải ổn định giữa các replica |
| `JWT_AUDIENCE` | Không | `corestack-web` | Phải khớp lúc ký và verify |
| `JWT_ACCESS_TTL_SECONDS` | Không | `900` | Thời gian sống access token |
| `REFRESH_TOKEN_TTL_DAYS` | Không | `30` | Thời gian sống session |
| `RBAC_SUPER_ADMIN_EMAIL` | Không | `owner@example.com` | Chỉ được seed sử dụng |

Tất cả backend replica phải dùng cùng key, issuer, audience và database. Đổi JWT key ngay lập tức sẽ làm access token cũ mất hiệu lực; cần có kế hoạch rotation trước khi thực hiện trong production.

## 4. Biến môi trường frontend

| Biến | Bắt buộc | Ví dụ |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Có | `https://api.example.com/api/v1` |
| `NEXT_PUBLIC_API_ORIGIN` | Có | `https://api.example.com` |

Các biến `NEXT_PUBLIC_*` được đưa vào browser bundle tại thời điểm build. Khi đổi domain API phải build lại frontend image.

Không đặt secret trong biến bắt đầu bằng `NEXT_PUBLIC_`.

## 5. Build image

Chạy từ repository root.

### Backend

```bash
docker build -t registry.example.com/corestack-backend:<version> ./backend
```

Backend Dockerfile:

- Cài dependency bằng lockfile.
- Generate Prisma Client.
- Compile TypeScript vào `dist/`.
- Prune development dependency trước runtime.
- Chạy `node dist/server.js` trên port `4000`.

### Migration

Migration dùng target riêng từ cùng backend source:

```bash
docker build \
  --target migration \
  -t registry.example.com/corestack-migration:<version> \
  ./backend
```

Image này chạy:

```text
pnpm db:migrate:deploy
```

### Frontend

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 \
  --build-arg NEXT_PUBLIC_API_ORIGIN=https://api.example.com \
  -t registry.example.com/corestack-frontend:<version> \
  ./frontend
```

Frontend được build với Next.js standalone output và chạy `node server.js` trên port `3000`.

Không dùng tag `latest` làm định danh duy nhất. Dùng commit SHA hoặc version bất biến để có thể xác định và rollback image.

## 6. Thứ tự triển khai

### Bước 1: Backup và review migration

- Đảm bảo có backup hoặc snapshot PostgreSQL phù hợp với mức độ quan trọng của dữ liệu.
- Review SQL migration mới, đặc biệt với `DROP`, đổi kiểu dữ liệu và cột `NOT NULL`.
- Không chạy `prisma migrate reset` trong production.

### Bước 2: Chạy migration job

Ví dụ với Docker:

```bash
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  registry.example.com/corestack-migration:<version>
```

Chỉ tiếp tục khi process trả exit code `0`. Nếu migration thất bại, không khởi động backend version mới.

### Bước 3: Chạy backend

```bash
docker run --rm \
  -p 4000:4000 \
  --env-file backend.production.env \
  registry.example.com/corestack-backend:<version>
```

Trong nền tảng deploy thật, inject secret từ secret manager thay vì lưu `backend.production.env` trong repository.

### Bước 4: Kiểm tra backend

Liveness:

```http
GET /health
```

Endpoint này chỉ xác nhận process HTTP đang hoạt động.

Readiness:

```http
GET /ready
```

Chỉ đưa instance vào load balancer khi `/ready` trả `200`. Endpoint này kiểm tra kết nối PostgreSQL.

### Bước 5: Chạy frontend

```bash
docker run --rm \
  -p 3000:3000 \
  registry.example.com/corestack-frontend:<version>
```

Sau khi frontend sẵn sàng, kiểm tra login, refresh session và route quản trị bằng một tài khoản thử nghiệm phù hợp.

## 7. Cookie, domain và CORS

Backend dùng refresh cookie với:

```text
HttpOnly
SameSite=Lax
Secure trong production
Path=/api/v1/auth
```

Yêu cầu triển khai:

- Frontend phải gọi đúng HTTPS API URL đã dùng khi build.
- `CORS_ORIGIN` phải bằng chính xác frontend origin và backend phải cho phép credentials.
- Frontend Axios phải giữ `withCredentials: true`.
- Nên đặt frontend và API dưới cùng một site, ví dụ `app.example.com` và `api.example.com`.

Nếu frontend và API nằm trên hai site hoàn toàn khác nhau, `SameSite=Lax` không phù hợp cho request XHR cross-site. Khi đó cần thiết kế lại cookie policy và CSRF protection; không chỉ đổi `SameSite=None` một cách riêng lẻ.

## 8. Seed RBAC

Migration chỉ tạo cấu trúc database. Seed tạo catalog role và permission.

Chạy seed khi khởi tạo môi trường mới hoặc khi catalog RBAC thay đổi:

```bash
cd backend
pnpm db:seed
```

Để bootstrap admin, user phải đăng ký trước. Sau đó đặt:

```env
RBAC_SUPER_ADMIN_EMAIL=owner@example.com
```

và chạy lại seed. Seed có thể chạy lặp lại mà không tạo bản ghi trùng.

Không chạy seed như một phần ngầm định của API startup.

## 9. Scale và shutdown

Backend không giữ access token hoặc session trong memory dùng chung; session nằm trong PostgreSQL nên có thể chạy nhiều replica.

Khi nhận `SIGTERM` hoặc `SIGINT`, backend:

1. Ngừng nhận kết nối HTTP mới.
2. Đóng HTTP server.
3. Ngắt Prisma connection.

Nền tảng deploy cần cho process đủ thời gian graceful shutdown trước khi buộc dừng container.

Frontend standalone cũng có thể chạy nhiều replica vì không lưu session server-side trong process.

## 10. Rollback

Rollback application bằng cách deploy lại backend/frontend image version trước.

Không tự động rollback migration bằng cách sửa hoặc xóa migration đã chạy. Schema mới nên được thiết kế tương thích ngược trong thời gian rollout, theo hướng:

1. Thêm cấu trúc mới theo cách tương thích.
2. Deploy code dùng được cả schema cũ và mới khi cần rolling deployment.
3. Backfill dữ liệu bằng job riêng nếu cần.
4. Chỉ xóa cấu trúc cũ trong migration sau khi mọi instance cũ đã ngừng chạy.

Nếu migration gây sự cố dữ liệu, dùng quy trình phục hồi đã được review dựa trên backup và tình trạng thực tế.

## 11. Checklist trước khi mở traffic

- [ ] Image dùng version bất biến.
- [ ] Migration job trả exit code `0`.
- [ ] Backend `/health` trả `200`.
- [ ] Backend `/ready` trả `200`.
- [ ] Frontend tải được qua HTTPS.
- [ ] `CORS_ORIGIN` đúng frontend origin.
- [ ] Refresh cookie có `HttpOnly` và `Secure`.
- [ ] Login, refresh, logout hoạt động.
- [ ] Tài khoản thiếu quyền nhận `403` ở API quản trị.
- [ ] Secret không xuất hiện trong image log hoặc frontend bundle.
- [ ] Backup và phương án rollback đã được xác nhận.

## 12. Phần chưa được cung cấp

Baseline hiện chưa có:

- CI/CD pipeline.
- Production Docker Compose.
- Kubernetes manifest.
- Reverse proxy configuration.
- Managed secret integration.
- Automated backup hoặc restore job.
- Observability ngoài process log và health endpoint.

Chỉ thêm cấu hình tương ứng khi chọn nền tảng deploy cụ thể; tránh duy trì manifest giả không được chạy kiểm chứng.

