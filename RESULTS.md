# Conclave Benchmarks — Leaderboard

_Generated 2026-11-28T06:12:38.263Z from `/home/runner/work/conclave-benchmarks/conclave-benchmarks/results/nightly`._

## Summary

| Tool | Cases (ok / total) | Verdict accuracy | Precision | Recall | FPR (clean) | Cost p50 / p95 | Latency p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| conclave | 20 / 20 | 65.0% | 63.6% | 41.2% | 100.0% | $0.0279 / $0.0470 | 35383ms / 54948ms |

## Per-category catch rate

| Tool | clean | encoding | logic | regression | security |
| --- | --- | --- | --- | --- | --- |
| conclave | 0 / 0 | 0 / 2 | 2 / 4 | 3 / 8 | 2 / 3 |

## Raw counts

| Tool | Flagged | Correct | Expected |
| --- | --- | --- | --- |
| conclave | 11 | 7 | 17 |

## Methodology

- **Fuzzy severity match**: a flagged blocker counts as correct if its file matches an expected file-pattern AND its severity is within one level of expected (blocker↔major↔minor↔nit). Category labels are not required to match across tools since each uses its own taxonomy.
- **FPR on clean cases**: fraction of `category=clean` cases where the tool returned `rework` or `reject`. Lower is better; 0 means the tool never flagged a clean PR.
- **Cost / latency**: p50/p95 across cases that returned a numeric value. Skipped or errored cases do not contribute.

See [`bench/src/score.ts`](bench/src/score.ts) for the canonical implementation.
