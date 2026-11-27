# Contributing to Fabricator Icons

`@fabricator-ui/icons-core` holds the icon sources and the tooling every icon package builds from. It is private: nothing here is published.

## Sources

| Path                            | What                                                              | Edited by                   |
| ------------------------------- | ----------------------------------------------------------------- | --------------------------- |
| `sources/lucide/`               | Lucide's icons and categories at the tag in `icons.lock.json`     | `bun run icons:sync` only   |
| `sources/outline/`              | Custom icons, Fabricator's own: `<name>.svg` + `<name>.json`      | you                         |
| `sources/brands/allowlist.json` | Which brand marks ship, where each comes from, held marks and why | you                         |
| `sources/brands/*.svg, *.json`  | Imported marks                                                    | `bun run icons:brands` only |
| `sources/rounded/`              | Canonical drawing overrides: `<name>-<weight>.svg`                | you                         |
| `fixtures/sharpos-brands.json`  | SharpOS's brand set, for the parity test                          | exported once               |

## Updating Lucide

```sh
bun run icons:sync --ref <tag>
```

It prints what was added, changed, aliased and removed. Then run `bun run test` (the parity tests compare against `@lucide/icons` and `lucide-react` at the same version, so bump those dev dependencies in `packages/icons` with the tag). A removal ships in a major release.

## Adding a custom icon

Fabricator's own icons form the Custom category. Every icon in `sources/outline/` is in it automatically, on top of any other category it names.

1. Check Lucide's names and open pull requests, so we don't draw what is about to arrive. If Lucide later ships a name we use, `icons:check` fails: keep Lucide's and turn ours into an alias if it depicts the same thing, or rename ours.
2. Draw it on Lucide's spec (https://lucide.dev/contribute/icons/specification): 24 × 24, 2px round strokes, 1px safe zone, 2px gaps. Reuse the modifier geometry in `docs/plans/icon-pack-expansion.md` so a variant matches its family.
3. Add `sources/outline/<name>.svg` with Lucide's root attributes and `<name>.json` with `tags` and `categories` (Lucide's category names; `custom` is added for you).
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

## UI drawing weights

The generator keeps the vendored name inventory. The drawings use five optical proportion profiles for directions, controls, panels, portraits and objects. Closed primitives use continuous shoulders, and the directional and heading glyphs share authored geometry across each family. The authored SVGs take precedence. The default Outline and Duotone stroke is 1.5 on a 24 × 24 canvas. Fill uses enclosed faces with transparent cutouts for details, or heavier strokes for open glyphs. Duotone keeps the outline drawing and uses a 20% secondary face or stroke.

Use `sources/rounded/<name>-outline.svg`, `<name>-fill.svg`, and `<name>-duotone.svg` for hand-drawn overrides. The authored Duotone file uses the Outline drawing and a group named `secondary`. Keep details readable at 14, 16 and 24 px in both themes. Existing `sources/duotone/` files can still supply authored secondary layers.

## Animated icons

Each canonical UI icon has a motion recipe in the web package. It uses the same static data at rest and accepts `variant="outline"`, `"fill"`, or `"duotone"`. Assign motion by family in `src/ui-icons.ts` and keep the shared recipes in the web renderer.

Run `bun run icons:audit` to verify motion, rest geometry, hover, and reduced motion in Chrome. `sources/animated/` remains the pinned upstream animation reference. Update it only through `bun run icons:animated`.
