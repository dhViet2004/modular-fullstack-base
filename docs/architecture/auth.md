# Authentication

Password, verified Google OAuth, OTP and magic-link strategies produce a common identity result. The shared pipeline resolves one user with multiple identities, checks status and session limit, resolves a device, creates a hashed refresh-token session, issues a short access token, and audits login. Challenges are hashed, expiring, attempt-limited and one-time-use.

Google OAuth is isolated under `backend/src/modules/oauth/google`. The auth router mounts it only when `GOOGLE_OAUTH_ENABLED=true`. The frontend renders its login action only when `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`. Disabling both flags removes the public OAuth surface without deleting code or credentials.

After provider verification, the module passes a normalized identity to the shared `authService.complete` pipeline. The callback creates a random, single-use, 60-second handoff code and redirects to the frontend. The frontend exchanges that code through `POST /api/v1/auth/google/exchange`; access and refresh tokens are never placed in a redirect URL.

The in-memory handoff store is intended for a single backend instance. A multi-instance deployment should keep the same `issue`/`consume` contract and replace the store with Redis or another shared TTL store.
