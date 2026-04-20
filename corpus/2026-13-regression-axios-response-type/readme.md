# 2026-13-regression-axios-response-type

Axios defaults to `responseType: "json"`. Removing the explicit `"arraybuffer"` option turns binary downloads into UTF-8-interpreted strings before they reach `Buffer.from`. The type system is placated by the generic parameter but the runtime corrupts bytes.

This is one of the most commonly reverted axios-consumer patterns in the wild (see axios/axios issue tracker).

**Expected:** rework — major regression in `src/base.ts`.
