# 2026-05-logic-missing-await

`await` removed and the Promise double-cast through `unknown` to silence the TS error. The function now returns a Promise wrapped as `Profile` — type system lies, runtime crashes the first time downstream code reads a field.

**Expected:** reject — blocker in `src/base.ts`.
