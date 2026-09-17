# Reusable OAuth module

The Google adapter is self-contained in `backend/src/modules/oauth/google`; the provider-neutral one-time handoff is in `backend/src/modules/oauth/oauth-handoff.service.ts`. Provider-specific authorization, PKCE, callback verification, validation and routes do not live in the core auth controller.

## Enable or disable

Backend:

```env
GOOGLE_OAUTH_ENABLED=true
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/api/v1/auth/google/callback
```

Frontend:

```env
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
```

Change both enabled flags to `false` and restart the applications to remove the routes and UI entry point. No source deletion or router commenting is required.

## Bootstrap the first super admin

Google proves identity; database RBAC remains the authorization source. A deployment can promote an allowlisted, verified Google identity on its first successful login:

```env
SUPER_ADMIN_BOOTSTRAP_ENABLED=true
SUPER_ADMIN_BOOTSTRAP_PROVIDER=google
SUPER_ADMIN_GOOGLE_EMAILS=admin@example.com
SUPER_ADMIN_GOOGLE_SUBS=
SUPER_ADMIN_BOOTSTRAP_ONCE=true
```

Prefer the immutable Google `sub` when it is known. Email matching is case-insensitive and is only a bootstrap mechanism. With `SUPER_ADMIN_BOOTSTRAP_ONCE=true`, the allowlist stops promoting users as soon as any `SUPER_ADMIN` assignment exists. The assignment and its audit event are committed atomically, and concurrent callbacks are serialized. Later logins resolve authorization exclusively through `AuthIdentity -> User -> UserRole`.

## Reuse in another project

Copy `backend/src/modules/oauth`, mount `googleOAuthRoutes` below the target auth prefix, and provide these host contracts:

- `authService.complete(identity, requestInfo)` creates or links a user and issues the application session.
- `env` supplies frontend URL and Google credentials.
- Shared error, response, validation and rate-limit middleware retain the same interfaces.

Copy the frontend callback page and Google login action, then adapt only `authClient.setTokens` and the post-login destination if the target application stores sessions differently.

For multiple backend instances, replace the in-memory handoff map with a shared TTL store such as Redis while preserving one-time `issue` and `consume` behavior.
