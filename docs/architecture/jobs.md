# Jobs

pg-boss uses PostgreSQL for durable delivery. The worker registers mail, auth/session cleanup, orphan cleanup, and Markdown import/export handlers. Schedules live in the worker; the HTTP server has no business `setInterval` jobs.
