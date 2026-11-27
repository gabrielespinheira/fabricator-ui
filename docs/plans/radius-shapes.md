# Radius shapes: Rounded, Squircle, Pill

Status: built, uncommitted (2026-11-27). Card: "Improve the Radius settings".

## As built (differs from the plan below)

- **Classes are CSS variables, not `rounded-control` utilities.** `cn` only merges t-shirt radius names, so custom utilities would stop a consumer's `rounded-none` from winning. Style maps write `rounded-(--radius-control)`, `rounded-(--radius-surface)`, `rounded-(--radius-panel)`, `rounded-(--radius-mark)`.
- **Roles are re-declared in every density scope.** A variable resolves where it is declared, so the role formulas sit on `:root`, every `[data-density]` switch and every `density-*` utility (`density.ts`); `size="sm"`/`"lg"` get proportional corners for free.
- **Layering is three fixed tokens plus inline sums**, instead of `--radius-parent`/`--corner-inset` machinery: `--radius-nested` (surface − 4px, popup rows), `--radius-inner` (control − `--density-4`), `--radius-wrap` (control + `--density-4`). Other gaps write `rounded-[max(var(--radius-mark),calc(var(--radius-surface)-<gap>))]` (Accordion, Attachment, Input Group xs buttons, large Chat Input). Fluid Hover highlights read `--fluid-hover-radius`, which each popup sets to `--radius-nested`.
- **Squircle values:** control `0.25 × height`, surface 14px, panel 20px, mark 5px. On the web it draws `corner-shape: superellipse(1.5)` scaled by 1.35 (`squircle` = superellipse(2) read about half its radius, tighter than Rounded). Pill's panel is `0.5 × height + 8px` so it stays above the surface at spacious.
- **Chat Input's one-line layout stays a capsule** with round buttons in every shape (already concentric, 18 + 8); its corner is pinned to `corner-shape: round`. The large layout follows the shape: card corner = button corner + 10px.
- **Existing Pill projects:** no CLI detection. `radius-pill` now writes the new variables, a new `radius-squircle` item exists, and the changelog tells Pill projects to re-run `add radius-pill`.
- **Native:** `getNativeRadii` resolves the roles to points; native style maps use the same classes plus a `corner-curve` utility (`border-curve: var(--corner-curve)`), which Uniwind compiles to a runtime `borderCurve` lookup.
- **Concentric audit** ran as an in-page script on a temporary lab route (external headless Chrome is blocked in this environment), across the three shapes and densities; the route is deleted. Remaining reports are flush transparent inputs (false positives) and 9–12px gaps treated as card spacing.

## Goal

Three shapes in the look (`shape=rounded|squircle|pill`), each with radii tuned per role and per size instead of one multiplier, so every component is concentric and proportional in all three. Squircle draws Apple-style continuous corners on web, desktop and iOS, and falls back to plain round corners wherever the platform can't draw them.

## What is wrong today

The whole system is one number. `look.ts` writes `--radius` (0.5rem Rounded, 1.25rem Pill) and every rung is a multiple of it (`--radius-sm` 0.6×, `md` 0.8×, `lg` 1×, `xl` 1.4×, `2xl` 1.8×; `native-theme.ts` copies the same table as `RADIUS_SCALE`). Measured at the default density:

| Problem                                                                                                                                                           | Rounded             | Pill        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------- |
| Containers inflate with the multiplier (`rounded-xl` card, popover, dialog, App Shell inset)                                                                      | 11.2px              | 28px        |
| Rows inside a `p-1` popup are not concentric (should be container − 4px)                                                                                          | 8 vs 7.2            | 20 vs 24    |
| `rounded-lg` means "control" and also "tooltip, sidebar collapse, skeleton, code block, badge", so in Pill every one of those becomes a capsule                   | –                   | 20px on all |
| Multi-line fields (textarea, chat input, input group with textarea) share the control radius                                                                      | 8px                 | 20px blobs  |
| Literal radii ignore the shape: checkbox `rounded-[6px]`, tooltip `rounded-[5px]`, input-group addon, kbd, sidebar inset `rounded-[48px]`, 16 style maps in total | –                   | stuck       |
| Sizes don't change radius: `sm` (28px), default (36px), `lg` (44px) and `xs` (24px) buttons all take `rounded-lg`                                                 | 29% → 18% of height | mostly pill |

Screens: `tmp/radius-audit/` (home and `/components`, Rounded and Pill, dark). The Pill App Shell frame and inset are 28px against a 20px sidebar row, and the main panel's corner crowds its "Overview" title.

The root cause is the missing role split, not the values. No value of `--radius` makes Pill work, because Pill wants capsule controls and moderate containers at the same time.

## Decisions

1. **Radius roles, not rungs.** The Fabricator style maps stop using `rounded-sm/md/lg/xl/2xl` and literal radii. They use four role utilities with their own tokens and two layering utilities computed from them, all new Fabricator names (contract 4: `--radius` and the shadcn `--radius-*` keep their names and meanings):

   | Utility           | Token                 | For                                                                                                                                                                                                  |
   | ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `rounded-control` | `--radius-control`    | Single-line controls: button, input, select trigger, toggle, badge, tab trigger, input group, segmented items, sidebar menu button                                                                   |
   | `rounded-nested`  | computed (decision 7) | Anything inside a rounded parent that reaches its corner: menu, select, command and listbox rows, highlights, card media, inner panels. Always `parent − inset`, so it is concentric by construction |
   | `rounded-surface` | `--radius-surface`    | Card, popover, menu, select content, hover card, dialog, alert, toast, code block, multi-line fields                                                                                                 |
   | `rounded-panel`   | `--radius-panel`      | Large frames: App Shell frame and inset, sheet and drawer edges, sidebar container                                                                                                                   |
   | `rounded-mark`    | `--radius-mark`       | Small parts: checkbox, kbd, tooltip, inline code, input-group addon, tag close buttons                                                                                                               |
   | `rounded-wrap`    | computed (decision 7) | A wrapper around one control in its corner: Chat Input, Input Group, tabs track, toggle group, segmented control. Always `child + inset`                                                             |

   `rounded-full` stays for intrinsically round things (avatar, switch, radio, slider thumb, status dot) and never changes with the shape. `rounded-none` and `rounded-[inherit]` stay. Data marks (chart bars, candlestick bodies, calendar event chips, color swatches, `em`-based Markdown highlights) keep their own fixed values and are listed as exemptions in the usage test.

   Pick: role utilities. They are the only way Pill can have capsule controls and moderate containers. Alternative: keep rungs and retune the multipliers per shape; it can't fix Pill and keeps the double meaning of `rounded-lg`.

2. **Control radius follows the control height.** `--radius-control` is computed from `--density-36` (the control height in each density scope), so `size=sm` (`density-compact`), default and `size=lg` (`density-spacious`) get proportional corners with no per-size classes. `xs` buttons and toggles (`h-6`, a literal) move to a density token or get one `rounded-control` override; Phase 3 picks whichever the style map already allows.

3. **Values per shape** (default density; compact/spacious follow from the formulas):

   | Token                                           | Rounded                                 | Squircle (base)                          | Pill                                                 |
   | ----------------------------------------------- | --------------------------------------- | ---------------------------------------- | ---------------------------------------------------- |
   | `--radius-control`                              | `--density-36 × 2/9` → 6 / **8** / 10px | `--density-36 × 0.3` → 8 / **11** / 13px | `9999px` (capsule)                                   |
   | `--radius-surface`                              | **12px**                                | **16px**                                 | `--density-36 / 2 + 4px` → 18 / **22** / 26px        |
   | `rounded-nested` in a `p-1` popup               | `surface − 4px` → **8px**               | `surface − 4px` → **12px**               | `surface − 4px` → **18px**, a capsule for a 36px row |
   | `--radius-panel`                                | **16px**                                | **22px**                                 | **24px**                                             |
   | `--radius-mark`                                 | **4px**                                 | **5px**                                  | **6px**                                              |
   | `--radius` (shadcn, for the project's own code) | 0.5rem                                  | 0.625rem                                 | 0.75rem (was 1.25rem)                                |

   Multi-line fields take `rounded-surface` in every shape, capped by `min()` so a two-line textarea in Pill reads as a soft rectangle, not a blob. The values are starting points; Phase 4 tunes them on screen and the test pins the result.

4. **Squircle on the web: CSS `corner-shape`, fallback is free.** The role utilities also write `corner-shape: var(--corner-shape, round)`. Squircle sets `--corner-shape: squircle` and, inside `@supports (corner-shape: squircle)`, scales the role radii by one constant (`SQUIRCLE_CORNER_SCALE`, start at 1.6) because a superellipse at the same radius reads tighter than Apple's continuous curve. Browsers without support ignore both and draw the base values with round corners, which is a slightly softer Rounded. No SVG masks, no `clip-path`, no JS, no new dependency.
   - Support (verified 2026-11-27): Chrome and Edge 139+ ship `corner-shape`; Safari and Firefox don't yet. Tailwind 4.3.5 (our pin) has no `corner-shape` utility, so the role utilities are hand-written `@utility` rules.
   - Because only the role utilities set it, `rounded-full` avatars stay circles in Squircle.
   - Fluid Hover's overlays copy the hovered row's radius; they must copy `corner-shape` too, or the highlight is round under a squircle row.

5. **Squircle on desktop.** Electron 45 (Chromium 140+) gets real squircles. Tauri gets them on Windows (WebView2) and falls back on macOS and Linux (WebKit). Nothing desktop-specific to build; Phase 6 checks both.

6. **Squircle on React Native: `borderCurve: 'continuous'` on iOS, round on Android.** Uniwind 1.14.0 already ships `border-continuous` (`border-curve: continuous`) as a utility. The native role utilities add it in Squircle only; Android ignores `borderCurve` and draws the base radii. iOS continuous corners already look like Apple's at the base values, so native does not apply `SQUIRCLE_CORNER_SCALE`.
   - Spike S2 decides how the shape reaches the utility: (a) a role utility writing `border-curve: var(--corner-curve)` updated by `applyLook()` through `Uniwind.updateCSSVariables`, if Uniwind resolves a variable for an enum style; else (b) a `shape-squircle` Uniwind theme variant on the root, read by the role utilities. Pick (a) if it works; (b) costs one variant per role.
   - No Skia squircles on Android: that is a dependency and a renderer for a fallback the user said not to over-engineer.

7. **Layered corners stay concentric.** Any component with rounded layers (a container, then something inside it near its corner) aligns them: **inner radius = outer radius − the distance between the two edges at that corner**. Today it breaks wherever the layers were chosen by eye. Example: Chat Input is `rounded-2xl` (14.4px in Rounded) with `p-(--density-8)` around a 36px round send button. The button's curve needs an 18 + 8 = 26px outer corner, so it sits off-centre in a tighter corner. The rule runs in two directions, and each layered component uses exactly one per corner:
   - **Inward, parent sets the shape** (`rounded-nested`): the container keeps its role and its children follow. Every role utility also writes `--radius-parent` (its own radius), and every padded container writes `--corner-inset` next to its padding (`[--corner-inset:var(--density-8)]`, default `4px` for `p-1` popups). `rounded-nested` resolves to `max(var(--radius-mark), var(--radius-parent) - var(--corner-inset))`. Custom properties inherit, so the closest rounded ancestor wins and three-deep stacks (App Shell frame → inset → card → row) resolve level by level.
     For containers of many things: card, popover, menu, select, command, dialog, sheet, sidebar, App Shell frame and inset, alert, toast, code block.
   - **Outward, child sets the shape** (`rounded-wrap`): one control sits in the corner and the wrapper follows. The wrapper writes `--radius-child` (the control's radius) and `--corner-inset`; `rounded-wrap` resolves to `calc(var(--radius-child) + var(--corner-inset))`.
     For wrappers that hug one control: Chat Input (send button and tools), Input Group with a button or addon, search fields with a submit, tabs track, toggle group, segmented controls, a floating toolbar.
   - **The corner's control takes the shape's control radius**, so the wrapper follows the shape: Chat Input's send button is `rounded-control` and the composer is 8 + 8 = 16px in Rounded, 11 + 8 = 19px in Squircle, 18 + 8 = 26px in Pill. If we want the send button round in every shape (as in the screenshot), it stays `rounded-full` and the composer is 26px everywhere; pick in Phase 4 on screen.
   - **Equal inset at the corner.** Concentric needs the same distance on both axes. Where a corner control has `px-12 py-8`, the style map evens out the padding at that corner (the control's own padding, not the wrapper's) rather than picking one value.
   - **Limits.** Inner never drops below `--radius-mark` and never goes negative; when the inset is bigger than the outer radius the inner corner is `mark`. CSS clamps any radius above half the box, which is what makes Pill capsules work without special cases.
   - **Squircle.** Both layers draw the same `corner-shape`. `SQUIRCLE_CORNER_SCALE` scales the role tokens only, never the inset, so `parent − inset` stays a real distance.
   - **Things that copy a radius** (Fluid Hover overlays, focus rings via box-shadow, `rounded-[inherit]` overlays, chat drop zones) read the resolved value of the element they cover, which already includes the nesting.
   - **Native.** `radius.ts` exports `getNestedRadius(outer, inset)` and `getWrappingRadius(child, inset)`; native components that layer (Chat Input, Input Group, Tabs, Toggle Group, menus, App Shell floating nav, sheets) call them with the density's numbers, unless spike S2 shows Uniwind resolves `calc()` with variables, in which case native uses the same utilities.

8. **One source of truth.** A new `registry/fabricator/radius.ts` (pure, like `density.ts` and `motion.ts`) defines `RADIUS_SHAPES` (the table above as data), `SQUIRCLE_CORNER_SCALE`, `toRadiusVars(shape)` for CSS, and `toNativeRadius(shape, density)` for `native-theme.ts`. `look.ts`, the site settings, the `/create` page, `native-theme.ts` and both demo settings screens read it. `RADIUS_SCALE` and `PILL_RADIUS` go away.

## Phases

Each phase is one commit (Conventional Commits, scopes in brackets). TDD: the test for a module lands before the module.

### Phase 1: spikes (no commit)

- **S1, web:** in `tmp/skill-lab`, a 36px button, a popover with rows, a card and an avatar with the three shapes. Confirm `corner-shape` follows through `overflow-hidden`, `box-shadow` surfaces (`shadow-surface-*` rings), focus rings and `backdrop-filter`; pick `SQUIRCLE_CORNER_SCALE` by overlaying a Chrome screenshot on an iOS simulator screenshot of the same box with `borderCurve: 'continuous'`.
- **S2, native:** whether Uniwind resolves `border-curve: var(--x)`; pick option (a) or (b) from decision 6.
- **S3, perf:** Data Table page with 500 rows in Squircle, Chrome performance trace; paint time within 5% of Rounded. If not, drop `corner-shape` from `rounded-nested` rows and keep it on controls and surfaces.

### Phase 2: tokens and the look [`tokens`]

- `radius.ts` + `__tests__/radius.test.ts`: every shape defines every role; `getNestedRadius` and `getWrappingRadius` (inset subtracted and added, clamped at `mark`, inset never scaled by the squircle factor); a `p-1` popup row and the Chat Input composer resolve concentric at the three densities in each shape; Pill's capsule radius covers the spacious control (`≥ 22px`); `toRadiusVars` output per shape.
- `look.ts`: `LOOK_SHAPES = ["rounded", "squircle", "pill"]`; `lookCssVars` writes `toRadiusVars(shape)` instead of `PILL_RADIUS`; `parseLook` error lists the three. Extend `__tests__/look.test.ts` (round-trip `shape=squircle`, invalid value error).
- Foundations item: the six `@utility` rules (each role also writes `--radius-parent`; `rounded-nested`, `rounded-wrap`, and directional variants of both), Rounded's tokens as the defaults in `:root`, the `@supports` block for Squircle. `bun run registry:build`.
- Site: `lib/site-settings.ts` (`SiteRadius` gains `squircle`, stored unknown values fall back to Rounded), the inline head script (`data-radius`), `fabricator-site.css` (`html[data-radius]` blocks generated from `radius.ts`, not hand-written values), `look-presets.ts` `RADIUS_OPTIONS` (Rounded, Squircle, Pill).

### Phase 3: migrate the style maps [`styles`]

- `__tests__/radius-usage.test.ts` first, in the shape of `density-usage.test.ts`: fails on `rounded-(sm|md|lg|xl|2xl|3xl|4xl)` (and side variants) and literal `rounded-[…]` in `registry/styles/fabricator/*.css` and `registry/fabricator/shared/**`, with an exemption list for the data marks in decision 1.
- Walk all 118 style maps, assigning each `rounded-*` to a role (≈420 uses; the biggest are button, input, select, menus, card, dialog, tabs, toggle group, sidebar, app shell, chat input, input group, tooltip, checkbox, kbd). Side variants (`rounded-t-xl` on card images, toggle-group `rounded-s-lg`) get directional role utilities (`rounded-t-surface`, `rounded-s-control`).
- Every layered component declares its corner: the container writes `--corner-inset` next to its padding, and the inner layer takes `rounded-nested`, or the wrapper takes `rounded-wrap` with `--radius-child`. The list to walk, outer → inner: Chat Input (composer → send, tools, attachment tiles → thumbnails), Input Group (group → button, addon, kbd), Tabs (track → trigger → highlight), Toggle Group and segmented controls, Dropdown, Context Menu, Menubar, Select, Combobox, Command, Navigation Menu (popup → row → Fluid Hover overlay), Sidebar (container → menu button → badge, action), App Shell (frame → inset → panels; native floating nav), Card (card → media, header and footer bands, nested items, tables), Dialog, Sheet, Drawer (content → footer band, close button), Alert and Toast (body → action, close), Attachment (tile → media), Calendar and Date Picker (popover → day cells, range ends), Color Picker (panel → area, swatches), File Upload (card → drop zone), Code Block (block → copy button), Slider and Progress (track → indicator), Switch (track → thumb).
- `radius-usage.test.ts` also fails when a `rounded-nested` or `rounded-wrap` has no `--corner-inset` declared on its parent part in the same style map.
- Shared overrides (`registry/fabricator/shared`, 136 uses) and the 16 maps with literal radii.
- Parity: style maps only; the three base trees share them, so contract 5 holds. Upstream styles are untouched, so `bun run test:parity` should stay green; run it anyway.

### Phase 4: tune on screen [`styles`]

**Concentric audit.** A `puppeteer-core` script (`apps/web/scripts/radius-audit.ts`, already a dependency of `apps/web`, run against the dev server) opens every component page in each shape and density, and for every element whose box sits within 24px of a rounded ancestor's corner, compares its computed radius with `ancestor radius − distance to the corner`. Anything more than 1px off is listed with its page, `data-slot` and the two values. It runs green before Phase 4 ends, so layered mismatches like the Chat Input send button are caught everywhere, not only in the components walked by hand.

Per shape, light and dark, compact/default/spacious: Button (all sizes, icon, `xs`), Input, Textarea, Input Group, Select, Combobox, Dropdown Menu, Context Menu, Command, Popover, Tooltip, Dialog, Sheet, Card, Tabs, Toggle Group, Checkbox, Badge, Kbd, Sidebar, App Shell, Chat Input, Data Table, Event Calendar, Kanban. Adjust `radius.ts` values only (never a style map) until each is concentric and proportional; update the radius test's pinned values. Capture before/after for the PR.

### Phase 5: native [`native`]

- `native-theme.ts` reads `toNativeRadius`; runtime variables gain the role tokens; `native-theme.test.ts` and `native-css-variables.test.ts` follow.
- Native tree (`registry/native`, ≈90 uses in `ui/` and `blocks/`) moves to the same role utilities; Squircle adds the iOS curve per S2.
- `demos/react-native/src/settings.tsx` lists three shapes from `RADIUS_OPTIONS`.
- `bun run registry:native` (without `--check`) before simulator checks; iPhone and iPad, then an Android emulator for the fallback.

### Phase 6: surfaces that offer the setting [`web`, `cli`, `setup`]

- Settings menu (`components/fabricator/site-settings.tsx`), command menu, `/create` install step and its live preview, `demos/react` settings. Three options; Squircle's label carries a short note that it's round where unsupported, so Safari users aren't confused.
- CLI and setup: `flags.ts` accepts `shape=squircle`; extend `flags.test.ts`, `items.test.ts`, `setup.test.ts`, `cli-args.test.ts`, `native-init.test.ts`, `install.test.ts`.
- **Existing Pill projects.** Their CSS has `--radius: 1.25rem` and no role tokens, so after updating components they'd render Rounded corners. The CLI's update path writes Pill's role tokens when it finds `--radius: 1.25rem` and no `--radius-control`; otherwise the changelog tells them to re-run init with `shape=pill`. Pick: the CLI migration, since it is one check and the alternative silently changes their UI.
- Electron and Tauri demos: open `/desktop` in each shape; confirm Electron draws squircles and Tauri macOS falls back cleanly.

### Phase 7: docs [`docs`]

- `COMPONENTS.md` "Shape": the roles, the concentric rule in both directions (`rounded-nested`, `rounded-wrap`, `--corner-inset`, equal inset at a corner), `rounded-full` exceptions, "never a literal radius or `rounded-lg`".
- `COMPONENTS.md` surface table (`rounded-xl` → `rounded-surface`).
- `docs/STYLES.md` look table: `shape` = `squircle`, `pill`; a short Radius section (where values live, the squircle fallback, the usage test).
- `docs/PLATFORMS.md` theme section: native radius roles and the iOS-only curve.
- New `content/docs/foundations/radius.mdx` with a live three-shape comparison; `skills/fabricator/setup/theming.md`, `setup/cli.md`, `components.md`; `unreleased.mdx` changelog section listing every component touched as `updated`.
- `bun run registry:capture --force && bun run pages:capture` for recaptured previews.

## States and edge cases

- **Unsupported `corner-shape`** (Safari, Firefox, Tauri on macOS/Linux, Android): base radii, round corners. Never broken, never a different layout.
- **Unknown `shape` param** in the init URL or CLI: the existing error path, now listing three values. **Unknown stored site setting** (an old or hand-edited value): falls back to Rounded silently.
- **Density scopes and portals:** popups set `data-density`, so `--density-36` and every derived radius match the region they opened from.
- **Nested containers** (card in a sheet, popover in a dialog): each surface uses its own role; only `rounded-nested` derives from its parent and `rounded-wrap` from its child, so an unrelated nesting never shrinks a dialog's corners.
- **Images and media in cards:** directional surface utilities plus `overflow-hidden`; check `corner-shape` clips images in Chrome.
- **Focus rings** are box-shadow rings and follow `corner-shape`; check they don't clip at the scaled squircle radius.
- **Reduced motion, high contrast, forced colors:** shape is static; check `forced-colors` borders still follow the corner.
- **Sound, motion, density, tint:** independent of shape; the URL and the settings keep them separate.
- **Theme toggle and FOUC:** the head script sets `data-radius` before paint for all three values.

## Out of scope

- SwiftUI or native window corners on desktop.
- Android squircles (Skia or masks).
- A per-component shape override prop.

## Done when

- [ ] The concentric audit reports no corner more than 1px off in any shape or density.
- [ ] `radius.test.ts`, `radius-usage.test.ts`, the look, native theme and CLI tests pass; `bun run check`, `bun run test`, `bun run demo check`.
- [ ] `bun run registry:build` and `bun run registry:native`; committed indexes updated; `bun run test:parity` green.
- [ ] Every component in Phase 4 seen in all three shapes, light and dark, three densities, keyboard only, phone and desktop widths, axe clean on touched pages; before/after screenshots in the PR.
- [ ] Squircle seen in Chrome (real), Safari (fallback), Electron (real), Tauri macOS (fallback), iOS simulator (continuous), Android (fallback).
- [ ] Data Table Squircle trace within 5% of Rounded.
- [ ] Docs in Phase 7 updated; changelog lists the touched components.
- [ ] Contract: `--radius` and shadcn `--radius-*` keep their names; new tokens ship in the foundations item's `cssVars`; native follows in the same change (contract 9).

## Sources

- [caniuse: corner-shape](https://caniuse.com/mdn-css_properties_corner-shape), [Chrome: implementing corner-shape](https://developer.chrome.com/blog/implementing-corner-shape), [squircle.js.org: browser support 2026](https://squircle.js.org/blog/squircles-in-css)
- [React Native view style props: borderCurve (iOS only)](https://reactnative.dev/docs/view-style-props)
- Uniwind 1.14.0 `border-continuous` utility: `demos/react-native/node_modules/uniwind/dist/module/bundler/artifacts/css/extraUtilities.js`
