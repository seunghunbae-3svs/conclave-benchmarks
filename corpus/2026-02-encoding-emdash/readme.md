# 2026-02-encoding-emdash

Synthetic encoding trap. Em-dashes (`—`) in the workflow's `name:` and `run:` lines were corrupted to `?` when the file was saved from a Windows PowerShell session with a non-UTF8 code page.

**Why it matters:** Silent data loss. The YAML parses fine and CI still runs; a reviewer who only looks at structure misses it. A reviewer who reads the file notices nonsense labels.

**Expected:** rework — flag the `?` artifacts in `.github/workflows/ci.yml`.

Source: observed during Conclave's own E2E smoke test on 2026-04-20.
