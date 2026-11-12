# Styles

The Fabricator layer: tokens, colour, motion, density, per-component looks and the overrides that add behaviour. The design language itself (surfaces, the look of every component, known deviations) is specified in [`apps/web/registry/fabricator/DESIGN.md`](../apps/web/registry/fabricator/DESIGN.md); read it before changing a style or an override. A change to a look updates that spec and the root [`DESIGN.md`](../DESIGN.md).

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

## Colour

- OKLCH, defined for `:root` and `.dark`. Every foreground/background pair meets WCAG 2.2 AA (4.5:1 text, 3:1 UI and large text); the contrast check enforces it.
- Six roles (`primary`, `secondary`, `info`, `success`, `warning`, `destructive`), each from `--<role>-hue` and `--<role>-chroma` through one recipe. Primary and secondary take any hue; statuses stay in their family (`ROLE_HUE_RANGES`), clamped in CSS too.
- Components use role tokens (`bg-<role>`, `text-<role>-text`, `bg-<role>-surface-N`) or neutrals. States are opacity steps of the fill (`/90`, `/80`; soft `/12`, `/16`, `/20`).

## Motion

By role, never milliseconds.

- Surfaces take one utility each: `motion-tooltip`, `-popup`, `-dialog`, `-scrim`, `-sheet`, `-disclosure`, `-toast`. Buttons and toggles add `motion-press`.
- Everything else: `duration-<role>`, `duration-<role>-exit`, `delay-<role>` (feedback, glide, move, …) with `ease-enter`, `-move`, `-exit`, `-feedback` or `-drawer`.
- Full-page theme changes use `--motion-theme` (700ms by default) with `--motion-ease-theme` (the reference Material curve, `cubic-bezier(0.4, 0, 0.2, 1)`); icon swaps keep the move timing. `circle-blur` blurs the incoming page from 8px to zero across the full reveal; polygon masks feather the edge while keeping content sharp.
- Speeds `smooth`, `default`, `snappy`, `instant` via `data-motion` on any element; `off` stops motion; `--motion-scale` multiplies every duration.
- `__tests__/motion-usage.test.ts` fails on fixed durations, literal curves, fixed zooms and retired tier names (`duration-fast`, `ease-spring`), which survive only as consumer aliases.

## Density

Sizes come from the density, never fixed pixels.

- `compact`, `default`, `spacious` via `data-density` on any element or the `density-<name>` utilities.
- Style maps use tokens named after their default value: `h-(--density-36)`, `px-(--density-16)`, `text-(length:--density-text-13)`, `size-(--density-icon-16)`. Theme keys like `h-control` break class merging.
- A control's `size="sm"` adds `density-compact`, `size="lg"` adds `density-spacious`.
- Portalled parts read `useDensity()` from `DensityProvider` (`shared/ui/density.tsx`) and set `data-density`; a new overlay override does the same.
- `__tests__/density-usage.test.ts` fails on fixed control heights, text sizes and icon sizes.

## Overrides

Behaviour CSS can't express (fluid hover, sliding selection) goes in an override: a copy of the upstream file with additive, container-level changes. Overrides compile into the Fabricator style only, so upstream styles keep their exact output, and they keep the full upstream API (contract 1). Their extra registry dependencies go in `fabricatorOverrides`. After an upstream sync, port upstream's changes to each overridden file ([MAINTAINING.md](MAINTAINING.md#upstream-sync)).

## Excluded items

`FABRICATOR_EXCLUDED_ITEMS` lists upstream items the library leaves out: Native Select (Select replaces it) and, for now, Chart with the blocks built on it. The build drops them from the published registry and site indexes, rewrites dependencies to the replacement and skips their demos; items that used one get an override, docs demos one in `registry/fabricator/site-examples/<base>/`. Upstream styles keep every item. `/blocks`, `/charts` and Chart docs URLs redirect to `/docs/components`.

## Seeing a change

The site renders the Fabricator style, so it shows what `add` installs.

- **CSS loop:** edit `registry/styles/fabricator/<component>.css`, run `bun run registry:build --examples` in `apps/web`, open `/view/base-fabricator/<component>-example`. It hot-reloads.
- **Compiled loop** (overrides, docs pages): `scripts/build-fabricator.sh [base|radix|aria|all]` in `apps/web` rebuilds `styles/*-fabricator` under a lock, safe with parallel workers.
- If the dev server can't resolve a generated file that exists, stop it, delete `apps/web/.next/dev`, restart.
- Every style folder the site renders needs an `@source` line in `app/globals.css`; gitignored folders are invisible to Tailwind otherwise.

## Done when

- [ ] The coverage lint, contrast check and the motion and density usage tests pass.
- [ ] The change was seen in the site in light and dark, at each density and motion speed it affects.
- [ ] `native-theme.ts` follows a token or radius change ([PLATFORMS.md](PLATFORMS.md#theme)).
- [ ] Visible changes are recaptured: `bun run registry:capture --force && bun run pages:capture` in `apps/web`, dev server running.
- [ ] `bun run test:parity` passes when an upstream style map changed.
