# Contributing to Fabricator Icons

`@fabricator-ui/icons-core` holds the icon sources and the tooling every icon package builds from. It is private: nothing here is published.

## Sources

| Path                            | What                                                              | Edited by                   |
| ------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `sources/lucide/`               | Lucide's icons and categories at the tag in `icons.lock.json`     | `bun run icons:sync` only   |
| `sources/outline/`              | Fabricator originals: `<name>.svg` + `<name>.json`                | you                         |
| `sources/brands/allowlist.json` | Which brand marks ship, where each comes from, held marks and why | you                         |
| `sources/brands/*.svg, *.json`  | Imported marks                                                    | `bun run icons:brands` only |
| `sources/duotone/`              | Duotone icons: the outline icon plus `<g id="secondary">`         | you                         |
| `fixtures/sharpos-brands.json`  | SharpOS's brand set, for the parity test                          | exported once               |

## Updating Lucide

```sh
bun run icons:sync --ref <tag>
```

It prints what was added, changed, aliased and removed. Then run `bun run test` (the parity tests compare against `@lucide/icons` and `lucide-react` at the same version, so bump those dev dependencies in `packages/icons` with the tag). A removal ships in a major release.

## Adding an original icon

1. Check Lucide first. Generic icons go to Lucide; Fabricator keeps the ones Lucide declines and glyphs specific to Fabricator.
2. Draw it on Lucide's spec (https://lucide.dev/contribute/icons/specification): 24 × 24, 2px round strokes, 1px safe zone, 2px gaps.
3. Add `sources/outline/<name>.svg` with Lucide's root attributes and `<name>.json` with `tags` and `categories` (Lucide's category names).
4. Run `bun run icons:check` and `bun run icons:sheet <name>`, and attach the sheet to the PR. Review it at 14, 16 and 18px, stroke 1.5 and 2, in light and dark.

## Adding a brand mark

1. Add an entry to `sources/brands/allowlist.json`: `name` (kebab-case), `title`, `group`, `tags`, `aliases`, and `mono` (and `art` for multi-colour marks) pointing at Simple Icons, Iconify's `logos` set, or official brand assets.
   - Give a mark `art` when its logo has more than one colour or white details, so `color="brand"` shows the real logo. Use Iconify's `logos` set (`{ "from": "logos", "icon": "chrome" }`); add `"unfilled": "#000000"` when the artwork leaves black shapes unfilled, and `"recolor"` to swap a colour the brand has since changed. When the logos artwork is outdated, `{ "from": "underlay", "shape": "circle" | "square" }` draws the current one-colour path over white, so its cut-outs read white.
   - When neither set has the mark, copy it from the brand's own site or kit into `sources/brands/kits/` and point at it with `{ "from": "kit", "file": "<name>.svg", "url": "<where you copied it>", "terms": "<the brand's logo terms>" }`, for `mono` (one path, any viewBox) or `art`. Copy the shapes as published; only resolve CSS variables to their colours.
   - Linear and radial gradients are kept, renamed to local ids (`g0`, `g1`, …) that every renderer prefixes per copy. Masks, clip paths, `<use>`, filters and gradients that inherit from another (`href`) are refused; such marks keep their official flat colour. The exception is a filter that only paints a shadow behind a shape: `"dropShadows": true` on the `logos` source removes it and keeps the shape.
2. Read the brand's terms. If they forbid redistributing the logo, add the entry with `held` and the reason instead.
3. Run `bun run icons:brands --measure`. It imports the mark and measures its optical scale against the frozen median.
4. Run `bun run icons:check` and `bun run test`.

Marks are never redrawn: the only change allowed is the uniform scale.

## Animated icons

Don't edit `sources/animated/`: it's vendored from [lucide-animated](https://lucide-animated.com). To update it:

1. Run `bun run icons:animated --ref <sha>`, then `bun run icons:check`.
2. A new upstream icon must take a Lucide name. If its name isn't one, add it to `renames` in `sources/animated.json`, or to `excluded` with the reason.
3. Run `bun run icons:audit`. It opens every icon in Chrome and fails when hover or a ref does nothing, an icon doesn't return to rest, reduced motion is ignored, or an icon at rest differs from the outline icon without being listed in `olderDrawings`. It also runs after a Lucide upgrade, since the generator gives each icon our current geometry where the parts line up.

## Duotone

Add `sources/duotone/<name>.svg`: the outline icon unchanged, plus one `<g id="secondary">` of closed shapes inset from the outline by at least half a stroke. The icon must still read with the layer hidden. `bun run icons:check` enforces the structure.
