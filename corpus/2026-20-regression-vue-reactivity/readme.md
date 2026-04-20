# 2026-20-regression-vue-reactivity

Destructuring from a `reactive()` proxy returns a plain object. Any component that consumes the destructured `filters` reference loses reactivity. Vue's docs call this out explicitly; Pinia/Vuex plugins exist specifically to help avoid it (`storeToRefs`).

**Expected:** rework.
