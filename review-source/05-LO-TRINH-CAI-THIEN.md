# 05. Lộ trình cải thiện

## Nguyên tắc

- **Sửa nhỏ, mỗi việc một commit, có test đi kèm.** Hầu hết vấn đề trong báo cáo là sửa cục bộ (vài dòng đến vài chục dòng), không cần đổi kiến trúc.
- **Làm Prettier trước tiên**, trong một commit chỉ chứa định dạng. Nhờ vậy mọi commit sửa lỗi sau đó có diff đọc được.
- **Không tick README khi chưa chạy lệnh kiểm chứng.** Mỗi dòng dưới đây có cột "Kiểm chứng" để biết lúc nào được coi là xong.
- Công sức: **S** < 2 giờ, **M** nửa ngày đến 1 ngày, **L** 2–3 ngày.

## Giai đoạn 0 — Làm ngay (chặn lỗ hổng, khoảng 2–3 ngày)

| # | Việc | Mã | Công sức | Kiểm chứng |
| --- | --- | --- | --- | --- |
| 0.1 | Thêm Prettier, format toàn bộ trong một commit riêng | CODE-001 | S | `prettier --check .` pass |
| 0.2 | Sinh migration bù cho `ScheduledJob`, `JobTaskType`, `mustChangePassword`, `temporaryExpiresAt`; review SQL | DB-001 | S | DB trống + `migrate deploy` + `db:seed` + login thành công |
| 0.3 | `authorize(jobs.*)` cho mọi route jobs; Zod schema; ánh xạ `taskType → queue` ở server; cấm lập lịch `mail.send`; whitelist trường khi update | SEC-001, ERR-010 | M | Test supertest: user không role/MEMBER nhận 403 ở cả 7 route |
| 0.4 | `authorize(files.*)`; orphan stats/cleanup chỉ cho quản trị; bỏ `force` từ client | SEC-002 | S | Test: MEMBER gọi `/files/orphans/cleanup` nhận 403 |
| 0.5 | Liên kết Google vào tài khoản chưa xác minh: xóa `passwordCredential` + thu hồi session trước khi gắn; **sửa test** `google-identity-sync.test.ts:31-38` | SEC-017 | S | Test: mật khẩu do người đăng ký trước đặt không đăng nhập được sau khi nạn nhân login Google |
| 0.6 | `multer limits`; map `MulterError` và lỗi body-parser về đúng 4xx | SEC-004, ERR-019 | S | Test upload 21MB nhận 413; JSON lỗi nhận 400 |
| 0.7 | `API_PUBLIC_URL` trong env, dùng cho link đăng ký/magic link | SEC-003 | S | Test: header `Host` giả không đổi link trong payload job |
| 0.8 | Thêm `PUT` vào CORS (hoặc đổi 2 route sang `PATCH`) | ERR-001 | S | Test `OPTIONS` với `Access-Control-Request-Method: PUT` |
| 0.9 | Interceptor chỉ refresh khi request có Bearer và không thuộc route auth công khai | ERR-002 | S | Sai mật khẩu hiện thông báo, không reload |

Sau giai đoạn 0, hai vấn đề Critical và phần lớn High đã được đóng.

## Giai đoạn 1 — Trước khi deploy (khoảng 1 tuần)

| # | Việc | Mã | Công sức | Kiểm chứng |
| --- | --- | --- | --- | --- |
| 1.1 | CI: lint, typecheck, test (có service Postgres), build, `prisma migrate diff --exit-code`, `prettier --check` | TEST-001, DB-001 | M | Pipeline xanh; cố ý bỏ một migration thì pipeline đỏ |
| 1.2 | Test ma trận phân quyền theo route + test "mọi route ghi đều có authorize" | TEST-001, ARCH-003 | M | Test tự fail khi thêm route mới không có authorize |
| 1.3 | Gộp refresh vào một promise dùng chung (FE); rotation có điều kiện (BE) | ERR-003 | M | Test hai 401 song song chỉ gọi refresh một lần |
| 1.4 | Fail-fast secret/`DATABASE_URL` ở production | SEC-006 | S | `NODE_ENV=production` thiếu secret thì process thoát với thông báo rõ |
| 1.5 | Tách worker: bỏ khởi động job trong `server.ts`; khóa lịch pg-boss theo `id`; bỏ `runOnServer` | ARCH-002 | M | Chạy `server` một mình không xử lý job; hai lịch cùng queue hoạt động độc lập |
| 1.6 | Sửa handler pg-boss nhận `Job[]`; reset `started` khi `boss.start()` lỗi | ERR-004, ERR-008 | S | Test qua `job.registry` với payload `retentionDays: 1` |
| 1.7 | Quên mật khẩu xóa cờ mật khẩu tạm | ERR-017 | S | Test: mật khẩu tạm hết hạn → reset → đăng nhập được |
| 1.8 | `softDelete` có điều kiện; cleanup xóa DB trước, storage sau; log lỗi thay vì `catch {}` | ERR-005, ERR-020, OPS-005 | M | Test xóa song song không làm `referenceCount` âm hoặc về 0 sai |
| 1.9 | Không đưa OTP/token/mật khẩu tạm vào payload job (truyền id, worker tự sinh/đọc) | SEC-008 | M | Bảng job của pg-boss không chứa secret |
| 1.10 | Dockerfile frontend nhận `NEXT_PUBLIC_API_URL`; `output: "standalone"`; backend có bước migrate và volume storage (hoặc R2) | OPS-001, OPS-002 | M | Build image với URL thật, gọi API thành công |
| 1.11 | Thay `xlsx` bằng bản SheetJS chính thức đã vá | SEC-009 | S | `pnpm audit` không còn cảnh báo xlsx |
| 1.12 | Rà lại README: bỏ tick các mục chưa đúng, ghi lý do; sửa `docs/architecture/*` theo code | DOC-001 | S | Mentor đối chiếu từng mục `[x]` với lệnh kiểm chứng |
| 1.13 | Tài liệu hóa `TRUST_PROXY`; cảnh báo khi phát hiện `X-Forwarded-For` mà chưa bật | OPS-003 | S | — |

## Giai đoạn 2 — Phiên bản sau (hoàn thiện nghiệp vụ và chất lượng)

| # | Việc | Mã |
| --- | --- | --- |
| 2.1 | Trần quyền: chỉ cấp permission actor đang có; cân nhắc bỏ kế thừa theo rank | SEC-015 |
| 2.2 | Rank policy cho `PATCH /users/:id` | SEC-007 |
| 2.3 | Gán MEMBER mặc định khi tạo user; API gửi lại email xác minh; OTP/magic link set `emailVerifiedAt` | ERR-006, ERR-007 |
| 2.4 | Luồng phục hồi khi chạm giới hạn session | ERR-018 |
| 2.5 | Chặn API (trừ đổi mật khẩu/logout) khi `mustChangePassword` | SEC-016 |
| 2.6 | Phân trang danh sách user; đồng bộ policy mật khẩu FE = BE; đọc localStorage trong `useEffect` | ERR-009, ERR-014, ERR-015 |
| 2.7 | Google không ghi đè tên do user đã sửa | ERR-011 |
| 2.8 | Một nguồn catalog permission; xóa dead code; quyết định số phận import Markdown | CODE-002, CODE-003, ERR-022 |
| 2.9 | Tách `file-manager.tsx`, `role-manager.tsx`, `jobs-manager.tsx` dưới 300 dòng | CODE-001 |
| 2.10 | Controller không gọi Prisma; page không gọi axios trực tiếp | CODE-006 |
| 2.11 | Index `File.objectId`, CHECK `referenceCount >= 0`, unique cho khóa lịch; làm rõ đặc tả retention | DB-002, DB-005 |
| 2.12 | Cập nhật đặc tả mục 32 theo quyết định gỡ OTP/magic link, hoặc tắt endpoint bằng cờ env | ARCH-004 |
| 2.13 | Prune `states` của Google OAuth theo TTL, giới hạn kích thước Map, rate limit `GET /auth/google` | SEC-005 |
| 2.14 | Các mục Low còn lại: SEC-010, SEC-012, SEC-013, SEC-014, ERR-012, ERR-013, ERR-016, ERR-021, CODE-004, CODE-005, OPS-004, DB-003, DB-004 | — |

## Giai đoạn 3 — Khi tăng trưởng (chỉ làm khi có nhu cầu thật)

| Tín hiệu cần chờ | Việc khi tín hiệu xuất hiện | Mã |
| --- | --- | --- |
| Cần chạy ≥ 2 instance API | Chuyển OAuth state/handoff vào bảng DB; rate limit dùng store chung | ARCH-001 |
| File lớn hoặc nhiều download đồng thời | Stream upload/download (hoặc presigned URL của R2) | PERF-002 |
| Query phân quyền thành nghẽn (đo được) | Cache permission theo request/TTL ngắn | PERF-001 |
| Có yêu cầu bảo mật cao hơn | Refresh token qua cookie httpOnly + SameSite; absolute session timeout | SEC-011, DB-004 |
| Cần điều tra sự cố thường xuyên | Logger JSON (pino), request log kèm requestId, metrics | SEC-013, OPS-004 |

## KHÔNG nên làm lúc này

| Đừng làm | Vì sao |
| --- | --- |
| Chuyển sang microservices hoặc tách service auth riêng | Một người phát triển, một DB, chưa có tải. Chi phí vận hành tăng gấp nhiều lần mà không giải quyết lỗi nào trong báo cáo |
| Viết lại bằng NestJS hoặc đổi ORM | Lỗi hiện tại là thiếu kiểm tra và thiếu quy trình, không phải do framework |
| Thêm Redis, Kafka, Kubernetes | PostgreSQL + pg-boss đủ cho quy mô này; Redis chỉ cần khi có ≥ 2 instance (giai đoạn 3) |
| Chuyển RBAC sang ABAC/Casbin/OPA | Chỉ cần làm cho 26 permission hiện có **thật sự được kiểm tra** ở server |
| Dựng event bus/CQRS | `core/events/event-bus.ts` đang là dead code; thêm tầng trừu tượng chỉ làm khó đọc hơn |
| Đuổi theo % coverage | Viết test theo rủi ro (phân quyền, liên kết tài khoản, race) có giá trị hơn nhiều so với tăng coverage cho code UI |
| Viết lại toàn bộ frontend | Chỉ cần tách các component quá lớn; kiến trúc feature-based hiện tại là đúng |
