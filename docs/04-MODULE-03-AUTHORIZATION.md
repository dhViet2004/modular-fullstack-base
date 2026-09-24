# Module 03 - Phân quyền RBAC

Module này bổ sung authorization cho CoreStack sau khi authentication đã xác định được người dùng và session hiện tại.

Authentication trả lời:

```text
Người gửi request là ai?
```

Authorization trả lời:

```text
Người đó có quyền thực hiện hành động này không?
```

## 1. Kết quả cần đạt

Sau khi hoàn thành, backend cần có:

- Mô hình `Role`, `Permission`, `UserRole` và `RolePermission` trong PostgreSQL.
- Hai role nền tảng `ADMIN` và `MEMBER` được tạo bằng seed.
- Permission catalog tập trung, có kiểu TypeScript rõ ràng.
- Repository và service lấy tập quyền hiệu lực của user.
- Middleware `authorize(permission)` chạy sau `authenticate`.
- Route quản trị luôn khai báo permission cần thiết tại route.
- Test cho các trường hợp `401`, `403` và request được phép.
- Test phát hiện route ghi hoặc route quản trị bị thiếu authorization khi phù hợp.

Không nằm trong phạm vi module này:

- Giao diện quản trị role và permission.
- Role hierarchy hoặc suy luận quyền dựa trên cấp bậc role.
- Permission tùy ý do frontend gửi lên.
- Attribute-based access control (ABAC).
- Quyền theo từng tenant, organization hoặc project.
- Audit log; module audit sẽ được triển khai sau RBAC.

## 2. Nguyên tắc thiết kế

### 2.1 Backend là nguồn quyết định cuối cùng

Frontend có thể ẩn nút theo permission để cải thiện trải nghiệm, nhưng backend vẫn phải chạy middleware authorization cho mọi route được bảo vệ.

Không tin dữ liệu như sau từ client:

```json
{
  "role": "ADMIN",
  "permission": "users:suspend"
}
```

Backend lấy user từ `request.auth`, sau đó tự đọc role và permission từ database.

### 2.2 Không dùng role rank

Không áp dụng luật dạng:

```text
ADMIN > MANAGER > MEMBER
```

Mỗi route yêu cầu permission cụ thể. Role chỉ là nhóm permission.

Ví dụ:

```text
ADMIN
  -> users:read
  -> users:update
  -> users:suspend
  -> roles:manage

MEMBER
  -> profile:read:self
  -> profile:update:self
```

### 2.3 Không nhét permission vào access token ở baseline

Access token hiện chỉ chứa `sub` và `sid`. Middleware authorization đọc quyền từ database để:

- Thay đổi role có hiệu lực ngay ở request tiếp theo.
- Không cần chờ JWT hết hạn.
- Không tạo JWT lớn khi permission tăng lên.
- Tránh dữ liệu quyền trong token bị lỗi thời.

Đổi lại, request cần authorization sẽ có thêm truy vấn database. Chỉ thêm cache khi có bằng chứng hiệu năng thực tế.

## 3. Mô hình dữ liệu

Quan hệ mục tiêu:

```text
User --< UserRole >-- Role --< RolePermission >-- Permission
```

Một user có thể có nhiều role. Một role có thể thuộc nhiều user. Một role có nhiều permission và một permission có thể thuộc nhiều role.

### `Role`

| Field | Kiểu | Mục đích |
| --- | --- | --- |
| `id` | UUID | Khóa chính nội bộ |
| `code` | String, unique | Mã ổn định như `ADMIN`, `MEMBER` |
| `name` | String | Tên hiển thị |
| `description` | String, nullable | Mô tả phạm vi role |
| `createdAt` | DateTime | Thời điểm tạo |
| `updatedAt` | DateTime | Thời điểm cập nhật |

### `Permission`

| Field | Kiểu | Mục đích |
| --- | --- | --- |
| `id` | UUID | Khóa chính nội bộ |
| `code` | String, unique | Mã ổn định như `users:read` |
| `description` | String, nullable | Giải thích quyền |
| `createdAt` | DateTime | Thời điểm tạo |
| `updatedAt` | DateTime | Thời điểm cập nhật |

### `UserRole`

| Field | Kiểu | Mục đích |
| --- | --- | --- |
| `userId` | UUID | User được gán role |
| `roleId` | UUID | Role được gán |
| `createdAt` | DateTime | Thời điểm gán |

Khóa chính ghép `(userId, roleId)` ngăn gán trùng cùng một role cho user.

### `RolePermission`

| Field | Kiểu | Mục đích |
| --- | --- | --- |
| `roleId` | UUID | Role nhận permission |
| `permissionId` | UUID | Permission được gán |
| `createdAt` | DateTime | Thời điểm gán |

Khóa chính ghép `(roleId, permissionId)` ngăn gán trùng permission.

Các bảng nối dùng `onDelete: Cascade` để quan hệ tương ứng được dọn khi user, role hoặc permission bị xóa. Baseline không cung cấp API xóa role/permission.

## 4. Permission catalog tối thiểu

Permission code dùng định dạng:

```text
resource:action[:scope]
```

Catalog ban đầu:

| Permission | Ý nghĩa |
| --- | --- |
| `profile:read:self` | Đọc hồ sơ của chính mình |
| `profile:update:self` | Cập nhật hồ sơ của chính mình |
| `users:read` | Xem danh sách hoặc chi tiết user |
| `users:update` | Cập nhật user khác |
| `users:suspend` | Khóa hoặc mở khóa user |
| `roles:manage` | Gán role và quản lý cấu hình RBAC |

Permission catalog phải được khai báo tập trung trong module `access`. Route và seed cùng dùng catalog này; không viết lại chuỗi permission rải rác.

## 5. Role mặc định

### `MEMBER`

```text
profile:read:self
profile:update:self
```

### `ADMIN`

```text
profile:read:self
profile:update:self
users:read
users:update
users:suspend
roles:manage
```

User đăng ký mới sẽ được gán role `MEMBER` trong cùng transaction với việc tạo user và password credential. Không dùng luồng tạo user xong rồi mới gán role bằng hai thao tác độc lập.

User admin đầu tiên được xác định qua seed hoặc quy trình bootstrap tin cậy, không nhận role từ request đăng ký công khai.

## 6. Cấu trúc module

```text
backend/src/modules/access/
├── permission.catalog.ts
├── access.repository.ts
├── access.service.ts
└── access.service.test.ts

backend/src/middleware/
├── authenticate.middleware.ts
└── authorize.middleware.ts
```

Chỉ tạo controller và route quản trị role khi bắt đầu use case quản trị thật. Middleware authorization không cần controller riêng.

## 7. Luồng authorization

Route khai báo rõ permission:

```ts
router.get(
  "/users",
  authenticate,
  authorize("users:read"),
  listUsersController,
);
```

Luồng thực thi:

```text
Request
  -> authenticate
  -> xác minh JWT và session
  -> gắn request.auth.user
  -> authorize("users:read")
  -> đọc permission hiệu lực từ database
  -> có quyền: next()
  -> thiếu quyền: 403 FORBIDDEN
  -> controller
```

`authorize` luôn đứng sau `authenticate`. Thiếu hoặc sai access token trả `401`; user hợp lệ nhưng thiếu quyền trả `403`.

## 8. Repository và service

### Repository

Repository cung cấp thao tác dữ liệu tối thiểu:

```ts
findPermissionCodesByUserId(userId)
userHasPermission(userId, permissionCode)
```

Baseline ưu tiên truy vấn tồn tại trực tiếp cho middleware thay vì tải toàn bộ role graph nếu route chỉ cần kiểm tra một permission.

Repository không biết Express, HTTP status hoặc response format.

### Service

Service nhận user ID và permission code từ catalog:

```ts
assertUserHasPermission(userId, permission)
```

Nếu thiếu quyền, service throw:

```text
403 FORBIDDEN
```

Service không nhận `Request` hoặc `Response` của Express.

## 9. Middleware `authorize`

API mục tiêu:

```ts
authorize(permission)
```

Đây là higher-order function: nhận permission khi khai báo route và trả về một Express middleware.

Middleware thực hiện:

1. Đọc `request.auth.user.id` do `authenticate` tạo.
2. Gọi access service để kiểm tra permission.
3. Có quyền thì gọi `next()`.
4. Thiếu quyền thì để `ApplicationError(403)` đi tới error middleware.

Không đọc role hoặc permission từ body, query hay header do client tự gửi.

## 10. Test bắt buộc

### Service test

- User có permission được chấp nhận.
- User thiếu permission nhận `403 FORBIDDEN`.
- Permission code truyền vào phải thuộc catalog TypeScript.

### Middleware test

- Request chưa authenticate nhận `401` từ authenticate middleware.
- User đã authenticate nhưng thiếu quyền nhận `403`.
- User có quyền gọi được controller.
- Middleware dùng user ID từ `request.auth`, không dùng dữ liệu client.

### Route matrix test

Khi có route quản trị, test phải chứng minh:

```text
Không đăng nhập       -> 401
Đăng nhập thiếu quyền -> 403
Có permission         -> 2xx
```

Nên bổ sung test bắt route ghi hoặc route quản trị thiếu `authorize` khi số lượng route bắt đầu tăng.

## 11. Thứ tự triển khai

1. Chốt tài liệu và permission catalog.
2. Thêm các model RBAC vào Prisma schema.
3. Tạo và review migration, không reset database.
4. Cập nhật seed idempotent cho role và permission nền tảng.
5. Gán role `MEMBER` nguyên tử khi đăng ký user mới.
6. Tạo access repository và service.
7. Tạo `authorize` middleware.
8. Viết service, middleware và route matrix tests.
9. Chạy format, lint, typecheck, test, build và migration verification.
10. Cập nhật checklist và roadmap sau khi verification pass.

## 12. Definition of Done

Module chỉ hoàn thành khi:

- Schema và migration RBAC an toàn, không phá dữ liệu hiện tại.
- Seed có thể chạy lặp lại mà không tạo role/permission trùng.
- User đăng ký mới luôn có role `MEMBER`.
- Backend kiểm tra permission thật, không chỉ ẩn UI.
- `401` và `403` được phân biệt đúng.
- Các trường hợp cho phép và từ chối đều có test.
- Backend format, lint, typecheck, test và build đều pass.
- Prisma generate, migration deploy và seed đều pass.
- `git diff --check` pass.
- `CHECKLIST.md` và `README.md` phản ánh đúng trạng thái đã kiểm chứng.
