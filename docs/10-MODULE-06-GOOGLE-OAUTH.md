# Module 06 - Google OAuth

Module này bổ sung đăng nhập Google bằng Authorization Code Flow với PKCE. Backend sở hữu toàn bộ OAuth flow, Google client secret không xuất hiện trong frontend và access token nội bộ không được đặt trong URL.

## 1. Kết quả cần đạt

- User có thể bắt đầu đăng nhập từ nút `Đăng nhập với Google`.
- Backend tạo `state`, PKCE verifier/challenge và redirect sang Google.
- Callback kiểm tra state một lần, đổi authorization code và xác minh Google ID token.
- Chỉ chấp nhận tài khoản có `email_verified = true`.
- Google identity được liên kết với user bằng claim `sub`, không dùng email làm khóa lâu dài.
- User mới nhận role `MEMBER`; user cũ có cùng email verified được liên kết tự động.
- Backend tạo session JWT/refresh cookie hiện có rồi redirect về frontend.
- Frontend callback gọi `/auth/refresh`; access token không đi qua query string hoặc fragment.
- Login thành công/thất bại được audit mà không lưu authorization code, token Google, state hoặc PKCE verifier.

Chưa nằm trong phạm vi:

- Provider khác Google.
- Cho phép user quản lý hoặc gỡ liên kết Google trong giao diện.
- Đồng bộ avatar hoặc profile Google sau mỗi lần đăng nhập.
- Google API scopes ngoài `openid email profile`.

## 2. API mục tiêu

| Method | Endpoint | Chức năng |
| --- | --- | --- |
| `GET` | `/api/v1/auth/google/start` | Tạo OAuth attempt và redirect tới Google |
| `GET` | `/api/v1/auth/google/callback` | Kiểm tra callback, tạo session và redirect frontend |

Frontend callback:

```text
${PUBLIC_WEB_URL}/oauth/google/callback
```

Callback thành công chỉ có refresh cookie `HttpOnly`. Frontend gọi endpoint refresh hiện có để lấy access token trong memory.

Callback thất bại redirect với mã ổn định, không chứa chi tiết từ Google:

```text
${PUBLIC_WEB_URL}/login?error=google_login_failed
```

## 3. Cấu hình

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/v1/auth/google/callback
GOOGLE_OAUTH_ATTEMPT_TTL_MINUTES=10
```

Production phải fail-fast khi thiếu một trong ba biến Google bắt buộc. Redirect URI phải được khai báo chính xác trong Google Cloud Console; backend không dựng URI từ request header.

## 4. Mô hình dữ liệu

### GoogleAccount

```prisma
model GoogleAccount {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @unique @db.Uuid
  googleSubject String   @unique @db.VarChar(255)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

`googleSubject` lấy từ claim `sub`. Không dùng email Google làm provider identifier vì email có thể thay đổi.

### GoogleOAuthAttempt

```prisma
model GoogleOAuthAttempt {
  id           String    @id @default(uuid()) @db.Uuid
  stateHash    String    @unique @db.VarChar(64)
  codeVerifier String    @db.VarChar(128)
  expiresAt    DateTime
  consumedAt   DateTime?
  createdAt    DateTime  @default(now())

  @@index([expiresAt])
}
```

Database chỉ lưu SHA-256 hash của state. PKCE verifier cần tồn tại tạm thời để backend đổi code; không được log hoặc trả qua API. Attempt được consume bằng conditional update và chỉ dùng thành công một lần.

## 5. Luồng bắt đầu

```text
Browser
  -> GET /auth/google/start
  -> backend sinh state + PKCE verifier
  -> lưu stateHash, verifier, expiresAt
  -> redirect accounts.google.com
```

Authorization request dùng:

- `response_type=code`
- `scope=openid email profile`
- `code_challenge_method=S256`
- `state=<raw-state>`
- `prompt=select_account`

## 6. Luồng callback

```text
Google callback
  -> hash state
  -> consume OAuth attempt còn hạn
  -> đổi code bằng PKCE verifier
  -> verify ID token bằng Google JWKS
  -> yêu cầu iss, aud, exp và email_verified hợp lệ
  -> tìm GoogleAccount theo sub
  -> hoặc liên kết/tạo User theo normalized email
  -> tạo session hiện có
  -> đặt refresh cookie
  -> redirect frontend callback
```

Không tin `email`, `name` hoặc `email_verified` trước khi chữ ký và claims ID token đã được xác minh.

## 7. Liên kết user

1. Có `GoogleAccount.googleSubject`: dùng user đã liên kết.
2. Chưa có GoogleAccount nhưng có user cùng normalized email: liên kết Google vào user đó và đặt `emailVerifiedAt` nếu đang null.
3. Chưa có user: tạo user, `GoogleAccount`, role `MEMBER` và `emailVerifiedAt` trong cùng transaction.

Unique constraint trên `googleSubject`, `GoogleAccount.userId` và `User.email` là lớp bảo vệ cuối cùng khi callback chạy đồng thời.

## 8. Error và audit

Không trả lỗi thư viện Google trực tiếp cho browser. Backend redirect về mã lỗi chung `google_login_failed`.

Audit dùng event:

- `AUTH_GOOGLE_LOGIN_SUCCEEDED`
- `AUTH_GOOGLE_LOGIN_FAILED`

Audit không chứa code, state, verifier, Google access token, ID token hoặc client secret.

## 9. Frontend

- Nút Google dùng browser navigation tới backend start endpoint, không gọi Axios.
- Trang `/oauth/google/callback` gọi `refreshAccessToken()`, sau đó `getCurrentUser()` và cập nhật AuthContext.
- Thành công chuyển theo `getPostLoginPath()`.
- Thất bại quay về login với thông báo tiếng Việt.

## 10. Test bắt buộc

- State và PKCE đủ entropy, challenge đúng SHA-256 base64url.
- OAuth attempt hết hạn/đã dùng/state sai đều bị từ chối như nhau.
- ID token sai issuer, audience hoặc email chưa verified bị từ chối.
- Google subject cũ đăng nhập đúng user.
- Email trùng liên kết vào user hiện có.
- User mới được tạo cùng role `MEMBER` nguyên tử.
- Hai callback dùng cùng state chỉ một callback thành công.
- Callback không đặt access token trong redirect URL.
- Frontend callback refresh session và cập nhật AuthContext.

## 11. Thứ tự triển khai

1. Thêm config và model/migration.
2. Tạo state/PKCE utility và test.
3. Tạo Google OAuth client đổi code và verify ID token.
4. Tạo repository/service liên kết user và tạo session.
5. Tạo start/callback controller, route và audit.
6. Tạo nút login và frontend callback.
7. Chạy migration, backend/frontend verification và smoke test Google thật.
8. Đồng bộ API/database docs, checklist và roadmap.
