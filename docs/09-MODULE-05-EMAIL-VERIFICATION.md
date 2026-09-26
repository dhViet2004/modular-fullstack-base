# Module 05 - Email Verification

Module này xác minh rằng user thực sự kiểm soát địa chỉ email đã đăng ký. Luồng dùng token một lần, chỉ lưu hash trong database và dựng liên kết từ public URL đã được cấu hình.

## 1. Kết quả cần đạt

- User đã đăng nhập có thể yêu cầu email xác minh.
- Backend tạo token ngẫu nhiên, chỉ lưu SHA-256 hash.
- Email chứa link tới frontend, không trỏ trực tiếp vào endpoint thay đổi dữ liệu.
- Frontend đọc token từ URL và gửi `POST` tới backend để xác minh.
- Token có thời hạn, dùng một lần và token cũ bị vô hiệu khi gửi lại.
- `User.emailVerifiedAt` được cập nhật nguyên tử với việc consume token.
- Có cooldown chống gửi email liên tục.
- Ghi audit event nhưng không ghi token hoặc token hash.

Chưa nằm trong phạm vi:

- Password reset.
- OTP nhập bằng mã số.
- Đổi email tài khoản.
- Bắt buộc email đã xác minh cho mọi API.
- Background job hoặc retry queue; chỉ thêm khi module jobs được triển khai.
- Khóa vào một nhà cung cấp email cụ thể trước khi cấu hình delivery được chọn.

## 2. API mục tiêu

| Method | Endpoint                                  | Authentication      | Chức năng                       |
| ------ | ----------------------------------------- | ------------------- | ------------------------------- |
| `POST` | `/api/v1/auth/email-verification/request` | Bearer access token | Yêu cầu gửi email xác minh      |
| `POST` | `/api/v1/auth/email-verification/verify`  | Public              | Consume token và xác minh email |

Không dùng `GET` để cập nhật `emailVerifiedAt`. Link email mở frontend; frontend mới gửi `POST` sau khi người dùng xác nhận.

## 3. Mô hình dữ liệu

Model mục tiêu:

```prisma
model EmailVerificationToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @db.Uuid
  tokenHash String    @unique @db.VarChar(64)
  expiresAt DateTime
  consumedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([expiresAt])
}
```

`User` bổ sung relation:

```prisma
emailVerificationTokens EmailVerificationToken[]
```

Token table là dữ liệu tạm thời, không phải audit log. Có thể xóa token cũ khi tạo token thay thế hoặc trong cleanup job tương lai.

## 4. Token format

Token gốc được tạo bằng `randomBytes(32)` và encode `base64url`.

```text
raw token -> gửi qua email
SHA-256(raw token) -> lưu database
```

Không:

- Lưu token gốc trong database.
- Log token hoặc URL đầy đủ chứa token.
- Trả token qua API response.
- Lưu token trong `localStorage`.

## 5. Public URL

Backend dùng biến môi trường:

```env
PUBLIC_WEB_URL=http://localhost:3000
EMAIL_VERIFICATION_TTL_MINUTES=60
EMAIL_VERIFICATION_COOLDOWN_SECONDS=60
```

Link được dựng bằng API `URL` của Node.js:

```text
${PUBLIC_WEB_URL}/verify-email?token=<raw-token>
```

Không dựng public URL từ `Host`, `Origin` hoặc forwarded header của request.

## 6. Luồng yêu cầu email

```text
Authenticated user
  -> POST /auth/email-verification/request
  -> kiểm tra emailVerifiedAt
  -> kiểm tra cooldown
  -> vô hiệu token chưa dùng cũ
  -> tạo token hash và expiresAt
  -> gửi email chứa frontend URL
  -> trả 202 Accepted
```

Response không chứa token:

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

Nếu email đã xác minh, endpoint vẫn có thể trả `202` mà không gửi mail để giữ hành vi idempotent.

Cooldown dùng token gần nhất của user. Request quá sớm trả:

```text
429 EMAIL_VERIFICATION_RATE_LIMITED
```

## 7. Luồng xác minh

Request:

```json
{
  "token": "<raw-token>"
}
```

Backend:

1. Hash token nhận được bằng SHA-256.
2. Tìm token hash, user và trạng thái thời hạn.
3. Conditional update chỉ consume token có `consumedAt = null` và chưa hết hạn.
4. Cập nhật `User.emailVerifiedAt` trong cùng transaction.
5. Trả user đã xác minh hoặc kết quả thành công tối thiểu.

Token thiếu, sai, hết hạn hoặc đã dùng đều trả cùng lỗi:

```text
400 INVALID_EMAIL_VERIFICATION_TOKEN
```

Không tiết lộ token thất bại vì lý do nào.

## 8. Transaction và concurrency

### Request token

Trong cùng transaction:

- Xóa hoặc vô hiệu token chưa dùng cũ của user.
- Tạo token hash mới.

Gửi email không thể nằm trong database transaction. Baseline gửi đồng bộ sau khi commit; nếu delivery thất bại, service xóa đúng token vừa tạo và trả lỗi. Khi có worker/outbox, thay phần compensation bằng retry bền vững.

### Verify token

Trong cùng transaction:

- Conditional update consume token.
- Cập nhật `emailVerifiedAt`.

Hai request đồng thời dùng cùng token thì tối đa một request thành công.

## 9. Mail boundary

Business service chỉ gọi một hàm cụ thể:

```ts
sendEmailVerification({ to, verificationUrl });
```

Không truyền password, access token, refresh token hoặc toàn bộ user object sang mail module.

Mail delivery dùng SMTP thông qua Nodemailer. Development mặc định kết nối `localhost:1025`; production bắt buộc cấu hình `SMTP_HOST` và `MAIL_FROM`. `SMTP_USER` và `SMTP_PASSWORD` phải cùng tồn tại hoặc cùng bỏ trống.

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=CoreStack <no-reply@localhost>
```

Test email verification mock boundary này; không gửi email thật trong unit test.

Không log `verificationUrl` vì URL chứa raw token.

## 10. Audit events

Bổ sung action:

| Action                         | Outcome   | Ghi chú                            |
| ------------------------------ | --------- | ---------------------------------- |
| `EMAIL_VERIFICATION_REQUESTED` | `SUCCESS` | Đã tạo token và chấp nhận delivery |
| `EMAIL_VERIFICATION_SUCCEEDED` | `SUCCESS` | User được đánh dấu verified        |
| `EMAIL_VERIFICATION_FAILED`    | `FAILURE` | Token verify không hợp lệ          |

Audit metadata không chứa email token, token hash hoặc URL xác minh.

## 11. Backend structure

```text
backend/src/modules/auth/email-verification/
├── email-verification-token.ts
├── email-verification.repository.ts
├── email-verification.service.ts
├── email-verification.schema.ts
├── email-verification.controller.ts
└── email-verification.service.test.ts

backend/src/modules/mail/
└── email-verification-mail.ts
```

Không tạo interface/factory cho mail khi mới có một provider. Hàm mail cụ thể có thể được mock trực tiếp trong test.

## 12. Frontend flow

### Trạng thái chưa xác minh

`/auth/me` đã trả `emailVerifiedAt`. Frontend có thể hiển thị lời nhắc và nút gửi email khi giá trị này là `null`.

### Trang verify

Route:

```text
/verify-email?token=<token>
```

Page chỉ ghép feature component. Component:

1. Đọc token từ search params.
2. Không ghi token vào storage hoặc log.
3. Gửi token bằng mutation khi người dùng xác nhận.
4. Hiển thị loading, success, invalid/expired và retry state.
5. Sau thành công, refresh `/auth/me` hoặc cập nhật AuthContext.

## 13. Test bắt buộc

### Token utility

- Token gốc đủ entropy và hash dài 64 ký tự hex.
- Verify cùng token tạo cùng hash.

### Service/repository

- User chưa verified tạo token mới và gửi đúng URL cấu hình.
- API/mail không nhận token hash.
- User đã verified không tạo token mới.
- Cooldown trả `429`.
- Delivery thất bại xóa token vừa tạo.
- Token đúng cập nhật `emailVerifiedAt`.
- Token sai, hết hạn hoặc đã dùng trả cùng lỗi.
- Hai request verify đồng thời chỉ một request thành công.

### HTTP

- Request email chưa đăng nhập trả `401`.
- Body verify thiếu/sai token trả `400`.
- Response request không chứa token.

### Frontend

- Không gửi request khi URL thiếu token.
- Success cập nhật trạng thái user.
- Error không hiển thị token trong UI.

## 14. Thứ tự triển khai

1. Thêm config public URL, TTL và cooldown.
2. Thêm model `EmailVerificationToken` và migration.
3. Tạo token utility và test.
4. Tạo repository/service cho request và verify.
5. Chốt concrete mail delivery rồi nối mail boundary.
6. Tạo controller, schema và routes.
7. Bổ sung audit events.
8. Tạo frontend request/verify flow.
9. Chạy migration, backend/frontend verification và smoke test.
10. Đồng bộ API docs, database docs, checklist và roadmap.

## 15. Definition of Done

- Raw token không được persist hoặc log.
- Public URL chỉ đến từ config đã validate.
- Token hết hạn, một lần dùng và chống concurrent reuse.
- `emailVerifiedAt` và consumed token commit nguyên tử.
- Request endpoint có authentication và cooldown.
- Mail provider failure không để token giả vờ đã được gửi.
- Backend/frontend có test và build đạt.
- API/database docs phản ánh implementation thật.
