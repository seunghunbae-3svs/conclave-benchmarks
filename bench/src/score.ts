#!/usr/bin/env node
/**
 * Scoring + leaderboard generation for Conclave benchmarks.
 *
 * Usage:
 *   pnpm score -- --results results/<timestamp>/ --corpus corpus/ --output RESULTS.md
 *
 * Metrics per tool (aggregated across all cases in the results dir):
 *   - Precision            correct_blockers / total_blockers_flagged
 *   - Recall               correct_blockers / total_expected_blockers
 *   - Verdict accuracy     verdicts_matching_expected / cases_run
 *   - Cost median / p95    from case-level cost_usd (ignores null)
 *   - Latency p50 / p95    from latency_ms
 *   - FPR on clean cases   (rework+reject) / clean_case_count
 *   - Catch rate / category expected_blockers hit / total in that category
 *
 * Fuzzy-match rule for "correct blocker" (doc-ready summary):
 *   A flagged blocker B is correct iff ∃ expected E s.t.
 *     1. regex(E.file_pattern) matches B.file   (case-insensitive, anchored with ^$ if no wildcards)
 *     2. severity-distance(B.severity, E.severity) ≤ 1
 *        where severity order is: blocker=0, major=1, minor=2, nit=3
 *        so "major" matches expected "major" or "blocker" (one level stricter) or "minor" (one level softer)
 *   Each expected blocker can be matched by at most one flagged blocker.
 *   Category is NOT required to match — adapters use different taxonomies.
 *
 * We deliberately allow one-level fuzziness on severity: a tool that spots the
 * right issue but calls it "major" instead of "blocker" still gets credit.
 * A tool that sees a real blocker but flags it "nit" does NOT get credit (2+ levels off).
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AdapterResult, BlockerOutput, ExpectedBlocker, Severity } from "./types.js";
import { AdapterResultSchema } from "./types.js";
import { loadCorpus } from "./corpus.js";
import { parseArgs, requireArg } from "./cli.js";

const SEVERITY_RANK: Record<Severity, number> = { blocker: 0, major: 1, minor: 2, nit: 3 };

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const resultsDir = resolve(requireArg(args, "results"));
  const corpusDir = resolve(args.values["corpus"] ?? "corpus");
  const outputPath = resolve(args.values["output"] ?? "RESULTS.md");
  const jsonPath = resolve(args.values["json"] ?? join(resultsDir, "results.json"));

  if (!existsSync(resultsDir)) {
    throw new Error(`results dir not found: ${resultsDir}`);
  }

  const cases = loadCorpus({ corpusDir });
  const casesById = new Map(cases.map((c) => [c.id, c]));

  const toolDirs = readdirSync(resultsDir).filter((n) => {
    const p = join(resultsDir, n);
    return statSync(p).isDirectory();
  });

  const perTool: ToolMetrics[] = [];
  for (const tool of toolDirs) {
    const toolDir = join(resultsDir, tool);
    const files = readdirSync(toolDir).filter((n) => n.endsWith(".json"));
    const results: AdapterResult[] = [];
    for (const f of files) {
      const raw = JSON.parse(readFileSync(join(toolDir, f), "utf8"));
      const parsed = AdapterResultSchema.safeParse(raw);
      if (parsed.success) results.push(parsed.data);
    }
    if (results.length === 0) continue;
    perTool.push(scoreOne(tool, results, casesById));
  }

  const leaderboard = {
    generated_at: new Date().toISOString(),
    results_dir: resultsDir,
    tools: perTool,
  };
  writeFileSync(jsonPath, JSON.stringify(leaderboard, null, 2), "utf8");
  writeFileSync(outputPath, renderMarkdown(perTool, resultsDir), "utf8");
  console.log(`[score] wrote ${outputPath}`);
  console.log(`[score] wrote ${jsonPath}`);
  return 0;
}

interface ToolMetrics {
  tool: string;
  cases_total: number;
  cases_ok: number;
  cases_failed: number;
  cases_skipped: number;
  precision: number | null;
  recall: number | null;
  verdict_accuracy: number | null;
  cost_median: number | null;
  cost_p95: number | null;
  latency_p50: number | null;
  latency_p95: number | null;
  fpr_clean: number | null;
  per_category: Record<string, { hit: number; total: number }>;
  total_flagged: number;
  total_correct: number;
  total_expected: number;
}

function scoreOne(
  tool: string,
  results: AdapterResult[],
  casesById: Map<string, { groundTruth: { category: string; expected_verdict: string; expected_blockers: ExpectedBlocker[] } }>,
): ToolMetrics {
  let ok = 0;
  let failed = 0;
  let skipped = 0;
  let verdictMatches = 0;
  let cleanTotal = 0;
  let cleanFalsePositives = 0;
  let totalFlagged = 0;
  let totalCorrect = 0;
  let totalExpected = 0;
  const costs: number[] = [];
  const latencies: number[] = [];
  const perCategory: Record<string, { hit: number; total: number }> = {};

  for (const r of results) {
    if (!r.ok) {
      if (r.meta?.["skipped"]) skipped += 1;
      else failed += 1;
      continue;
    }
    ok += 1;
    const gt = casesById.get(r.case_id)?.groundTruth;
    if (!gt) continue;

    if (r.verdict === gt.expected_verdict) verdictMatches += 1;

    if (gt.category === "clean") {
      cleanTotal += 1;
      if (r.verdict === "rework" || r.verdict === "reject") cleanFalsePositives += 1;
    }

    totalFlagged += r.blockers.length;
    totalExpected += gt.expected_blockers.length;
    const { correct } = matchBlockers(r.blockers, gt.expected_blockers);
    totalCorrect += correct;

    const cat = gt.category;
    if (!perCategory[cat]) perCategory[cat] = { hit: 0, total: 0 };
    perCategory[cat].total += gt.expected_blockers.length;
    perCategory[cat].hit += correct;

    if (typeof r.cost_usd === "number") costs.push(r.cost_usd);
    if (typeof r.latency_ms === "number" && r.latency_ms > 0) latencies.push(r.latency_ms);
  }

  const cases_ok = ok;
  const precision = totalFlagged > 0 ? round(totalCorrect / totalFlagged, 3) : null;
  const recall = totalExpected > 0 ? round(totalCorrect / totalExpected, 3) : null;
  const verdict_accuracy = cases_ok > 0 ? round(verdictMatches / cases_ok, 3) : null;
  const fpr_clean = cleanTotal > 0 ? round(cleanFalsePositives / cleanTotal, 3) : null;

  return {
    tool,
    cases_total: results.length,
    cases_ok: ok,
    cases_failed: failed,
    cases_skipped: skipped,
    precision,
    recall,
    verdict_accuracy,
    cost_median: quantile(costs, 0.5),
    cost_p95: quantile(costs, 0.95),
    latency_p50: quantile(latencies, 0.5),
    latency_p95: quantile(latencies, 0.95),
    fpr_clean,
    per_category: perCategory,
    total_flagged: totalFlagged,
    total_correct: totalCorrect,
    total_expected: totalExpected,
  };
}

export function matchBlockers(
  flagged: BlockerOutput[],
  expected: ExpectedBlocker[],
): { correct: number; unmatchedExpected: ExpectedBlocker[] } {
  const used = new Set<number>();
  let correct = 0;
  for (let ei = 0; ei < expected.length; ei += 1) {
    const e = expected[ei];
    if (!e) continue;
    const re = patternToRegex(e.file_pattern);
    for (let fi = 0; fi < flagged.length; fi += 1) {
      if (used.has(fi)) continue;
      const f = flagged[fi];
      if (!f) continue;
      if (!re.test(f.file)) continue;
      const dist = Math.abs(SEVERITY_RANK[f.severity] - SEVERITY_RANK[e.severity]);
      if (dist <= 1) {
        used.add(fi);
        correct += 1;
        break;
      }
    }
  }
  const unmatchedExpected = expected.filter((_, i) => !used.has(i));
  return { correct, unmatchedExpected };
}

export function patternToRegex(pattern: string): RegExp {
  // Already a regex-ish pattern? Contains unescaped regex metacharacters.
  if (/[\\^$|()?]/.test(pattern)) {
    return new RegExp(pattern, "i");
  }
  // Glob → anchored regex.
  //   `**/`  → zero-or-more path segments (expands to `` or `a/b/`)
  //   `**`   → `.*` (cross-segment, rarely used alone)
  //   `*`    → `[^/]*` (single segment)
  // Anchored with ^$ so `src/*.ts` does not match `src/nested/foo.ts`.
  let regex = pattern.replace(/[.+]/g, "\\$&");
  regex = regex.replace(/\*\*\//g, "::GLOBSTAR_SLASH::");
  regex = regex.replace(/\*\*/g, "::GLOBSTAR::");
  regex = regex.replace(/\*/g, "[^/]*");
  regex = regex.replace(/::GLOBSTAR_SLASH::/g, "(?:.*/)?");
  regex = regex.replace(/::GLOBSTAR::/g, ".*");
  return new RegExp(`^${regex}$`, "i");
}

function quantile(xs: number[], q: number): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  const val = sorted[idx];
  return val === undefined ? null : round(val, 4);
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function renderMarkdown(tools: ToolMetrics[], resultsDir: string): string {
  const sorted = [...tools].sort((a, b) => (b.verdict_accuracy ?? 0) - (a.verdict_accuracy ?? 0));
  const lines: string[] = [];
  lines.push("# Conclave Benchmarks — Leaderboard");
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString()} from \`${resultsDir}\`._`);
  lines.push("");
  if (sorted.length === 0) {
    lines.push("> No results found. Run `pnpm bench` first.");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Summary");
  lines.push("");
  lines.push("| Tool | Cases (ok / total) | Verdict accuracy | Precision | Recall | FPR (clean) | Cost p50 / p95 | Latency p50 / p95 |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const t of sorted) {
    const okLabel = `${t.cases_ok} / ${t.cases_total}${t.cases_skipped > 0 ? ` (${t.cases_skipped} skipped)` : ""}`;
    lines.push(
      `| ${t.tool} | ${okLabel} | ${fmtPct(t.verdict_accuracy)} | ${fmtPct(t.precision)} | ${fmtPct(t.recall)} | ${fmtPct(t.fpr_clean)} | ${fmtCost(t.cost_median)} / ${fmtCost(t.cost_p95)} | ${fmtMs(t.latency_p50)} / ${fmtMs(t.latency_p95)} |`,
    );
  }
  lines.push("");

  lines.push("## Per-category catch rate");
  lines.push("");
  const allCats = new Set<string>();
  for (const t of sorted) Object.keys(t.per_category).forEach((k) => allCats.add(k));
  const cats = [...allCats].sort();
  if (cats.length > 0) {
    lines.push("| Tool | " + cats.join(" | ") + " |");
    lines.push("| --- |" + cats.map(() => " --- ").join("|") + "|");
    for (const t of sorted) {
      const row = [t.tool];
      for (const c of cats) {
        const entry = t.per_category[c];
        row.push(entry ? `${entry.hit} / ${entry.total}` : "—");
      }
      lines.push(`| ${row.join(" | ")} |`);
    }
    lines.push("");
  }

  lines.push("## Raw counts");
  lines.push("");
  lines.push("| Tool | Flagged | Correct | Expected |");
  lines.push("| --- | --- | --- | --- |");
  for (const t of sorted) {
    lines.push(`| ${t.tool} | ${t.total_flagged} | ${t.total_correct} | ${t.total_expected} |`);
  }
  lines.push("");
  lines.push("## Methodology");
  lines.push("");
  lines.push("- **Fuzzy severity match**: a flagged blocker counts as correct if its file matches an expected file-pattern AND its severity is within one level of expected (blocker↔major↔minor↔nit). Category labels are not required to match across tools since each uses its own taxonomy.");
  lines.push("- **FPR on clean cases**: fraction of `category=clean` cases where the tool returned `rework` or `reject`. Lower is better; 0 means the tool never flagged a clean PR.");
  lines.push("- **Cost / latency**: p50/p95 across cases that returned a numeric value. Skipped or errored cases do not contribute.");
  lines.push("");
  lines.push("See [`bench/src/score.ts`](bench/src/score.ts) for the canonical implementation.");
  lines.push("");
  return lines.join("\n");
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(1)}%`;
}
function fmtCost(v: number | null): string {
  if (v === null) return "—";
  return `$${v.toFixed(4)}`;
}
function fmtMs(v: number | null): string {
  if (v === null) return "—";
  return `${Math.round(v)}ms`;
}

// Only execute when invoked as a script; keeps the module importable from tests.
import { fileURLToPath } from "node:url";
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error("[score] fatal:", err);
      process.exit(1);
    },
  );
}
