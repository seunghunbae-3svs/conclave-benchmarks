# 2026-08-security-ssrf-unvalidated

Allowlist removed "for local testing". Now any caller-supplied URL goes through `fetch()` — including `http://169.254.169.254/latest/meta-data/iam/security-credentials/` (EC2 IMDS), `http://localhost:6379` (internal Redis), or a private cluster DNS name.

**Expected:** reject — SSRF blocker in `src/base.ts`.
