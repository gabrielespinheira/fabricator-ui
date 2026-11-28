# Contributing to Fabricator Icons

`@fabricator-ui/icons-core` holds the icon sources and the tooling every icon package builds from. It is private: nothing here is published.

## Sources

| Path                            | What                                                              | Edited by                   |
| ------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `sources/lucide/`               | Frozen import of drawings, metadata and notices                   | Read-only reference         |
| `sources/categories.json`       | Catalog category names and labels                                 | you                         |
| `sources/outline/`              | Custom icons, Fabricator's own: `<name>.svg` + `<name>.json`      | you                         |
| `sources/brands/allowlist.json` | Which brand marks ship, where each comes from, held marks and why | you                         |
| `sources/brands/*.svg, *.json`  | Imported marks                                                    | `bun run icons:brands` only |
| `sources/rounded/`              | Canonical drawing overrides: `<name>-<weight>.svg`                | you                         |
| `fixtures/sharpos-brands.json`  | SharpOS's brand set, for the parity test                          | exported once               |

## Catalog ownership

Fabricator maintains the shipped names, categories, drawings and variants in this repository. The catalog includes the frozen Lucide import in `icons.lock.json` to preserve existing names and aliases. Add new icons and redraw existing entries here.

```sh
bun run icons:compare --ref <tag>
```

Use this read-only report to compare a Lucide tag with the frozen import. The compatibility fixtures use the version recorded in `icons.lock.json`.

## Adding a UI icon

Fabricator's own icons form the Custom category. Every icon in `sources/outline/` is in it automatically, on top of any other category it names.

1. Choose a kebab-case name that is free in the Fabricator catalog, including its aliases. Use an override in `sources/rounded/` to redraw an existing icon.
2. Draw on a 24 × 24 grid with a 1.75-unit round stroke. Keep the visible stroke inside the 1-unit margin and match the proportions of related Fabricator icons.
3. Add `sources/outline/<name>.svg` and `<name>.json` with `tags`, `categories` and any aliases. Use category names from `sources/categories.json`. The generator adds Custom and derives Fill, Duotone and Animated from the new entry.
4. Run `bun run icons:check` and `bun run icons:sheet <name>`. Review the drawing at 14, 16 and 18 px in both themes and attach the sheet to the PR.

## Adding a brand mark

1. Add an entry to `sources/brands/allowlist.json`: `name` (kebab-case), `title`, `group`, `tags`, `aliases`, and `mono` (and `art` for multi-colour marks) pointing at Simple Icons, Iconify's `logos` set, or official brand assets.
   - Give a mark `art` when its logo has more than one colour or white details, so `color="brand"` shows the real logo. Use Iconify's `logos` set (`{ "from": "logos", "icon": "chrome" }`); add `"unfilled": "#000000"` when the artwork leaves black shapes unfilled, and `"recolor"` to swap a colour the brand has since changed. When the logos artwork is outdated, `{ "from": "underlay", "shape": "circle" | "square" }` draws the current one-colour path over white, so its cut-outs read white.
   - When neither set has the mark, copy it from the brand's own site or kit into `sources/brands/kits/` and point at it with `{ "from": "kit", "file": "<name>.svg", "url": "<where you copied it>", "terms": "<the brand's logo terms>" }`, for `mono` (one path, any viewBox) or `art`. Copy the shapes as published; only resolve CSS variables to their colours.
   - Linear and radial gradients are kept, renamed to local ids (`g0`, `g1`, …) that every renderer prefixes per copy. Masks, clip paths, `<use>`, filters and gradients that inherit from another (`href`) are refused; such marks keep their official flat colour. The exception is a filter that only paints a shadow behind a shape: `"dropShadows": true` on the `logos` source removes it and keeps the shape.
2. Read the brand's terms. If they forbid redistributing the logo, add the entry with `held` and the reason instead.
3. Run `bun run icons:brands --measure` to import the mark and record its compatibility scale. The package generator measures the published viewport for the one-colour and full-colour artwork.
4. Run `bun run icons:check` and `bun run test`.

Marks are never redrawn: the only change allowed is the uniform scale.

## UI drawing weights

Use the shared shapes in `src/ui-glyphs.ts`, `src/ui-common-glyphs.ts`, `src/ui-families.ts`, and `src/ui-state-glyphs.ts` when a drawing belongs to a family. Keep its frame and place the state mark in the space reserved for it. Calendar state drawings use `src/ui-calendar-glyphs.ts` and the body, corner, divider and pins from `sources/rounded/calendar-outline.svg`. In `src/ui-grid.ts`, most illustrations fit a 20.5-unit silhouette, panels use 20 units, and compact controls and punctuation reserve more breathing room. The fitting step preserves the aspect ratio and applies one mapping to the authored Outline, Fill, and Duotone.

Use `sources/rounded/<name>-outline.svg`, `<name>-fill.svg`, and `<name>-duotone.svg` for individual drawings. Fill uses enclosed faces and transparent cutouts, or heavier strokes for open glyphs. Duotone uses the Outline drawing and a group named `secondary` with 20% weight. Review the artwork in light and dark at 14, 16 and 18 px, then check the curves and cutouts at 24 and 48 px. The 3-unit preview stroke must fit the canvas.

Circle and square letters use the centre of the painted stroke to align the glyph, with small shifts that preserve space inside the frame. Fill cuts the same lettering out of the solid frame.

## Optical sizing

The generator measures rendered ink, including translucent layers and cutouts, on a normalized 24-unit grid. It uses span, reach from the centre, and painted area to size the viewport. Outline and Duotone share a viewport across the catalog. A family with a shared frame uses one viewport across its states and weights, keeping its edges aligned when the mark or weight changes. Brand artwork and file icons are measured in their own sets. Compact symbols keep their intended size, and open and closed file folders share a viewport. Animated icons use their corresponding static viewport at rest.

## Animated icons

Each canonical UI icon has a motion recipe in the web package. It uses the same static data at rest and accepts `variant="outline"`, `"fill"`, or `"duotone"`. Assign motion by family in `src/icon-motion.ts`. Define timing in the web package's `animated-gestures.ts` and match moving SVG parts in `animated-recipes.ts`. Include a corresponding cutout movement when a Fill detail is masked.

Run `bun run icons:audit` to verify motion, rest geometry, hover, loop playback, panel state and reduced motion in Chrome. `sources/animated/` remains the pinned upstream animation reference. Update it only through `bun run icons:animated`.
