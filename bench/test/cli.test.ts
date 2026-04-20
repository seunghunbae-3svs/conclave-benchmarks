import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, requireArg } from "../src/cli.js";

test("parseArgs space-separated values", () => {
  const r = parseArgs(["--corpus", "corpus/", "--tools", "conclave"]);
  assert.equal(r.values["corpus"], "corpus/");
  assert.equal(r.values["tools"], "conclave");
});

test("parseArgs handles = form", () => {
  const r = parseArgs(["--output=results/x"]);
  assert.equal(r.values["output"], "results/x");
});

test("parseArgs flags without values", () => {
  const r = parseArgs(["--help"]);
  assert.ok(r.flags.has("help"));
});

test("parseArgs strips leading -- separator", () => {
  const r = parseArgs(["--", "--corpus", "corpus/"]);
  assert.equal(r.values["corpus"], "corpus/");
});

test("requireArg throws when missing", () => {
  const r = parseArgs([]);
  assert.throws(() => requireArg(r, "corpus"));
});

test("requireArg uses fallback", () => {
  const r = parseArgs([]);
  assert.equal(requireArg(r, "corpus", "default-dir"), "default-dir");
});
