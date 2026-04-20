import { toString } from "lodash";

export function stringifyId(v: unknown): string {
  return toString(v);
}
