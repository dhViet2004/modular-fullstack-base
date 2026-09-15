# Backend Deployment

Build `backend/` independently. Provide all required environment variables, run `pnpm db:migrate:deploy`, then run `pnpm start` for HTTP and `pnpm start:worker` as a distinct worker service.

For Cloudflare R2 file storage, set `STORAGE_DRIVER=r2` and provide
`R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and
`R2_SECRET_ACCESS_KEY`. The backend derives the account S3 endpoint and uses
R2's `auto` region. Keep the bucket private; authenticated downloads are
proxied by the API.
