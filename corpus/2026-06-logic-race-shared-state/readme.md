# 2026-06-logic-race-shared-state

A "request coalescing" optimization was added but the new `inflight` map is never written to — only read. Concurrent calls still launch duplicate `load()` invocations. On top of that, `inflight` is mutated lazily from `null`, which was fine single-threaded but is meaningless when the race is the point.

**Expected:** rework — `src/base.ts` race condition.
