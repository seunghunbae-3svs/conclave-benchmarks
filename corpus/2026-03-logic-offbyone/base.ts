export function sumFirstN(xs: number[], n: number): number {
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    total += xs[i] ?? 0;
  }
  return total;
}
