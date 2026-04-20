# conclave-benchmarks

> Open benchmark for multi-agent code-review systems. Defend claims with data, not marketing copy.

## Purpose

Every code-review AI claims it catches real bugs. Almost none publish how they measure that. `conclave-benchmarks` is a small, curated, transparent corpus — 20 hand-labeled pull-request cases across five failure categories — plus a runner that invokes any tool through an adapter and emits the same metrics for each.

The goal is not to win; the goal is to make it cheap for anyone to verify the claim, reproduce the numbers, and add a case they care about. If Conclave AI loses on a category, we want to see that loss printed in the leaderboard, not hidden behind a blog post.

## Methodology

### Corpus

Every case lives in `corpus/<YYYY-NN>-<slug>/` and carries four files:

- `base.ts` (or `base/`) — the pre-change snapshot.
- `diff.patch` — a unified diff representing the PR.
- `groundtruth.json` — category, expected verdict, expected blockers.
- `readme.md` — what the case tests and why it matters. Links to upstream source commit when the pattern comes from public OSS history.

Cases are **authorial reproductions** of patterns seen in public revert histories, published vulnerability disclosures, and framework-documented footguns — not verbatim copies of a single PR. We deliberately do not reprint OSS authors' names or emails; upstream source URLs in `readme.md` are the only attribution.

### Categories

| Category | Count | What it tests |
| --- | --- | --- |
| `regression` | 8 | Subtle behavior-breaking changes that build and pass types — axios response-type drop, lodash `toString` semantics, express `trust proxy`, React `useMemo` deps, Node sync I/O in async paths, TS non-null assertion on optional fields, webpack chunk magic comment, Vue reactivity destructuring. |
| `encoding` | 2 | UTF-16 BOM in README, em-dash corrupted to `?` in workflow YAML. Both hit during Conclave's own E2E smoke test — known-good ground truth. |
| `logic` | 4 | Off-by-one, null deref, missing await, race in shared state. |
| `security` | 3 | Hardcoded AWS key (AWS public example values; format-matching for scanners), SSRF via unvalidated URL, SQL injection via template-literal interpolation. |
| `clean` | 3 | Real-world clean PRs — README typo fix, minor dep bump within caret range, pure test addition. Tools should APPROVE these. Flagging them is a false positive. |

### Scoring

For each tool across all cases we report:

- **Precision** — correct_blockers / total_blockers_flagged
- **Recall** — correct_blockers / total_expected_blockers
- **Verdict accuracy** — verdicts_matching_expected / cases_run
- **Cost p50 / p95** — USD per case (ignores null values)
- **Latency p50 / p95** — wall-clock ms per case
- **FPR on clean cases** — fraction of `clean` cases returned with `rework` or `reject`
- **Catch rate per category** — correct / expected within each category

A flagged blocker is **correct** if:

1. The expected `file_pattern` (glob or regex) matches the flagged file.
2. The flagged severity is within one level of expected on the `blocker → major → minor → nit` scale.

Category labels across tools differ too much to compare directly, so category is informational only in scoring. The canonical rule lives at the top of [`bench/src/score.ts`](bench/src/score.ts).

## Current leaderboard

See [`RESULTS.md`](RESULTS.md).

Populated from the first local run. Automated nightly refresh lands via [`.github/workflows/nightly.yml`](.github/workflows/nightly.yml) once the workflow is enabled on the default branch.

## How to contribute a case

One case = one PR. Minimal checklist:

1. Fork, branch.
2. Add a new directory under `corpus/` following `YYYY-NN-<slug>/`.
3. Include `diff.patch`, `base.ts` (or `base/`), `groundtruth.json`, `readme.md`.
4. `groundtruth.json` must validate against the zod schema in [`bench/src/types.ts`](bench/src/types.ts).
5. CI runs `pnpm build` + `pnpm test` + corpus validation on your branch.

**Do not** include:
- Live API keys, credentials, customer data.
- The original author's name, email, or avatar — link the source commit URL instead.
- A `CLA.md`. No CLA here; contributions are Apache-2.0 on submission.

**Do** include:
- A `source_url` in `groundtruth.json` if your case reproduces a real upstream incident. A single commit URL is enough.

## Running locally

```bash
# prerequisites: Node 22+, pnpm 10+
corepack pnpm install
corepack pnpm build
corepack pnpm test

# run the benchmark end-to-end
corepack pnpm bench -- \
  --corpus corpus/ \
  --tools conclave \
  --cli-version 0.4.3 \
  --output results/first-run/

corepack pnpm score -- \
  --results results/first-run/ \
  --corpus corpus/ \
  --output RESULTS.md
```

Conclave's CLI needs at least one LLM API key to run a real review. If none are set (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` / `XAI_API_KEY`), the adapter returns `{ok: false, meta: {skipped: true}}` per case and the harness exits 0 — so CI stays informational and local smoke tests still pass.

## Adapters

| Tool | Status | Notes |
| --- | --- | --- |
| `conclave` | implemented | Installs `@conclave-ai/cli@<version>` into a throwaway dir, runs `conclave review --diff`. |
| `copilot-review` | stub | Phase 2 (after ≥2 external Conclave installs). |
| `coderabbit` | stub | Phase 2. |
| `greptile` | stub | Phase 2. |

Each stub throws `NotImplementedError` rather than silently producing empty results. See the source in [`bench/src/adapters/`](bench/src/adapters/) for the Phase 2 wiring plan per tool.

## Licensing

- Harness code: Apache-2.0 ([`LICENSE`](LICENSE)).
- Corpus cases: Apache-2.0 on submission. When a case reproduces a pattern from a public upstream repo, the `readme.md` links to the source commit URL. We do not reprint upstream author names/emails in corpus files.

## Not benchmarked yet

Phase 2 (GitHub Copilot Review, CodeRabbit, Greptile) lands after we have ≥2 external Conclave installs in production and can exercise the staging path against real GitHub PR flows. Until then, the stubs live in `bench/src/adapters/` with their wiring plans as comments.

If you run one of these tools against the corpus today, please file an issue with your methodology — we'll accept PR adapters that respect the `Adapter` contract.
