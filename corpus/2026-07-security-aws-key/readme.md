# 2026-07-security-aws-key

Hardcoded AWS credentials in source. The keys used here are AWS's own public documentation examples — not live credentials — but they match the `AKIA[A-Z0-9]{16}` access-key format that every secret scanner (trufflehog, gitleaks, GitHub push protection) looks for.

**Expected:** reject — `src/base.ts` blocker.
