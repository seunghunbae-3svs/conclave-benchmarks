import test from "node:test";
import assert from "node:assert/strict";
import { GroundTruthSchema } from "../src/types.js";
import { loadCorpus } from "../src/corpus.js";
import { resolve } from "node:path";

test("GroundTruthSchema accepts valid payload", () => {
  const ok = GroundTruthSchema.safeParse({
    id: "2026-01-encoding-bom",
    category: "encoding",
    expected_verdict: "rework",
    expected_blockers: [
      { file_pattern: "README.md", severity: "major", category_hint: "encoding" },
    ],
  });
  assert.equal(ok.success, true);
});

test("GroundTruthSchema rejects bad id", () => {
  const bad = GroundTruthSchema.safeParse({
    id: "oops",
    category: "encoding",
    expected_verdict: "rework",
    expected_blockers: [],
  });
  assert.equal(bad.success, false);
});

test("GroundTruthSchema rejects unknown category", () => {
  const bad = GroundTruthSchema.safeParse({
    id: "2026-01-x",
    category: "unicorn",
    expected_verdict: "rework",
    expected_blockers: [],
  });
  assert.equal(bad.success, false);
});

test("loadCorpus loads every case in the shipped corpus/", () => {
  const corpusDir = resolve(process.cwd(), "corpus");
  const cases = loadCorpus({ corpusDir });
  assert.ok(cases.length >= 20, `expected ≥20 cases, got ${cases.length}`);
  // all ids unique
  const ids = new Set(cases.map((c) => c.id));
  assert.equal(ids.size, cases.length, "case ids must be unique");
  // categories cover the required set
  const cats = new Set(cases.map((c) => c.groundTruth.category));
  for (const required of ["encoding", "logic", "security", "clean"]) {
    assert.ok(cats.has(required as never), `missing category: ${required}`);
  }
});
