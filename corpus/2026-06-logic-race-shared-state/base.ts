let cache: Map<string, unknown> | null = null;

export async function getCached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache) cache = new Map();
  const hit = cache.get(key);
  if (hit !== undefined) return hit as T;
  const v = await load();
  cache.set(key, v);
  return v;
}
