# Auth API

Routes under `/api/v1/auth`: password login, OTP request/verify, magic-link request/verify, refresh, logout/logout-all, and session list/revoke. Success and errors use the shared response envelope. External Google and mail verification requires credentials.

When `GOOGLE_OAUTH_ENABLED=true`, the following modular routes are mounted:

- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`
- `POST /api/v1/auth/google/exchange` with `{ "code": "..." }`

Set `GOOGLE_OAUTH_ENABLED=false` to unmount all three routes. Set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false` in the frontend to hide the corresponding login action. Restart both applications after changing feature flags.
