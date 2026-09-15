# Conclave Benchmarks — Leaderboard

_Generated 2026-09-15T06:22:13.111Z from `/home/runner/work/conclave-benchmarks/conclave-benchmarks/results/nightly`._

## Summary

| Tool | Cases (ok / total) | Verdict accuracy | Precision | Recall | FPR (clean) | Cost p50 / p95 | Latency p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| conclave | 20 / 20 | 70.0% | 47.6% | 58.8% | 33.3% | $0.0428 / $0.0635 | 67794ms / 96078ms |

## Per-category catch rate

| Tool | clean | encoding | logic | regression | security |
| --- | --- | --- | --- | --- | --- |
| conclave | 0 / 0 | 0 / 2 | 2 / 4 | 7 / 8 | 1 / 3 |

## Raw counts

| Tool | Flagged | Correct | Expected |
| --- | --- | --- | --- |
| conclave | 21 | 10 | 17 |

## Methodology

- **Fuzzy severity match**: a flagged blocker counts as correct if its file matches an expected file-pattern AND its severity is within one level of expected (blocker↔major↔minor↔nit). Category labels are not required to match across tools since each uses its own taxonomy.
- **FPR on clean cases**: fraction of `category=clean` cases where the tool returned `rework` or `reject`. Lower is better; 0 means the tool never flagged a clean PR.
- **Cost / latency**: p50/p95 across cases that returned a numeric value. Skipped or errored cases do not contribute.

See [`bench/src/score.ts`](bench/src/score.ts) for the canonical implementation.
