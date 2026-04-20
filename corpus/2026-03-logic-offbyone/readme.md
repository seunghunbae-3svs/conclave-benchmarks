# 2026-03-logic-offbyone

Classic off-by-one: loop bound changed from `i < n` to `i <= n`, summing one extra element. `xs[n]` is `undefined` for a length-`n` array, so `?? 0` masks the crash; the function just returns the wrong number.

**Expected:** rework — flag the loop bound in `src/base.ts`.
