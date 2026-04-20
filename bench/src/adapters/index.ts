import type { Adapter } from "../types.js";
import { conclaveAdapter } from "./conclave.js";
import { copilotReviewAdapter } from "./copilot-review.js";
import { codeRabbitAdapter } from "./coderabbit.js";
import { greptileAdapter } from "./greptile.js";

export const ADAPTERS: Record<string, Adapter> = {
  conclave: conclaveAdapter,
  "copilot-review": copilotReviewAdapter,
  coderabbit: codeRabbitAdapter,
  greptile: greptileAdapter,
};

export function getAdapter(name: string): Adapter {
  const a = ADAPTERS[name];
  if (!a) {
    throw new Error(
      `Unknown tool '${name}'. Available: ${Object.keys(ADAPTERS).join(", ")}`,
    );
  }
  return a;
}
