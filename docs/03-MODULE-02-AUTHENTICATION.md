# Module 02 - Xác thực bằng mật khẩu và session

Module này cung cấp đăng ký, đăng nhập và phiên đăng nhập có thể thu hồi cho CoreStack.

## Kết quả

- Đăng ký bằng email và mật khẩu Argon2id.
- Đăng nhập tạo access token JWT RS256 sống ngắn.
- Refresh token ngẫu nhiên được lưu trong cookie `HttpOnly`.
- Database chỉ lưu SHA-256 hash của refresh token secret.
- Refresh token được xoay vòng sau mỗi lần sử dụng.
- Logout thu hồi session và xóa cookie.
- `/auth/me` trả user của access token hợp lệ.
- Frontend chỉ giữ access token trong bộ nhớ, không dùng `localStorage`.

## API

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Tạo user và password credential |
| `POST` | `/api/v1/auth/login` | Xác minh mật khẩu, tạo session và cookie |
| `POST` | `/api/v1/auth/refresh` | Xoay vòng refresh token và trả access token mới |
| `POST` | `/api/v1/auth/logout` | Thu hồi session và xóa cookie |
| `GET` | `/api/v1/auth/me` | Trả user hiện tại; yêu cầu Bearer access token |

## Luồng đăng nhập

```text
Frontend
  -> POST /auth/login
  -> Password service xác minh Argon2id
  -> Session service tạo session
  -> Backend trả access token trong JSON
  -> Backend đặt refresh token trong HttpOnly cookie
```

## Luồng refresh

```text
Access token hết hạn
  -> Axios nhận 401 từ request đã có Bearer token
  -> POST /auth/refresh bằng HttpOnly cookie
  -> Backend kiểm tra session và refresh token hash
  -> Conditional update thay hash cũ bằng hash mới
  -> Frontend giữ access token mới trong bộ nhớ
  -> Axios retry request ban đầu tối đa một lần
```

Nhiều request 401 đồng thời dùng chung một refresh Promise. Request login, register, refresh và logout không kích hoạt interceptor refresh để tránh vòng lặp.

## Quy tắc bảo mật

- Private key chỉ ký JWT; public key dùng để xác minh.
- Access token chứa `sub` là user ID và `sid` là session ID.
- Refresh token có dạng `sessionId.secret`; chỉ hash của `secret` được lưu.
- Cookie dùng `HttpOnly`, `SameSite=Lax` và `Secure` trong production.
- Logout có tính idempotent: cookie vẫn được xóa khi token thiếu hoặc không hợp lệ.
- Middleware kiểm tra cả chữ ký JWT, session, thời hạn và trạng thái user.
- Không log hoặc trả password hash, private key hay refresh token trong JSON.

## Cấu hình môi trường

```env
JWT_PRIVATE_KEY_BASE64=
JWT_PUBLIC_KEY_BASE64=
JWT_ISSUER=corestack-api
JWT_AUDIENCE=corestack-web
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
```

## Ranh giới module

Backend giữ luồng:

```text
Route -> Controller -> Service -> Repository -> Prisma
```

Frontend giữ luồng:

```text
Provider/Component -> Hook -> Feature API -> Axios client -> Backend
```

Module này chưa triển khai email verification, reset password, OAuth, role hoặc permission.
