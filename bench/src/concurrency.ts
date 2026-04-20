/**
 * Tiny inline concurrency limiter. Avoids pulling in p-limit for a 15-line function.
 */
export function pLimit(concurrency: number) {
  if (concurrency < 1 || !Number.isInteger(concurrency)) {
    throw new Error(`pLimit: concurrency must be a positive integer, got ${concurrency}`);
  }
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const run = queue.shift();
    if (!run) return;
    active += 1;
    run();
  };

  return function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      };
      queue.push(run);
      next();
    });
  };
}
