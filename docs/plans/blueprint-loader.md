# Loader: Skeleton or Blueprint

A project picks how its loading states look: `skeleton` (today's pulsing blocks, the default) or `blueprint` (the Blueprint drawing). It is a foundation like density and motion: a set of CSS variables in `:root`, switchable per region with `data-loader`, chosen in the site settings, on Get started and with the CLI's `--look`.

Decided (2026-11-27): the loader reaches Skeleton and every component's `loading` state; the website follows the site setting, defaulting to Skeleton.

## Foundation

`registry/fabricator/loader.ts`, beside `density.ts`:

- `LOADER_NAMES = ["skeleton", "blueprint"]`, `DEFAULT_LOADER = "skeleton"`.
- Each loader is a set of tokens: `--loader` (the name, read by JavaScript), the placeholder fill, its outline, the pen's colour and trace, its animation, and how far a loading plot dims (`--loader-dim`).
- `LOADER_CSS`: `:root[data-loader=<name>], [data-loader=<name>]` selectors, `loader-<name>` utilities, the pen's `@property` angles and the `fabricator-loader-trace` keyframes, added to `foundations.ts` next to `DENSITY_CSS`. The default's tokens go in `:root` with the other foundation tokens.
- The trace is timed by the reveal role, stops under Reduce Motion and when motion is `off`.
- Revised 2026-11-27: no dot field and no sweep line. On a full layout they read as one patterned surface; each placeholder is now its own outline with a pen tracing it, so the loader stays component-oriented. Blueprint likewise fills its dot field only on components up to about a card and drops the probe on larger ones.

## Components

- **Skeleton** (every base, upstream-derived): the style map reads the loader tokens, and the rule overrides upstream's `animate-pulse` with the loader's animation (an important class, as for hard-coded durations). Blueprint mode draws the placeholder's own dotted outline with a pen tracing it (an `::after` outline under a conic mask), instead of a pulse. No source change, so contract 1 holds.
- **Charts and Status Bar, Heat Calendar** (`cn-chart-plot` under `data-loading`): the plot dims to `--loader-dim` (0.5 skeleton, 0 blueprint) and the plot's box shows the loader placeholder while loading; the marks fade back in when it ends.
- **Data Table** first load: Skeleton rows, so it follows. Its refresh bar is not a placeholder and stays.
- **Canvas** loading nodes: use the loader placeholder tokens.
- **Blueprint** itself is unchanged; it gains a scale-aware measurement so it draws correctly inside transformed containers (the scaled block frames).
- **React Native**: a dated parity exception; native Skeleton keeps the pulse until the native port draws the field.

## Look, setup and CLI

- `look.ts`: `loader` joins the look (`loader=blueprint`, written only when not the default). `lookCssVars` writes the blueprint tokens into `:root`. `/init`, `--look`, the package install's theme overrides and `/create`'s command all go through it, so the CLI needs no new flag; its help example and docs name `loader`.
- Site settings: `loader` in `lib/site-settings.ts` (validated, default `skeleton`), applied as `data-loader` on `<html>` by the effects and the `<head>` script, so there is no flash. A Loader select in `SiteSettingsFields`, which the settings menu and the Get started Look step both render.

## Website

- Hero (`BlocksShowcase` through `FramePreview`): in blueprint mode the frame's placeholder is sketched by a `Blueprint` that holds while the block loads, and the whole placeholder fades into the page when it is ready, as today.
- Component cards: in blueprint mode each card's demo is wrapped in a `Blueprint` inside the Suspense boundary, so it sketches in once its code has loaded; the placeholder before it is a Skeleton, which follows the loader too. The Blueprint card itself is not wrapped.

## Scenarios

- Loader changed while a page is open: CSS follows at once; sketches already done don't replay; the next card or block that loads uses the new loader.
- Reduce Motion or `motion=off`: blueprint placeholders are static (dots and outline, no sweep); Blueprint sketches are skipped.
- No JavaScript: CSS placeholders still render; Blueprint content shows as it is.
- Invalid `loader` in a URL or `--look`: `/init` answers 400 with the valid values, as for `density`.
- Package distribution: the theme overrides include the loader tokens.
- Regions: `data-loader="skeleton"` on any element keeps a calm region in a blueprint project, and the reverse.

## Done when

- [ ] Loader tokens, CSS and look round-trip are tested; `bun run test`, `bun run check` pass.
- [ ] Full `registry:build`; dry-run add on each base; `/init?loader=blueprint` returns the tokens.
- [ ] Seen: settings menu, Get started (command shows `loader=blueprint`), hero, cards, Skeleton and chart loading docs, light and dark, phone and desktop.
- [ ] Docs: Skeleton, Blueprint, the loading foundation and theming pages, CLI docs, changelog, `DESIGN.md`, the skill.
