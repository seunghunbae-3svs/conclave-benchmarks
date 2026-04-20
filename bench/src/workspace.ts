/**
 * Workspace management: per-case throwaway directory, apply diff, clean up.
 */
import { mkdirSync, cpSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import type { BenchCase } from "./types.js";

export interface Workspace {
  dir: string;
  patchPath: string;
  dispose(): void;
}

/**
 * Create a fresh workspace for a case, seed it with the base content, and
 * write the diff as `change.patch` inside. We do NOT git-apply here — adapters
 * that care (e.g. conclave with --diff) receive the patch directly; an adapter
 * that wants the patched tree can apply it in their own hermetic step.
 *
 * Rationale: every adapter has its own constraints (some want a git repo,
 * some want a raw diff, some spawn their own sandbox). The runner's job is to
 * hand over a clean pair (base-state + diff) and let the adapter decide.
 */
export function createWorkspace(c: BenchCase): Workspace {
  const dir = join(tmpdir(), `conclave-bench-${c.id}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });

  // Seed base state
  const baseTarget = join(dir, "base");
  mkdirSync(baseTarget, { recursive: true });
  if (c.baseIsDir) {
    cpSync(c.basePath, baseTarget, { recursive: true });
  } else {
    // single base.ts → place it at base/src/<filename>
    const inner = join(baseTarget, "src");
    mkdirSync(inner, { recursive: true });
    cpSync(c.basePath, join(inner, "base.ts"));
  }

  const patchPath = join(dir, "change.patch");
  writeFileSync(patchPath, c.diff, "utf8");

  return {
    dir,
    patchPath,
    dispose() {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore — OS will clean tmp eventually
      }
    },
  };
}

export function ensureDir(p: string): void {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

export function ensureParentDir(p: string): void {
  ensureDir(dirname(p));
}
