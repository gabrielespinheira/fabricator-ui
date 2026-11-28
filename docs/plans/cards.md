# Cards: corner, anatomy, kinds

Status: built, uncommitted (2026-11-28). Board card: "I would like you to help me improve the Cards component."

## As built (differs from the plan below)

- **Values as planned:** card corner Rounded 12/16/20, Squircle 16/20/24, Pill 22/26/30 (`--radius-card`, with `--radius-card-sm` and `--radius-card-inner`); title on the 16 step; `CardValue` on new density text steps 32 (28/32/36) and 24 (20/24/28), semibold, after review. A stat card puts its `Delta` in `CardAction` beside the title and its previous value on a line under the number. Phase 0's lab was skipped: the values were tuned on the real examples instead.
- **No `press-surface` motion role.** A linked card scales to a third of the button press, `calc(1 - (1 - var(--motion-press-scale)) / 3)`, so speeds and Reduce Motion follow with no new token.
- **No two-line clamp on `CardDescription`:** cutting copy silently hides content. Long descriptions wrap.
- **Chart and meter kinds live in `card-overview`** instead of their own examples; there is no `card-settings` example yet (DESIGN.md's Settings section covers it).
- **Native `CardLink` takes `onPress`.** The card registers it and becomes a `Pressable`; the link text is what screen readers focus. No `render`/`asChild` on native.
- **No `card.browser.mjs` and no perf trace.** Link behaviour, focus, hover, the bleed rules, light and dark, and 390px were checked by hand in the running site; `card.test.tsx` covers slots, variants, upstream exports and `CardLink` per base.
- **Finance keeps its own delta** for "mo" (runway months), which `Delta` doesn't take; its values moved to `CardValue`. Billing's plan picker is a choice card (a `FieldLabel`), so it keeps its own markup.
- **A Segmented Meter under a `CardValue`** hides its header visually (new `segmented-meter-header` slot), keeping it for screen readers.

## Goal

Cards that look designed out of the box, and that agents compose the same way every time. Concretely: a rounder card corner in every shape, a header with room for an icon, logo or avatar and a control centred on the title, a first-class headline value with its unit and delta, lists and tables that reach the card's edges on their own, interactive cards, two more variants, and a catalogue of card kinds in the docs, `DESIGN.md` and the skill that agents copy from.

The references (Traffic, Context, Node 07) set the direction, not the target: a ~20px corner, a 16px title with its control on the same line, a large light figure with a muted unit, colour that lives in the data (stacked bars, a segmented meter, legend chips, avatars), identity through an icon tile, and quiet metadata at the bottom.

## What is wrong today

Screens: `tmp/cards-audit/` (the Card docs page in light, the Finance overview in dark, both in Squircle).

1. **The card has the menu's corner.** `.cn-card` uses `--radius-surface`: 12px in Rounded, 14px in Squircle (≈19px drawn), 22px in Pill, the same as a popover or a dropdown. A 480px card with a 16px inset reads boxy; the references sit around 20 to 24px on 300px cards.
2. **The header has two text slots and nothing else.** `CardTitle` (14px) over `CardDescription`, and `CardAction` spanning both rows, top-aligned. There is no place for an icon, logo or avatar, and `DESIGN.md` forbids icon tiles outright. With no description, a 32px control sits above the title's centre line.
3. **Every block hand-writes the headline value.** `text-2xl tracking-tight tabular-nums weight-semibold` appears in `finance-01` (2), `billing-01` (2) and twice in the skill's dashboard recipe. Units ("visits", "of 200K") and the previous value have no treatment, and the delta's position differs per block. 24px semibold reads heavy next to the references' ≈28px regular figure.
4. **The delta badge is re-implemented** in the recipe and in each block, with its sign, rounding and good/bad flip.
5. **Edge-to-edge content is class soup.** A table card needs `-mb-(--card-spacing) px-0` and `[&_tr>*:first-child]:ps-(--card-spacing) [&_tr>*:last-child]:pe-(--card-spacing)`; a list card needs `px-[calc(var(--card-spacing)-var(--density-12))]`. Agents get it wrong or skip it, and the first column drifts off the inset.
6. **One look.** No quieter card for secondary content or for a card inside a raised surface, no layered card, no interactive state. Clickable cards are hand-built with hover classes, often as an `<a>` around buttons (invalid HTML).
7. **Footers float.** In a row of equal-height cards the footer sits under the content instead of on the bottom edge.
8. **Charts carry full chrome at every size.** A 300px card still draws the y-axis, gridlines and every x label; the Traffic reference is bars and two end dates.
9. **The docs teach the wrong card.** The Card page leads with upstream's login form, and nothing on it shows a dashboard card. The skill's dashboard recipe is the only thing agents copy, and it hand-writes the value.

## What the references and other sources agree on

- **Concentric corners** (Apple, WWDC25 "Get to know the new design system"; SwiftUI `ConcentricRectangle`): an inner corner is the container's minus the padding, with a minimum. Fabricator already does this for popups and tracks; the card role extends it to the card's own layers.
- **Three kinds of surface** (Material 3 elevated, filled, outlined). Fabricator maps elevated to the default card and filled to a muted card, and drops outlined, because surfaces carry no border.
- **A hoverable state and a secondary style** (Vercel Geist's Card).
- **Card, metric and a few data marks** (Tremor: `Card`, `Metric`, `CategoryBar`, `BarList`, `Tracker`). Fabricator already has `SegmentedMeter`, horizontal `BarChart` and `StatusBar`. The missing piece is the metric part.
- **KPI anatomy** (NHS digital playbook): the title top-left, the value as the largest text, context (period, trend) at the bottom; a sparkline only when it adds meaning; colour never the only signal.
- **Bento grids** (2026 guides): size signals importance, shapes vary across a grid, and a card lifts slightly under the pointer.

## Decisions

### 1. A card corner role: `--radius-card`

Cards get their own role in `radius.ts`, `control height × ratio + base` like the others, so it follows the density.

| Shape    | Formula    | Compact / **default** / spacious | Today (surface)  |
| -------- | ---------- | -------------------------------- | ---------------- |
| Rounded  | `0.5h − 2` | 12 / **16** / 20px               | 12px             |
| Squircle | `0.5h + 2` | 16 / **20** / 24px (27 drawn)    | 14px (≈19 drawn) |
| Pill     | `0.5h + 8` | 22 / **26** / 30px               | 18 / 22 / 26px   |

- `size="sm"` takes `max(--radius-surface, --radius-card − --density-4)`: its inset is one step smaller, so its corner is too (Rounded 12, Squircle 16, Pill 22 at default).
- At default density the card equals the panel in every shape (16, 20, 26), so a card never looks rounder than the App Shell inset around it.
- What inherits it: the card root, a top or bottom image (`*:[img:first-child]` and friends), the tray panel (decision 7, `card − gap`), the card's focus ring. Popovers, menus, dialogs, alerts, toasts, Kanban cards and choice cards keep `--radius-surface`.
- Media inside the card at the inset (icon tiles, logos, wells, thumbnails) take the control corner, as `DESIGN.md` already says: the corner is 16px away, so concentric would give 0.

Pick: a new role. A rounder surface would break popup rows (rows are `surface − 4px`, so 12px rows next to 8px controls); reusing panel fixes the value at 16px in every density.

### 2. The header: media, title and action on one grid

- **`CardMedia`** (new, mirrors `ItemMedia`): `variant="icon"` is a 32px (`--density-32`) muted tile with a 16px icon; `"image"` holds a logo or picture; `"default"` holds an `Avatar` or anything else. The header grid becomes `[media] [title, description] [action]`, each column present only when its part is.
- **Title on the action's line.** With no description, the title and the action centre on one row; with a description, the action aligns to the title's row. A ghost control at the edge still pulls out by its own padding (existing rule).
- **Type.** `CardTitle` moves from the 14 step to the 16 step (15 / 16 / 18px), medium; `size="sm"` stays on the 14 step. `CardDescription` stays at 13, muted, and clamps to two lines in the header.
- **Icon tiles are allowed on identity cards** (an agent, an integration, a project, a file, a person): the tile says what kind of thing it is. They stay off metric, chart and list cards, where the title names a measure. `DESIGN.md`'s blanket "no icon tile" rule is rewritten accordingly.

Pick: one grid with optional columns, so every header lines up on the inset. Alternative: a free `flex` row per use, which is what produces the drift today.

### 3. The headline value: `CardValue` and `CardValueCaption`

```tsx
<CardValue>
  24,182
  <CardValueCaption>visits</CardValueCaption>
</CardValue>

<CardValue>
  $981K
  <Delta change={11.5} isGoodWhenUp />
  <CardValueCaption>from $879.5K</CardValueCaption>
</CardValue>
```

- `CardValue` is the figure: two new density text steps, **28** (24 / 28 / 32px) on default cards and **20** (18 / 20 / 22px) on `size="sm"`, medium weight, `tracking-tight`, `tabular-nums`, `leading-none`. It is a baseline-aligned row that wraps, so a caption or a delta drops under the figure when the card is narrow; the figure itself never truncates.
- `CardValueCaption` is the muted text after it: a unit, a total ("of 200K"), a previous value. Body size, muted.
- The figure keeps its label: the card title names it, and `CardValue` takes `aria-describedby` from the title when it is used as a stat.

Pick: two parts on the card. Alternative: a separate `Stat` component, one more thing to learn for something that only ever sits in a card.

### 4. `Delta`, a Fabricator-only component

One badge for a change: sign, one decimal, arrow, `success` when the change is good and `destructive` when bad, flipped for metrics where down is good, an outline "0%" for no change, rates in points ("−0.4 pt"). The rules live in `shared/lib/delta-model.ts`, tested first; the component renders `Badge`. Used in `CardValue`, tables and lists. Depends on `@fabricator/badge` (contract 3).

Pick: a component. It is already written three times; the next block makes four.

### 5. Lists and tables reach the edges on their own

- A `CardContent` whose child is a `Table` (`[data-slot=table-container]`) drops its inline padding, pads the first and last cells to `--card-spacing`, and, as the card's last part, pulls down by `--card-spacing` so the last row's wash meets the bottom corner.
- A `CardContent` whose child is an `ItemGroup` insets by `--card-spacing` minus the item's own padding, so each icon lands on the inset.
- Existing manual classes resolve to the same values, so nothing double-counts; blocks and recipes drop them in Phase 6.

Pick: built in, as `DESIGN.md` already requires both. Alternative: a `bleed` prop on `CardContent`, which agents would forget like the classes today.

### 6. The footer pins to the bottom

`CardFooter` gets `mt-auto`, so in a row of equal-height cards every footer sits on the bottom edge. The footer's text is a muted caption by default (metadata, "Updated 2 min ago", an `AvatarGroup` with its count); buttons keep their own colour.

### 7. Variants: `default`, `muted`, `tray`

| Variant   | Look                                                                                                                                 | For                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `default` | Today's lift: `bg-card shadow-surface-2`                                                                                             | Almost everything                                                                                   |
| `muted`   | A wash (`bg-muted`), no shadow                                                                                                       | Secondary cards, an "Add" slot in a grid, a card inside a raised surface (a sheet, a dialog)        |
| `tray`    | A muted shell with `p-(--density-4)`; header and footer sit on the shell, `CardContent` is the lifted panel with corner `card − gap` | One featured card per grid, a plan, a group of settings with a caption, anything that needs a frame |

- In `tray`, the panel's inline padding is `--card-spacing − gap`, so the header's text and the panel's text share one edge.
- No `outline` variant: surfaces carry no border.

Pick: these three. They give a grid real variety in depth without colour or borders; anything more is a one-off that belongs in the project.

### 8. Interactive cards: `CardLink`

```tsx
<Card>
  <CardHeader>
    <CardMedia variant="icon">
      <WorkflowIcon />
    </CardMedia>
    <CardTitle>
      <CardLink href="/agents/node-07">Node 07</CardLink>
    </CardTitle>
    <CardAction>
      <MoreMenu />
    </CardAction>
  </CardHeader>
  …
</Card>
```

- A stretched link: the anchor's `::after` covers the card, so the whole card opens the record, cmd-click opens a tab, and screen readers hear one link named by the title. Buttons, menus and switches inside the card are lifted above the overlay and keep working. No `<a>` around the card.
- Per base: `render` (Base UI, `useRender`), `asChild` (Radix), the React Aria `Link`. A Next.js `Link` goes through `render` / `asChild`.
- States on the card, keyed on the link: hover lifts one level (`bg-surface-3 shadow-surface-3`) on the feedback timing; press scales to 0.99 on a new `press-surface` motion role (0.97 is for buttons and reads as a wobble on a 400px card); the focus ring draws around the card on the card's corner and `corner-shape`. No hover lift on touch; reduced motion keeps the colour and drops the scale.
- Selectable cards stay as they are (choice cards are a `FieldLabel` around a `Field`).

### 9. Compact chart chrome: `minimal`

Line, area, bar and composition charts take `minimal`: no y-axis, no gridlines, and only the first and last category under the plot (the Traffic reference). Tooltip, crosshair, keyboard inspection and the screen-reader table stay. Used in cards narrower than about 360px and in stat cards with a sparkline. Its own commit; the card work doesn't wait for it.

### 10. Card kinds are the contract for agents

Each kind is a docs example, a recipe in the skill and a line in `DESIGN.md`, all built from the same parts in the same order:

| Kind       | Parts, in order                                                                                       | Example           |
| ---------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| Stat       | Title, `CardValue` + `Delta` + previous value                                                         | `card-stat`       |
| Chart      | Title, period `ToggleGroup` in the action, `CardValue` + caption, chart (`minimal` when narrow)       | `card-chart`      |
| Meter      | Title, action, `CardValue` "of" total, `SegmentedMeter` with its legend                               | `card-meter`      |
| Object     | `CardMedia` icon, title with `CardLink`, More menu, two-line description, `AvatarGroup` in the footer | `card-object`     |
| List       | Title, "View all", `ItemGroup` (bleeds by itself)                                                     | `card-list`       |
| Table      | Title, "View all", `Table` (bleeds by itself)                                                         | `card-table`      |
| Settings   | Title, description, horizontal fields, footer with Save only when it saves                            | `card-settings`   |
| Plan       | `tray`: name and who it's for, `CardValue` price, what's included, the button                         | `card-plan`       |
| Connection | `CardMedia` logo, name, one line, `Switch` or "Connect" in the action                                 | `card-connection` |
| States     | Loading (frame and header at once, `Skeleton` content), empty (`Empty`), error (`Alert` with Retry)   | `card-states`     |

Plus `card-overview` (the docs page's lead: a chart, a meter and an object card side by side), `card-variants`, `card-media` and `card-link`. Upstream's examples (`card-demo`, `card-small`, `card-spacing`, `card-edge-to-edge`, `card-image`, `card-rtl`) stay, lower on the page.

### 11. Where the code goes

- **The new parts and the `variant` prop go in Fabricator overrides** (`registry/fabricator/{base,radix,aria}/ui/card.tsx`, copied from upstream with every export, prop and `data-slot` kept). Overrides compile into the Fabricator style only, so upstream styles keep byte-identical output (contracts 1 and 5, `bun run test:parity`).
- **The look is the style map** `registry/styles/fabricator/card.css`: corner, header grid, title and value type, footer pin, variants, link states, the bleed rules.
- **`Delta`** is `registry/fabricator/shared/ui/delta.tsx` with its model.
- **Tokens** are new names (`--radius-card-ratio`, `--radius-card-base`, `--radius-card`, `--density-text-24`, `--density-text-32`) shipped in the foundations item's `cssVars` (contract 4). The `card` item must depend on the foundations item so `add card` brings `--radius-card`; otherwise an older project gets square corners.

## Phases

One commit per phase (scope in brackets). TDD: each test lands before the code it covers. Each phase updates the docs that own its convention in the same commit.

### Phase 0: lab and look sign-off (no commit)

In `tmp/skill-lab`: the three references rebuilt with Fabricator parts (Traffic as a stacked `BarChart`, Context as a `SegmentedMeter`, Node 07 as an object card), plus the finance KPI row and a table card, with the proposed values as plain CSS. Side by side with the reference images, in light and dark, the three shapes and the three densities.

- Tune: the card corner per shape, the title step (16 or stay at 14), the value step and weight, the tray gap, the press scale.
- Measure the dark step between page and card against the references (≈#191919 → #262626). If ours is clearly flatter, that is a separate plan, since it moves every surface.
- **Checkpoint:** the before and after screenshots go to the board card, and the values are picked there before Phase 1.

### Phase 1: tokens [`tokens`]

- `radius.test.ts` first: the card role per shape at the three densities (Rounded 12/16/20, Squircle 16/20/24, Pill 22/26/30, or Phase 0's values), card ≥ surface everywhere, the `sm` corner rule, the tray panel `card − --density-4` never below mark, `toShapeVars` and `getNativeRadii` include the card.
- `radius.ts`: `card` joins `RADIUS_ROLES` and `SHAPE_RADII`.
- `density.test.ts`, then `density.ts`: text steps 20 and 28.
- `motion.test.ts`, then `motion.ts`: the `press-surface` role.
- `native-theme.ts`, `native-theme.test.ts`, `native-css-variables.test.ts` follow.
- Docs: `COMPONENTS.md` Shape and Typography tables, `docs/STYLES.md`, `content/docs/foundations/radius.mdx` (a Card row in the comparison), `DESIGN.md` Shapes ("three corner sizes: controls, containers, cards").

### Phase 2: the card [`registry`]

- `card.test.tsx` per base first: every part renders its `data-slot`; upstream's exports are unchanged; `variant` and `size` reach `data-*`; `CardLink` renders one anchor with the title as its name, through `render` / `asChild` / the Aria `Link`.
- The three overrides and `card.css`: corner, header grid with `CardMedia`, title step, centred action, `CardValue` and `CardValueCaption`, footer pin, the three variants, link states, the bleed rules.
- `card.browser.mjs` (like the existing `*.browser.mjs` checks): clicking the card opens the link; clicking a button or menu inside it doesn't; the focus ring follows the corner; the tray panel is concentric within 1px; the first column of a table card and the icons of a list card sit on the inset.
- `radius-usage.test.ts`: the card map uses `--radius-card` for the root, media and tray panel, and no other map uses it.
- Registry: `registry.ts` override dependencies (`@base-ui/react/use-render`, Radix `Slot`); confirm `card` depends on the foundations item.
- Perf: the card's `:has()` rules are anchored on the card itself (not on an ancestor). Trace style recalculation on the docs page and on a 40-card grid before and after; within 5%.

### Phase 3: `Delta` [`registry`]

- `delta-model.test.ts` first: sign and unicode minus, one decimal, `%` and ` pt`, the good/bad flip, zero as outline, a missing value as "No data" with no badge, a tiny share as "<0.1%".
- `delta.tsx`, item in `registry.ts`, docs page under Data display, examples per base.

### Phase 4: native [`native`]

- `registry/native/ui/card.tsx` and `styles/native/card.css`: the card corner (`corner-curve` for iOS continuous corners), `CardMedia`, `CardValue`, `CardValueCaption`, the variants, the centred action, the footer pin. `Delta` in the native tree.
- `CardLink` on native: a `Pressable` filling the card behind its content with the press feedback, and inner controls above it. Spike first: if nested pressables steal each other's touches on Android, `CardLink` becomes `onPress` and `href` on `Card` itself, recorded in `parity-exceptions.json` with the date.
- `bun run registry:native` (without `--check`) before simulator checks; iPhone and iPad, then Android.

### Phase 5: docs and examples [`docs`]

- The card page leads with `card-overview`, then Anatomy, Kinds (each kind above, with its preview), Variants, Interactive cards, Media, Value and Delta, Size, Spacing, Edge to edge (now automatic), States, then upstream's sections and the API reference with the new parts. Same for the three bases and native.
- Examples per base (14 new) and native. Demo content uses the identity in `scripts/rebrand.ts`.
- `unreleased.mdx`: a Card section and a Delta section; `card` in `updated`, `delta` in `new`.

### Phase 6: blocks [`registry`]

- `finance-01` and `billing-01` move to `CardValue`, `Delta` and the automatic bleed; their hand-written value classes and padding soup go.
- The other blocks' 18 `Card` uses get the new header where they hand-build one (icon tiles, logos), and `tray` or `muted` where a variant replaces custom classes.
- `/create`'s block previews pick this up with no change; check them.
- `bun run registry:build`, then `bun run registry:capture --force && bun run pages:capture`.

### Phase 7: compact charts [`registry`]

- `chart-grids.test.tsx` first: `minimal` drops the y-axis and gridlines and keeps the first and last category labels.
- `minimal` on line, area, bar and composition charts; `card-chart` uses it; native follows or records an exception.

### Phase 8: the agent side [`docs`]

- `DESIGN.md`: Cards (anatomy with the new parts, the kinds table, icon tiles on identity cards only, variants, interactive cards, equal heights with pinned footers), Typography (Metric: 28px medium; card titles on the 16 step), Elevation (the muted card), Dashboards "Make it engaging" pointing at the kinds, the review checklist.
- `skills/fabricator`: `recipes/dashboard.md` rewritten on `CardValue`, `Delta` and the automatic bleed; a new `recipes/cards.md` with one recipe per kind; `judge.md` card checks; `components.md`; `patterns.md`.
- `skills/fabricator/evals/evals.json`: two new evals, "a usage card for a plan's seats and storage" and "an integrations grid", judged on the parts used, no hand-written value classes, one inset, and pinned footers.

## States and edge cases

- **Long title:** wraps to two lines; the action stays on the first line. **Long description:** two lines in the header, full in the content.
- **Long value** ("$1,284,310.55" in a quarter card): the caption and delta wrap under the figure; the figure never truncates. At a 390px width every KPI value shows in full.
- **Missing value:** "No data" in muted body text with no delta; zero shows "0".
- **Loading:** the frame, title and action render at once; the value is a `Skeleton` at the figure's height and the chart shows its `loading`; a row of cards appears together.
- **Empty:** an `Empty` at the content's height with one outline action. **Error:** an error `Alert` in that card with Retry; other cards keep their data. **Partial:** said in the description or a warning `Badge`.
- **Interactive card:** the description can't be selected under the overlay (documented; a card whose text people copy uses an "Open" action instead). Tab order: the link, then the card's own controls. Middle-click and cmd-click open a tab. A disabled record has no `CardLink`.
- **Top image with a link:** the image is part of the target.
- **RTL:** the header grid and the stretched link follow logical sides; `card-rtl` gains media and a value.
- **Forced colours:** the shadow edge disappears, so the card gets a 1px `CanvasText` outline, on its corner.
- **Squircle fallback** (Safari, Firefox, Tauri on macOS and Linux, Android): the base radii, round corners.
- **Older projects:** updating `card` without the foundations item would leave `--radius-card` undefined; the item dependency prevents it, and a `packages/tests` run of `add card` on an existing project checks it.
- **Upstream styles:** untouched; `bun run test:parity` stays green.

## Out of scope

- A `CardGrid` or bento layout component. The grid stays a recipe; revisit after the third block hand-builds a bento grid.
- Rolling numbers when a value changes.
- Dashboard editing (drag to reorder, resize cards).
- Changing the surface ladder (see Phase 0's dark measurement).
- Kanban cards and choice cards: their own components, which keep the surface corner.

## Done when

- [ ] Phase 0 signed off on the board card with before and after screenshots.
- [ ] `radius.test.ts`, `density.test.ts`, `motion.test.ts`, `delta-model.test.ts`, `card.test.tsx` (three bases), `chart-grids.test.tsx`, the native theme tests and `card.browser.mjs` pass; `bun run check`, `bun run test`, `bun run demo check`.
- [ ] `bun run registry:build` and `bun run registry:native`; committed indexes updated; `bun run test:parity` green.
- [ ] Every kind seen in the running site in the three shapes, light and dark, compact, default and spacious, keyboard only, at 390px and 1280px, axe clean on the Card and Delta pages and on `finance-01` and `billing-01`.
- [ ] Native card seen on iPhone, iPad and Android.
- [ ] Style recalculation on the docs page and a 40-card grid within 5% of before.
- [ ] `DESIGN.md`, `COMPONENTS.md`, `docs/STYLES.md`, the radius foundations page and the skill updated; the two new evals pass.
- [ ] Changelog lists `card` as updated and `delta` as new.
- [ ] Contract: upstream names, props and slots kept (1); `@fabricator/badge` for `Delta` (3); new tokens under new names in the foundations' `cssVars` (4); the three bases in the same change (5); native in the same change or a dated exception (9).

## Sources

- [Apple, WWDC25 "Get to know the new design system"](https://developer.apple.com/videos/play/wwdc2025/356/), [`ConcentricRectangle`](https://developer.apple.com/documentation/swiftui/concentricrectangle), [`concentric(minimum:)`](<https://developer.apple.com/tutorials/data/documentation/swiftui/edge/corner/style/concentric(minimum:).md>), [HIG: Widgets](https://developer.apple.com/design/human-interface-guidelines/widgets)
- [Material 3 cards in Compose (elevated, filled, outlined)](https://developer.android.com/develop/ui/compose/components/card)
- [Vercel Geist: Card](https://vercel.com/geist/card)
- [Tremor: data bars](https://npm.tremor.so/docs/visualizations/data-bars)
- [NHS digital playbook: KPI cards](https://nhsbsa.github.io/nhsbsa-digital-playbook/data/data-visualisation/kpi-cards)
- [SaaSFrame: designing bento grids that work (2026)](https://www.saasframe.io/blog/designing-bento-grids-that-actually-work-a-2026-practical-guide)
- [`radius-shapes.md`](radius-shapes.md): the roles, the concentric rule and the squircle scale this plan builds on
