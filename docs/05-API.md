# API Reference

Tài liệu này mô tả HTTP API hiện có của CoreStack. Nội dung được đồng bộ với route, schema validation, controller và middleware trong backend.

## 1. Thông tin chung

Base URL khi chạy local:

```text
http://localhost:4000
```

Base URL cho business API:

```text
http://localhost:4000/api/v1
```

Request body dùng JSON:

```http
Content-Type: application/json
```

Các request dùng refresh token cần cho phép gửi cookie. Frontend Axios đã cấu hình:

```ts
withCredentials: true
```

## 2. Response format

### Thành công

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

### Thất bại

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Thông báo lỗi"
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Không dùng nội dung `message` để điều khiển logic frontend. Frontend nên xử lý theo `error.code`.

## 3. Authentication

Hệ thống dùng hai token:

| Token | Cách gửi | Mục đích |
| --- | --- | --- |
| Access token | `Authorization: Bearer <token>` | Gọi API được bảo vệ |
| Refresh token | Cookie `refresh_token` | Xin access token mới và logout |

Access token được trả trong JSON sau login/refresh. Refresh token chỉ được gửi bằng cookie `HttpOnly`; JavaScript frontend không đọc được giá trị này.

## 4. Tổng hợp endpoint

| Method | Endpoint | Authentication | Permission |
| --- | --- | --- | --- |
| `GET` | `/health` | Public | Không |
| `GET` | `/ready` | Public | Không |
| `GET` | `/api/v1` | Public | Không |
| `POST` | `/api/v1/auth/register` | Public | Không |
| `POST` | `/api/v1/auth/login` | Public | Không |
| `POST` | `/api/v1/auth/refresh` | Refresh cookie | Không |
| `POST` | `/api/v1/auth/logout` | Refresh cookie nếu có | Không |
| `GET` | `/api/v1/auth/me` | Bearer access token | Không |
| `GET` | `/api/v1/users` | Bearer access token | `users:read` |

## 5. System API

### `GET /health`

Liveness endpoint. Chỉ xác nhận HTTP process đang hoạt động; không kiểm tra PostgreSQL.

Response `200`:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "api"
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

### `GET /ready`

Readiness endpoint. Kiểm tra backend có truy cập được PostgreSQL hay không.

Response `200`:

```json
{
  "success": true,
  "data": {
    "status": "ready",
    "dependencies": {
      "database": "up"
    }
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Response `503`:

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Dịch vụ tạm thời chưa sẵn sàng"
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

### `GET /api/v1`

Trả thông tin định danh API.

Response `200`:

```json
{
  "name": "CoreStack API",
  "version": "v1"
}
```

Endpoint này là ngoại lệ chưa dùng envelope `success/data/meta`.

## 6. Register

### `POST /api/v1/auth/register`

Tạo user, password credential và gán role `MEMBER` trong cùng thao tác Prisma.

Request:

```json
{
  "email": "user@example.com",
  "password": "CorrectHorse123!",
  "displayName": "Nguyễn Văn A"
}
```

Validation:

| Field | Yêu cầu |
| --- | --- |
| `email` | Email hợp lệ, tối đa 254 ký tự |
| `password` | Từ 12 đến 128 ký tự |
| `displayName` | Không bắt buộc, từ 1 đến 100 ký tự sau khi trim |

Backend chuẩn hóa email bằng `trim().toLowerCase()` và hash password bằng Argon2id.

Response `201`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "user@example.com",
      "displayName": "Nguyễn Văn A",
      "status": "ACTIVE",
      "emailVerifiedAt": null,
      "createdAt": "2026-09-25T00:00:00.000Z",
      "updatedAt": "2026-09-25T00:00:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Các lỗi:

| Status | Code | Khi nào |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Body không đúng schema |
| `409` | `USER_EMAIL_ALREADY_EXISTS` | Email đã tồn tại |

## 7. Login

### `POST /api/v1/auth/login`

Xác minh password, tạo database session, trả access token và đặt refresh cookie.

Request:

```json
{
  "email": "user@example.com",
  "password": "CorrectHorse123!"
}
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "user@example.com",
      "displayName": "Nguyễn Văn A",
      "status": "ACTIVE",
      "emailVerifiedAt": null,
      "createdAt": "2026-09-25T00:00:00.000Z",
      "updatedAt": "2026-09-25T00:00:00.000Z"
    },
    "accessToken": "<jwt>",
    "accessTokenExpiresInSeconds": 900
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Response còn có header `Set-Cookie` chứa refresh token:

```http
Set-Cookie: refresh_token=<token>; Path=/api/v1/auth; HttpOnly; SameSite=Lax
```

Production bổ sung thuộc tính `Secure`.

Các lỗi:

| Status | Code | Khi nào |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Body không đúng schema |
| `401` | `INVALID_CREDENTIALS` | Email không tồn tại hoặc password sai |
| `403` | `ACCOUNT_SUSPENDED` | User đã bị khóa |

Backend cố ý dùng cùng `INVALID_CREDENTIALS` cho email sai và password sai để hạn chế dò tài khoản.

## 8. Refresh session

### `POST /api/v1/auth/refresh`

Không có request body. Browser gửi cookie `refresh_token` tự động.

Backend:

1. Đọc refresh token dạng `sessionId.secret`.
2. Kiểm tra session, thời hạn, trạng thái user và hash secret.
3. Thay refresh token hash bằng conditional update.
4. Trả access token mới và ghi đè refresh cookie bằng token mới.

Response `200`:

```json
{
  "success": true,
  "data": {
    "accessToken": "<new-jwt>",
    "accessTokenExpiresInSeconds": 900
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Lỗi:

| Status | Code | Khi nào |
| --- | --- | --- |
| `401` | `INVALID_REFRESH_TOKEN` | Cookie thiếu, sai, hết hạn, đã dùng, bị revoke hoặc user không còn active |

Mỗi refresh token chỉ được sử dụng thành công một lần. Hai request đồng thời dùng cùng token thì tối đa một request thành công.

## 9. Logout

### `POST /api/v1/auth/logout`

Không có request body. Backend đọc refresh cookie nếu có, thu hồi session hợp lệ và luôn yêu cầu browser xóa cookie.

Response:

```http
204 No Content
```

Logout có tính idempotent: gọi lại khi cookie thiếu hoặc session đã bị thu hồi vẫn trả `204`.

## 10. Current user

### `GET /api/v1/auth/me`

Header bắt buộc:

```http
Authorization: Bearer <access-token>
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "user@example.com",
      "displayName": "Nguyễn Văn A",
      "status": "ACTIVE",
      "emailVerifiedAt": null,
      "createdAt": "2026-09-25T00:00:00.000Z",
      "updatedAt": "2026-09-25T00:00:00.000Z"
    },
    "access": {
      "roles": ["MEMBER"],
      "permissions": [
        "profile:read:self",
        "profile:update:self"
      ]
    }
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Lỗi:

| Status | Code | Khi nào |
| --- | --- | --- |
| `401` | `UNAUTHENTICATED` | Bearer header thiếu/sai, JWT hết hạn hoặc session/user không hợp lệ |

Roles và permissions dùng để điều chỉnh UI. Backend vẫn kiểm tra permission lại trên từng route cần phân quyền.

## 11. Users administration

### `GET /api/v1/users`

Yêu cầu:

```text
Authentication: Bearer access token
Permission: users:read
```

Response `200`:

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "11111111-1111-4111-8111-111111111111",
        "email": "user@example.com",
        "displayName": "Nguyễn Văn A",
        "status": "ACTIVE",
        "emailVerifiedAt": null,
        "createdAt": "2026-09-25T00:00:00.000Z",
        "updatedAt": "2026-09-25T00:00:00.000Z",
        "roles": ["MEMBER"]
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Danh sách được sắp xếp theo `createdAt` giảm dần. API không trả password credential, session hoặc refresh token hash.

Các lỗi:

| Status | Code | Khi nào |
| --- | --- | --- |
| `401` | `UNAUTHENTICATED` | Chưa đăng nhập hoặc access token không hợp lệ |
| `403` | `FORBIDDEN` | Đã đăng nhập nhưng thiếu `users:read` |

## 12. Error codes hiện có

| Code | Status thường dùng | Ý nghĩa |
| --- | --- | --- |
| `VALIDATION_ERROR` | `400` | Request body không hợp lệ |
| `UNAUTHENTICATED` | `401` | Thiếu hoặc sai thông tin xác thực |
| `INVALID_CREDENTIALS` | `401` | Email/password không đúng |
| `INVALID_REFRESH_TOKEN` | `401` | Refresh token không còn sử dụng được |
| `FORBIDDEN` | `403` | User hợp lệ nhưng thiếu permission |
| `ACCOUNT_SUSPENDED` | `403` | Tài khoản bị khóa |
| `USER_EMAIL_ALREADY_EXISTS` | `409` | Email đã được đăng ký |
| `SERVICE_UNAVAILABLE` | `503` | Dependency bắt buộc chưa sẵn sàng |
| `INTERNAL_SERVER_ERROR` | `500` | Lỗi ngoài dự kiến |

## 13. Kiểm tra bằng PowerShell

### Đăng ký

```powershell
$registerBody = @{
  email = "user@example.com"
  password = "CorrectHorse123!"
  displayName = "Nguyễn Văn A"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/api/v1/auth/register" `
  -ContentType "application/json" `
  -Body $registerBody
```

### Đăng nhập và giữ cookie

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

$loginBody = @{
  email = "user@example.com"
  password = "CorrectHorse123!"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/api/v1/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody `
  -WebSession $session

$accessToken = $login.data.accessToken
```

### Lấy user hiện tại

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:4000/api/v1/auth/me" `
  -Headers @{ Authorization = "Bearer $accessToken" }
```

### Refresh

```powershell
$refresh = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/api/v1/auth/refresh" `
  -WebSession $session

$accessToken = $refresh.data.accessToken
```

### Danh sách user

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:4000/api/v1/users" `
  -Headers @{ Authorization = "Bearer $accessToken" }
```

Tài khoản cần role có permission `users:read`, mặc định là `ADMIN`.

### Logout

```powershell
Invoke-WebRequest `
  -Method Post `
  -Uri "http://localhost:4000/api/v1/auth/logout" `
  -WebSession $session
```

## 14. Quy tắc khi thêm endpoint mới

Mỗi endpoint mới phải xác định rõ:

1. Endpoint là public hay cần `authenticate`.
2. Permission nào được truyền vào `authorize`.
3. Input được validate bởi Zod schema nào.
4. Controller nào mapping HTTP request/response.
5. Service nào giữ business rule.
6. Repository nào được phép gọi Prisma.
7. Status code và error code nào được trả về.
8. Test cho trường hợp thành công, `401`, `403` hoặc validation error tương ứng.

Khi API contract thay đổi, cập nhật tài liệu này trong cùng task.
