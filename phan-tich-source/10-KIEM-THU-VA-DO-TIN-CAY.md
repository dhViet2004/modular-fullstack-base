# 10. Kiểm thử và độ tin cậy

## 1. Test hiện có

Backend: 17 file, ~1.015 dòng. Frontend: 2 file, ~100 dòng. Không chạy được trong môi trường phân tích (không có `node_modules`, không có Postgres), nên các nhận xét dưới đây là từ việc đọc test.

| File | Loại | Cần DB | Nội dung | Nhận xét |
| --- | --- | --- | --- | --- |
| `integration/auth.test.ts` | HTTP (supertest) | Có | login ok, chỉ lưu hash; handoff exchange một lần; sai mật khẩu → 401 + audit; blocked → 403; session limit 5; refresh sai → 401; audit logout/revoke; access token chết ngay sau revoke | Tốt, bao phủ spec mục 39 |
| `integration/challenges.test.ts` | Service + HTTP | Có | OTP hết hạn/đã dùng; magic link một lần; OTP/magic qua pipeline chung tạo identity | Tốt; nhưng test "qua pipeline" tạo challenge **không có userId** nên đi nhánh upsert; nhánh `result.userId` (thực tế hay gặp) không được test |
| `integration/files.test.ts` | Service | Có + storage local | dedup cùng hash; object còn tham chiếu không bị xoá; orphan mới giữ, cũ xoá | Tốt; **không có** test storage lỗi dù README tick "Storage failure handled" |
| `integration/google-identity-sync.test.ts` | Service | Có | tạo user lần đầu; cùng `sub` → cùng user; liên kết với tài khoản password sẵn có | Tốt |
| `integration/password-reset.test.ts` | HTTP | Có | không lộ email; đổi mật khẩu + OTP một lần | Tốt |
| `integration/registration.test.ts` | HTTP | Có | đăng ký chưa verify chặn login; verify một lần; link hết hạn | Tốt |
| `integration/health.test.ts` | HTTP | Không | `/health` envelope | Ổn |
| `unit/rbac.test.ts` | Unit, mock Prisma | Không | policy; kế thừa rank; override; role CRUD rank rule | Tốt về policy; phần service mock Prisma sâu |
| `unit/temporary-password.test.ts` | Unit, mock 6 module | Không | reset mật khẩu tạm; hết hạn; đổi mật khẩu xoá cờ | Nhiều `vi.mock`, dễ vỡ khi refactor |
| `unit/scheduled-jobs.test.ts` | Unit, spy Prisma | Không | handler audit/inactive; triggerNow | Test handler trực tiếp, **không qua registry** nên không bắt ERR-004 |
| `unit/file-service.test.ts` | Unit, spy | Không | MIME fallback; từ chối loại; quá size; reuse | Tốt |
| `unit/r2-storage.test.ts` | Unit, mock client | Không | endpoint; thiếu cấu hình; put/delete; exists 404 vs lỗi mạng | Tốt, mẫu tốt về inject client |
| `unit/email-template.test.ts` | Unit | Không | 3 mẫu; escape HTML | Tốt |
| `unit/mail-schema.test.ts`, `unit/markdown.test.ts`, `unit/security.test.ts`, `unit/super-admin-bootstrap.test.ts` | Unit | Không | schema; normalize; argon2/sha/otp; allowlist | Ổn |
| FE `lib/axios/__tests__/client.test.ts` | Unit | — | instance tồn tại; `apiError` | Không test hành vi interceptor |
| FE `features/files/utils/markdown-converter.test.ts` | Unit | — | TSV/CSV → MD; extract table; Google Docs HTML | Ổn |

## 2. Chất lượng và độ bao phủ thực tế

### 2.1 Điểm tốt

- Có cả integration (HTTP thật qua supertest) lẫn unit; test đặt tên rõ theo hành vi.
- Các bất biến bảo mật quan trọng được test: hash-only, one-time-use, revoke tức thì, session limit, handoff một lần.
- `vitest.config.ts` ép `DATABASE_URL` test riêng và tắt song song file để tránh xung đột.

### 2.2 Vấn đề

| Vấn đề | Bằng chứng | Hệ quả |
| --- | --- | --- |
| **Không có test nào ở tầng route cho authorize** | Không test gọi `/api/v1/users/*` với user thiếu quyền; không test `/files/*`, `/jobs/*` qua HTTP | SEC-001, SEC-002, SEC-007 lọt qua "test pass" |
| Không test CORS/PUT | — | ERR-001 |
| Không test interceptor FE (401 sai mật khẩu, refresh song song) | `client.test.ts` chỉ kiểm tra instance | ERR-002, ERR-003 |
| Không test registry pg-boss | `scheduled-jobs.test.ts` gọi handler trực tiếp | ERR-004 |
| Không test thứ tự cleanup vs upload đồng thời | `files.test.ts` tuần tự | ERR-005 |
| Không test storage failure | README tick | Sai lệch tài liệu |
| Integration test phụ thuộc schema DB thật | Nếu DB test dựng bằng migration → lỗi cột `mustChangePassword` (DB-001) | Test chỉ pass khi DB dựng bằng `db push` |
| `deleteMany()` toàn bảng trong `beforeEach` | `files.test.ts`, `auth.test.ts` | Nguy hiểm nếu trỏ nhầm DB (DB-003) |
| Mock Prisma bằng `vi.mock` toàn module | `rbac.test.ts`, `temporary-password.test.ts` | Test gắn với chi tiết implementation (`findUniqueOrThrow` vs `findUnique`), refactor sang repository sẽ vỡ test |
| Không có coverage report/threshold | `vitest run` không `--coverage` | Không biết độ phủ thật |
| Không CI | Không `.github/workflows` | Test không chạy tự động |

Ước lượng độ phủ theo luồng (không phải theo dòng):

| Luồng | Phủ |
| --- | --- |
| Login password/OTP/magic/refresh/logout | Tốt |
| Google OAuth strategy (state, PKCE, id_token) | Không (chỉ handoff và identity sync) |
| Đăng ký/xác minh/reset | Tốt |
| RBAC policy | Tốt |
| RBAC enforcement qua HTTP | Không |
| Users CRUD/block qua HTTP | Không |
| Files upload qua HTTP (multer, MIME) | Không (chỉ service) |
| Jobs API | Không |
| Mail send/template qua HTTP | Không (chỉ schema/merge) |
| Frontend components | Không |

## 3. Luồng quan trọng chưa được kiểm thử (ưu tiên)

1. **Ma trận authorize**: với mỗi route × {không token, MEMBER, ADMIN, SUPER_ADMIN} → mã trạng thái mong đợi. Một test tham số hoá ~40 dòng bắt được SEC-001/002/007 và ngăn tái phát.
2. **Jobs API**: MEMBER tạo lịch → 403; ADMIN tạo lịch `queue` không thuộc taskType → 400; payload được truyền tới handler.
3. **Refresh**: thành công + rotation; refresh hai lần song song với cùng token (định nghĩa hành vi mong muốn).
4. **Cleanup orphan**: storage.delete ném lỗi → object còn nguyên, có log; upload cùng hash trong lúc cleanup.
5. **Register → resend/verify hết hạn** (sau khi thêm resend).
6. **Google strategy** với mock `fetch` và JWKS (jose cho phép `createLocalJWKSet`).
7. **Frontend**: interceptor (msw hoặc mock adapter) cho 401 ở `/auth/login` không redirect; 401 ở `/users` → 1 refresh duy nhất; `usePermissions`; `parseMarkdownToElements` (đã có converter test nhưng previewer chưa).
8. **E2E** (Playwright) tối thiểu: đăng ký → verify (đọc link từ mailbox giả như MailHog) → login → upload → xoá → orphan stats.

## 4. Unit / integration / E2E cần bổ sung (đề xuất cấu trúc)

```
backend/tests/
  unit/            (thuần: policy, schema, template, parser, url builder)
  integration/     (HTTP + DB test container; dùng testcontainers hoặc docker compose profile test)
    authz.matrix.test.ts
    jobs.api.test.ts
    files.api.test.ts   (multer limits, MIME, download attachment)
    users.api.test.ts   (PATCH policy, pagination)
    cleanup.race.test.ts
  contract/        (snapshot response envelope theo docs/api)
frontend/
  src/lib/axios/__tests__/interceptors.test.ts
  src/lib/auth/__tests__/use-permission.test.ts
  e2e/ (playwright)
```

Kèm `vitest --coverage` với ngưỡng tối thiểu cho `modules/auth`, `modules/users` (ví dụ 80% dòng), và CI chạy `lint → typecheck → test → build` cho cả hai app.

## 5. Khả năng phục hồi khi thành phần ngoài gặp lỗi

| Thành phần | Khi lỗi | Hành vi hiện tại | Đánh giá |
| --- | --- | --- | --- |
| PostgreSQL chết | Mọi request cần `authenticate` | Prisma ném → 500 `INTERNAL_ERROR`; `/health` vẫn 200 | Health không phản ánh (OPS-004); không circuit breaker (chấp nhận được) |
| PostgreSQL chưa sẵn sàng lúc boot | `boss.start()` reject | API vẫn chạy, nhưng mọi `send()` sau đó lỗi vĩnh viễn | ERR-008 |
| SMTP lỗi | `mail.send` job | pg-boss retry mặc định rồi failed; không alert; `/mail/send` (đồng bộ) trả 500 + audit MAIL_FAILED | Không có dead-letter/monitor |
| Storage local đầy/không ghi được | `storage.put` ném | Upload 500; không rollback gì (chưa tạo record) — an toàn | OK |
| R2 lỗi | `put/get` ném | Upload/download 500; cleanup nuốt lỗi và thử lại lần sau | OK nhưng im lặng |
| Google/JWKS không truy cập được | callback | Bắt lỗi → redirect FE `?error=…` | OK |
| Frontend mất mạng | Axios reject | Query báo lỗi; `retry: 1` | OK |
| Process API restart | Map in-memory mất | OAuth đang dở → "Invalid OAuth state"; handoff chưa exchange → 401 | ARCH-001 |

Graceful shutdown: `server.ts` đóng HTTP, dừng boss, disconnect Prisma trên SIGINT/SIGTERM — tốt. `worker.ts` tương tự (không disconnect Prisma, nhỏ).

## 6. Kết luận về độ tin cậy

Bộ test hiện tại bảo vệ tốt **các bất biến bên trong** (hash, one-time, policy) nhưng gần như **không bảo vệ bề mặt API** — đúng chỗ các lỗi nghiêm trọng nhất nằm. Đây là bài học lớn: test theo "đơn vị" là chưa đủ khi rủi ro nằm ở cách các đơn vị được lắp ráp (route + middleware + service).
