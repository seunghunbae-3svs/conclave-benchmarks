/**
 * Greptile adapter — STUB.
 *
 * Phase 2 wiring plan:
 *   1. Greptile exposes a REST API (api.greptile.com) for cross-repo review.
 *   2. Upload the base snapshot, send the diff, capture the structured
 *      response.
 *   3. Map to AdapterResult.
 *
 * Until then, throws NotImplementedError.
 */
import { NotImplementedError, type Adapter } from "../types.js";

export const greptileAdapter: Adapter = {
  name: "greptile",
  async run() {
    throw new NotImplementedError("greptile");
  },
};
