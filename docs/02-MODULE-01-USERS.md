# Module 01 - Nền tảng người dùng

Tài liệu này hướng dẫn tự code module nghiệp vụ đầu tiên của CoreStack. Phạm vi của module là tạo nền tảng định danh cho `User` và lớp truy cập dữ liệu dùng cho các bước xác thực tiếp theo.

Đây chưa phải module đăng ký/đăng nhập. Không tạo endpoint công khai để liệt kê hoặc tạo người dùng trong bước này vì backend chưa có authentication và authorization.

## 1. Kết quả cần đạt

Sau khi hoàn thành, backend cần có:

- `User` model đủ thông tin định danh cơ bản.
- Migration Prisma có thể áp dụng trên PostgreSQL trống.
- Module `users` tuân theo hướng `service → repository → Prisma`.
- Use case tạo user và tìm user theo email/id để module `auth` sử dụng sau này.
- Quy tắc chuẩn hóa email và xử lý email trùng lặp.
- Test cho cả trường hợp thành công và trường hợp bị từ chối.
- Tất cả lệnh verification backend liên quan đều pass.

Không nằm trong phạm vi:

- Băm mật khẩu, đăng ký và đăng nhập.
- Session, refresh token và logout.
- Role, permission và route quản trị user.
- Email verification, reset password và OAuth.
- Frontend.

## 2. Đọc code hiện tại

Trước khi sửa, đọc các file sau theo thứ tự:

1. `backend/prisma/schema.prisma` để xem `User` baseline.
2. `backend/src/core/database/prisma.ts` để dùng chung Prisma Client.
3. `backend/src/app.ts` và `backend/src/routes/index.ts` để hiểu cách mount route.
4. `backend/src/core/http/api-response.ts` và `backend/src/middleware/error.middleware.ts` để biết response/error hiện tại.
5. `backend/tests/integration/health.test.ts` để theo convention Vitest hiện có.

Không tạo Prisma Client mới trong module. Mọi truy vấn phải dùng client chung trong `core/database`.

## 3. Chốt thiết kế trước khi code

Mở rộng `User` theo mục tiêu tối thiểu sau:

| Field | Kiểu gợi ý | Mục đích |
| --- | --- | --- |
| `id` | UUID | Định danh nội bộ, giữ như baseline |
| `email` | String, unique | Định danh đăng nhập đã được chuẩn hóa |
| `displayName` | String, nullable | Tên hiển thị; chưa bắt buộc khi tạo identity |
| `status` | Enum | Trạng thái tài khoản, mặc định `ACTIVE` |
| `emailVerifiedAt` | DateTime, nullable | `null` nghĩa là email chưa xác minh |
| `createdAt` | DateTime | Thời điểm tạo |
| `updatedAt` | DateTime | Thời điểm cập nhật |

Enum ban đầu chỉ cần:

```prisma
enum UserStatus {
  ACTIVE
  SUSPENDED
}
```

Chưa thêm `passwordHash` trong module này. Field đó thuộc bước `auth/password`, khi chính sách password và cách tạo credential được triển khai cùng test.

Quy ước email:

- Service nhận email từ use case và chuẩn hóa bằng `trim().toLowerCase()`.
- Repository nhận email đã chuẩn hóa; repository không lặp lại business rule.
- Unique constraint trong database là lớp bảo vệ cuối cùng cho request đồng thời.
- Không dùng luồng `find → nếu chưa có thì create` như cách duy nhất để ngăn trùng lặp.

## 4. Bước 1 - Mở rộng Prisma schema

Sửa `backend/prisma/schema.prisma`:

1. Thêm enum `UserStatus`.
2. Thêm `displayName`, `status` và `emailVerifiedAt` vào `User`.
3. Giữ `email` unique, `id` là UUID và hai timestamp hiện tại.
4. Dùng tên field camelCase; không đổi tên bảng/cột baseline nếu không cần.

Kiểm tra schema ngay sau khi sửa:

```powershell
cd backend
pnpm exec prisma format
pnpm exec prisma validate
pnpm db:generate
```

Checkpoint: cả ba lệnh phải pass trước khi tạo migration.

## 5. Bước 2 - Tạo và review migration

Đảm bảo PostgreSQL development đang chạy:

```powershell
# Chạy tại repository root
docker compose up -d postgres
docker compose ps
```

Sau đó chuyển vào `backend/` và tạo migration:

```powershell
cd backend
pnpm db:migrate --name extend_user_identity
```

Mở file `backend/prisma/migrations/<timestamp>_extend_user_identity/migration.sql` và tự review:

- Chỉ có thay đổi enum/cột đúng phạm vi.
- `status` có default hợp lệ để migration không làm hỏng row `User` cũ.
- Cột nullable không bị tạo thành `NOT NULL` ngoài ý muốn.
- Unique index của `email` vẫn còn.
- Không có `DROP TABLE`, `DROP COLUMN` hoặc xóa dữ liệu.

Không dùng `prisma db push` thay cho migration cần commit. Không chạy `prisma migrate reset`.

Checkpoint: migration SQL an toàn và database development đã áp dụng migration thành công.

## 6. Bước 3 - Tạo module users nhỏ nhất

Tạo cấu trúc:

```text
backend/src/modules/users/
├── user.repository.ts
├── user.service.ts
└── user.types.ts
```

Chỉ tạo `user.types.ts` nếu type input/output được dùng ở cả repository, service hoặc test. Chưa tạo route/controller/schema HTTP vì module này chưa có public API.

### Repository

Trong `user.repository.ts`, triển khai các thao tác tối thiểu:

```ts
findUserById(id)
findUserByEmail(email)
createUser(data)
```

Yêu cầu:

- Import Prisma Client chung bằng relative import có đuôi `.js`.
- Chỉ file repository được gọi Prisma trong module.
- `createUser` chỉ nhận các field được phép tạo; không nhận trực tiếp một object tùy ý từ request.
- Không trả password/secret khi module auth được mở rộng sau này.
- Không biết Express, HTTP status hay response format.

### Service

Trong `user.service.ts`, triển khai các use case tối thiểu:

```ts
getUserById(id)
getUserByEmail(email)
createUser(input)
```

Yêu cầu của `createUser`:

1. Chuẩn hóa email.
2. Chuẩn hóa `displayName`: trim; chuỗi rỗng trở thành `null`.
3. Gọi repository để tạo user.
4. Chuyển lỗi unique email của Prisma thành lỗi ứng dụng có ý nghĩa.
5. Không nhận `Request`/`Response` của Express.

Nếu project chưa có application error phù hợp, dùng test để dẫn dắt một lớp error tối thiểu trong `core/http`. Không đưa HTTP status vào repository.

Checkpoint: `rg "prisma\." backend/src/modules/users` chỉ tìm thấy lời gọi Prisma trong repository.

## 7. Bước 4 - Viết test trước khi thêm API

Ưu tiên test service bằng cách inject hoặc mock các hàm repository. Cần bao phủ ít nhất:

1. Tạo user thành công với email đã trim và lowercase.
2. `displayName` rỗng được chuyển thành `null`.
3. Email trùng lặp trả về application error mong đợi.
4. Tìm user theo email sử dụng email đã chuẩn hóa.
5. Repository tạo đúng tập field cho phép.

Sau đó thêm integration test database nếu cấu hình test hiện tại cho phép dùng PostgreSQL riêng. Integration test cần chứng minh unique constraint vẫn chặn hai user cùng email, kể cả khi service bị gọi gần đồng thời.

Không dùng database development chung cho test có thao tác xóa/làm sạch dữ liệu. Nếu chưa có test database riêng, ghi rõ phần integration database là chưa được verify; không tự động reset database.

Đặt test gần module hoặc trong `backend/tests/` theo convention bạn chốt, nhưng chỉ dùng một convention cho các module tiếp theo.

Checkpoint: test phải thất bại nếu bỏ chuẩn hóa email hoặc bỏ xử lý unique conflict.

## 8. Bước 5 - Xác nhận ranh giới module

Trước khi verify, tự review bằng các câu hỏi:

- Có file nào ngoài repository gọi Prisma để truy cập `User` không?
- Service có phụ thuộc Express không?
- Email có được chuẩn hóa tại một nơi rõ ràng không?
- Database unique constraint có phải lớp bảo vệ cuối cùng không?
- Có vô tình thêm public route tạo/liệt kê user khi chưa có RBAC không?
- Test có cả ca thành công và ca trùng email không?
- Migration có giữ dữ liệu baseline không?

Nếu câu trả lời không đạt, sửa trong phạm vi module trước khi sang auth.

## 9. Bước 6 - Verification bắt buộc

Chạy trong `backend/`:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:generate
pnpm db:migrate:deploy
```

Nếu thay đổi seed thì chạy thêm:

```powershell
pnpm db:seed
```

Cuối cùng, chạy tại repository root:

```powershell
git diff --check
git status --short
```

Không đánh dấu checklist `[x]` nếu một verification liên quan chưa pass. Nếu integration test database chưa chạy được, giữ task ở `[~]` hoặc `[ ]` và ghi rõ lý do.

## 10. Definition of Done

Module 01 chỉ hoàn thành khi:

- Schema và migration phản ánh đúng thiết kế identity tối thiểu.
- Migration deploy được trên PostgreSQL.
- Repository/service có ranh giới đúng kiến trúc.
- Chuẩn hóa email và unique conflict đã có test.
- Không có public users endpoint thiếu authentication/authorization.
- Backend format, lint, typecheck, test và build đều pass.
- `git diff --check` pass.
- `CHECKLIST.md` được cập nhật trung thực.

## 11. Bước tiếp theo sau module này

Sau khi Module 01 pass, bắt đầu `auth/password` theo một vertical slice nhỏ:

1. Chốt password policy và thêm dependency hash password.
2. Thêm credential field/model bằng migration.
3. Tạo schema validation cho register/login.
4. Tạo repository, service, controller và route auth.
5. Test không làm lộ password/hash và test email trùng lặp.

Không bắt đầu session, RBAC hoặc frontend trước khi register/login backend đã được verify.
