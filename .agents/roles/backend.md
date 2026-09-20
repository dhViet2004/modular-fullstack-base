# Backend Agent Rules

## Phạm vi

Áp dụng cho mọi task thay đổi file trong `backend/`, Prisma schema/migration hoặc backend service trong `docker-compose.yml`.

Trước khi triển khai, đọc `AGENTS.md`, `CODEX_PROJECT_SETUP.md`, phase liên quan trong `CHECKLIST.md` và tài liệu backend tương ứng trong `docs/`.

## Công nghệ

Backend dùng Express, TypeScript ESM, Prisma, PostgreSQL, Zod, Vitest và Supertest.

## Kiến trúc

Dependency direction bắt buộc:

```text
Route → Controller → Service → Repository → Prisma
```

### Route

- Chỉ khai báo HTTP method, URL, middleware và controller.
- Gắn validation, authentication và authorization phù hợp.
- Không đọc hoặc biến đổi request body.
- Không gọi service, repository hoặc Prisma trực tiếp.
- Mỗi route phải xác định rõ actor hoặc permission được phép gọi.

### Controller

- Đọc input đã được validate từ request.
- Gọi service method tương ứng.
- Chuyển kết quả service thành HTTP response thống nhất.
- Không chứa business logic.
- Không gọi repository hoặc Prisma trực tiếp.

### Service

- Chứa use case và business rule.
- Không phụ thuộc `Request` hoặc `Response` của Express.
- Phối hợp repository và integration cần thiết.
- Throw application error thay vì tự gửi HTTP response.
- Với thao tác ghi, phải xem xét concurrent request và tính nguyên tử.

### Repository

- Là nơi duy nhất trong module gọi Prisma.
- Không biết Express, HTTP status hoặc response format.
- Ưu tiên unique constraint, conditional update và transaction thay cho luồng check-then-act không nguyên tử.

## Validation và authorization

- Validation dùng Zod schema và middleware.
- Backend là nơi authorization cuối cùng; việc ẩn UI không thay thế authorization server-side.
- Mọi route quản trị và route ghi phải có authentication/authorization phù hợp, trừ route auth công khai được xác định rõ.
- Không tin dữ liệu điều khiển từ client như queue name, role, permission, storage key hoặc public URL.
- Test phải có cả ca thành công và ca bị từ chối.

## Error handling

- Dùng format response và application error thống nhất.
- Validation error trả 400, authentication error trả 401, authorization error trả 403.
- Không biến lỗi 4xx của thư viện thành 500.
- Không trả stack trace hoặc thông tin nội bộ cho client.
- Map lỗi giới hạn upload thành 413 khi triển khai upload.

## Security

- Không log password, token, OTP, secret hoặc credential.
- Không đưa OTP, token hoặc mật khẩu vào job payload.
- Production phải fail-fast khi thiếu secret, `DATABASE_URL` hoặc cấu hình bắt buộc.
- Không dựng public URL từ request `Host`; dùng URL từ cấu hình đã validate.
- Upload phải giới hạn dung lượng trước khi buffer.
- Mọi thao tác check-then-act phải được đánh giá race condition.

## TypeScript ESM

- Relative import trong TypeScript NodeNext dùng extension `.js`.
- Không dùng CommonJS `require` trong source ESM.
- Tránh `any`; dùng `unknown` và narrow type khi xử lý lỗi hoặc input chưa tin cậy.

## Database

Khi thay đổi `backend/prisma/schema.prisma`:

1. Tạo migration tương ứng.
2. Review migration SQL.
3. Generate Prisma Client.
4. Cập nhật seed nếu cần.
5. Viết hoặc cập nhật test.
6. Verify migration trên database trống khi phù hợp.
7. Kiểm tra schema và migration không bị drift.

Không dùng `db push` thay cho migration cần commit. Không reset database hoặc chạy migration phá hủy dữ liệu nếu chưa được người dùng cho phép.

## API và worker

- `server.ts` chỉ chạy HTTP API.
- `worker.ts` chạy background jobs và scheduler.
- API chỉ enqueue; worker mới xử lý job.
- Không khởi động worker trong API process.
- Client không được tự chọn queue hoặc job handler nội bộ.

## Testing

Thay đổi liên quan đến auth, permission, database, validation, API response, persistence hoặc security phải có test tương ứng.

Ưu tiên:

- Integration test qua HTTP bằng Supertest.
- Negative test cho authentication và authorization.
- Test concurrent request cho thao tác nhạy cảm.
- Test migration/seed trên PostgreSQL thật khi thay đổi persistence.
- Test bắt route ghi mới thiếu `authorize` khi module authorization được triển khai.

## Verification

Chạy các lệnh phù hợp trong `backend/`:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Khi thay đổi Prisma:

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
```

Cuối cùng chạy tại repository root:

```bash
git diff --check
```

Không báo pass cho lệnh chưa chạy. Nếu không chạy một lệnh vì không liên quan hoặc bị chặn, ghi rõ lý do trong báo cáo.
