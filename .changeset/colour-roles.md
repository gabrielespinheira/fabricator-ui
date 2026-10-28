---
"fabricator-ui": minor
---

Add colour roles to the registry. Primary, secondary, info, success, warning and destructive are each set by `--<role>-hue` and `--<role>-chroma`, and every component takes its colours from them. Breaking: the `error-*` and `destructive-light` tokens are removed; use `destructive-*` (the `error` variants of Alert and Badge stay, as another name for `destructive`).
