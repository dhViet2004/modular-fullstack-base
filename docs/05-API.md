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
withCredentials: true;
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

| Token         | Cách gửi                        | Mục đích                       |
| ------------- | ------------------------------- | ------------------------------ |
| Access token  | `Authorization: Bearer <token>` | Gọi API được bảo vệ            |
| Refresh token | Cookie `refresh_token`          | Xin access token mới và logout |

Access token được trả trong JSON sau login/refresh. Refresh token chỉ được gửi bằng cookie `HttpOnly`; JavaScript frontend không đọc được giá trị này.

## 4. Tổng hợp endpoint

| Method | Endpoint                                  | Authentication        | Permission   |
| ------ | ----------------------------------------- | --------------------- | ------------ |
| `GET`  | `/health`                                 | Public                | Không        |
| `GET`  | `/ready`                                  | Public                | Không        |
| `GET`  | `/api/v1`                                 | Public                | Không        |
| `POST` | `/api/v1/auth/register`                   | Public                | Không        |
| `POST` | `/api/v1/auth/login`                      | Public                | Không        |
| `POST` | `/api/v1/auth/refresh`                    | Refresh cookie        | Không        |
| `POST` | `/api/v1/auth/logout`                     | Refresh cookie nếu có | Không        |
| `GET`  | `/api/v1/auth/me`                         | Bearer access token   | Không        |
| `POST` | `/api/v1/auth/email-verification/request` | Bearer access token   | Không        |
| `POST` | `/api/v1/auth/email-verification/verify`  | Public                | Không        |
| `GET`  | `/api/v1/auth/google/start`               | Public                | Không        |
| `GET`  | `/api/v1/auth/google/callback`            | Google callback       | Không        |
| `GET`  | `/api/v1/users`                           | Bearer access token   | `users:read` |
| `GET`  | `/api/v1/audit-logs`                      | Bearer access token   | `audit:read` |
| `POST` | `/api/v1/files`                           | Bearer access token   | Không        |
| `GET`  | `/api/v1/files/:id`                       | Bearer access token   | Không        |

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

| Field         | Yêu cầu                                         |
| ------------- | ----------------------------------------------- |
| `email`       | Email hợp lệ, tối đa 254 ký tự                  |
| `password`    | Từ 12 đến 128 ký tự                             |
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

| Status | Code                        | Khi nào                |
| ------ | --------------------------- | ---------------------- |
| `400`  | `VALIDATION_ERROR`          | Body không đúng schema |
| `409`  | `USER_EMAIL_ALREADY_EXISTS` | Email đã tồn tại       |

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

| Status | Code                  | Khi nào                               |
| ------ | --------------------- | ------------------------------------- |
| `400`  | `VALIDATION_ERROR`    | Body không đúng schema                |
| `401`  | `INVALID_CREDENTIALS` | Email không tồn tại hoặc password sai |
| `403`  | `ACCOUNT_SUSPENDED`   | User đã bị khóa                       |

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

| Status | Code                    | Khi nào                                                                   |
| ------ | ----------------------- | ------------------------------------------------------------------------- |
| `401`  | `INVALID_REFRESH_TOKEN` | Cookie thiếu, sai, hết hạn, đã dùng, bị revoke hoặc user không còn active |

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
      "permissions": ["profile:read:self", "profile:update:self"]
    }
  },
  "meta": {
    "timestamp": "2026-09-25T00:00:00.000Z"
  }
}
```

Lỗi:

| Status | Code              | Khi nào                                                             |
| ------ | ----------------- | ------------------------------------------------------------------- |
| `401`  | `UNAUTHENTICATED` | Bearer header thiếu/sai, JWT hết hạn hoặc session/user không hợp lệ |

Roles và permissions dùng để điều chỉnh UI. Backend vẫn kiểm tra permission lại trên từng route cần phân quyền.

## 11. Email verification

### `POST /api/v1/auth/email-verification/request`

Yêu cầu đưa việc gửi email xác minh của chính user đang đăng nhập vào queue. Endpoint không nhận email từ body và không trả token trong response. `202` xác nhận job đã được nhận, không bảo đảm SMTP đã gửi thành công; worker sẽ retry khi gửi lỗi.

```http
Authorization: Bearer <access-token>
```

Response `202`:

```json
{
  "success": true,
  "data": {
    "accepted": true
  },
  "meta": {
    "timestamp": "2026-09-26T00:00:00.000Z"
  }
}
```

| Status | Code                              | Khi nào                                  |
| ------ | --------------------------------- | ---------------------------------------- |
| `401`  | `UNAUTHENTICATED`                 | Access token thiếu hoặc không hợp lệ     |
| `429`  | `EMAIL_VERIFICATION_RATE_LIMITED` | Yêu cầu gửi lại trong thời gian cooldown |
| `503`  | `EMAIL_DELIVERY_UNAVAILABLE`      | Queue tạm thời không nhận được yêu cầu   |

### `POST /api/v1/auth/email-verification/verify`

Endpoint public, nhận raw token từ trang frontend và consume token một lần.

```json
{
  "token": "<raw-token>"
}
```

Response `200` trả user với `emailVerifiedAt` đã được cập nhật. Token thiếu, sai, hết hạn hoặc đã dùng đều trả lỗi chung:

| Status | Code                               | Khi nào                                 |
| ------ | ---------------------------------- | --------------------------------------- |
| `400`  | `VALIDATION_ERROR`                 | Body thiếu token hoặc sai kiểu dữ liệu  |
| `400`  | `INVALID_EMAIL_VERIFICATION_TOKEN` | Token sai, hết hạn hoặc đã được sử dụng |

Backend không log hoặc trả lại raw token, token hash hay URL xác minh.

## 12. Google OAuth

### `GET /api/v1/auth/google/start`

Tạo OAuth attempt có state và PKCE, sau đó redirect `302` tới Google. Frontend bắt đầu flow bằng browser navigation, không gọi endpoint này qua Axios.

### `GET /api/v1/auth/google/callback`

Google gọi endpoint với `code` và `state`. Backend consume state một lần, đổi code, xác minh ID token, liên kết hoặc tạo user, rồi tạo session hiện có.

Thành công đặt refresh cookie `HttpOnly` và redirect tới `${PUBLIC_WEB_URL}/oauth/google/callback`. Access token nội bộ không xuất hiện trong URL.

Thất bại redirect tới `${PUBLIC_WEB_URL}/login?error=google_login_failed`. Backend không trả hoặc log authorization code, state, PKCE verifier, Google token hay client secret.

## 13. Users administration

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

| Status | Code              | Khi nào                                       |
| ------ | ----------------- | --------------------------------------------- |
| `401`  | `UNAUTHENTICATED` | Chưa đăng nhập hoặc access token không hợp lệ |
| `403`  | `FORBIDDEN`       | Đã đăng nhập nhưng thiếu `users:read`         |

## 14. Audit logs

### `GET /api/v1/audit-logs`

Trả timeline sự kiện bảo mật và quản trị, mới nhất trước.

Yêu cầu:

```text
Authentication: Bearer access token
Permission: audit:read
```

Query:

| Field         | Yêu cầu                                         |
| ------------- | ----------------------------------------------- |
| `cursor`      | Không bắt buộc, cursor opaque từ response trước |
| `limit`       | Mặc định `50`, từ `1` đến `100`                 |
| `action`      | Không bắt buộc, phải thuộc audit event catalog  |
| `actorUserId` | Không bắt buộc, UUID hợp lệ                     |

Response `200`:

```json
{
  "success": true,
  "data": {
    "auditLogs": [
      {
        "id": "33333333-3333-4333-8333-333333333333",
        "action": "AUTH_LOGIN_SUCCEEDED",
        "outcome": "SUCCESS",
        "actorUserId": "11111111-1111-4111-8111-111111111111",
        "subjectType": "SESSION",
        "subjectId": "22222222-2222-4222-8222-222222222222",
        "sessionId": "22222222-2222-4222-8222-222222222222",
        "ipAddress": "127.0.0.1",
        "userAgent": "Browser",
        "metadata": null,
        "createdAt": "2026-09-26T00:00:00.000Z"
      }
    ],
    "nextCursor": null
  },
  "meta": {
    "timestamp": "2026-09-26T00:00:00.000Z"
  }
}
```

Frontend truyền `nextCursor` vào request tiếp theo để tải thêm. Không tự phân tích nội dung cursor.

Các lỗi:

| Status | Code               | Khi nào                              |
| ------ | ------------------ | ------------------------------------ |
| `400`  | `VALIDATION_ERROR` | Query hoặc cursor không hợp lệ       |
| `401`  | `UNAUTHENTICATED`  | Access token thiếu hoặc không hợp lệ |
| `403`  | `FORBIDDEN`        | User thiếu `audit:read`              |

## 15. Error codes hiện có

| Code                               | Status thường dùng | Ý nghĩa                                        |
| ---------------------------------- | ------------------ | ---------------------------------------------- |
| `VALIDATION_ERROR`                 | `400`              | Request body không hợp lệ                      |
| `UNAUTHENTICATED`                  | `401`              | Thiếu hoặc sai thông tin xác thực              |
| `INVALID_CREDENTIALS`              | `401`              | Email/password không đúng                      |
| `INVALID_REFRESH_TOKEN`            | `401`              | Refresh token không còn sử dụng được           |
| `INVALID_EMAIL_VERIFICATION_TOKEN` | `400`              | Token xác minh email sai, hết hạn hoặc đã dùng |
| `FORBIDDEN`                        | `403`              | User hợp lệ nhưng thiếu permission             |
| `ACCOUNT_SUSPENDED`                | `403`              | Tài khoản bị khóa                              |
| `USER_EMAIL_ALREADY_EXISTS`        | `409`              | Email đã được đăng ký                          |
| `EMAIL_VERIFICATION_RATE_LIMITED`  | `429`              | Yêu cầu gửi email xác minh quá sớm             |
| `EMAIL_DELIVERY_UNAVAILABLE`       | `503`              | Queue tạm thời không khả dụng                  |
| `GOOGLE_OAUTH_NOT_CONFIGURED`      | `503`              | Google OAuth chưa được cấu hình                |
| `GOOGLE_LOGIN_FAILED`              | `401`              | Callback hoặc Google identity không hợp lệ     |
| `SERVICE_UNAVAILABLE`              | `503`              | Dependency bắt buộc chưa sẵn sàng              |
| `INTERNAL_SERVER_ERROR`            | `500`              | Lỗi ngoài dự kiến                              |

## 16. Kiểm tra bằng PowerShell

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

### Yêu cầu gửi email xác minh

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/api/v1/auth/email-verification/request" `
  -Headers @{ Authorization = "Bearer $accessToken" }
```

### Xác minh email

```powershell
$verifyBody = @{ token = "<token-trong-email>" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/api/v1/auth/email-verification/verify" `
  -ContentType "application/json" `
  -Body $verifyBody
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

## 17. Files (local development/test)

Cả hai endpoint yêu cầu Bearer access token và chỉ truy cập file của chính user. Development/test dùng local disk; production dùng Cloudflare R2. R2 tạm thời không khả dụng trả `503 STORAGE_UNAVAILABLE`.

### `POST /api/v1/files`

Request body là byte stream với `Content-Type: application/octet-stream`, tối đa 5 MiB. Backend đếm byte khi đọc stream và trả `201` với `data: { id, size }`; không nhận storage key hoặc tên file do client chọn. Body rỗng trả `400 EMPTY_FILE`, quá giới hạn trả `413 FILE_TOO_LARGE`, Content-Type khác trả `415 UNSUPPORTED_FILE_TYPE`.

### `GET /api/v1/files/:id`

Trả `application/octet-stream` với `Content-Disposition: attachment`. ID phải là UUID; ID sai trả `400 INVALID_FILE_ID`. File không tồn tại hoặc thuộc user khác đều trả `404 FILE_NOT_FOUND`.

## 18. Quy tắc khi thêm endpoint mới

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
