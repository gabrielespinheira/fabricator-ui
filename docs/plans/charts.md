# Charts: plan

Status: built (2026-11-15). All fifteen charts and the kit ship on the web (Base UI, Radix, React Aria) and React Native. §14 lists what the build changed against this plan.

Fifteen Fabricator-exclusive chart components in a new **Charts** group, on the web (one shared source for Base UI, Radix and React Aria) and React Native, drawn from one shared geometry model so a chart looks the same on every platform. The reference for scope and feel is beUI's charts (beui.dev/charts, reviewed 2026-11-15); the look, colour, motion and density are Fabricator's.

Library facts were checked on npm on 2026-11-15: `d3-shape` 3.2.1, `d3-scale` 4.0.3 and `d3-hierarchy` 3.1.3 (ISC, all released 2026-11-03); `d3-sankey` 0.12.3 (BSD-3, last release 2019, unmaintained).

---

## 1. Decisions

| #   | Decision         | Pick                                                                                                                                                                                                                                        |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Engine           | Our own renderers on one pure geometry model. Recharts can't run on React Native, and two engines would draw two different charts                                                                                                           |
| D2  | Geometry         | `d3-shape` (curves, areas, arcs, pies, stacks), `d3-scale` (linear, band, point, time scales and nice ticks), `d3-hierarchy` (squarified treemap). Pure JS, no DOM, run on Hermes. Our own Sankey layout, since `d3-sankey` is unmaintained |
| D3  | Web renderer     | SVG in React, one file per chart in `registry/fabricator/shared/ui/`, identical for every base (pure HTML, as Syntax Highlight). The tooltip, legend and data table are HTML                                                                |
| D4  | Native renderer  | `react-native-svg` 15 for the marks, Reanimated 4 for the tooltip, crosshair and highlight, Gesture Handler 3 for scrubbing. Same props and exports as web (contract 9)                                                                     |
| D5  | API              | One component per chart, driven by props (`data`, `config`, `index`): the same props draw the same chart on both platforms. Shared types and parts come from a `chart-kit` item                                                             |
| D6  | Upstream `chart` | Stays excluded (`FABRICATOR_EXCLUDED_ITEMS`). Its Recharts API can't be a superset on React Native, and our names don't collide with it                                                                                                     |
| D7  | Colour           | A new categorical palette, `--chart-series-1` to `--chart-series-8`, in the foundations, built like the syntax colours and validated for colour-blind separation and contrast in both modes. Status charts use the status roles             |
| D8  | Motion           | Charts draw in once, the first time they are visible, and morph when their data changes. Both follow the motion speed and Reduce Motion; `instant` and `off` skip the draw-in                                                               |
| D9  | Hover            | One highlight per chart that glides between marks (a crosshair on lines and areas, a wash band on bars, a lift on slices and cells), the chart version of Fluid Hover, with one tooltip that follows it                                     |
| D10 | Accessibility    | Every chart is a labelled region with a hidden data table and one focusable "inspect" control (a slider on web, an adjustable element on native) that steps through the marks and shows the tooltip                                         |
| D11 | Group            | **Charts**, between Content and Chat, navigation ID `group-charts`, icon `ChartColumnIcon` (Content moves to `NewspaperIcon` so two chart icons don't sit side by side)                                                                     |

---

## 2. Scope

### The fifteen charts

| Item                | Component          | Form and job                                                                                               |
| ------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `area-chart`        | `AreaChart`        | Change over time, one or more series; stacked and 100% stacked                                             |
| `line-chart`        | `LineChart`        | Change over time, comparing series; dashed series for targets and forecasts                                |
| `bar-chart`         | `BarChart`         | Magnitude by category; grouped or stacked, vertical or horizontal                                          |
| `pie-chart`         | `PieChart`         | Parts of one whole, few parts                                                                              |
| `donut-chart`       | `DonutChart`       | Parts of one whole with the total (or the part under the pointer) in the centre and a value list beside it |
| `radar-chart`       | `RadarChart`       | Several measures of one or more subjects on shared axes                                                    |
| `radial-chart`      | `RadialChart`      | Progress of a few values against their target as concentric rings, full or half circle                     |
| `treemap`           | `Treemap`          | Hierarchical parts of a whole, sized by value and coloured by top-level group                              |
| `candlestick-chart` | `CandlestickChart` | Open, high, low and close per period, with optional volume and a last-price line                           |
| `status-bar`        | `StatusBar`        | Uptime: one pill per day (or period) coloured by status, with the uptime share                             |
| `composition-chart` | `CompositionChart` | How the mix of a whole changes over time: 100% stacked columns with each part's current share              |
| `funnel-chart`      | `FunnelChart`      | Ordered stages losing volume, with the conversion between stages; vertical or horizontal                   |
| `bump-chart`        | `BumpChart`        | Rank over time; who overtook whom                                                                          |
| `heat-calendar`     | `HeatCalendar`     | A value per day over months, as a week-by-weekday grid in five levels                                      |
| `sankey-chart`      | `SankeyChart`      | Flow volumes between stages (sources to destinations)                                                      |

Plus `chart-kit`, the shared item every chart installs: types, the palette and formatting model, and the frame, tooltip, legend, axis, grid and table parts.

### Later

Sparkline (a stat card's trend), scatter and bubble, drill-in on treemaps, brushing and zoom on time series, live streaming helpers, export to PNG or CSV.

### Out

Dual-axis charts (two y-scales; two charts or an index instead), 3D, gauges with needles, maps.

---

## 3. Names and group

- Names are the form plus `-chart` where people say it that way (`area-chart`), the bare noun where they don't (`treemap`, `status-bar`, `heat-calendar`). None exists in upstream's catalog; upstream's chart demos are `chart-*`, which `isFabricatorExcludedDemo` keeps dropping because no chart of ours starts with `chart-` except `chart-kit`, which has no demos.
- **Charts** is the eighth group. It changes every surface at once, as `docs/COMPONENT-GROUPS.md` says: `COMPONENT_GROUPS` and `GROUP_BY_SLUG`, the icons in `apps/web/lib/explorer-icons.ts` and `apps/mobile/src/nav.ts`, the ID in `apps/web/lib/component-explorer.ts`, COMPONENT-GROUPS.md's table and rules, `docs/plans/component-groups.md`, DESIGN.md's "Choosing a component", and the changelog.
- Choosing a group gains a rule before Content's: **Charts** when the component draws numbers as marks (lines, bars, areas, arcs, cells). A table of numbers stays Content.

---

## 4. Architecture

Four layers. Domain code never imports React, the DOM or React Native (Ports and Adapters).

| Layer                 | Where                                                                                                                                          | Shared?                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Kit model** (TS)    | `shared/lib/chart-model.ts`: config and colour resolution, formatting, scales, ticks, nearest-mark lookup, interpolation, table rows           | One copy, installed on both platforms (`SHARED_LIB_FILES`) |
| **Chart models** (TS) | `shared/lib/chart-<form>-model.ts`: one per form, data in, marks out (paths, rects, arcs, labels, hit regions)                                 | One copy each                                              |
| **Kit parts**         | Web `shared/ui/chart-kit.tsx`; native `registry/native/ui/chart-kit.tsx`: frame, tooltip, legend, axis, grid, crosshair, table, the tween hook | Same exports and props                                     |
| **Charts**            | Web `shared/ui/<item>.tsx`; native `registry/native/ui/<item>.tsx`: draw the model's marks                                                     | Same exports and props                                     |

- **A model is the chart.** Given data, config, size and options, it returns every mark with its geometry, colour slot, label and hit region, and the order the inspect control steps through. Renderers only map marks to SVG elements, so a layout fix lands once and both platforms match to the pixel.
- **Models are tested first** (TDD, Vitest, colocated): scales and ticks, stacking, layouts, nearest-mark lookup, label fitting, interpolation between two datasets, keyboard order, table rows.
- **Size** comes from the container: `ResizeObserver` on web, `onLayout` on native. The SVG's `viewBox` equals its pixel size, so text and hairlines stay crisp.
- **Text** inside the plot (axis ticks, in-mark labels) is SVG text in Inter at the density's small size, measured by a shared width estimate (Inter's average advance per character at the size) to decide whether a label fits; the tooltip, legend and centre labels are HTML on web and `Text` on native.
- **Formatting** is ours: compact numbers (`1.2K`, `3.4M`), percentages and dates through a small shared formatter, with `formatValue` and `formatIndex` props. Hermes' `Intl` lacks parts of compact notation on some builds, so the model doesn't depend on it for numbers; dates use `Intl.DateTimeFormat`, which Hermes has.

### Dependencies

| Package        | Why                                                                                             | Approx. client cost (min+gzip, tree-shaken) |
| -------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `d3-shape`     | Monotone, step and bump curves, areas, arcs with corner radius and padding, pies, stack offsets | ~5 kB                                       |
| `d3-scale`     | Linear, band, point and time scales with nice domains and ticks                                 | ~9 kB with `d3-array`, `d3-interpolate`     |
| `d3-hierarchy` | Squarified treemap                                                                              | ~3 kB                                       |

All exact-pinned, typed through `@types/d3-*` as dev dependencies of the items that use them. Sizes are estimates to be measured once installed; the PR states the measured numbers. They go in `apps/web` and `apps/mobile`. Sankey's layout is ours (~200 lines, tested): node columns by longest path, sizes by flow, and a few passes of relaxation to straighten links.

---

## 5. Colour

- **`--chart-series-1` to `--chart-series-8`**: the categorical palette, for identity. Defined in a new `registry/fabricator/chart-colors.ts`, like `syntax-colors.ts`: per-mode OKLCH values in a fixed hue order, written into the foundations' `cssVars` and into `native-theme.ts` (`LITERAL_COLOR_TOKENS` or a derived set). Light and dark are each selected for their surface, never flipped.
- **Validated, never eyeballed.** `__tests__/chart-colors.test.ts` ports the dataviz checks: OKLCH lightness band and chroma floor per mode, adjacent-pair separation under simulated protanopia and deuteranopia (OKLab ΔE ×100 ≥ 8) and in normal vision (≥ 15), and 3:1 against the card surface in both modes, or the relief rule (visible labels or the table) recorded for the slots that miss it.
- **Status hues aren't series hues.** Slots avoid the exact status steps; a series never means a status. The Status Bar uses `success`, `warning`, `destructive`, `info` and a neutral for "no data", always with the status named in the tooltip and legend. The Candlestick's up and down use success and destructive, paired with the sign in the tooltip.
- **Ordinal and sequential** (funnel stages, heat levels) use one series hue in opacity steps over the surface, so they work identically on native without `color-mix()`. The lightest step still clears 2:1 where it carries a value.
- **A series picks its colour** with `config[key].color`: a palette slot (`"chart-series-3"`), an upstream chart token (`"chart-1"`), a role (`"primary"`, `"info"`), or any CSS colour. Unset, series take slots in config order, so a filter never repaints the survivors.
- **`--chart-1` to `--chart-5`** keep their upstream name and meaning (contract 4) and remain available as colours.
- Grid and axis lines use `border`; tick labels `muted-foreground`; tooltip values `foreground`. Text never wears a series colour; a dot or line key beside it carries identity.

---

## 6. Anatomy (chart-kit)

| Part             | Web                                                                                                                                                                                                         | Native                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ChartFrame`     | `role="figure"` region with the accessible name, the measured plot, the hidden table                                                                                                                        | `View` with `accessibilityLabel`, measured by `onLayout`           |
| `ChartGrid`      | Horizontal hairlines on y ticks (vertical for horizontal bars); never dashed                                                                                                                                | Same, `react-native-svg`                                           |
| `ChartAxis`      | Tick labels in `muted-foreground`, no axis line except the baseline                                                                                                                                         | Same                                                               |
| `ChartCrosshair` | 1px line in `border` colour, gliding to the snapped index on the `glide` timing                                                                                                                             | Animated with Reanimated on the same role                          |
| `ChartTooltip`   | `bg-surface-5 shadow-surface-5`, two steps over the card it sits on, `motion-tooltip` entrance, then glides with the highlight; header = index, rows = line key, label (muted), value (foreground, tabular) | Same look, Reanimated; sits above the finger, clamped to the frame |
| `ChartLegend`    | A row of toggle buttons (`aria-pressed`): pressing hides a series, hovering spotlights it                                                                                                                   | `Pressable` row, same behaviour, haptic tick                       |
| `ChartTable`     | `sr-only` `<table>` of every value                                                                                                                                                                          | Read through the adjustable control's value text                   |

- **Mark specs** (dataviz): bars at most 24px thick with 4px rounded data ends and square baselines, a 2px surface gap between touching marks, 2px lines with round joins, 8px dots with a 2px surface ring, area fills a series-hue wash fading down, hairline grids.
- **States:** `loading` keeps the last render at reduced opacity (or a skeleton in the chart's shape when there's nothing yet); `empty` content shows when there's no data; a hidden series leaves a gap in the legend's pressed state, never a repainted chart.
- **Density:** text and spacing from the density tokens, so a compact dashboard gets smaller ticks and tighter padding.

---

## 7. Motion

| Moment                          | Motion                                                                                                                                                                              | Role           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| First time visible              | Lines and areas reveal left to right; bars grow from the baseline in a short stagger; arcs sweep from 12 o'clock; cells and pills fade up in a wave; flows extend from their source | `reveal` (new) |
| Data change, series toggled     | Geometry morphs from the old marks to the new: points, rects and angles interpolate; entering marks grow from the baseline, leaving ones shrink into it                             | `move`         |
| Pointer or finger moves         | The highlight and tooltip glide to the nearest mark                                                                                                                                 | `glide`        |
| Tooltip appears and leaves      | Fade and small scale, instantly once one is showing                                                                                                                                 | `tooltip`      |
| Spotlight (legend hover, slice) | Other marks fade to 40%                                                                                                                                                             | `feedback`     |

- One tween hook per platform (`useChartTween`) drives a 0 to 1 progress on the role's duration and curve; models interpolate geometry for any progress. Web reads the role from CSS variables, so `data-motion` on any ancestor retimes the chart; native reads `useMotion`.
- Reduced motion keeps the fades and drops the sweeps, growth and morphs. `instant` and `off` draw at once.
- DESIGN.md's "App content appears in place" gains its exception: a chart's draw-in shows how its marks encode the data, once per mount.

---

## 8. Interaction and accessibility

- **Web pointer:** the nearest mark under the pointer is active (nearest index on cartesian charts, so nobody aims at a 2px line); hit regions are larger than marks (24px minimum).
- **Keyboard:** the frame holds one inspect control. Cartesian charts: `role="slider"`, arrows step the index, Home and End jump, `aria-valuetext` reads the tooltip. Other charts step through marks in the model's order. Legend toggles are buttons. Focus rings on both.
- **Native touch:** a horizontal pan scrubs (activates after 8pt sideways, fails on vertical, so the page still scrolls); a tap selects the nearest mark; each snap plays `feedback("tick")` with its haptic. The frame is `accessibilityRole="adjustable"` with increment and decrement actions and the tooltip as its value.
- `onActiveChange(active)` reports the active datum on both platforms, so a stat above the chart can follow the scrub.
- Colour never carries identity alone: two or more series always show a legend; Status Bar names every status.

---

## 9. API

Common props (every chart, both platforms):

```ts
type ChartConfig = Record<
  string,
  { label: string; color?: ChartColor; dashed?: boolean }
>

type ChartProps<TDatum> = {
  data: TDatum[]
  config: ChartConfig
  label: string // the accessible name
  formatValue?: (value: number, key: string) => string
  legend?: boolean // default: on for two or more series
  tooltip?: boolean // default: on
  animate?: boolean // default: on, still bound by speed and Reduce Motion
  loading?: boolean
  empty?: React.ReactNode
  onActiveChange?: (active: ChartActive<TDatum> | null) => void
  className?: string
}
```

| Component          | Own props                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `AreaChart`        | `index`, `curve` (`smooth`, `linear`, `step`), `stack` (`none`, `stacked`, `expand`), `formatIndex` |
| `LineChart`        | `index`, `curve`, `stack`, `formatIndex`                                                            |
| `BarChart`         | `index`, `layout` (`vertical`, `horizontal`), `stack` (`none`, `stacked`), `formatIndex`            |
| `PieChart`         | `nameKey`, `valueKey`, `labels` (`none`, `outside`)                                                 |
| `DonutChart`       | `nameKey`, `valueKey`, `centerLabel`, `list` (the value list beside or below)                       |
| `RadarChart`       | `index` (the axis names)                                                                            |
| `RadialChart`      | `nameKey`, `valueKey`, `max`, `shape` (`full`, `half`), `centerLabel`                               |
| `Treemap`          | `nameKey`, `valueKey`, `childrenKey`                                                                |
| `CandlestickChart` | `index`, `volume`, `formatIndex`                                                                    |
| `StatusBar`        | `index`, `statusKey`, `statuses` (label per status)                                                 |
| `CompositionChart` | `index`, `formatIndex`                                                                              |
| `FunnelChart`      | `nameKey`, `valueKey`, `orientation` (`vertical`, `horizontal`)                                     |
| `BumpChart`        | `index` (series are config keys, values are ranks or scores ranked per index)                       |
| `HeatCalendar`     | `dateKey`, `valueKey`, `range` (start and end dates), `weekStartsOn`                                |
| `SankeyChart`      | `nodes`, `links` (in place of `data`)                                                               |

`data-slot` on every part (`area-chart`, `area-chart-plot`, `chart-tooltip`, `chart-legend`, …) and placeholders (`cn-chart-*`, `cn-area-chart-*`) per COMPONENTS.md; native mirrors both.

---

## 10. Files per chart

| What             | Path (under `apps/web/`)                                                             |
| ---------------- | ------------------------------------------------------------------------------------ |
| Model and test   | `registry/fabricator/shared/lib/chart-<form>-model.ts`, `.test.ts`                   |
| Web component    | `registry/fabricator/shared/ui/<item>.tsx`                                           |
| Web style map    | `registry/styles/fabricator/<item>.css`                                              |
| Web item         | `registry/fabricator/registry.ts`                                                    |
| Web demos        | `examples/{base,radix,aria}/<item>-demo.tsx` and one per variant, identical per base |
| Docs             | `content/docs/components/{base,radix,aria}/<item>.mdx`, `meta.json` entries          |
| Native component | `registry/native/ui/<item>.tsx`, `registry/styles/native/<item>.css`                 |
| Native item      | `registry/native/items/charts.ts` (new), shared models added to `SHARED_LIB_FILES`   |
| Native demo      | `examples/native/<item>-example.tsx`                                                 |
| Site             | homepage catalog card, `GROUP_BY_SLUG`                                               |

---

## 11. Phases

1. **Foundation.** The group on every surface; `chart-colors.ts` with its validation test; `chart-model.ts`; the web and native kits; the tween hook. Done when the group shows empty-safe everywhere and the palette test passes.
2. **Reference charts, end to end:** Area and Bar on web and native with docs, demos, native demo and catalog cards. Every later chart copies their shape.
3. **Cartesian:** Line, Composition, Candlestick, Bump.
4. **Polar:** Pie, Donut, Radial, Radar.
5. **Layouts:** Treemap, Funnel, Sankey.
6. **Grids:** Heat Calendar, Status Bar.
7. **Integration:** DESIGN.md (Charts section replaces "There is no Chart component", Choosing a component, Motion exception), COMPONENTS.md dependencies, COMPONENT-GROUPS.md, the unreleased changelog, `native:docs`, captures, the full definition of done.

Phases 3 to 6 are independent once 2 lands: each chart owns its own files, and shared files (`registry.ts`, `GROUP_BY_SLUG`, `meta.json`, indexes, the catalog) are wired in one pass per phase.

---

## 12. Verification

- Models: Vitest, written first. Palette: the validation test. Kit: tooltip snapping and keyboard stepping tested on the model.
- Web: each demo in the running site, light and dark, keyboard only, 390px and 1440px, every motion speed, axe clean; `shadcn add --dry-run` per base.
- Native: `bun run registry:native --check`, `native:parity --strict`, `bunx tsc -p ../mobile`, every demo on the iOS Simulator (iPhone and iPad) in light and dark, scrubbing and VoiceOver.
- `bun run check`, `bun run test`, a full `bun run registry:build`.

---

## 13. Risks

- **Per-frame SVG updates on native.** Morphs re-render paths on the JS thread. Fine for a few hundred points over a role's duration; the candlestick's live update and large heat calendars get measured on a device, and fall back to opacity-only transitions above a mark count if they drop frames.
- **SVG text measurement** is estimated, not measured, to stay identical on both platforms. Labels that might not fit are dropped, never clipped; the tooltip and table keep the value.
- **Eight series hues** can't all pass all-pairs separation; charts where any two series touch (Treemap groups, Sankey nodes) cap distinct hues at the passing count and fold the rest into "Other".

---

## 14. Changes against the plan

- **A `reveal` motion role** (1000, 700, 480 and 0ms from smooth to instant) times the draw-in; `disclosure` (200ms) was too quick to read as drawing. Tested in `__tests__/motion.test.ts`; native reads it through `useMotion`.
- **The palette** is the data-viz reference hues re-stepped for Fabricator's surfaces (amber darkened to keep 3:1 on the light page), defined in `chart-colors.ts` and checked by `__tests__/chart-colors.test.ts`, which ports the validator's checks.
- **`chart-kit` is a `registry:lib` item** on both platforms and holds `chart-model.ts` and `chart-cartesian-model.ts`. It has no docs page and no native demo (a dated parity exception), and `build-native-docs.mts` now skips non-component items.
- **Line Chart has no `dots` prop**: the inspected dots are enough, and an always-on dot per point adds ink without a reader asking for it.
- **Touch:** a tap pins the readout to the nearest mark and a second tap on it lets go; a sideways drag scrubs and lets go on lift. A tooltip that doesn't fit above the finger sits beside the crosshair.
- **Native hidden table:** `ChartDataTable` renders nothing on React Native (a dated parity exception); the adjustable inspector reads every value.
- **Native styles read by charts** (dimmed opacity, grid and axis colours) go through `cva()`: the native compiler doesn't reach a `cn()` inside a hook's argument.
- **Content's group icon** is `NewspaperIcon`.
- **Durations are parsed as CSS times.** The dev stylesheet writes `250ms` as `.25s`, so the web kit reads role durations through `parseCssDuration` (`chart-model.ts`) rather than `parseFloat`.
- **Legend presses end the spotlight**, so hiding a series doesn't leave the rest dimmed until the pointer leaves.
- **Label room:** estimated label widths get a few pixels of slack (4px on cartesian axes, half the font size for the Heat Calendar's weekdays), and band charts reserve room for the last label past a narrow band.
- **Kit additions made while building the charts:** `renderLegend` receives the active index (Composition's live shares); `ChartInspector` takes an optional `getStep` (the Heat Calendar's two-dimensional keys) and, on native, `scrub: "hold"` for charts inside a sideways scroller; tooltips take an optional `note` (Status Bar).
- **Per chart:**
  - Donut Chart's tooltip is off by default: its centre is the readout, with the slice's share.
  - Pie Chart folds slices past the seventh into "Other" (`__other`), in `muted-foreground`.
  - Radial Chart's target defaults to the largest value when neither `max` nor `maxKey` is given.
  - Radar Chart shortens long axis names with "…" before the radius falls below a floor; the tooltip and table keep the full names.
  - Candlestick Chart takes an optional `config` of `up` and `down` (labels and colours) and has no legend by default; `formatValue` receives the field (`open`, `high`, …) as its key.
  - Funnel and Sankey label every stage and node on the chart, so their legends are off by default.
  - Sankey throws a typed `SankeyLayoutError` (`cycle`, `unknown-node`, `duplicate-node`) for data it can't lay out; pointing at a node lights its links and the nodes at their other ends.
  - Heat Calendar and Status Bar count days in UTC (`@date-fns/tz`), so the server and the browser draw the same days; date-only strings (`2026-11-03`) are the safe input. Their grids scroll sideways once cells reach their minimum size, opening on the latest day.
- **The tooltip sits two surface steps over the card** (`bg-surface-5 shadow-surface-5` on both platforms), as menus over Chat Input's card do; on surface 3 it matched the card it floats over in dark mode.
- **The tooltip's positioner is `cn-chart-tooltip-positioner`.** As `cn-chart-tooltip` it shared a name with the excluded upstream Chart, whose surface rule merged in and drew a second box around the tooltip. `__tests__/chart-placeholders.test.ts` now holds every chart placeholder to one rule in each style map.
