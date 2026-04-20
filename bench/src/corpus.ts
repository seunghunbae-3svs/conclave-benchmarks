/**
 * Corpus loader: scans corpus/ for cases, validates groundtruth schema,
 * returns BenchCase[] ready for the runner to dispatch.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { GroundTruthSchema, type BenchCase } from "./types.js";

export interface LoadCorpusOptions {
  /** absolute or relative path to corpus dir */
  corpusDir: string;
  /** optional allowlist of case ids; when omitted, load every case */
  only?: string[];
}

export function loadCorpus(opts: LoadCorpusOptions): BenchCase[] {
  const root = resolve(opts.corpusDir);
  if (!existsSync(root)) {
    throw new Error(`Corpus dir not found: ${root}`);
  }
  const entries = readdirSync(root).filter((name) => {
    if (name.startsWith(".")) return false;
    const p = join(root, name);
    return statSync(p).isDirectory();
  });

  const cases: BenchCase[] = [];
  const errors: string[] = [];
  for (const name of entries) {
    const dir = join(root, name);
    try {
      cases.push(loadOne(dir));
    } catch (err) {
      errors.push(`[${name}] ${(err as Error).message}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Corpus validation failed:\n  ${errors.join("\n  ")}`);
  }
  const filtered = opts.only ? cases.filter((c) => opts.only!.includes(c.id)) : cases;
  filtered.sort((a, b) => a.id.localeCompare(b.id));
  return filtered;
}

function loadOne(dir: string): BenchCase {
  const gtPath = join(dir, "groundtruth.json");
  if (!existsSync(gtPath)) throw new Error("missing groundtruth.json");
  const raw = JSON.parse(readFileSync(gtPath, "utf8")) as unknown;
  const parsed = GroundTruthSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`groundtruth.json invalid: ${parsed.error.issues.map((i) => i.message).join(", ")}`);
  }
  const diffPath = join(dir, "diff.patch");
  if (!existsSync(diffPath)) throw new Error("missing diff.patch");
  const diff = readFileSync(diffPath, "utf8");

  const baseTsPath = join(dir, "base.ts");
  const baseDirPath = join(dir, "base");
  let basePath: string;
  let baseIsDir: boolean;
  if (existsSync(baseTsPath)) {
    basePath = baseTsPath;
    baseIsDir = false;
  } else if (existsSync(baseDirPath) && statSync(baseDirPath).isDirectory()) {
    basePath = baseDirPath;
    baseIsDir = true;
  } else {
    throw new Error("missing base.ts or base/ directory");
  }

  return {
    id: parsed.data.id,
    dir,
    diffPath,
    basePath,
    baseIsDir,
    groundTruth: parsed.data,
    diff,
  };
}
