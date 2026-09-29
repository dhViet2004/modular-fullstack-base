# Module 02 - XÃ¡c thá»±c báº±ng máº­t kháº©u vÃ  session

Module nÃ y cung cáº¥p Ä‘Äƒng kÃ½, Ä‘Äƒng nháº­p vÃ  phiÃªn Ä‘Äƒng nháº­p cÃ³ thá»ƒ thu há»“i cho CoreStack.

## Káº¿t quáº£

- ÄÄƒng kÃ½ báº±ng email vÃ  máº­t kháº©u Argon2id.
- ÄÄƒng nháº­p táº¡o access token JWT RS256 sá»‘ng ngáº¯n.
- Refresh token ngáº«u nhiÃªn Ä‘Æ°á»£c lÆ°u trong cookie `HttpOnly`.
- Database chá»‰ lÆ°u SHA-256 hash cá»§a refresh token secret.
- Refresh token Ä‘Æ°á»£c xoay vÃ²ng sau má»—i láº§n sá»­ dá»¥ng.
- Logout thu há»“i session vÃ  xÃ³a cookie.
- `/auth/me` tráº£ user cá»§a access token há»£p lá»‡.
- Frontend chá»‰ giá»¯ access token trong bá»™ nhá»›, khÃ´ng dÃ¹ng `localStorage`.

## API

| Method | Endpoint | Chá»©c nÄƒng |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Táº¡o user vÃ  password credential |
| `POST` | `/api/v1/auth/login` | XÃ¡c minh máº­t kháº©u, táº¡o session vÃ  cookie |
| `POST` | `/api/v1/auth/refresh` | Xoay vÃ²ng refresh token vÃ  tráº£ access token má»›i |
| `POST` | `/api/v1/auth/logout` | Thu há»“i session vÃ  xÃ³a cookie |
| `GET` | `/api/v1/auth/me` | Tráº£ user hiá»‡n táº¡i; yÃªu cáº§u Bearer access token |

## Luá»“ng Ä‘Äƒng nháº­p

```text
Frontend
  -> POST /auth/login
  -> authService xÃ¡c minh Argon2id
  -> Session service táº¡o session
  -> Backend tráº£ access token trong JSON
  -> Backend Ä‘áº·t refresh token trong HttpOnly cookie
```

## Luá»“ng refresh

```text
Access token háº¿t háº¡n
  -> Axios nháº­n 401 tá»« request Ä‘Ã£ cÃ³ Bearer token
  -> POST /auth/refresh báº±ng HttpOnly cookie
  -> Backend kiá»ƒm tra session vÃ  refresh token hash
  -> Conditional update thay hash cÅ© báº±ng hash má»›i
  -> Frontend giá»¯ access token má»›i trong bá»™ nhá»›
  -> Axios retry request ban Ä‘áº§u tá»‘i Ä‘a má»™t láº§n
```

Nhiá»u request 401 Ä‘á»“ng thá»i dÃ¹ng chung má»™t refresh Promise. Request login, register, refresh vÃ  logout khÃ´ng kÃ­ch hoáº¡t interceptor refresh Ä‘á»ƒ trÃ¡nh vÃ²ng láº·p.

## Quy táº¯c báº£o máº­t

- Private key chá»‰ kÃ½ JWT; public key dÃ¹ng Ä‘á»ƒ xÃ¡c minh.
- Access token chá»©a `sub` lÃ  user ID vÃ  `sid` lÃ  session ID.
- Refresh token cÃ³ dáº¡ng `sessionId.secret`; chá»‰ hash cá»§a `secret` Ä‘Æ°á»£c lÆ°u.
- Cookie dÃ¹ng `HttpOnly`, `SameSite=Lax` vÃ  `Secure` trong production.
- Logout cÃ³ tÃ­nh idempotent: cookie váº«n Ä‘Æ°á»£c xÃ³a khi token thiáº¿u hoáº·c khÃ´ng há»£p lá»‡.
- Middleware kiá»ƒm tra cáº£ chá»¯ kÃ½ JWT, session, thá»i háº¡n vÃ  tráº¡ng thÃ¡i user.
- KhÃ´ng log hoáº·c tráº£ password hash, private key hay refresh token trong JSON.

## Cáº¥u hÃ¬nh mÃ´i trÆ°á»ng

```env
JWT_PRIVATE_KEY_BASE64=
JWT_PUBLIC_KEY_BASE64=
JWT_ISSUER=corestack-api
JWT_AUDIENCE=corestack-web
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
```

## Ranh giá»›i module

Backend giá»¯ luá»“ng:

```text
Route -> Middleware -> Controller -> Service -> Prisma (repository ch? d?ng khi c?n persistence boundary)
```

Frontend giá»¯ luá»“ng:

```text
Provider/Component -> Hook -> Feature API -> Axios client -> Backend
```

Module hiện đã triển khai password authentication, email verification và Google OAuth. Magic link và reset password chưa thuộc scope; role/permission nằm ở module authorization.

## Gi?i h?n thi?t b? vï¿½ qu?n lï¿½ phiï¿½n

Bi?n MAX_ACTIVE_SESSIONS_PER_USER (m?c d?nh 5) gi?i h?n s? phiï¿½n ho?t d?ng c?a m?i user. Khi dang nh?p vu?t gi?i h?n, cï¿½c phiï¿½n cu nh?t b? revoke; refresh token c?a chï¿½ng khï¿½ng cï¿½n h?p l?.



## Stateless access token v? session policy

M?i l?n login th?nh c?ng t?o m?t session ri?ng; kh?ng nh?n di?n ho?c reuse session theo thi?t b?. M?t user c? t?i ?a 5 session active; khi v??t gi?i h?n, session c? nh?t b? revoke.

Middleware authenticate ch? verify ch? k? JWT, `exp`, issuer v? audience r?i g?n identity v?o request; kh?ng lookup session DB tr?n m?i request. Session DB ch? qu?n l? refresh lifecycle, danh s?ch session v? revoke.

Revoking a session prevents future refreshes for that login session. Already-issued access tokens remain valid until their short expiration time.

On rotation, store the previous token hash in `previousRefreshTokenHash` and update `lastUsedAt`. Accept the previous token for 30 seconds; reuse after that revokes the session.

Session HTTP handlers n?m trong `session.controller.ts`; token infrastructure n?m trong `session.tokens.ts`. Session service g?i Prisma tr?c ti?p v? gi? transaction audit, gi?i h?n session v? conditional refresh rotation.
## Dat va doi mat khau

`GET /api/v1/auth/me` tra `user.hasPassword` ma khong tra password hash.
Tai khoan chua co `PasswordCredential` (vi du dang ky qua Google) co the dat
mat khau qua `POST /api/v1/auth/password/change` khi da dang nhap: body chi can
`newPassword` (12-128 ky tu). Tai khoan da co mat khau phai gui them
`currentPassword` dung. Giao dien tai lai `/auth/me` sau khi dat mat khau.
