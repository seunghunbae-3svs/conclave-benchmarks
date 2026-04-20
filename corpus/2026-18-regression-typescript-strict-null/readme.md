# 2026-18-regression-typescript-strict-null

The null guard was removed and replaced with `!` (non-null assertion). The comment confidently — and wrongly — claims TS will narrow. Runtime TypeError on the first order without an email.

This is one of the most common regressions in "tighten the types" refactors.

**Expected:** reject.
