/**
 * Minimal argv parser. No external dep on commander/yargs — keeps the
 * benchmark harness's footprint tiny so contributors don't have to audit a
 * dependency tree on every PR.
 */
export interface ParsedArgs {
  flags: Set<string>;
  values: Record<string, string>;
  positional: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  const positional: string[] = [];
  let i = 0;
  // Strip `--` separator if present (pnpm passes flags after it)
  while (i < argv.length) {
    const a = argv[i];
    if (a === undefined) break;
    if (a === "--") {
      i += 1;
      continue;
    }
    if (a.startsWith("--")) {
      const eqIdx = a.indexOf("=");
      if (eqIdx >= 0) {
        const k = a.slice(2, eqIdx);
        values[k] = a.slice(eqIdx + 1);
        i += 1;
        continue;
      }
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        values[k] = next;
        i += 2;
      } else {
        flags.add(k);
        i += 1;
      }
      continue;
    }
    positional.push(a);
    i += 1;
  }
  return { flags, values, positional };
}

export function requireArg(parsed: ParsedArgs, name: string, fallback?: string): string {
  const v = parsed.values[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`missing required --${name}`);
  }
  return v;
}
