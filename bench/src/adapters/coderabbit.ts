/**
 * CodeRabbit adapter — STUB.
 *
 * Phase 2 wiring plan:
 *   1. CodeRabbit operates over GitHub PRs; install the GH app on a throwaway
 *      private repo.
 *   2. Push base + PR with diff, wait for CodeRabbit bot comment.
 *   3. Parse structured CodeRabbit output (they expose a JSON block in
 *      summary comments).
 *   4. Map to AdapterResult shape.
 *
 * Until then, throws NotImplementedError.
 */
import { NotImplementedError, type Adapter } from "../types.js";

export const codeRabbitAdapter: Adapter = {
  name: "coderabbit",
  async run() {
    throw new NotImplementedError("coderabbit");
  },
};
