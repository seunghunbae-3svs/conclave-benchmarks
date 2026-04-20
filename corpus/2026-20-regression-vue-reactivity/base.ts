// Vue 3 Composition API sketch — reactivity handling is the load-bearing detail.
declare function reactive<T extends object>(v: T): T;
declare function ref<T>(v: T): { value: T };

interface State {
  cart: { id: string; qty: number }[];
  filters: { inStock: boolean; minPrice: number };
}

export function createStore() {
  const state = reactive<State>({ cart: [], filters: { inStock: true, minPrice: 0 } });
  const addToCart = (id: string, qty: number) => {
    state.cart.push({ id, qty });
  };
  return { state, addToCart };
}
