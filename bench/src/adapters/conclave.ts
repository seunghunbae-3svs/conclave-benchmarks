/**
 * Conclave adapter.
 *
 * Installs @conclave-ai/cli@<toolVersion> into a private temp dir (so it
 * doesn't clobber any global install) and invokes `conclave review
 * --diff <patch>` against the generated patch.
 *
 * The CLI as of v0.4.3 emits a human-readable text block — see
 * packages/cli/src/lib/output.ts in conclave-ai. We parse that format below.
 * TODO(phase 2): switch to `--json` once the CLI exposes structured output,
 * and drop the parseTextOutput path.
 *
 * Behaviour when env keys are missing:
 *   - The CLI itself will fail to instantiate agents without at least one of
 *     ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY. We detect this
 *     upfront and return a soft-failure result with ok=false + a clear
 *     `error` string. The runner writes the soft failure and moves on so
 *     CI stays informational.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  NotImplementedError as _NotImplementedError,
  type Adapter,
  type AdapterContext,
  type AdapterResult,
  type BenchCase,
  type BlockerOutput,
  type Severity,
  type Verdict,
} from "../types.js";

export const conclaveAdapter: Adapter = {
  name: "conclave",
  async run(c: BenchCase, ctx: AdapterContext): Promise<AdapterResult> {
    const started = new Date().toISOString();
    const t0 = performance.now();

    const hasAnyKey =
      !!process.env.ANTHROPIC_API_KEY ||
      !!process.env.OPENAI_API_KEY ||
      !!process.env.GEMINI_API_KEY ||
      !!process.env.XAI_API_KEY;

    if (!hasAnyKey) {
      return {
        tool: "conclave",
        case_id: c.id,
        ok: false,
        error:
          "no LLM API keys set (ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY / XAI_API_KEY). Skipping live invocation.",
        blockers: [],
        cost_usd: null,
        latency_ms: 0,
        tokens: null,
        cache_hit: null,
        agent_count: null,
        meta: { skipped: true, reason: "missing_api_keys" },
        timestamp: started,
      };
    }

    const installDir = join(ctx.workspace, "conclave-install");
    mkdirSync(installDir, { recursive: true });
    const version = ctx.toolVersion ?? "latest";

    // npm init -y && npm install @conclave-ai/cli@<version>
    const initResult = await exec("npm", ["init", "-y"], { cwd: installDir });
    if (initResult.code !== 0) {
      return softFail(c.id, started, t0, `npm init failed: ${initResult.stderr.slice(0, 400)}`);
    }
    const installResult = await exec(
      "npm",
      ["install", "--no-audit", "--no-fund", `@conclave-ai/cli@${version}`],
      { cwd: installDir, timeoutMs: 180_000 },
    );
    if (installResult.code !== 0) {
      return softFail(
        c.id,
        started,
        t0,
        `npm install @conclave-ai/cli@${version} failed: ${installResult.stderr.slice(0, 400)}`,
      );
    }

    const binPath = join(installDir, "node_modules", ".bin", process.platform === "win32" ? "conclave.cmd" : "conclave");
    if (!existsSync(binPath)) {
      return softFail(c.id, started, t0, `conclave binary missing at ${binPath}`);
    }

    // Copy the patch into the install dir where the CLI will resolve relative paths
    const diffHere = join(installDir, "change.patch");
    writeFileSync(diffHere, c.diff, "utf8");

    const runResult = await exec(binPath, ["review", "--diff", diffHere], {
      cwd: installDir,
      timeoutMs: 300_000,
      env: {
        ...process.env,
        // Don't let user's local cosmiconfig pick up unrelated project configs
        CONCLAVE_CONFIG_DISABLE_SEARCH: "1",
      },
    });

    const latency_ms = Math.round(performance.now() - t0);
    const parsed = parseTextOutput(runResult.stdout);
    if (!parsed) {
      return softFail(
        c.id,
        started,
        t0,
        `could not parse conclave stdout (exit=${runResult.code}): ${runResult.stdout.slice(0, 400)} | stderr: ${runResult.stderr.slice(0, 200)}`,
      );
    }

    return {
      tool: "conclave",
      case_id: c.id,
      ok: true,
      verdict: parsed.verdict,
      blockers: parsed.blockers,
      cost_usd: parsed.cost_usd,
      latency_ms,
      tokens: parsed.tokens,
      cache_hit: parsed.cache_hit,
      agent_count: parsed.agent_count,
      meta: {
        exit: runResult.code,
        rounds: parsed.rounds,
        early_exit: parsed.early_exit,
        cli_version: version,
      },
      timestamp: started,
    };
  },
};

function softFail(
  case_id: string,
  timestamp: string,
  t0: number,
  error: string,
): AdapterResult {
  return {
    tool: "conclave",
    case_id,
    ok: false,
    error,
    blockers: [],
    cost_usd: null,
    latency_ms: Math.round(performance.now() - t0),
    tokens: null,
    cache_hit: null,
    agent_count: null,
    meta: {},
    timestamp,
  };
}

/** Parse the v0.4.3 text output format from packages/cli/src/lib/output.ts. */
export function parseTextOutput(stdout: string): ParsedReview | null {
  const verdictMatch = stdout.match(/^Verdict:\s+(APPROVE|REWORK|REJECT)/m);
  if (!verdictMatch || !verdictMatch[1]) return null;
  const verdict = verdictMatch[1].toLowerCase() as Verdict;

  const blockers: BlockerOutput[] = [];
  // Match a single line: [SEV] <message text> <file-with-ext>
  // - severity tag is one of BLOCKER/MAJOR/MINOR/NIT
  // - file is the LAST `<path>.<ext>` token on the line (accepts a/b/c.ts or c.ts)
  const blockerLine =
    /^\s*\[(BLOCKER|MAJOR|MINOR|NIT)\]\s+(.*?)\s+([A-Za-z0-9_./\\-]+\.[A-Za-z0-9]+)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = blockerLine.exec(stdout)) !== null) {
    const sev = (m[1] ?? "").toLowerCase() as Severity;
    const message = (m[2] ?? "").trim();
    const file = m[3] ?? "unknown";
    if (!sev) continue;
    blockers.push({ file, severity: sev, message });
  }

  const costMatch = stdout.match(/Cost[:\s]+\$?([0-9.]+)/i);
  const tokensMatch = stdout.match(/Tokens[:\s]+([0-9,]+)/i);
  const roundsMatch = stdout.match(/Rounds:\s+(\d+)/);
  const earlyExitMatch = stdout.match(/early exit on consensus/i);
  const agentsMatch = stdout.match(/(\d+)\s+agents?/i);
  const cacheMatch = stdout.match(/cache[ _-]?hit/i);

  return {
    verdict,
    blockers,
    cost_usd: costMatch && costMatch[1] ? Number(costMatch[1]) : null,
    tokens: tokensMatch && tokensMatch[1] ? Number(tokensMatch[1].replace(/,/g, "")) : null,
    rounds: roundsMatch && roundsMatch[1] ? Number(roundsMatch[1]) : null,
    early_exit: !!earlyExitMatch,
    agent_count: agentsMatch && agentsMatch[1] ? Number(agentsMatch[1]) : null,
    cache_hit: cacheMatch ? true : null,
  };
}

interface ParsedReview {
  verdict: Verdict;
  blockers: BlockerOutput[];
  cost_usd: number | null;
  tokens: number | null;
  rounds: number | null;
  early_exit: boolean;
  agent_count: number | null;
  cache_hit: boolean | null;
}

interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}
interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function exec(cmd: string, args: string[], opts: ExecOptions = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      shell: process.platform === "win32",
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const to = opts.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill();
        }, opts.timeoutMs)
      : null;
    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      if (to) clearTimeout(to);
      resolve({ code: code ?? -1, stdout, stderr, timedOut });
    });
    child.on("error", (err) => {
      if (to) clearTimeout(to);
      resolve({ code: -1, stdout, stderr: stderr + "\n" + err.message, timedOut });
    });
  });
}
