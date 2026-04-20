# 2026-09-security-sql-injection

Parametrized `$1` placeholder swapped for template-literal interpolation. Classic SQLi surface — `email = "' OR '1'='1"` returns every row. The "simpler" comment is the tell.

**Expected:** reject — blocker in `src/base.ts`.
