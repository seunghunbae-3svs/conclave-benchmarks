import test from "node:test";
import assert from "node:assert/strict";
import { matchBlockers, patternToRegex } from "../src/score.js";
import { parseTextOutput } from "../src/adapters/conclave.js";

test("patternToRegex glob: * matches single segment", () => {
  const re = patternToRegex("src/*.ts");
  assert.equal(re.test("src/foo.ts"), true);
  assert.equal(re.test("src/nested/foo.ts"), false);
});

test("patternToRegex glob: ** crosses segments", () => {
  const re = patternToRegex("src/**/*.ts");
  assert.equal(re.test("src/foo.ts"), true);
  assert.equal(re.test("src/a/b/foo.ts"), true);
  assert.equal(re.test("lib/foo.ts"), false);
});

test("patternToRegex regex-ish passes through", () => {
  const re = patternToRegex("^src/(foo|bar)\\.ts$");
  assert.equal(re.test("src/foo.ts"), true);
  assert.equal(re.test("src/baz.ts"), false);
});

test("matchBlockers: exact severity + path matches", () => {
  const { correct } = matchBlockers(
    [{ file: "src/foo.ts", severity: "blocker", message: "x" }],
    [{ file_pattern: "src/foo.ts", severity: "blocker", category_hint: "regression" }],
  );
  assert.equal(correct, 1);
});

test("matchBlockers: severity off by 1 still matches", () => {
  const { correct } = matchBlockers(
    [{ file: "src/foo.ts", severity: "major", message: "x" }],
    [{ file_pattern: "src/foo.ts", severity: "blocker", category_hint: "regression" }],
  );
  assert.equal(correct, 1);
});

test("matchBlockers: severity off by 2 does NOT match", () => {
  const { correct } = matchBlockers(
    [{ file: "src/foo.ts", severity: "nit", message: "x" }],
    [{ file_pattern: "src/foo.ts", severity: "blocker", category_hint: "regression" }],
  );
  assert.equal(correct, 0);
});

test("matchBlockers: each expected blocker consumed once", () => {
  const { correct } = matchBlockers(
    [
      { file: "src/foo.ts", severity: "blocker", message: "a" },
      { file: "src/foo.ts", severity: "blocker", message: "b" },
    ],
    [{ file_pattern: "src/foo.ts", severity: "blocker", category_hint: "regression" }],
  );
  assert.equal(correct, 1);
});

test("matchBlockers: wrong path does not match", () => {
  const { correct } = matchBlockers(
    [{ file: "src/other.ts", severity: "blocker", message: "x" }],
    [{ file_pattern: "src/foo.ts", severity: "blocker", category_hint: "regression" }],
  );
  assert.equal(correct, 0);
});

test("parseTextOutput extracts REWORK verdict + blockers", () => {
  const stdout = [
    "conclave review — acme/repo #42",
    "  sha:    abc123def456",
    "  source: github",
    "",
    "Verdict: REWORK (no consensus)",
    "Rounds:  2 (early exit on consensus)",
    "",
    "[BLOCKER] Null deref on user.session src/auth.ts",
    "[MAJOR]  Missing await on fetch() src/api/client.ts",
    "",
    "Cost: $0.0123",
    "Tokens: 4,321",
    "3 agents participated",
  ].join("\n");
  const parsed = parseTextOutput(stdout);
  assert.ok(parsed);
  assert.equal(parsed!.verdict, "rework");
  assert.equal(parsed!.cost_usd, 0.0123);
  assert.equal(parsed!.tokens, 4321);
  assert.equal(parsed!.rounds, 2);
  assert.equal(parsed!.early_exit, true);
  assert.equal(parsed!.agent_count, 3);
  assert.ok(parsed!.blockers.length >= 2);
  assert.equal(parsed!.blockers[0]!.severity, "blocker");
});

test("parseTextOutput returns null without a Verdict line", () => {
  const parsed = parseTextOutput("nothing useful here");
  assert.equal(parsed, null);
});

test("parseTextOutput handles APPROVE with no blockers", () => {
  const stdout = "Verdict: APPROVE\nRounds: 1";
  const parsed = parseTextOutput(stdout);
  assert.ok(parsed);
  assert.equal(parsed!.verdict, "approve");
  assert.equal(parsed!.blockers.length, 0);
});
