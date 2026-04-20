# 2026-19-regression-webpack-chunk-name

Magic comment `/* webpackChunkName: "checkout" */` removed by a formatter. Build succeeds, but every downstream tool that tracks chunks by name (CDN cache rules, Sentry source maps, analytics dashboards) loses context. Silent observability regression.

**Expected:** rework (minor).
