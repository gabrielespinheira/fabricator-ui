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
| Radius and shapes                        | `registry/fabricator/radius.ts`                                                                |
| Loader                                   | `registry/fabricator/loader.ts`                                                                |
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
- Springs for what follows the pointer or can be interrupted: `motion.ts` names seven (`follow`, `settle`, `soft`, `lead`, `trail`, `pop`, `fade`) as stiffness and damping, the default values from the Motion Studies at designbookmark.com/motion, and writes them as `--motion-spring-<name>: <stiffness> <damping>` plus `--motion-stagger`. Speeds retime them with the same damping ratio (`retimeSpring`); `instant` damps them critically. `shared/lib/spring-model.ts` steps them (semi-implicit Euler, substeps, velocity kept on retarget); Fluid Hover's overlays move each edge on `lead` or `trail`. Each spring also has a CSS form, `--motion-spring-<name>-duration` and `--motion-ease-<name>-spring` (`sampleSpring`: settle within 0.5 %, 40 samples), behind the `duration-<name>-spring` and `ease-<name>-spring` utilities; `motion-stagger` staggers rows by `sibling-index()`. The names put `spring` last because `ease-spring` is a retired alias the motion usage test rejects. React Native reads the same values from `motion.ts` by `--motion-speed` (`useMotionSprings`) and hands them to `withSpring`.
- Charts draw in once on the `reveal` role (700ms at the default speed, none at `instant`) and morph on `move`. Text Motion plays each piece on `reveal` and staggers by a share of it, so a speed retimes the whole sequence (`shared/ui/text-motion.tsx`). Their JavaScript tween reads `--motion-reveal`, `--motion-move`, the curves and `--motion-scale` from the element, so a scoped speed retimes them (`shared/ui/chart-kit.tsx`).
- Full-page theme changes use `--motion-theme` (700ms by default) with `--motion-ease-theme` (the reference Material curve, `cubic-bezier(0.4, 0, 0.2, 1)`); icon swaps keep the move timing. `circle-blur` blurs the incoming page from 8px to zero across the full reveal; polygon masks feather the edge while keeping content sharp.
- Speeds `smooth` (about 1.5× default, expo-out entrances, popups slide through a 2px blur), `default`, `snappy` (about ¾) and `instant` (fades only) each set every token; `look.ts` writes the chosen one into `:root`.
- `__tests__/motion-usage.test.ts` fails on fixed durations, literal curves, fixed zooms and retired tier names (`duration-fast`, `ease-spring`), which survive only as consumer aliases.

## Density

Sizes come from the density, never fixed pixels; the token table and how a component uses it are in [COMPONENTS.md](../COMPONENTS.md#density).

- `density.ts` defines the three scales, each token named after its default value. They are CSS variables rather than theme keys because class merging only knows arbitrary values.
- React Native resolves its own rungs per device (`registry/native/lib/density-scale.ts`): a phone's default is the spacious scale, a tablet's 40pt controls with phone text.
- `__tests__/density-usage.test.ts` fails on fixed control heights, text sizes and icon sizes.

## Loader

How placeholders look while content loads: `skeleton` (default) or `blueprint`. Plan: [`plans/blueprint-loader.md`](plans/blueprint-loader.md).

- `loader.ts` defines both as the same set of `--loader-*` tokens, the `data-loader` switches, `loader-<name>` utilities, the pen's `@property` angles and the trace's keyframes. A token can't hold the trace's mask: `var()` in a custom property resolves where it is defined, so the conic mask lives in the style maps, on the element the angles animate. A placeholder reads the tokens (`cn-skeleton`, `cn-chart-plot` under `data-loading`); it never asks which loader is on. Code that must know reads `--loader`.
- The look writes the blueprint tokens into `:root` (`loader=blueprint`); the site sets `data-loader` on `<html>` from its settings.
- React Native skips the tokens (`native-css-variables.test.ts`) and keeps the skeleton; see `parity-exceptions.json`.

## Radius

How components use the roles is in [COMPONENTS.md](../COMPONENTS.md#shape).

- `radius.ts` gives each shape a ratio and a base per role (control, surface, panel, mark): a corner is `--density-36 × ratio + base`. Rounded: 8px controls, 12px surfaces, 16px panels, 4px marks. Squircle: a quarter of the control height, 14px, 20px, 5px. Pill: half the control height (a capsule), half plus 4px for surfaces (so a `p-1` popup's capsule rows are concentric), half plus 8px for panels, 6px marks.
- The roles (`--radius-control`, `--radius-nested`, `--radius-inner`, `--radius-wrap`, …) are formulas declared on `:root` and again in every density switch and `density-*` utility, because a variable resolves where it is declared; a scope's corners follow its control height.
- Squircle sets `--corner-shape` to a superellipse, which a base-layer rule hands to every element except `rounded-full` ones. Where `corner-shape` is supported (Chromium 139+, Electron) an `@supports` rule draws `superellipse(1.5)` and scales the roles by `SQUIRCLE_CORNER_SCALE` (1.35), because a superellipse reads tighter than a circle of the same radius; elsewhere the base radii draw round, a slightly softer Rounded. Insets are never scaled.
- shadcn's `--radius` and its `--radius-sm` … `--radius-4xl` keep their names and meaning (contract 4) for a project's own classes: 0.5rem, 0.625rem and 0.75rem per shape.
- `__tests__/radius.test.ts` pins the values and the concentric rows; `__tests__/radius-usage.test.ts` fails on Tailwind's rungs and literal radii in the style maps.

## The look

A project installs with a look (`look.ts`): the settings on `/create`, carried in the init URL and turned into cssVars by `/init` on top of the palette. Only values that differ from the defaults are written, and `config.style` stays a valid upstream id (contract 2).

| Param                     | Values                                       | Writes                                                                       |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `surface`                 | `<hue>_<chroma>` (chroma 0–0.04)             | `--surface-hue`, `--surface-chroma`, and links the palette to the surfaces   |
| `primary` … `destructive` | `<hue>_<chroma>`, statuses clamped to family | `--<role>-hue`, `--<role>-chroma`; links changed shadcn tokens to the recipe |
| `shape`                   | `squircle`, `pill`                           | That shape's radius ratios and bases, `--corner-shape`, shadcn's `--radius`  |
| `motion`                  | `smooth`, `snappy`, `instant`, `off`         | That speed's tokens in `:root` (`off`: `--motion-scale: 0`)                  |
| `density`                 | `compact`, `spacious`                        | That density's tokens in `:root`                                             |

## Excluded items

`FABRICATOR_EXCLUDED_ITEMS` lists upstream items the library leaves out: Native Select (Select replaces it) and, for now, Chart with the blocks built on it. The build drops them from the published registry and site indexes, rewrites dependencies to the replacement and skips their demos; items that used one get an override, docs demos one in `registry/fabricator/site-examples/<base>/`. Upstream styles keep every item. `/charts` and Chart docs URLs redirect to `/docs/components`.

## Seeing a change

The preview loops (live CSS, compiled styles, native) are in [COMPONENTS.md](../COMPONENTS.md#seeing-a-change).

## Done when

- [ ] The coverage lint, contrast check and the motion, density and radius usage tests pass.
- [ ] The change was seen in the site in light and dark, at each density, motion speed and shape it affects.
- [ ] `native-theme.ts` follows a token or radius change ([PLATFORMS.md](PLATFORMS.md#theme)).
- [ ] Visible changes are recaptured: `bun run registry:capture --force && bun run pages:capture` in `apps/web`, dev server running.
- [ ] `bun run test:parity` passes when an upstream style map changed.
