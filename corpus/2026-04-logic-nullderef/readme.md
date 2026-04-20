# 2026-04-logic-nullderef

Guarded accessor `user.session?.token ?? ""` was "simplified" to `user.session.token`, removing both the null-user check and the optional chain. Crashes in every anonymous-request path.

**Expected:** reject — `src/base.ts` has a blocker-severity null deref.
