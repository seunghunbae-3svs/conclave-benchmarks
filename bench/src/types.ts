/**
 * Schema + TypeScript types for the Conclave benchmark harness.
 *
 * Every case in corpus/<id>/groundtruth.json is validated against GroundTruthSchema
 * before it's fed to any adapter. Adapter outputs are validated against
 * AdapterResultSchema before they're written to results/.
 */
import { z } from "zod";

// ─── Ground-truth labels per corpus case ─────────────────────────────────────

export const Severity = z.enum(["blocker", "major", "minor", "nit"]);
export type Severity = z.infer<typeof Severity>;

export const CategoryHint = z.enum([
  "regression",
  "correctness",
  "security",
  "style",
  "accessibility",
  "encoding",
  "performance",
  "design",
]);
export type CategoryHint = z.infer<typeof CategoryHint>;

export const Verdict = z.enum(["approve", "rework", "reject"]);
export type Verdict = z.infer<typeof Verdict>;

export const CaseCategory = z.enum([
  "encoding",
  "logic",
  "security",
  "clean",
  "design",
  "regression",
]);
export type CaseCategory = z.infer<typeof CaseCategory>;

export const ExpectedBlockerSchema = z.object({
  file_pattern: z.string().min(1),
  severity: Severity,
  category_hint: CategoryHint,
  note: z.string().optional(),
});
export type ExpectedBlocker = z.infer<typeof ExpectedBlockerSchema>;

export const GroundTruthSchema = z.object({
  id: z
    .string()
    .regex(/^\d{4}-\d{2}-[a-z0-9-]+$/, "id must be YYYY-NN-slug (e.g. 2026-01-encoding-bom)"),
  category: CaseCategory,
  expected_verdict: Verdict,
  expected_blockers: z.array(ExpectedBlockerSchema),
  source_url: z.string().url().optional(),
  notes: z.string().optional(),
});
export type GroundTruth = z.infer<typeof GroundTruthSchema>;

// ─── In-memory representation of a loaded case ───────────────────────────────

export interface BenchCase {
  /** canonical id from groundtruth.json */
  id: string;
  /** absolute path to the case directory */
  dir: string;
  /** absolute path to diff.patch */
  diffPath: string;
  /** absolute path to base file or directory */
  basePath: string;
  /** is basePath a directory? */
  baseIsDir: boolean;
  /** loaded + parsed groundtruth */
  groundTruth: GroundTruth;
  /** raw diff content, preloaded for adapters */
  diff: string;
}

// ─── Adapter output ──────────────────────────────────────────────────────────

export const BlockerOutputSchema = z.object({
  /** file path the adapter flagged */
  file: z.string(),
  /** severity as reported by the adapter */
  severity: Severity,
  /** category label as reported by the adapter (free-form; scoring does fuzzy match) */
  category: z.string().optional(),
  /** one-line message from the adapter */
  message: z.string(),
});
export type BlockerOutput = z.infer<typeof BlockerOutputSchema>;

export const AdapterResultSchema = z.object({
  tool: z.string(),
  case_id: z.string(),
  ok: z.boolean(),
  /** populated when ok === false */
  error: z.string().optional(),
  verdict: Verdict.optional(),
  blockers: z.array(BlockerOutputSchema).default([]),
  /** USD spent on this case; null if unknown */
  cost_usd: z.number().nullable().default(null),
  /** wall-clock latency ms */
  latency_ms: z.number().nonnegative().default(0),
  /** total input+output tokens */
  tokens: z.number().nullable().default(null),
  /** whether the adapter reported a cache hit */
  cache_hit: z.boolean().nullable().default(null),
  /** number of agents that voted */
  agent_count: z.number().int().nonnegative().nullable().default(null),
  /** free-form metadata the adapter wants to stash */
  meta: z.record(z.unknown()).default({}),
  timestamp: z.string().datetime().optional(),
});
export type AdapterResult = z.infer<typeof AdapterResultSchema>;

// ─── Adapter contract ────────────────────────────────────────────────────────

export interface AdapterContext {
  /** semver of the tool the caller wants to benchmark; adapter may ignore */
  toolVersion?: string;
  /** absolute path to the temp workspace the runner created for this case */
  workspace: string;
}

export interface Adapter {
  readonly name: string;
  run(c: BenchCase, ctx: AdapterContext): Promise<AdapterResult>;
}

export class NotImplementedError extends Error {
  constructor(adapter: string) {
    super(
      `Adapter '${adapter}' is not implemented. See README § "Not benchmarked yet" — stubs land in Phase 2 after external install signal.`,
    );
    this.name = "NotImplementedError";
  }
}
