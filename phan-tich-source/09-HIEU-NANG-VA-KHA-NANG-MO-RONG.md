# 09. Hiệu năng và khả năng mở rộng

Lưu ý: không có môi trường chạy nên toàn bộ là phân tích định tính từ code. Không có con số đo thực.

## 1. Query, API và xử lý dữ liệu

### 1.1 Chi phí mỗi request được bảo vệ

| Bước | Query | Ghi chú |
| --- | --- | --- |
| `authenticate` | `session.findFirst(id, revokedAt null, expiresAt > now) include user` | 1 query, dùng PK; `include user` không cần thiết cho authenticate (chỉ dùng `session.userId`) |
| `authorize` | `user.findUniqueOrThrow include roles.role, permissionOverrides.permission` + `role.findMany(rank <= max) include permissions.permission` | 2 query (Prisma sinh thêm query con cho include lồng) |
| Nghiệp vụ | tuỳ | |

Tổng: **3–5 round-trip DB trước nghiệp vụ**. Với vài trăm người dùng đồng thời và Postgres cùng mạng, mỗi round-trip ~0.5–2 ms → chấp nhận được. Khi tăng, giải pháp rẻ nhất: cache permission set theo user trong bộ nhớ với TTL 30–60 giây và invalidate khi đổi role/override (các thao tác này đều đi qua `user.service` nên dễ đặt hook). Chưa cần Redis.

### 1.2 N+1 và truy vấn nặng

- Không phát hiện N+1 thật sự: Prisma `include` gom theo lô.
- `userService.list`: `findMany include roles.role` + `count` — ổn, có phân trang (FE không dùng).
- `fileRepository.list`: **không phân trang**, `include object` — user có hàng nghìn file sẽ nặng (Low).
- `mailController.list`: `count where entityType` không có index → chậm dần khi AuditLog lớn (Low).
- `updateInactiveUsersJob`: anti-join trên sessions; `Session` có index `(userId, revokedAt, expiresAt)` nhưng không có `lastActiveAt` → quét theo user; chạy 1 lần/tháng nên chấp nhận được.
- `cleanupOrphans`: `findMany` toàn bộ orphan đủ điều kiện rồi xử lý tuần tự từng object (mỗi object: 1 storage delete + 1 transaction 3 query). Với hàng chục nghìn orphan sẽ chạy lâu nhưng là job nền; không có giới hạn batch → nếu có 1 triệu orphan sẽ load tất cả vào RAM (Low, tiềm ẩn).

### 1.3 Xử lý dữ liệu trong RAM

| Điểm | Vấn đề | Mã |
| --- | --- | --- |
| Upload | multer buffer toàn bộ, không giới hạn | SEC-004 |
| Download | `readFile` → Buffer → `res.send`; R2 `transformToByteArray` | PERF-002; 20MB × N request đồng thời |
| Import markdown | Nội dung (tới 20MB) vào payload job (JSON trong Postgres) | PERF-002 |
| `sha256(buffer)` | Đồng bộ trên main thread; 20MB ~ 30–60 ms | Chấp nhận được |
| argon2 | CPU-bound ~50–100 ms/lần với tham số mặc định | Login/đăng ký/đổi mật khẩu; ổn ở quy mô nhỏ, cần cân nhắc worker thread khi >50 login/giây |

## 2. Cache, queue và background job

- **Cache**: không có ở bất kỳ tầng nào (không HTTP cache header, không in-memory). Với dashboard gọi 6 API mỗi lần mở, `staleTime: 30s` của TanStack Query giúp phía client.
- **Queue**: pg-boss trên Postgres. Ưu điểm: không thêm hạ tầng, giao dịch cùng DB. Nhược điểm: polling (mặc định vài giây) → độ trễ gửi mail vài giây; tải ghi vào Postgres tăng theo số job. Ở quy mô base project là lựa chọn đúng.
- **Worker**: chạy cả trong API process và (tuỳ chọn) `worker.ts`. Nghĩa là API process cũng gửi SMTP, xoá file — CPU/IO của API bị chia sẻ. Khi tải tăng, tách worker là bước đầu tiên (chỉ cần bỏ 3 dòng trong `server.ts` và deploy `worker.ts` riêng).
- **Retry**: không cấu hình `retryLimit/retryDelay/expireInSeconds` cho queue nào → dùng mặc định pg-boss. Mail thất bại vì SMTP tạm lỗi sẽ retry rất ít lần rồi "failed" im lặng. Không có dead-letter xử lý.
- **Idempotency**: handler cleanup/audit là idempotent; `mail.send` không (retry có thể gửi trùng) — chấp nhận được cho OTP.

## 3. Khả năng chịu tải hiện tại (ước lượng định tính)

| Thành phần | Giới hạn thực tế | Nguyên nhân |
| --- | --- | --- |
| API | Một process Node, không cluster | `server.ts` `app.listen` đơn; scale dọc bằng CPU nhanh hơn |
| Đăng nhập | ~10–20 login/giây/CPU | argon2 |
| Upload | Bị giới hạn bởi RAM (không limits) | SEC-004 |
| OAuth | Bộ nhớ tăng theo số lần bắt đầu OAuth | SEC-005 |
| DB | Một Postgres, pool mặc định Prisma (num_cpus×2+1) | Không cấu hình `connection_limit` |
| Rate limit | Bộ nhớ process | Sai lệch khi nhiều instance |

## 4. Điểm nghẽn

1. **Trạng thái in-memory** (ARCH-001): chặn scale ngang trước cả khi hiệu năng là vấn đề.
2. **Scheduler in-process** (ARCH-002): mỗi instance API đều gọi `boss.schedule` (idempotent, pg-boss chỉ chạy một lần mỗi cron) — không sai, nhưng mỗi instance cũng `work()` mọi queue.
3. **argon2 + sha256 trên event loop**: khi tải cao sẽ làm tăng latency mọi request khác.
4. **Không phân trang file list**, **không giới hạn batch cleanup**.
5. **`authorize` 2 query mỗi request** (PERF-001).

## 5. Khả năng scale dọc và ngang

- **Dọc**: dễ. Tăng CPU/RAM; bật `node --max-old-space-size`; dùng `cluster` hoặc PM2 (nhưng cluster cũng làm bể trạng thái in-memory giữa các worker process!).
- **Ngang** (nhiều instance sau load balancer): **hiện không thể** vì `states`, `handoffs`, rate limit. Đường ngắn nhất không cần Redis:
  - Lưu OAuth `state`+`verifier` và handoff payload vào bảng (ví dụ `VerificationChallenge` với type mới, hoặc bảng `OAuthState`) với TTL; đây là DB write nhẹ.
  - Rate limit: chuyển sang store Postgres (có package) hoặc chấp nhận per-instance.
  - Storage: dùng R2 (đã có) thay local.
  - Worker: deploy `worker.ts` riêng, tắt in-process ở API.

## 6. Những tối ưu chưa cần thiết ở quy mô hiện tại

| Không nên làm bây giờ | Lý do |
| --- | --- |
| Thêm Redis cho cache/rate limit/session | Postgres đủ; thêm hạ tầng tăng chi phí vận hành cho một base project |
| Chuyển sang microservice / tách auth service | Quy mô nhỏ; vòng phụ thuộc auth↔users cần gỡ trước |
| CDN/streaming phức tạp cho download | File ≤20MB, người dùng ít |
| Full-text search cho users/files | Chưa có yêu cầu |
| Tối ưu `permissionService.resolve` bằng SQL recursive | 2 query là đủ |

Ngược lại, những việc **rẻ và nên làm ngay** vì vừa là lỗi vừa là hiệu năng: `multer limits` (SEC-004), prune `states` (SEC-005), phân trang file list, batch cleanup (`take: 500`), bỏ `include user` trong `authenticate`, dedupe refresh ở FE (ERR-003), tránh gọi `/users/me` hai lần khi mở dashboard.
