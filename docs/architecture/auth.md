# Authentication

Password, verified Google OAuth, OTP and magic-link strategies produce a common identity result. The shared pipeline resolves one user with multiple identities, checks status and session limit, resolves a device, creates a hashed refresh-token session, issues a short access token, and audits login. Challenges are hashed, expiring, attempt-limited and one-time-use.
