# Contributing to conclave-benchmarks

Thanks for opening a PR. Every accepted case is a number someone can cite when they ask "does your reviewer actually catch X?"

## Ground rules

- No CLA. Your contribution is Apache-2.0 on submission.
- No live secrets. No customer data. No upstream author PII.
- One case per PR, please. Keeps review fast.

## Case layout

```
corpus/
  <YYYY-NN>-<slug>/
    diff.patch          required; unified diff
    base.ts or base/    required; pre-change snapshot
    groundtruth.json    required; matches the zod schema
    readme.md           required; one short paragraph + source_url if applicable
```

Example: `corpus/2026-21-regression-<your-pattern>/`

## groundtruth.json schema

See [`bench/src/types.ts`](bench/src/types.ts). Required fields:

```json
{
  "id": "2026-21-regression-thing",
  "category": "regression | encoding | logic | security | clean | design",
  "expected_verdict": "approve | rework | reject",
  "expected_blockers": [
    {
      "file_pattern": "src/**/*.ts",
      "severity": "blocker | major | minor | nit",
      "category_hint": "regression | correctness | security | style | accessibility | encoding | performance | design",
      "note": "optional — what the reviewer should flag"
    }
  ],
  "source_url": "https://github.com/<org>/<repo>/commit/<sha> (optional)"
}
```

`id` must be unique and follow `YYYY-NN-<slug>`.

## What makes a good case

- **Minimal.** The diff should isolate the pattern; ~10 lines of context is ideal.
- **Decidable.** A human expert should agree with the expected verdict in under a minute.
- **Non-obvious.** If a regex or ESLint rule would catch it, write the rule instead of a benchmark case.
- **Real pattern.** Either observed in production, documented in upstream framework docs, or reproduced from a public revert history.

## Local checks

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm test
```

The corpus test (`bench/test/corpus.test.ts`) validates every case loads against the schema. CI runs the same.

## Re-attributing source

If your case reproduces a pattern from a real commit, put the commit URL in `source_url`. Do not copy the author's name, email, avatar, or commit-message text. The diff content itself is fair game under the same OSS license as the upstream.
