// Minimal React hook sketch — the dep array is the load-bearing detail.
declare function useMemo<T>(fn: () => T, deps: unknown[]): T;
declare function useState<T>(v: T): [T, (n: T) => void];

interface Product {
  id: string;
  name: string;
  price: number;
}

export function useFilteredProducts(products: Product[], query: string, minPrice: number) {
  const filtered = useMemo(
    () =>
      products.filter(
        (p) => p.name.toLowerCase().includes(query.toLowerCase()) && p.price >= minPrice,
      ),
    [products, query, minPrice],
  );
  return filtered;
}
