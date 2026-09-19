# Conclave Benchmarks — Leaderboard

_Generated 2026-09-19T06:18:49.634Z from `/home/runner/work/conclave-benchmarks/conclave-benchmarks/results/nightly`._

## Summary

| Tool | Cases (ok / total) | Verdict accuracy | Precision | Recall | FPR (clean) | Cost p50 / p95 | Latency p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| conclave | 20 / 20 | 65.0% | 55.6% | 58.8% | 66.7% | $0.0428 / $0.0695 | 50003ms / 81875ms |

## Per-category catch rate

| Tool | clean | encoding | logic | regression | security |
| --- | --- | --- | --- | --- | --- |
| conclave | 0 / 0 | 0 / 2 | 3 / 4 | 6 / 8 | 1 / 3 |

## Raw counts

| Tool | Flagged | Correct | Expected |
| --- | --- | --- | --- |
| conclave | 18 | 10 | 17 |

## Methodology

- **Fuzzy severity match**: a flagged blocker counts as correct if its file matches an expected file-pattern AND its severity is within one level of expected (blocker↔major↔minor↔nit). Category labels are not required to match across tools since each uses its own taxonomy.
- **FPR on clean cases**: fraction of `category=clean` cases where the tool returned `rework` or `reject`. Lower is better; 0 means the tool never flagged a clean PR.
- **Cost / latency**: p50/p95 across cases that returned a numeric value. Skipped or errored cases do not contribute.

See [`bench/src/score.ts`](bench/src/score.ts) for the canonical implementation.
