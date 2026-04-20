# Conclave Benchmarks — Leaderboard

_Generated 2026-04-20T15:20:09Z from `results/first-run/`._

## Status

**First-run harness verification — no live LLM invocation.** This run was executed on the repo-bootstrap machine, which does not hold LLM API keys, so the `conclave` adapter returned `skipped: true` for every case. The harness itself ran end-to-end without crashing, which was the acceptance criterion for Phase 1.

Live numbers will land from:

- The **nightly workflow** ([`.github/workflows/nightly.yml`](.github/workflows/nightly.yml)) — runs on a GitHub Actions runner with `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` provisioned as secrets. Opens a PR against `main` with the refreshed RESULTS.md.
- **Local runs** — anyone with keys can reproduce: `corepack pnpm bench -- --corpus corpus/ --tools conclave --cli-version <v> --output results/<run-id>/` followed by `corepack pnpm score`.

## Summary

| Tool | Cases (ok / total) | Verdict accuracy | Precision | Recall | FPR (clean) | Cost p50 / p95 | Latency p50 / p95 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| conclave | 0 / 20 (20 skipped) | — | — | — | — | — / — | — / — |

## Per-category catch rate

| Tool | encoding | logic | security | clean | regression |
| --- | --- | --- | --- | --- | --- |
| conclave | — | — | — | — | — |

## Raw counts

| Tool | Flagged | Correct | Expected |
| --- | --- | --- | --- |
| conclave | 0 | 0 | 0 |

## Corpus composition (reference)

| Category | Count | Expected verdicts |
| --- | --- | --- |
| regression | 8 | 7 rework / 1 reject |
| logic | 4 | 2 rework / 2 reject |
| security | 3 | 3 reject |
| encoding | 2 | 2 rework |
| clean | 3 | 3 approve |
| **total** | **20** | |

## Methodology

- **Fuzzy severity match**: a flagged blocker counts as correct if its file matches an expected file-pattern AND its severity is within one level of expected (blocker↔major↔minor↔nit). Category labels are not required to match across tools since each uses its own taxonomy.
- **FPR on clean cases**: fraction of `category=clean` cases where the tool returned `rework` or `reject`. Lower is better; 0 means the tool never flagged a clean PR.
- **Cost / latency**: p50/p95 across cases that returned a numeric value. Skipped or errored cases do not contribute.

See [`bench/src/score.ts`](bench/src/score.ts) for the canonical implementation.
