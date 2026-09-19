# 12. Lộ trình cải thiện

Nguyên tắc xây dựng lộ trình: **sửa nền trước khi thêm tính năng**; mỗi bước nhỏ, có test bảo vệ, không viết lại toàn bộ. Ước lượng công sức tính theo người-ngày cho một lập trình viên đã quen codebase; chỉ mang tính tham khảo.

## 1. Cần xử lý ngay (trước mọi việc khác)

| #   | Việc                                                                                                                                                  | Mã               | Lý do                                           | Ưu tiên | Phụ thuộc                                        | Kết quả mong đợi                                                                | Ước lượng |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------- | ------- | ------------------------------------------------ | ------------------------------------------------------------------------------- | --------- |
| 1.1 | Sinh migration bù cho `ScheduledJob`, `JobTaskType`, `mustChangePassword`, `temporaryExpiresAt`; thêm `prisma migrate diff` vào script `db:check`     | DB-001           | Không có nó, không môi trường mới nào chạy được | P0      | Cần Postgres local                               | `migrate deploy` trên DB trống → seed → login thành công                        | 0.5 ngày  |
| 1.2 | Thêm `authorize(jobs.*)` cho toàn bộ `job.routes.ts`; Zod schema create/update; ánh xạ `taskType → queue` cố định ở server, bỏ nhận `queue` từ client | SEC-001, ERR-010 | Leo thang quyền, gửi mail tuỳ ý                 | P0      | Thêm hằng `JOBS_*` vào `permission.constants.ts` | MEMBER gọi `/jobs/*` → 403; ADMIN không thể chọn queue `mail.send`              | 1 ngày    |
| 1.3 | `authorize(files.*)` cho `file.routes.ts`; orphan stats/cleanup yêu cầu `system.settings.update`; cân nhắc bỏ `force`                                 | SEC-002          | Phá retention, lộ thống kê                      | P0      | 1.2 (pattern)                                    | Test ma trận authorize pass                                                     | 0.5 ngày  |
| 1.4 | Thêm `API_PUBLIC_URL` (bắt buộc ở production) và dùng cho link đăng ký/magic link                                                                     | SEC-003          | Chiếm tài khoản                                 | P0      | —                                                | Link trong mail không phụ thuộc Host header                                     | 0.5 ngày  |
| 1.5 | Bắt buộc `ACCESS_TOKEN_SECRET`, `DATABASE_URL` khi `NODE_ENV=production` (fail-fast)                                                                  | SEC-006          | Secret công khai                                | P0      | —                                                | Server từ chối khởi động khi thiếu                                              | 0.25 ngày |
| 1.6 | Thêm `PUT` vào CORS methods (hoặc bỏ tuỳ chọn)                                                                                                        | ERR-001          | 2 tính năng hỏng                                | P0      | —                                                | Lưu quyền vai trò và mẫu email hoạt động từ trình duyệt                         | 0.1 ngày  |
| 1.7 | Sửa interceptor: chỉ refresh/redirect khi request có Bearer và không thuộc route public; một promise refresh dùng chung                               | ERR-002, ERR-003 | Sai mật khẩu reload; logout ngẫu nhiên          | P0      | —                                                | Test interceptor: 401 login không redirect; 3 request 401 song song → 1 refresh | 1 ngày    |
| 1.8 | `multer limits.fileSize`; map `MulterError` → 413                                                                                                     | SEC-004          | OOM                                             | P0      | —                                                | Upload 21MB → 413 trước khi buffer                                              | 0.25 ngày |
| 1.9 | Prune `states` theo TTL; `authRateLimit` cho `GET /auth/google` và `POST /auth/refresh`                                                               | SEC-005          | Memory leak                                     | P0      | —                                                | Map không tăng vô hạn                                                           | 0.25 ngày |

Tổng nhóm 1: ~4.5 ngày. Sau nhóm này, hệ thống mới "đúng" ở mức cơ bản.

## 2. Cần xử lý trước khi deploy production

| #    | Việc                                                                                                                                                   | Mã                | Lý do                    | Ưu tiên | Phụ thuộc        | Kết quả mong đợi                                           | Ước lượng |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------ | ------- | ---------------- | ---------------------------------------------------------- | --------- |
| 2.1  | Sửa handler registry nhận `Job[]` và truyền `job.data`; test qua mock boss                                                                             | ERR-004           | Payload lịch vô tác dụng | P1      | 1.2              | `retentionDays` từ UI có hiệu lực                          | 0.5 ngày  |
| 2.2  | Đảo thứ tự cleanup: DB trước (transaction, kiểm `referenceCount`), storage sau; log lỗi; batch `take: 500`                                             | ERR-005           | Mất file vật lý          | P1      | —                | Test race upload/cleanup                                   | 0.5 ngày  |
| 2.3  | `POST /auth/register/resend`; cho đăng ký lại khi chưa verify; OTP/magic link set `emailVerifiedAt`                                                    | ERR-006           | Tài khoản kẹt            | P1      | —                | Test luồng hết hạn → resend → verify                       | 1 ngày    |
| 2.4  | Gán MEMBER mặc định (env `DEFAULT_ROLE`) trong transaction tạo user                                                                                    | ERR-007           | User mới không quyền     | P1      | —                | User mới thấy Files/Sessions                               | 0.25 ngày |
| 2.5  | `jobService.start()` reset khi reject + retry backoff; `/health` kiểm DB + boss                                                                        | ERR-008, OPS-004  | Mail chết sau boot lỗi   | P1      | —                | Boot trước Postgres vẫn tự hồi phục                        | 0.5 ngày  |
| 2.6  | Rank policy cho `PATCH /users/:id`; giới hạn permission có thể cấp/override ⊆ permission của actor                                                     | SEC-007           | Leo thang mềm            | P1      | —                | ADMIN không sửa SUPER_ADMIN; không cấp quyền mình không có | 0.5 ngày  |
| 2.7  | Job mail nhận `challengeId`/`userId` thay vì secret; `deleteAfterSeconds` ngắn cho `mail.send`                                                         | SEC-008           | OTP trong DB             | P1      | 2.1              | Bảng pgboss không chứa OTP/mật khẩu tạm                    | 1 ngày    |
| 2.8  | Dockerfile FE: ARG/ENV, copy config hoặc standalone; Dockerfile BE: stage migrate, `USER node`, HEALTHCHECK; compose profile dev có api/worker/mailhog | OPS-001, OPS-002  | Image không dùng được    | P1      | 1.1              | `docker compose --profile dev up` chạy đủ                  | 1 ngày    |
| 2.9  | CI: lint/typecheck/test/build cho 2 app + migrate diff                                                                                                 | TEST-001, DOC-001 | Chặn hồi quy             | P1      | 1.1              | PR không merge khi đỏ                                      | 0.5 ngày  |
| 2.10 | Test ma trận authorize theo route; test jobs/files API qua HTTP                                                                                        | TEST-001          | Bảo vệ 1.2/1.3           | P1      | 1.2, 1.3         | ~40 test case tham số hoá                                  | 1 ngày    |
| 2.11 | Prettier toàn repo (commit riêng), `max-lines`, lint-staged                                                                                            | CODE-001          | Không review được        | P1      | —                | 0 file một dòng; lint pass                                 | 0.5 ngày  |
| 2.12 | Sửa `error: any` + `console.error`; xoá `package-lock.json`; pin `react-icons`; thay `xlsx`                                                            | CODE-004, SEC-009 | Lint/audit               | P1      | 2.11             | `pnpm lint`, `pnpm audit` sạch                             | 0.5 ngày  |
| 2.13 | Cập nhật README/docs theo thực tế; bỏ tick chưa verify; tài liệu `TRUST_PROXY`, biến bắt buộc                                                          | DOC-001, OPS-003  | Đúng sự thật             | P1      | Sau các mục trên | Checklist khớp CI                                          | 0.5 ngày  |

Tổng nhóm 2: ~8.5 ngày.

## 3. Nên cải thiện trong phiên bản tiếp theo

| #    | Việc                                                                                                                                                          | Mã                   | Lý do                        | Ưu tiên | Phụ thuộc | Kết quả mong đợi             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------- | ------- | --------- | ---------------------------- |
| 3.1  | Permission registry duy nhất; seed và constants sinh từ đó; FE nhận nhóm từ API                                                                               | CODE-002             | Drift                        | P2      | 1.2       | Thêm quyền = sửa 1 file      |
| 3.2  | Chuyển nghiệp vụ khỏi controller (auth OTP/magic, mail, user.me); dùng repository nhất quán                                                                   | CODE-006             | Tầng rõ, test dễ             | P2      | 2.11      | Controller ≤ 10 dòng/handler |
| 3.3  | Tách `file-manager.tsx`, `role-manager.tsx`, `jobs-manager.tsx` thành component ≤ 300 dòng; `Modal` dùng chung; `getApiErrorMessage` dùng chung; bỏ `alert()` | CODE-001, trùng lặp  | Bảo trì                      | P2      | 2.11      | Không file > 500 dòng        |
| 3.4  | Xoá dead code (danh sách CODE-003); hoàn thiện hoặc bỏ import markdown; bỏ `runOnServer`; bỏ Device nếu không gửi fingerprint                                 | CODE-003, ERR-013    | Gọn                          | P2      | —         | `knip` sạch                  |
| 3.5  | Phân trang users (và files) đầu-cuối; tìm kiếm server-side                                                                                                    | ERR-009              | Đúng dữ liệu                 | P2      | —         | Thấy toàn bộ user            |
| 3.6  | `ScheduledJob.queue` unique hoặc schedule key theo id; tách worker khỏi API (cờ `JOBS_INPROCESS`)                                                             | ARCH-002             | Lịch không ghi đè            | P2      | 1.2       | Docs jobs khớp code          |
| 3.7  | Lưu OAuth state/handoff vào DB (bảng có TTL)                                                                                                                  | ARCH-001             | Scale ngang, restart an toàn | P2      | —         | 2 instance API chạy OAuth ổn |
| 3.8  | Logger JSON + request logger + requestId; log lỗi job; alert mail thất bại                                                                                    | SEC-013, OPS-004     | Vận hành                     | P2      | —         | Điều tra sự cố được          |
| 3.9  | Đồng bộ policy mật khẩu FE/BE; sửa modal 8→12; `settings/page.tsx` bắt lỗi; `AuthProvider` context thay đọc localStorage trong render                         | ERR-014, ERR-015     | UX/hydration                 | P2      | 1.7       | Không hydration warning      |
| 3.10 | Không ghi đè displayName khi Google login                                                                                                                     | ERR-011              | Dữ liệu người dùng           | P2      | —         |                              |
| 3.11 | Thay parser markdown thủ công bằng `react-markdown` + `remark-gfm` (+ plugin callout); lọc `javascript:`                                                      | SEC-011, độ phức tạp | Bớt 900 dòng                 | P2      | —         |                              |
| 3.12 | Absolute session lifetime; `CHECK` constraints; index `File.objectId`                                                                                         | DB-004, DB-002       | Toàn vẹn                     | P2      | 1.1       |                              |

## 4. Có thể cân nhắc khi hệ thống tăng trưởng

| Việc                                       | Khi nào                                               | Ghi chú                   |
| ------------------------------------------ | ----------------------------------------------------- | ------------------------- |
| Refresh token trong cookie httpOnly + CSRF | Khi có nhiều người dùng thật / yêu cầu bảo mật cao    | Đổi mô hình FE            |
| Cache permission theo user (TTL 30–60s)    | Khi P95 latency tăng do 3 query/request               | Invalidate ở user.service |
| Redis cho rate limit/handoff               | Khi >2 instance và DB-store không đủ                  | Chưa cần                  |
| Stream download/upload, presigned URL R2   | Khi file lớn hơn 20MB hoặc băng thông API là nút thắt |                           |
| argon2 trong worker thread                 | Khi >50 login/giây                                    |                           |
| OpenAPI + client sinh tự động              | Khi FE/BE tách team                                   | Spec mục 31 đã gợi ý      |
| Audit API/UI, export audit                 | Khi cần compliance                                    |                           |
| Tách `oauth` thành package dùng lại        | Khi có dự án thứ hai                                  | Gỡ vòng auth↔users trước  |

## 5. Những phần chưa nên tối ưu hoặc viết lại

| Phần                                                    | Vì sao giữ nguyên                                                                                                                         |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline `authService.complete` + strategies            | Thiết kế đúng, có test; chỉ cần tách OTP/magic request vào service                                                                        |
| `challengeService` (sau khi thay ternary bằng bảng tra) | Logic one-time-use/attempt đúng                                                                                                           |
| Mô hình `File`/`StoredObject`/`referenceCount`          | Đúng; chỉ sửa thứ tự cleanup                                                                                                              |
| `super-admin-bootstrap.service.ts`                      | Mẫu tốt về advisory lock                                                                                                                  |
| `email-template.service.ts`                             | Merge an toàn, validate biến, có test                                                                                                     |
| `R2Storage`                                             | Có inject client, có test                                                                                                                 |
| Cấu trúc thư mục frontend `features/*`                  | Đúng hướng; chỉ cần tách component lớn                                                                                                    |
| pg-boss trên Postgres                                   | Không đổi sang BullMQ/Redis                                                                                                               |
| Toàn bộ dự án                                           | **Không viết lại từ đầu**: ~70% code nền dùng được; chi phí sửa (~13 ngày cho nhóm 1+2) thấp hơn nhiều so với viết lại và lặp lại sai lầm |

## 6. Trình tự thực hiện gợi ý (sprint)

1. **Sprint 0 (2 ngày)**: Prettier + CI khung + migration bù (1.1, 2.9, 2.11). Lý do làm format trước: mọi PR sau đó mới review được.
2. **Sprint 1 (1 tuần)**: nhóm 1 còn lại + test ma trận authorize (2.10).
3. **Sprint 2 (1 tuần)**: nhóm 2 (2.1–2.8, 2.12, 2.13).
4. **Sprint 3+**: nhóm 3 theo thứ tự 3.1 → 3.2 → 3.3 → 3.4, xen kẽ với tính năng mới.
