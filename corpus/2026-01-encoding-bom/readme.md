# 2026-01-encoding-bom

Synthetic encoding trap. The diff introduces a README that starts with a UTF-16 BOM (`U+FEFF`). Most plain-text pipelines handle this, but GitHub's markdown renderer and some static site generators mis-render the first heading.

**Why it matters:** README is the first touchpoint for every potential user. A silent BOM means your landing page renders a stray character before the title.

**Expected:** rework — flag the BOM on `README.md`.

Source: observed during Conclave's own E2E smoke test on 2026-04-20.
