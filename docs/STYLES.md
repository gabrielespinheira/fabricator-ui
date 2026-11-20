# Styles

How the Fabricator foundations are made: the token modules, the colour, motion and density systems behind them, the look a project installs with, and excluded items. The rules for using them in a component (which token, which state recipe, overrides, the preview loop) are in the root [`COMPONENTS.md`](../COMPONENTS.md); a component's look is specified by the comments in its style map. The root [`DESIGN.md`](../DESIGN.md) is the guide new projects receive: it changes only when a rule for designing products changes (which component a screen calls for, layout, what a colour means), never for a component's internal look, timings or platform details.

## Where things live

| What                                     | Where                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A component's look                       | `registry/styles/fabricator/<component>.css`, under `/* MARK: <Component> */`, upstream order  |
| Foundations and palette                  | `registry/fabricator/foundations.ts` (new token names; the palette writes the shadcn names)    |
| Colour roles                             | `registry/fabricator/color-roles.ts`                                                           |
| Motion                                   | `registry/fabricator/motion.ts`                                                                |
| Density                                  | `registry/fabricator/density.ts`                                                               |
| Code colours                             | `registry/fabricator/syntax-colors.ts`                                                         |
| Overrides (behaviour)                    | `registry/fabricator/<base>/ui/<component>.tsx`, shared files in `registry/fabricator/shared/` |
| Extra items, overrides' deps, exclusions | `registry/fabricator/registry.ts`                                                              |

Paths are under `apps/web/`. `style-fabricator.css` and `app/fabricator.css` are generated.

## Surfaces

- `foundations.ts` defines an eight-level ladder plus `surface-0` (a screen that stands alone, no shadow). Light: level 1 #FAFAFA, level 2 #FCFCFC, white from 3 up. Dark: each level a step lighter, `oklch(0.205)` to `oklch(0.402)`; `surface-0` is `oklch(0.175)`.
- `--shadow-N` is a 1px ring in `--shadow-color` (6% black) plus N−1 drops of 1, 3, 6, 12, 24, 48 and 96px, each with a negative spread of half its blur. Dark adds an inset top highlight and an outer black ring. The ring is why surfaces carry no border.
- `surface-tint.ts` computes every level from `--surface-hue` and `--surface-chroma` (0 by default). Light tints from 44% of the chroma at the page to 21.5% at level 8 and lowers lightness as chroma grows; `--muted-foreground` darkens with it to stay AA. Dark keeps its lightness and tapers the tint from 90% to 55%. Every level stays in sRGB up to the maximum chroma (0.04), which `__tests__/surface-tint.test.ts` checks.
- The `fabricator` preset writes `background`, `card`, `popover`, `sidebar`, `muted` and `muted-foreground` as literals; the site and a tinted look link them to the surfaces (`SURFACE_PALETTE_LINKS`). Interaction tokens (`hover`, `active`, `--overlay`, `--focus-ring`) live beside them.

## Colour

- OKLCH, defined for `:root` and `.dark`. Every foreground/background pair meets WCAG 2.2 AA (4.5:1 text, 3:1 UI and large text); the contrast check enforces it.
- Six roles (`primary`, `secondary`, `info`, `success`, `warning`, `destructive`), each from `--<role>-hue` and `--<role>-chroma` through one recipe. Primary and secondary take any hue; statuses stay in their family (`ROLE_HUE_RANGES`), clamped in CSS too.
- Chart series take `--chart-series-1` to `--chart-series-8` (`registry/fabricator/chart-colors.ts`), literal per mode and independent of the roles, so retinting a role never repaints a series. `__tests__/chart-colors.test.ts` holds them to the data-viz checks: a lightness band and chroma floor per mode, ΔE ≥ 8 between neighbours under simulated protanopia and deuteranopia and ≥ 15 in normal vision, and 3:1 on the page and the card. Change a slot only with that test green.

## Motion

By role, never milliseconds; the roles and how a component uses them are in [COMPONENTS.md](../COMPONENTS.md#motion).

- Two springs, CSS `linear()` curves sampled from `getSpringSamples` per speed, which native interpolates too. `ease-bounce` overshoots: layout that should feel physical (accordion items). `ease-settle` springs without a visible overshoot (damping ratio 0.84): layout that follows the pointer and mustn't wobble (an avatar group parting). Everything else keeps its curve.
- Charts draw in once on the `reveal` role (700ms at the default speed, none at `instant`) and morph on `move`. Their JavaScript tween reads `--motion-reveal`, `--motion-move`, the curves and `--motion-scale` from the element, so a scoped speed retimes them (`shared/ui/chart-kit.tsx`).
- Full-page theme changes use `--motion-theme` (700ms by default) with `--motion-ease-theme` (the reference Material curve, `cubic-bezier(0.4, 0, 0.2, 1)`); icon swaps keep the move timing. `circle-blur` blurs the incoming page from 8px to zero across the full reveal; polygon masks feather the edge while keeping content sharp.
- Speeds `smooth` (about 1.5× default, expo-out entrances, popups slide through a 2px blur), `default`, `snappy` (about ¾) and `instant` (fades only) each set every token; `look.ts` writes the chosen one into `:root`.
- `__tests__/motion-usage.test.ts` fails on fixed durations, literal curves, fixed zooms and retired tier names (`duration-fast`, `ease-spring`), which survive only as consumer aliases.
- Gooey is an opt-in decorative silhouette. Its geometry and presets live in `registry/fabricator/shared/lib/gooey-model.ts` and are exported in the platform contract. Tabs and Slider use the `move` timing for their deformation. The region sets Gooey separately from motion speed. Keep content and input semantics above the decoration.

## Density

Sizes come from the density, never fixed pixels; the token table and how a component uses it are in [COMPONENTS.md](../COMPONENTS.md#density).

- `density.ts` defines the three scales, each token named after its default value. They are CSS variables rather than theme keys because class merging only knows arbitrary values.
- React Native resolves its own rungs per device (`registry/native/lib/density-scale.ts`): a phone's default is the spacious scale, a tablet's 40pt controls with phone text.
- `__tests__/density-usage.test.ts` fails on fixed control heights, text sizes and icon sizes.

## The look

A project installs with a look (`look.ts`): the settings on `/create`, carried in the init URL and turned into cssVars by `/init` on top of the palette. Only values that differ from the defaults are written, and `config.style` stays a valid upstream id (contract 2).

| Param                     | Values                                       | Writes                                                                       |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `surface`                 | `<hue>_<chroma>` (chroma 0–0.04)             | `--surface-hue`, `--surface-chroma`, and links the palette to the surfaces   |
| `primary` … `destructive` | `<hue>_<chroma>`, statuses clamped to family | `--<role>-hue`, `--<role>-chroma`; links changed shadcn tokens to the recipe |
| `shape`                   | `pill`                                       | `--radius: 1.25rem`                                                          |
| `motion`                  | `smooth`, `snappy`, `instant`, `off`         | That speed's tokens in `:root` (`off`: `--motion-scale: 0`)                  |
| `density`                 | `compact`, `spacious`                        | That density's tokens in `:root`                                             |

## Excluded items

`FABRICATOR_EXCLUDED_ITEMS` lists upstream items the library leaves out: Native Select (Select replaces it) and, for now, Chart with the blocks built on it. The build drops them from the published registry and site indexes, rewrites dependencies to the replacement and skips their demos; items that used one get an override, docs demos one in `registry/fabricator/site-examples/<base>/`. Upstream styles keep every item. `/charts` and Chart docs URLs redirect to `/docs/components`.

## Seeing a change

The preview loops (live CSS, compiled styles, native) are in [COMPONENTS.md](../COMPONENTS.md#seeing-a-change).

## Done when

- [ ] The coverage lint, contrast check and the motion and density usage tests pass.
- [ ] The change was seen in the site in light and dark, at each density and motion speed it affects.
- [ ] `native-theme.ts` follows a token or radius change ([PLATFORMS.md](PLATFORMS.md#theme)).
- [ ] Visible changes are recaptured: `bun run registry:capture --force && bun run pages:capture` in `apps/web`, dev server running.
- [ ] `bun run test:parity` passes when an upstream style map changed.
