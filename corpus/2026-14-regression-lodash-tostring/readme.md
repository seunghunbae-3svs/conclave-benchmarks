# 2026-14-regression-lodash-tostring

Replacing lodash `toString` with the global `String()` looks harmless until you hit null/undefined:

| input | lodash `toString` | JS `String()` |
| --- | --- | --- |
| `null` | `""` | `"null"` |
| `undefined` | `""` | `"undefined"` |
| `-0` | `"-0"` | `"0"` |

IDs flowing through `stringifyId` change shape. This exact pattern has caused production incidents in projects that ripped out lodash without reading the docs.

**Expected:** rework.
