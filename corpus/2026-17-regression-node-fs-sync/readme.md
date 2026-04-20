# 2026-17-regression-node-fs-sync

`readFile` (async) replaced with `readFileSync`. The outer function is still marked `async`, so a reviewer scanning signatures sees nothing wrong. But every call now blocks the event loop — on a server this serializes all concurrent requests during config reload, spikes p99 latency, and breaks health checks.

**Expected:** rework.
