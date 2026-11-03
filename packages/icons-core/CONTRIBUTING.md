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
2. Read the brand's terms. If they forbid redistributing the logo, add the entry with `held` and the reason instead.
3. Run `bun run icons:brands --measure`. It imports the mark and measures its optical scale against the frozen median.
4. Run `bun run icons:check` and `bun run test`.

Marks are never redrawn: the only change allowed is the uniform scale.

## Duotone

Add `sources/duotone/<name>.svg`: the outline icon unchanged, plus one `<g id="secondary">` of closed shapes inset from the outline by at least half a stroke. The icon must still read with the layer hidden. `bun run icons:check` enforces the structure.
