#!/usr/bin/env node
/**
 * Conclave benchmarks runner.
 *
 * Usage:
 *   pnpm bench -- \
 *     --corpus corpus/ \
 *     --tools conclave[,copilot-review,coderabbit,greptile] \
 *     --output results/<timestamp>/ \
 *     --cli-version 0.4.3 \
 *     [--only 2026-01-encoding-bom,2026-02-...] \
 *     [--concurrency 4]
 *
 * Per case:
 *   1. Load ground truth + diff
 *   2. Create throwaway workspace (/tmp/conclave-bench-<case>-<ts>/)
 *   3. Invoke adapter(s)
 *   4. Write results/<ts>/<tool>/<case-id>.json
 *   5. Dispose workspace
 *
 * Runs up to N cases concurrently (default 4) per tool via pLimit.
 * Exits 0 on completion (bench is informational — doesn't gate CI).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { AdapterResultSchema, NotImplementedError, type AdapterResult } from "./types.js";
import { loadCorpus } from "./corpus.js";
import { createWorkspace } from "./workspace.js";
import { getAdapter } from "./adapters/index.js";
import { pLimit } from "./concurrency.js";
import { parseArgs, requireArg } from "./cli.js";

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has("help") || args.flags.has("h")) {
    printHelp();
    return 0;
  }

  const corpusDir = requireArg(args, "corpus", "corpus");
  const tools = requireArg(args, "tools", "conclave").split(",").map((s) => s.trim()).filter(Boolean);
  const outputDir = resolve(requireArg(args, "output", `results/${timestamp()}`));
  const cliVersion = args.values["cli-version"];
  const onlyArg = args.values["only"];
  const only = onlyArg ? onlyArg.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const concurrency = Number(args.values["concurrency"] ?? "4");

  console.log(`[bench] corpus    ${corpusDir}`);
  console.log(`[bench] tools     ${tools.join(", ")}`);
  console.log(`[bench] output    ${outputDir}`);
  console.log(`[bench] version   ${cliVersion ?? "(latest)"}`);
  if (only) console.log(`[bench] filter    ${only.join(", ")}`);
  console.log(`[bench] parallel  ${concurrency}`);

  const cases = loadCorpus({ corpusDir, only });
  console.log(`[bench] loaded ${cases.length} case(s)`);
  if (cases.length === 0) {
    console.warn("[bench] no cases matched — exiting");
    return 0;
  }

  mkdirSync(outputDir, { recursive: true });

  let totalOk = 0;
  let totalFail = 0;
  let totalSkipped = 0;

  for (const toolName of tools) {
    const toolOutDir = join(outputDir, toolName);
    mkdirSync(toolOutDir, { recursive: true });

    let adapter;
    try {
      adapter = getAdapter(toolName);
    } catch (err) {
      console.error(`[bench][${toolName}] ${(err as Error).message}`);
      continue;
    }

    const limit = pLimit(Math.max(1, concurrency));
    const tasks = cases.map((c) =>
      limit(async () => {
        const ws = createWorkspace(c);
        const label = `${toolName}:${c.id}`;
        const started = Date.now();
        try {
          const r = await adapter.run(c, { toolVersion: cliVersion, workspace: ws.dir });
          const validated = AdapterResultSchema.parse(r);
          writeResult(toolOutDir, c.id, validated);
          if (validated.ok) {
            totalOk += 1;
            console.log(`[bench] OK    ${label} (${Date.now() - started}ms)`);
          } else {
            if (validated.meta?.["skipped"]) {
              totalSkipped += 1;
              console.log(`[bench] SKIP  ${label} — ${validated.error ?? "skipped"}`);
            } else {
              totalFail += 1;
              console.log(`[bench] FAIL  ${label} — ${validated.error ?? "unknown"}`);
            }
          }
        } catch (err) {
          totalFail += 1;
          const isNotImpl = err instanceof NotImplementedError;
          const errResult: AdapterResult = {
            tool: toolName,
            case_id: c.id,
            ok: false,
            error: (err as Error).message,
            blockers: [],
            cost_usd: null,
            latency_ms: Date.now() - started,
            tokens: null,
            cache_hit: null,
            agent_count: null,
            meta: { not_implemented: isNotImpl },
            timestamp: new Date().toISOString(),
          };
          writeResult(toolOutDir, c.id, errResult);
          console.log(
            `[bench] ERR   ${label} — ${isNotImpl ? "stub adapter (phase 2)" : (err as Error).message}`,
          );
        } finally {
          ws.dispose();
        }
      }),
    );
    await Promise.all(tasks);
  }

  const summary = {
    timestamp: new Date().toISOString(),
    corpus_dir: resolve(corpusDir),
    tools,
    cli_version: cliVersion ?? null,
    counts: { ok: totalOk, fail: totalFail, skipped: totalSkipped, total: cases.length * tools.length },
  };
  writeFileSync(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(
    `[bench] done — ok=${totalOk} fail=${totalFail} skipped=${totalSkipped} | results at ${outputDir}`,
  );
  return 0;
}

function writeResult(dir: string, caseId: string, r: AdapterResult): void {
  const p = join(dir, `${caseId}.json`);
  writeFileSync(p, JSON.stringify(r, null, 2), "utf8");
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(
    d.getUTCHours(),
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function printHelp(): void {
  console.log(`conclave-benchmarks runner

Usage:
  pnpm bench -- --corpus <dir> --tools <tool[,tool]> [--output <dir>] [--cli-version <v>] [--only <id[,id]>] [--concurrency <n>]

Flags:
  --corpus <dir>         path to corpus directory (required)
  --tools  <list>        comma-separated tool names (required). known: conclave, copilot-review, coderabbit, greptile
  --output <dir>         output dir (default: results/<timestamp>)
  --cli-version <v>      conclave CLI version to install (default: latest)
  --only <ids>           comma-separated case ids to run
  --concurrency <n>      parallel cases per tool (default: 4)
  --help                 show this help

Notes:
  Missing LLM API keys → conclave adapter returns skipped=true result. Harness
  exits 0 so CI stays informational.
`);
}

// Only execute when invoked as a script; keeps the module importable from tests.
import { fileURLToPath } from "node:url";
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error("[bench] fatal:", err);
      process.exit(1);
    },
  );
}
