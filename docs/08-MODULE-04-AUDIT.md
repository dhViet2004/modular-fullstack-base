# Module 04 - Audit Log

Module này ghi lại các hành động bảo mật và quản trị quan trọng để có thể trả lời: ai đã làm gì, với đối tượng nào, kết quả ra sao và vào thời điểm nào.

Audit log không thay thế application log. Application log phục vụ vận hành và debug; audit log là dữ liệu nghiệp vụ có cấu trúc, được lưu bền vững và không được chỉnh sửa qua API.

## 1. Phạm vi

Module hoàn chỉnh cần hỗ trợ:

- Lưu audit event dạng append-only trong PostgreSQL.
- Ghi nhận đăng nhập thành công và thất bại.
- Ghi nhận logout thành công khi xác định được session.
- Ghi nhận khóa/mở khóa user.
- Ghi nhận gán hoặc gỡ role.
- API quản trị đọc danh sách audit log có phân trang.
- Frontend quản trị hiển thị audit log cho tài khoản có quyền.
- Không lưu password, token, hash credential hoặc secret trong audit data.

Chưa nằm trong phạm vi:

- Export CSV.
- Gửi log sang SIEM hoặc data warehouse.
- Retention job tự động.
- Full-text search.
- Generic event bus.
- Cho phép sửa hoặc xóa audit log qua API.

## 2. Nguyên tắc

### Append-only

Application chỉ được `create` và `read` audit log. Model không có `updatedAt`; module không cung cấp repository update/delete.

Database administrator vẫn có thể sửa dữ liệu trực tiếp, nên append-only ở baseline là ranh giới của application, chưa phải tamper-proof storage.

### Không phụ thuộc foreign key

Audit log phải còn đọc được sau khi user, session hoặc role nguồn đã bị xóa. Vì vậy các định danh như `actorUserId`, `sessionId` và `subjectId` được lưu dưới dạng snapshot, không tạo foreign key có cascade.

### Không để audit làm lộ secret

Không ghi vào `metadata`:

- Password hoặc password hash.
- Access token, refresh token hoặc refresh token hash.
- JWT private/public key.
- Cookie hoặc nguyên `Authorization` header.
- Request body chưa được lọc.

Metadata phải được tạo rõ ràng cho từng event, không truyền thẳng object request vào audit service.

## 3. Event catalog

Action dùng chuỗi ổn định theo định dạng `DOMAIN_ACTION`.

| Action | Outcome | Actor | Subject |
| --- | --- | --- | --- |
| `AUTH_LOGIN_SUCCEEDED` | `SUCCESS` | User đăng nhập | Session mới |
| `AUTH_LOGIN_FAILED` | `FAILURE` | User nếu xác định được | Tài khoản được thử đăng nhập |
| `AUTH_LOGOUT_SUCCEEDED` | `SUCCESS` | User của session | Session bị revoke |
| `USER_SUSPENDED` | `SUCCESS` | Admin thực hiện | User bị khóa |
| `USER_ACTIVATED` | `SUCCESS` | Admin thực hiện | User được mở khóa |
| `USER_ROLE_ASSIGNED` | `SUCCESS` | Admin thực hiện | User nhận role |
| `USER_ROLE_REMOVED` | `SUCCESS` | Admin thực hiện | User bị gỡ role |

Không tạo event cho mọi request đọc. Chỉ ghi sự kiện có giá trị bảo mật hoặc thay đổi trạng thái nghiệp vụ.

## 4. Mô hình dữ liệu

Model mục tiêu:

```prisma
enum AuditOutcome {
  SUCCESS
  FAILURE
}

model AuditLog {
  id          String       @id @default(uuid()) @db.Uuid
  action      String       @db.VarChar(100)
  outcome     AuditOutcome
  actorUserId String?      @db.Uuid
  subjectType String?      @db.VarChar(50)
  subjectId   String?      @db.VarChar(100)
  sessionId   String?      @db.Uuid
  ipAddress   String?      @db.VarChar(45)
  userAgent   String?      @db.VarChar(512)
  metadata    Json?
  createdAt   DateTime     @default(now())

  @@index([createdAt])
  @@index([action, createdAt])
  @@index([actorUserId, createdAt])
  @@index([subjectType, subjectId, createdAt])
}
```

### Ý nghĩa field

| Field | Ý nghĩa |
| --- | --- |
| `action` | Mã event ổn định từ catalog |
| `outcome` | Hành động thành công hay thất bại |
| `actorUserId` | User thực hiện hành động, nullable khi chưa xác thực được |
| `subjectType` | Loại đối tượng như `USER`, `SESSION` hoặc `ROLE` |
| `subjectId` | ID snapshot của đối tượng chịu tác động |
| `sessionId` | Session liên quan nếu có |
| `ipAddress` | Địa chỉ nguồn đã chuẩn hóa |
| `userAgent` | User-Agent đã giới hạn độ dài |
| `metadata` | Chi tiết không nhạy cảm, có cấu trúc theo từng action |
| `createdAt` | Thời điểm event được ghi |

Không thêm `updatedAt`, relation Prisma hoặc soft-delete field khi chưa có yêu cầu retention.

## 5. Transaction policy

Audit của một mutation quan trọng phải nằm trong cùng database transaction với mutation đó.

Ví dụ:

```text
Tạo session đăng nhập
  + ghi AUTH_LOGIN_SUCCEEDED
  -> cùng commit hoặc cùng rollback
```

```text
Gán role
  + ghi USER_ROLE_ASSIGNED
  -> cùng commit hoặc cùng rollback
```

Failed login không có mutation nghiệp vụ để rollback. Backend ghi `AUTH_LOGIN_FAILED` trước khi trả lỗi xác thực. Nếu database không ghi được audit event, lỗi phải được đưa tới error middleware và operational log; không giả vờ event đã được lưu.

Không dùng fire-and-forget Promise cho audit write.

## 6. Request context

Controller hoặc middleware HTTP chỉ trích xuất context tối thiểu:

```ts
type AuditRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};
```

Service nghiệp vụ quyết định `action`, actor, subject và metadata. Audit repository chỉ ghi record đã được service chuẩn hóa.

Khi ứng dụng chạy sau reverse proxy, chỉ tin `X-Forwarded-For` sau khi Express `trust proxy` được cấu hình đúng cho hạ tầng thật. Baseline không tự tin mọi forwarded header từ internet.

## 7. Cấu trúc module

```text
backend/src/modules/audit/
├── audit.catalog.ts
├── audit.repository.ts
├── audit.service.ts
├── audit.routes.ts
├── audit.controller.ts
├── audit.schema.ts
└── audit.service.test.ts
```

Chỉ tạo từng file khi bắt đầu use case cần nó. Bước ghi event ban đầu chưa cần route hoặc controller đọc.

Dependency vẫn giữ:

```text
Route -> Controller -> Service -> Repository -> Prisma
```

Module nghiệp vụ gọi audit service; không gọi Prisma audit trực tiếp.

## 8. API quản trị mục tiêu

```http
GET /api/v1/audit-logs
```

Yêu cầu:

```text
Authentication: Bearer access token
Permission: audit:read
```

Query tối thiểu:

| Query | Yêu cầu |
| --- | --- |
| `cursor` | Không bắt buộc, ID hoặc cursor opaque của trang trước |
| `limit` | Mặc định `50`, tối đa `100` |
| `action` | Không bắt buộc, phải thuộc event catalog |
| `actorUserId` | Không bắt buộc, UUID hợp lệ |

Baseline dùng cursor pagination theo `(createdAt, id)`, sắp xếp mới nhất trước. Không dùng offset pagination cho bảng log tăng liên tục.

Response không trả metadata nhạy cảm vì dữ liệu nhạy cảm không được phép ghi từ đầu.

## 9. Permission

Bổ sung permission:

```text
audit:read
```

Chỉ role `ADMIN` nhận permission này trong seed. Frontend dùng permission để ẩn/hiện liên kết; backend vẫn bắt buộc chạy `authenticate` và `authorize("audit:read")`.

Không tạo permission ghi audit vì audit event được tạo nội bộ từ business service, không có public API tạo event tùy ý.

## 10. Frontend mục tiêu

Route:

```text
/admin/audit-logs
```

Màn hình tối thiểu hiển thị:

- Thời gian.
- Action và outcome.
- Actor.
- Subject.
- IP address.
- Nút tải trang tiếp theo.

Không render raw JSON metadata thành HTML. Nếu hiển thị metadata, dùng text đã escape và chỉ mở chi tiết khi người dùng yêu cầu.

## 11. Test bắt buộc

### Audit service/repository

- Ghi đúng action và outcome.
- Metadata không nhận field ngoài cấu trúc event cho phép.
- Audit log không có thao tác update/delete trong repository.

### Authentication integration

- Login thành công tạo session và audit event.
- Login sai tạo `AUTH_LOGIN_FAILED` nhưng vẫn trả `INVALID_CREDENTIALS`.
- Audit write thất bại không để mutation quan trọng commit một nửa.
- Logout hợp lệ tạo event đúng session.

### Authorization/API

- Chưa đăng nhập nhận `401`.
- Thiếu `audit:read` nhận `403`.
- Có permission nhận danh sách phân trang.
- `limit` vượt mức hoặc filter sai nhận validation error.

### Frontend

- Không gọi API khi user thiếu permission.
- Hiển thị loading, empty, error và next-page state.

## 12. Thứ tự triển khai

1. Thêm `AuditOutcome` và `AuditLog` vào Prisma schema.
2. Tạo và review migration append-only.
3. Thêm event catalog và permission `audit:read`.
4. Cập nhật seed cho permission mới.
5. Tạo audit repository/service và test.
6. Tích hợp login/logout với transaction policy.
7. Tạo API đọc audit log có cursor pagination.
8. Tạo frontend `/admin/audit-logs`.
9. Chạy Prisma generate, migration, seed và toàn bộ backend/frontend verification.
10. Đồng bộ API docs, database docs, checklist và roadmap.

## 13. Definition of Done

Module hoàn thành khi:

- Audit record là append-only ở application layer.
- Mutation bảo mật quan trọng và audit event không commit lệch nhau.
- Không có credential hoặc token trong audit data.
- Permission `audit:read` được backend thực thi.
- API phân trang ổn định và có validation.
- Frontend chỉ hiển thị cho user có quyền.
- Test bao phủ success, failure, `401`, `403` và transaction failure.
- Migration, seed, lint, typecheck, test và build đều pass.
- Tài liệu và checklist được cập nhật theo implementation thật.
