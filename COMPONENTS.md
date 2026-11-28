# Fabricator UI components

How to write or change a component, example or block in this repo. Read it in full before you start; every rule here is one the existing components already follow, so a new component that follows them looks, moves, sizes and behaves like the rest of the library on every base and platform.

This file owns the component rules: the foundations every component draws from, how source and style maps are written across the three web bases, responsiveness and input, the port to each platform, accessibility and the definition of done. Neighbouring docs own the rest:

| For                                                             | Read                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| Which component a screen calls for, layout, what a colour means | [`DESIGN.md`](DESIGN.md)                               |
| How tokens are made (recipes, files, tests), excluded items     | [`docs/STYLES.md`](docs/STYLES.md)                     |
| React Native porting in detail                                  | [`registry/native/README.md`][native-readme]           |
| Declaring an item, the build, generated files                   | [`docs/REGISTRY.md`](docs/REGISTRY.md)                 |
| A component's group, sidebar place and catalog card             | [`docs/COMPONENT-GROUPS.md`](docs/COMPONENT-GROUPS.md) |
| Docs pages, the changelog page                                  | [`docs/WEBSITE.md`](docs/WEBSITE.md)                   |

[native-readme]: apps/web/registry/native/README.md

A component's look has one written spec: its style map. Each rule opens with a comment saying why it looks the way it does, so there is no second description to keep in step. Paths below are under `apps/web/` unless they start at the root.

## What makes a Fabricator component

1. **A superset of upstream.** A replacement keeps upstream's name, target path, exports, props, variant names and `data-slot`s, and only adds (contract 1). A Fabricator-only component follows the same shape: parts, `data-slot`s, `variant` and `size`.
2. **Source holds behaviour; the style map holds the look.** Structure and mechanics are inline classes; anything a style could change is a placeholder resolved by `registry/styles/fabricator/<name>.css`.
3. **Every value comes from a foundation.** Colour from the roles and neutrals, size from the density, timing from the motion roles, corners from the radius roles, height from the surface ladder. No hex, no pixels for controls, no milliseconds.
4. **The region decides the size and speed.** A component never fixes its density or motion; it follows `data-density` and `data-motion` from the nearest ancestor, portals included.
5. **Behaviour is pure and shared.** Logic (positions, parsing, selection, scales) lives in a tested model shared by React web and React Native. Rendering code wires it to events.
6. **Built-in, never per use.** Fluid hover, sliding selection, the press, focus, sounds and haptics come from the component, so the people using it write none of them.
7. **Every state, every input.** Hover, focus, pressed, open, selected, disabled, invalid, loading, empty, long content; pointer, keyboard, touch and screen reader.
8. **The same on every base and platform.** Base UI, Radix and React Aria render the same look and behaviour; React Native matches the web API. A gap is recorded, never silent.
9. **Small API.** Compose parts before adding props; no option without a use; names follow upstream and Base UI (`value`, `onValueChange`, `defaultValue`, `disabled`, `render`).

## Work in this order

1. **Classify the change.** A look change touches only the style map. Behaviour on an upstream component is an override. A component upstream doesn't have is Fabricator-only. A screen is a block.
2. **Read the references.** Upstream's version of the component (below). Then the closest Fabricator component: `button` (variants and sizes), `input` (a field frame), `checkbox` (a stateful control), `dialog` (an overlay), `tabs` (fluid hover with a sliding selection), `select` (a portalled list), `rating` (a Fabricator-only control with a model), `app-shell` (container queries and panels).
3. **Write the model first** when there is logic: `registry/fabricator/shared/lib/<name>-model.ts` with a colocated `<name>-model.test.ts`, written before the code that uses it. No React, DOM or React Native imports.
4. **Write the web source** in every base tree, then **the style map**.
5. **Write the examples and the docs page** for each base.
6. **Port it:** the React Native item or a dated exception.
7. **Check it** against [Done when](#done-when) in the running site and on devices.

## Where things live

| What                                                     | Where                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Upstream-derived source, one tree per base               | `registry/bases/<base>/ui/<name>.tsx`                                                 |
| Behaviour overrides of upstream components               | `registry/fabricator/<base>/ui/<name>.tsx`                                            |
| Fabricator-only components with one source for all bases | `registry/fabricator/shared/ui/<name>.tsx`                                            |
| Pure models, shared hooks                                | `registry/fabricator/shared/lib/<name>-model.ts`, `registry/fabricator/shared/hooks/` |
| The look                                                 | `registry/styles/fabricator/<name>.css`, under `/* MARK: <Component> */`              |
| Items, override dependencies, excluded items             | `registry/fabricator/registry.ts`; screen blocks in `registry/fabricator/blocks.ts`   |
| Foundations (surfaces, roles, density, motion, look)     | `registry/fabricator/*.ts`, generated into `app/fabricator.css`                       |
| Fluid hover, density, sounds                             | `shared/lib/fluid-hover.tsx`, `shared/ui/density.tsx`, `shared/lib/sounds.ts`         |
| Web examples                                             | `examples/<base>/<name>-example.tsx`, `<name>-<intent>.tsx`                           |
| Docs pages                                               | `content/docs/components/<base>/<name>.mdx`                                           |
| React Native item and look                               | `registry/native/ui/<name>.tsx`, `registry/styles/native/<name>.css`                  |
| Platform gaps                                            | `registry/native/parity-exceptions.json`                                              |

`style-fabricator.css`, `app/fabricator.css`, `styles/*` and the registry indexes are generated: rebuild them, never edit them (contract 6).

## Start from upstream

Read upstream's version before writing: `apps/v4/registry/bases/<base>/`, its rules in `registry/styles/style-nova.css`, its examples. Its structure, slots, variants and accessibility are the baseline you extend. Sparse-clone it at the pinned SHA outside the repo:

```bash
git clone --filter=blob:none --sparse https://github.com/shadcn-ui/ui.git <scratch>/shadcn
git -C <scratch>/shadcn sparse-checkout set apps/v4/registry apps/v4/examples packages/shadcn/src packages/registry/src skills
```

`bunx --bun shadcn@latest view @shadcn/<name>` shows what upstream ships. A Fabricator-only name is checked against upstream's catalog so it never collides.

## Bases

| Base    | Composition                               | Example                                                         |
| ------- | ----------------------------------------- | --------------------------------------------------------------- |
| `base`  | `render` prop, `useRender` / `mergeProps` | `<DialogPrimitive.Close render={<Button variant="ghost" />} />` |
| `radix` | `asChild` + `Slot.Root` from `radix-ui`   | `<DialogClose asChild><Button /></DialogClose>`                 |
| `aria`  | RAC render props and slots                | per the `react-aria-components` docs                            |

- **Mirror every change** to the same path in the other trees (contract 5). Only imports, primitive APIs and part names differ (Radix `Overlay`/`Content`, Base UI `Backdrop`/`Popup`, RAC `ModalOverlay`/`Modal`); `data-slot`s and placeholders stay identical. A change scoped to one base says so in the commit body and PR. Report which bases you updated.
- **Base UI first,** then Radix with the same behaviour, then React Aria. A Fabricator-only component writes Radix and Aria versions when their primitive differs; otherwise the item falls back to Base UI, recorded in its `meta` and on its docs page. A pure-HTML component keeps one identical source in every tree, usually in `shared/ui/`.
- Shared files import base-specific code through `@/registry/bases/__base__/…`, which the build resolves per base.
- Typechecking resolves `@/registry/bases/<base>/ui/<name>` to the upstream tree, so an overlay-only component, or overlay code using an override's additions, needs a path alias in `apps/web/tsconfig.json` (see the App Shell entries).
- React Aria has no `NavigationMenu`; upstream ships none for that base. Menubar is left out of every base (`FABRICATOR_EXCLUDED_ITEMS`).

## Source

```tsx
"use client"

// only for state, effects, context, events or an interactive primitive
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-content"
      className={cn(
        "cn-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full",
        className
      )}
      {...props}
    />
  )
}

export { DialogContent }
```

- Plain function components, `ref` as a regular prop, one `export { … }` block at the bottom, `className` merged last through `cn()` (from the `cn` package; `lib/utils.ts` re-exports it).
- Props extend the primitive's: `DialogPrimitive.Popup.Props` (Base UI), `React.ComponentProps<typeof X>` (Radix), the RAC types (Aria), `React.ComponentProps<"div">` (HTML). Document each added prop with a one-line JSDoc comment.
- `data-slot="<component>-<part>"` on every rendered part. Parents style children with `has-data-[slot=…]:` and `in-data-[slot=…]:`.
- State a style needs is a `data-*` attribute on the part (`data-size`, `data-variant`, `data-orientation`, `data-disabled`), never a class chosen in JavaScript.
- Variants use `cva` with the axes `variant` and `size`, `defaultVariants` set, and placeholder values (`default: "cn-button-variant-default"`).
- Controlled and uncontrolled both work: `value`, `defaultValue`, `onValueChange`, plus `onValueCommitted` where a drag ends.
- Open the file with a short comment on what the component is and which WAI-ARIA pattern it follows when it isn't obvious.
- Registry files import each other as `@/registry/bases/<base>/ui/<name>`; the build and CLI rewrite it.

## Placeholders and style maps

**What goes where**

- **Inline in source:** what every style shares: display, flex and grid mechanics, positioning, `z-50` on popups, `outline-none`, `select-none`, disabled mechanics, `[&_svg]:pointer-events-none`, group names, `@container` names.
- **Placeholder** (`cn-<component>[-<part>][-variant-<v>|-size-<s>]`): anything a style could change: radius, colour, border, shadow, spacing, height, gap, type, focus ring, invalid state, timing, cursor.
- **Placeholders compile only as string literals** in a `className` attribute or a `cn(...)` argument. One in a ternary, an `&&` or a variable ships unreplaced. Put variant styles in the rule behind a `data-*` attribute (`data-[size=sm]:density-compact`) and check the compiled file: `grep -no '"[^"]*cn-[a-z][^"]*"' styles/<style>/ui/<name>.tsx`.
- Upstream-derived placeholders need a rule in every style map; Fabricator-only ones in the Fabricator map only. The build's coverage lint enforces it.
- State variants come from `shadcn/tailwind.css` (`data-open:`, `data-checked:`, `data-disabled:`, …), which match Radix and Base UI alike. React Aria adds `data-pressed:`, `data-selected:`, `data-focus-visible:`; cover them in the same rule.
- Install-time markers stay literal for the CLI: `cn-menu-target`, `cn-menu-translucent`, `cn-font-heading`, `cn-rtl-flip`, `cn-logical-sides`.

**Writing the rules**

1. Every placeholder a component uses has a rule in its style file; the build fails otherwise. Rules may change completely; placeholder names may not.
2. Each rule opens with a comment on why it looks the way it does, under a `/* MARK: <Component> */` heading, in upstream's order. That comment is the component's spec.
3. Sizes come from the density tokens; colour from the role tokens or the neutrals; durations, curves and zooms from the motion roles. `__tests__/density-usage.test.ts` and `__tests__/motion-usage.test.ts` fail on fixed values.
4. Where upstream source hard-codes a duration or a size, the rule overrides it with an important class (`duration-sheet!`); class merging keeps the source's class otherwise.
5. A rule reaches its component's parts by slot (`[&_[data-slot=rating-star-fill]]:`), never by a class name.

## Overrides

Behaviour CSS can't express (fluid hover, a sliding selection, density on a portal) goes in an override.

1. Copy the upstream file from `registry/bases/<base>/ui/<name>.tsx` to `registry/fabricator/<base>/ui/<name>.tsx` and keep every export, prop, variant and `data-slot`. Changes are additive.
2. Keep the diff small and container-level; style through placeholders, not inline classes.
3. Import Fabricator libs with `@/registry/bases/<base>/lib/…` (`@/registry/bases/__base__/…` in `shared/`).
4. Add new registry dependencies to `fabricatorOverrides` in `registry.ts`; they apply only to bases with an override file.
5. A base without an override keeps upstream behaviour with the Fabricator look.
6. Overrides compile into the Fabricator style only, so upstream styles keep their exact output. After an upstream sync, port upstream's changes to each overridden file ([MAINTAINING.md](docs/MAINTAINING.md#upstream-sync)).

## Logic lives in models

Anything that computes (a position, a value from a pointer, a date grid, a parse, a scale, a keyboard step, a selection rule) is a pure function in `registry/fabricator/shared/lib/<name>-model.ts`, tested first with Vitest. The component calls it and renders the result. This is what keeps the platforms equal:

- React web and React Native import the same model, so they can't drift.

One adapter per SDK or service (file pickers, clipboard, audio, haptics, windows, drag and drop, the calendar engine): the component consumes typed results, never the SDK. Models to copy from: `rating-model`, `spinner-model`, `data-table-model`, `file-tree-model`, and `event-calendar-model` with FullCalendar kept inside `ui/event-calendar-engine.tsx`.

## Foundations

Use these through their tokens and utilities. How they are calculated is in [STYLES.md](docs/STYLES.md).

### Surfaces and elevation

An eight-level ladder of backgrounds, each paired with a shadow that starts with a 1px ring. **Surfaces have no borders: the ring is the edge.** Light: level 1 is the page (#FAFAFA), level 2 is #FCFCFC, then flat white separated only by shadow. Dark: each level is a step lighter. `surface-0` grounds a screen that stands alone (the auth blocks), with no shadow. A project's surface tint (`--surface-hue`, `--surface-chroma`) flows through every level, so never write a surface colour.

| Level    | Classes                                                    | Holds                                                                |
| -------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| Page     | `bg-background` (surface 1)                                | The page; in an App Shell, the main column and panels                |
| 2        | `bg-card shadow-surface-2 rounded-(--radius-card)`         | The default card, inset regions, the sidebar on its own              |
| 3        | `bg-surface-3 shadow-surface-3 rounded-(--radius-surface)` | Raised cards, menus, popovers, selects, hover cards, sheets, drawers |
| 4        | `bg-surface-4 shadow-surface-4`                            | The active tab, anything raised inside a level-3 surface             |
| 5        | `bg-surface-5 shadow-surface-5 rounded-(--radius-surface)` | Dialogs, alert dialogs, toasts, chart tooltips                       |
| Inverted | `bg-foreground text-background`                            | Tooltips                                                             |
| Scrim    | `bg-black/40 dark:bg-black/80`                             | Behind dialogs and sheets                                            |

- A child sits above its parent. A quiet area inside a surface is a faint wash (`bg-hover`, `bg-muted`), never a lower level.
- Height means layering, never importance. No other shadows, no borders on surfaces; status surfaces are the tinted ladder (`bg-<role>-surface-N`).
- Portalled surfaces set their own level; they don't inherit the parent's.

### Colour

Six roles, each one hue and chroma (`--<role>-hue`, `--<role>-chroma`) turned into the same tokens by one recipe, AA-tested in both themes at any setting:

- **Primary:** the main action and "on": the default button, links, checked controls, a switch that is on, a slider's range, progress, a selected date. Neutral (the foreground colour) until a project picks a hue.
- **Secondary:** a soft second action.
- **Info, success, warning, destructive:** statuses, each kept to its hue family. `error` is another name for `destructive`.

| Token                                        | Use                                                               |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `bg-<role>`, `text-<role>-foreground`        | A fill and the text on it: buttons, checked controls, dots        |
| `text-<role>`                                | An icon or dot in the role's colour                               |
| `text-<role>-text`                           | Coloured text on any neutral or tinted surface; all coloured text |
| `border-<role>-border`, `ring-<role>-border` | The role's hairline                                               |
| `bg-<role>-surface-1…8`                      | A tinted ladder level; light uses 1–2, dark starts at 3           |
| `text-foreground`, `text-muted-foreground`   | The two text steps; a third comes from size or weight             |

**States are opacity steps of the fill,** so they work with any palette:

- **Solid:** `bg-<role> text-<role>-foreground hover:bg-<role>/90 active:bg-<role>/80`. Secondary: `hover:bg-secondary/80`.
- **Soft** (destructive button, invalid washes): `bg-<role>/12 text-<role>-text hover:bg-<role>/16 active:bg-<role>/20`.
- **Neutral:** `bg-hover` (4% black, 6% white) for hover and lit rows, `bg-active` (7%, 10%) for pressed, selected and toggled on. Ghost controls rest `text-muted-foreground` and turn `text-foreground` with the wash.
- The pressed step also applies while a trigger's popup is open (`aria-expanded:`) and to React Aria presses (`data-pressed:`).
- **Status contrast:** low (default) is the neutral panel with only the icon in `text-<s>`; high is `bg-<s>-surface-1 dark:bg-<s>-surface-3 ring-1 ring-inset ring-<s>-border` with the description in `text-<s>-text`.

**Focus** is one 1px blue ring with no offset: `focus-visible:ring-1 focus-visible:ring-ring`, the same blue in both themes and every palette. The exceptions, each for a reason: checkbox, radio and switch add `ring-offset-2 ring-offset-background` to clear the filled control; text fields focus with a neutral `ring-foreground/25` because the caret already marks focus; the slider draws a ring 4px outside its thumb.

**Invalid:** `aria-invalid:ring-1 aria-invalid:ring-destructive/50`; fields add a `bg-destructive/5` hover wash; messages and invalid labels are `text-destructive-text`. **Disabled:** `opacity-50 pointer-events-none`; a button that stays focusable (`aria-disabled`) keeps pointer events and shows `cursor-not-allowed`.

- `border` is 12% of the foreground; dividers inside menus and tables are `border/60`. Lines exist only where a component must be read (a field's frame, a table's row rules, menu group separators).
- Chart series take `--chart-series-1…8` in config order; never a role. Code takes `text-syntax-<name>`.
- Colour you write by hand is a deviation, allowed only where content behind the control is arbitrary (see [Known deviations](#known-deviations)) and recorded there.

### Density

Three densities size every component: **compact** (dashboards, dense tables), **default** (apps), **spacious** (websites, touch-first screens). `data-density="<name>"` on any element, or the `density-<name>` utilities (which work at breakpoints), switches everything inside it.

Tokens are named after their default value. Write `h-(--density-36)`, `px-(--density-16)`, `gap-(--density-6)`, `text-(length:--density-text-13)`, `size-(--density-icon-16)`. They are CSS variables rather than theme keys because class merging only knows arbitrary values: `h-control` would never conflict with a consumer's `h-12`.

| Token                       | Compact | Default | Spacious | Sizes                                               |
| --------------------------- | ------- | ------- | -------- | --------------------------------------------------- |
| `--density-48`              | 40      | 48      | 56       | Command input row, App Shell and panel headers      |
| `--density-40`              | 32      | 40      | 48       | Tab strip, large avatars, media tiles               |
| `--density-36`              | 28      | 36      | 44       | Controls, menu rows, table head, tab tracks         |
| `--density-32`              | 28      | 32      | 40       | Sidebar rows, avatars, calendar cells               |
| `--density-28`              | 24      | 28      | 36       | Tabs and segmented items, sub-rows, chips           |
| `--density-24`              | 20      | 24      | 28       | Badges, row actions, dialog padding                 |
| `--density-20`              | 16      | 20      | 24       | Switch track, Kbd                                   |
| `--density-16`              | 12      | 16      | 20       | Button padding, card spacing, dialog and sheet gaps |
| `--density-12`              | 10      | 12      | 14       | Tab, accordion, table and popover padding           |
| `--density-10`              | 8       | 10      | 12       | Input, select, toggle and badge padding             |
| `--density-8`, `-6`, `-4`   | 6, 4, 2 | 8, 6, 4 | 10, 8, 4 | Row padding and gaps, button gaps, track padding    |
| `--density-text-32` / `-24` | 28 / 20 | 32 / 24 | 36 / 28  | Card values / small card values                     |
| `--density-text-16` / `-14` | 15 / 13 | 16 / 14 | 18 / 16  | Dialog and card titles / small card titles          |
| `--density-text-13`         | 12      | 13      | 15       | Body and control text                               |
| `--density-text-12` / `-11` | 12 / 11 | 12 / 11 | 13 / 12  | Captions, labels, errors / shortcuts, Kbd           |
| `--density-icon-18`         | 16      | 18      | 20       | Icons in a card's item list                         |
| `--density-icon-16` / `-14` | 14 / 12 | 16 / 14 | 18 / 16  | Icons / small chevrons and separators               |

- **Never write a fixed control size.** Derived geometry is a `calc()` of tokens (an inline addon sits `(group height − content height) / 2` from the edge; a menu inset is two row paddings plus an icon).
- **`size` pins a density:** `sm` adds `density-compact`, `lg` adds `density-spacious`; the default follows the region. Button `xs` is a fixed 24px floor.
- **Containers** (card, item, avatar, sidebar rows) take their sizes as steps of the scale, so they grow and shrink with it.
- **Portalled parts** (menus, select, combobox, popover, hover card, tooltip, dialog, sheet, drawer) read `useDensity()` from `DensityProvider` before the portal and set `data-density`, so a popup matches the region it opened from. A new overlay does the same. A bar or menu anchored to something other than a trigger (the editor's selection bar) opens in the top layer instead, through `popover="manual"`, where no parent crops it and it keeps its region. Toasts follow `<html>`.

### Shape

Every corner comes from a radius role (`registry/fabricator/radius.ts`), never `rounded-lg` or a literal: the look's shape (Rounded, Squircle, Pill) sets each role, and the control corner follows the density's control height, so `size="sm"` and `size="lg"` stay proportional.

| Role    | Class                        | For                                                                                              |
| ------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Control | `rounded-(--radius-control)` | Single-line controls and their highlights: button, input, select trigger, badge, toggle, tooltip |
| Surface | `rounded-(--radius-surface)` | Containers: popover, menu, dialog, alert, toast, code block, kanban card                         |
| Card    | `rounded-(--radius-card)`    | `Card` (`--radius-card-sm` on `size="sm"`, `--radius-card-inner` for a tray's panel)             |
| Panel   | `rounded-(--radius-panel)`   | Large frames: App Shell inset and panels, sheet and drawer edges                                 |
| Mark    | `rounded-(--radius-mark)`    | Small parts: checkbox, kbd, inline marks, chart and event chips                                  |

**Layers are concentric: an inner corner is the outer one minus the gap between their edges.** `rounded-(--radius-nested)` is a row in a `p-1` popup (surface − 4px), `rounded-(--radius-inner)` a part inside a control (control − `--density-4`), and `rounded-(--radius-wrap)` a track hugging its controls with `p-(--density-4)` (control + `--density-4`). Any other gap writes the same sum inline, `rounded-[max(var(--radius-mark),calc(var(--radius-surface)-var(--density-6)))]`, with the gap equal on both axes at that corner. A Fluid Hover highlight in a popup takes the rows' corner through `[--fluid-hover-radius:var(--radius-nested)]` on the popup. Switches, avatars, status dots and slider thumbs are `rounded-full` in every shape. `__tests__/radius-usage.test.ts` fails on rungs and literal radii in the style maps.

### Typography and weight

Inter with its optical-size axis; `font-medium` is 450 and `font-semibold` 550.

| Role     | Size                                       | Where                                                     |
| -------- | ------------------------------------------ | --------------------------------------------------------- |
| Title    | `--density-text-16`, bold, `leading-tight` | Dialog titles                                             |
| Card     | `--density-text-16`, medium                | `CardTitle` (the 14 step on `size="sm"`)                  |
| Metric   | `--density-text-32`, semibold, tabular     | `CardValue` (the 24 step on `size="sm"`)                  |
| Subtitle | `--density-text-14`, medium                | Alert and popover titles; the command input               |
| Body     | `--density-text-13`                        | Controls, labels, menus, cells, descriptions              |
| Caption  | `--density-text-12`, muted                 | Group labels, badges, tooltips, field help and errors     |
| Shortcut | `--density-text-11`                        | Kbd, menu shortcuts                                       |
| Document | 14, 16 or 18, fixed                        | Markdown, Editor, chat bubbles; never follows the density |

- **Hover changes colour (muted → foreground) and icon stroke (1.5 → 2); weight changes only for persistent state** (checked, selected, open). For a weight change that must not shift layout, use `weight-normal|medium|semibold|bold` with `transition-[font-variation-settings]` (`weight-normal data-checked:weight-semibold`).
- Text inputs are `text-base md:text-(length:--density-text-13)` so iOS doesn't zoom into them.
- Figures that update or sit in columns use `tabular-nums`. `text-box-trim` centres text optically in fixed-height controls. Sentence case, no tracking on labels.

### Motion

By role, never milliseconds. Every animation belongs to a role whose tokens the speed retimes.

| Role                                 | Covers                                             | Use                                         |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------- |
| feedback                             | Hover, colour, focus, icon stroke, weight          | `duration-feedback ease-feedback`           |
| press                                | Buttons and toggles while held (to 0.97)           | `motion-press`                              |
| glide                                | The fluid hover highlight's fade                   | `duration-glide ease-enter`                 |
| move                                 | Indicators, thumbs, checkmarks, progress, widths   | `duration-move ease-move`                   |
| tooltip, popup, dialog, sheet, toast | Each surface's whole enter and exit recipe         | `motion-<surface>`, `motion-scrim`          |
| disclosure                           | Collapsible panels                                 | `motion-disclosure`                         |
| bounce                               | Layout that should feel physical (accordion items) | `motion-bounce`, `ease-bounce`              |
| settle                               | Layout that follows the pointer without a wobble   | `duration-settle ease-settle`               |
| reveal                               | Charts and Text Motion playing in, once            | read from `--motion-reveal`                 |
| springs                              | What follows the pointer or can be interrupted     | `--motion-spring-<name>`, `spring-model`    |
| spring in CSS                        | A transition that only starts and lands            | `duration-<name>-spring ease-<name>-spring` |
| stagger                              | Menu rows entering one after another               | `motion-stagger`                            |

- Speeds `smooth`, `default`, `snappy`, `instant` via `data-motion` on any element; `off` stops motion; `--motion-scale` multiplies every duration. A JavaScript tween reads the tokens from its element so a scoped speed retimes it.
- Ease-out for what enters or leaves, ease-in-out for what moves, plain `ease` for colour. Exits are about 30% quicker (`duration-<role>-exit`). Popups grow from their trigger (`origin-(--transform-origin)`), dialogs from the centre, nothing from below 0.9.
- Animate `transform` and `opacity`. Widths animate only where deliberate (panels, Search), on the move timing.
- Springs never drive what overshooting would break: a closing gap would overlap and a chevron would wobble.
- Reduced motion keeps fades and drops slides, zooms, blur and the press; the foundations handle it when you use the roles.
- An arbitrary transition uses `calc(var(--motion-<role>) * var(--motion-scale, 1))`.

### Fluid hover

One `bg-hover` highlight glides to the item nearest the pointer (no dead zones; a click in a gap goes to the lit item), and a `bg-active` selection slides between selected items. Both travel on the `lead` and `trail` springs, one per edge, so they stretch toward the next item and keep their velocity when the target changes. The primitive's keyboard highlight moves the same highlight. Any list of alternatives uses it: menus, select, combobox, command, tabs, tab strip, toggle groups, sidebar, accordion triggers, table rows, file tree. Skip it where items are far apart or a wrong click would hurt.

```tsx
import { FluidHoverHighlight, FluidHoverSelection, useFluidHover, useMergedRef } from "@/registry/bases/<base>/lib/fluid-hover"

const fluid = useFluidHover<HTMLDivElement>({
  items: '[role="menuitem"]',         // items inside the container
  highlighted: "[data-highlighted]",  // the primitive's keyboard highlight (optional)
  selected: "[data-checked]",         // gets the sliding selection (optional)
  axis: "y",                          // "x" strips, "xy" grids, "auto" follows orientation
})
const mergedRef = useMergedRef(fluid.attach, ref)

<Primitive.Container ref={mergedRef} {...fluid.props} {...props}>
  <FluidHoverSelection selection={fluid.selection} />
  <FluidHoverHighlight hover={fluid.hover} />
  {children}
</Primitive.Container>
```

- The container's rule makes it `relative isolate`; the overlays sit under the items. It gets `data-fluid-hover`; the lit item gets `data-fluid-hover-active`.
- Items keep a fallback hover and drop it inside a fluid container: `data-highlighted:bg-hover in-data-[fluid-hover]:data-highlighted:bg-transparent`. The lit item: `data-fluid-hover-active:text-foreground data-fluid-hover-active:[&_svg]:stroke-2`.
- One container per group: split a list at its separators so the highlight never crosses groups. A submenu has its own.
- Disabled items are skipped. Reduced motion keeps the fades and drops the travel.
- A menu popup that can open submenus also merges `useSubmenuAim()` (`shared/hooks/use-submenu-aim.ts`) into the same ref, so the rows the pointer crosses on its way to an open submenu don't take over. It works on every base through the trigger's `aria-controls`; the Radix sub trigger ignores the leave it replays.

### Cursors

The cursor says what a press will do, set in the style map: `pointer` on anything that activates on click (buttons, toggles, tabs, triggers, every menu and list row, checkable labels, calendar days); `text` on text entry; `grab` → `grabbing` on what you drag; `ew-resize` or `col-resize` on resize edges; `not-allowed` on disabled controls that keep pointer events; `default` on everything else. Upstream marks menu rows `cursor-default` inline; overrides drop it.

### Icons, scrollbars, rendering, sounds

- **Icons:** registry source uses `<IconPlaceholder lucide="…" tabler="…" hugeicons="…" phosphor="…" remixicon="…" />` with all five filled; the CLI swaps in the project's library. Components size their icons (`[&_svg:not([class*='size-'])]:size-(--density-icon-16)`), rest them at `stroke-[1.5]` and colour them with their label. Icon slots take `data-icon="inline-start" | "inline-end"`; icon props take components (`icon={CheckIcon}`).
- **Scrollbars:** a region that scrolls uses `ScrollArea` or `scroll-fade` / `scroll-fade-x` on its edges; `no-scrollbar` hides a strip's bar. Touch keeps native scrolling.
- **Rendering:** no half-pixel transforms at rest (centre dialogs with `inset-0 m-auto h-fit`, not `translate(-50%)`); measure positions in whole pixels (`offsetTop`).
- **Sounds and haptics:** `<SoundEffects />` picks a sound from `data-slot`, the ARIA role or `data-sound`, so a component that uses standard slots and roles needs nothing. A new family adds a synthesis recipe to `sound-recipes.ts`, with its haptic in `sounds-model.ts`; never an audio file.

## Responsive and input

Design the phone first and widen it. A component adapts to the room it is given, because the same component sits in a full page, a narrow card, a side panel and a phone.

- **Respond to the container, not the window.** A component that lays out its own parts by width names a container (`@container/<name>`) and uses container variants (`@md:flex-row`): the App Shell, its panels, Chat Input, the pie and donut charts. Viewport breakpoints (`sm:`, `md:`) are only for what depends on the screen itself: a dialog's maximum width, the iOS input zoom, a sheet's width.
- **Measure only when CSS can't decide,** with a `ResizeObserver`, and let container queries cover the first paint.
- **Never let content break the frame.** `min-w-0` on flexible children, `truncate` on names with the full value in a tooltip; numbers, dates and statuses never truncate. Prose takes `text-balance` (headings) or `text-pretty`. A strip that can overflow scrolls sideways with `scroll-fade-x`; a toolbar of commands, which a mouse can't scroll, folds what doesn't fit into a menu (`getToolbarFit`). Test the longest name, the largest number and an empty value.
- **Pointer type, not screen size, decides input behaviour.** Hover is an enhancement: anything revealed on hover is also reachable by focus and on touch. Use `pointer-coarse:` and `pointer-fine:` for what differs (Data Table hides its resize affordances on coarse pointers; Questionnaire rows grow to `--density-48`). Targets are at least 24px at compact; touch-first regions take spacious density for 44px.
- **Phone forms are the component's job.** A surface that can't fit takes its phone form itself (the App Shell's panels become a bottom drawer and its actions fold into one menu; the sidebar moves behind the page). Consumers never write a second component for phones.
- **Left to right only:** no RTL docs, demos or checks, but write logical utilities (`ms-*`, `ps-*`, `start-*`, `text-start`) and keep upstream's `cn-rtl-flip` markers, so RTL can come later.
- **Desktop windows:** components work in Electron and Tauri unchanged. A component that owns window chrome (the App Shell's title bar) marks drag regions with `app-region: drag` and every control inside with `no-drag`, and finds its window through the `desktop-window` item. CDP clicks skip the native hit test, so prove a window control by auditing its `app-region` rects.

## Platforms

Each web component has a React Native item under the same name. What a platform lacks is recorded, never silent.

| Platform                     | Source               | Parity                                                 |
| ---------------------------- | -------------------- | ------------------------------------------------------ |
| Web, desktop, Tauri mobile   | The three base trees | Base parity (contract 5); desktop and Tauri reuse them |
| React Native (Expo, Uniwind) | `registry/native/`   | Same API as web (contract 9), `native:parity --strict` |

### React Native

Read [`registry/native/README.md`][native-readme] before writing native source. The essentials:

- **The web API is the contract,** Base UI's flavour of it: same named exports, `variant` and `size` values, declared props, `data-slot`s and placeholder names. `onClick` becomes `onPress`. Native may add, never rename. A real exception is a dated entry in `registry/native/parity-exceptions.json`.
- **Same tokens, smaller CSS.** Rules go in `registry/styles/native/<name>.css` with the web file's reasoning. `hover:`, `group-*`, `has-*`, `in-*`, `peer-*`, `before:`, `after:` and `[&_svg]:` don't exist: pass state through context and `data-*` props, turn hover into `active:`, and add `-text` placeholders for text colour (text style doesn't inherit).
- **Text only inside `Text`** from `ui/text`; parts holding children call `renderTextChildren`; text colour that follows state uses `<TextStyle eases>`.
- **Motion through hooks:** `useMotion(role)`, `useSurfaceAnimation`, `usePressScale`; eased fills with `PressWash` and `StateFill`, because `active:` snaps.
- **Fluid hover on touch:** a press lights the row, a drag moves the highlight where `track` is set, and lists that scroll wait 90ms before lighting (`FluidHoverList`, `FluidHoverScrollList`, `useFluidRow`).
- **Sizes for the device:** a phone's default is 44pt controls and 15pt text, a tablet's 40pt; `size` goes through `useControlSize`, and small controls reach 44pt through `getTouchSlop`. `md:` (768pt) is the tablet layout.
- **Overlays** read `useDensity()` before the portal, wrap content in `DensityScope`, and handle Android back and outside press.
- Icons import from `@fabricator-ui/icons-react-native` by value. Native source never imports from `demos/react-native`.

## Accessibility

- Keyboard and ARIA come from the primitive; keep them intact by composing, not wrapping. A custom interactive component implements its WAI-ARIA Authoring Practices pattern in full: roles, states, keys, focus management.
- `focus-visible:` ring placeholders on every interactive element; `aria-invalid:` styling on every form control; forms use `Field` / `FieldGroup` with `data-invalid`.
- Every control has a name: icon-only buttons an `aria-label`, sliders and switches a label, overlays a title (`sr-only` if hidden). Charts have a table for screen readers.
- Colour never carries meaning alone: pair it with an icon, a sign or text.
- Motion honours `prefers-reduced-motion` through the motion roles or `motion-safe:` / `motion-reduce:`.
- Native: `role`, `aria-checked`, `aria-expanded` and friends on every part; `accessibilityLabel` on a `Pressable` with no text; VoiceOver and TalkBack checked on devices.

## Examples, blocks and the site

- Colour from semantic tokens (`bg-primary`, `text-muted-foreground`); one class covers light and dark. A variant first, then tokens, then new CSS variables. `className` on library components is for layout.
- Gaps through flex and grid; `size-10` for equal sides; `truncate` for one-line overflow; `cn()` for conditional classes.
- Items sit in their group (`SelectGroup`, `CommandGroup`, …). Dialog, Sheet and Drawer always have a Title. Cards use Header, Title, Description, Content and Footer. Use `Alert`, `Empty`, `Skeleton`, `Badge` and `Avatar` + `AvatarFallback` for their roles.
- Loading buttons: `Spinner` + `data-icon` + `disabled`. Loading text: `shimmer`. Scroll edges: `scroll-fade`. Toasts: `toast` on Base UI, Sonner on Radix and Aria. Overlays manage their own stacking.
- Examples show every variant, size and state (disabled, invalid, loading, controlled, open from state) with real content from the Fabricator identity (`scripts/rebrand.ts`), and follow [`DESIGN.md`](DESIGN.md).
- Screen blocks (`registry/fabricator/shared/blocks/<name>/`) compile once per base, so shared files use only APIs the three bases share. Parts that differ (triggers, `ToggleGroup`, `Select`, `Tabs` state, `Checkbox`, `Switch`) go in `registry/fabricator/{base,radix,aria}/blocks/<name>/` under the same path. A form disables its controls while it submits with a disabled `<fieldset className="contents">`, because Aria's `Button` takes `isDisabled`.

## Dependencies

- Reuse upstream's: `radix-ui`, `@base-ui/react`, `react-aria-components`, `cmdk`, `vaul`, `sonner`, `react-day-picker` + `date-fns`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `motion`.
- Fabricator's own, each behind its component's files: `@tanstack/react-table` and `@tanstack/react-virtual` (Data Table), `@fullcalendar/react` with `temporal-polyfill` and `@date-fns/tz` (Event Calendar), `@xyflow/react` (Canvas, its structural CSS imported into the `base` layer by the item) and `@dagrejs/dagre` (Canvas Layout), `d3-scale`, `d3-shape` and `d3-hierarchy` (inside the chart models only).
- A new runtime dependency needs a written reason in the PR: size, maintenance, licence, React 19 support, and its native equivalent. Pin only where upstream pins. Base primitives belong on the base's `index` / `style` item. Different dependencies per base go in `meta.baseRegistryDependencies`.
- Web drag sensors go through `lib/sortable.tsx`. Kanban resolves card placement against its own scroll viewport, from `kanban-model`. Shared files that need popups describe them as data for `components/property-controls.tsx`, which each base draws with its own parts. React Native uses its own drag adapter, and both platforms offer move actions.

## Seeing a change

The site renders the Fabricator style, so it shows what `add` installs.

- **CSS loop:** edit `registry/styles/fabricator/<name>.css`, run `bun run registry:build --examples` in `apps/web`, open `/view/base-fabricator/<name>-example`. It hot-reloads.
- **Compiled loop** (overrides, docs pages): `scripts/build-fabricator.sh [base|radix|aria|all]` in `apps/web` rebuilds `styles/*-fabricator` under a lock, safe with parallel workers.
- **Native:** `bun run registry:native --check <names>` compiles without writing; `bun run demo react-native:ios` runs the explorer.
- If the dev server can't resolve a generated file that exists, stop it, delete `apps/web/.next/dev`, restart. Every style folder the site renders needs an `@source` line in `app/globals.css`.
- Check light and dark, each density and motion speed the change affects, keyboard only, a phone width and a wide desktop. Recapture visible changes: `bun run registry:capture --force && bun run pages:capture` in `apps/web`, dev server running.

## Known deviations

Places where the code breaks a rule above. Fix the code, then delete the line; a new deviation is added here with its reason.

- `AppShellPageTitle` is a fixed `text-2xl` (24px), outside the density scale. Pick one page-title size and give it a token.
- Navigation menu triggers keep the source's fixed `h-9`, so they ignore density, and the Radix navigation menu override doesn't read `useDensity()`.
- Fixed sizes the density test misses: the Empty description (`text-[13px]/relaxed`), and svg `size-3` in badge, kbd and avatar. Extend `density-usage.test.ts` to catch them.
- `native-select.css` and `chart.css` style excluded items. Delete them, or note why they stay until Chart returns.
- `bg-tint`, `bg-tint-hover` and `bg-selected` are defined but used by no style map.
- Raw colours, kept because the control sits on arbitrary content no token stays legible on: the Video Player's chrome (white on black scrims), Image Compare's line, knob and labels (white), the Color Picker's thumb edges and hue track. Rating's default stars are `amber-400` because a score reads as yellow whatever the palette; a `--rating` token would let a project retune it.

## Done when

Report each applicable line as passed, or name what wasn't run and why.

- [ ] Every base tree has the change, the look is in the style map with its why-comments, and no rule writes a fixed size, colour or duration.
- [ ] Logic lives in a tested model; `bun run check` and `bun run test` pass.
- [ ] A full `bun run registry:build` ran; `shadcn add --dry-run` succeeds against the local registry for each base; `bun run test:parity` passes when upstream-derived source, a style map or the build script changed.
- [ ] Examples cover every variant, size and state; new ones are named `<component>-example` or `<component>-<intent>` and indexed with `registry:build --examples`.
- [ ] Each base has a docs page in `apps/web/content/docs/` with Preview, Installation (CLI + Manual), Usage, Composition, Examples, API reference and Accessibility.
- [ ] Seen in the running site: light and dark, each affected density and motion speed, keyboard only, phone and desktop widths, the longest and empty content, axe clean.
- [ ] The native item follows, or a dated `parity-exceptions.json` entry explains why; `bun run native:parity` passes and the demo was checked on the iOS Simulator and Android Emulator ([PLATFORMS.md](docs/PLATFORMS.md#done-when)).
- [ ] A new component has a group and, unless the homepage leaves its kind out, a catalog card ([COMPONENT-GROUPS.md](docs/COMPONENT-GROUPS.md#adding-a-component)).
- [ ] A new component or variant appears where [`DESIGN.md`](DESIGN.md) chooses between components, keeping it within one agent read (about 25,000 tokens).
- [ ] A changed foundation rule is updated in this file; a user-visible change has a section in `apps/web/content/docs/changelog/unreleased.mdx` and its slug in that page's `new` or `updated` frontmatter.
