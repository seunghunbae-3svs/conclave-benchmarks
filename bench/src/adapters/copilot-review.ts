/**
 * GitHub Copilot code review adapter — STUB.
 *
 * Phase 2 wiring plan (NOT in this repo yet — lands after we have ≥2 external
 * Conclave installs per Bae's staging):
 *   1. Spin up a throwaway private GitHub repo, push base + branch with diff.
 *   2. Open PR and request review from @copilot-pull-request-reviewer.
 *   3. Poll PR reviews API until copilot comment arrives.
 *   4. Parse comments → AdapterResult blockers.
 *
 * Until then, calling this adapter throws NotImplementedError so the harness
 * cannot silently produce empty competitor results. Explicit > implicit.
 */
import { NotImplementedError, type Adapter } from "../types.js";

export const copilotReviewAdapter: Adapter = {
  name: "copilot-review",
  async run() {
    throw new NotImplementedError("copilot-review");
  },
};
