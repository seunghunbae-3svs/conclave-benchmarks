# 2026-16-regression-react-usememo-dep

Dependency array truncated to `[products]`. The memoized filter no longer re-computes when `query` or `minPrice` change — user types in search box, nothing happens. The `react-hooks/exhaustive-deps` lint catches this, but only if the project has the rule enabled and unsilenced.

**Expected:** rework.
