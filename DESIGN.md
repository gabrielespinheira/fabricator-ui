---
version: alpha
name: Fabricator UI
description: >-
  Calm, precise interfaces for apps, dashboards and websites: neutral surfaces
  lifted by shadow, colour kept for meaning, and size and motion set per region.
  Values are the light theme at the default look. Dark mode and every look
  setting (surface tint, colour roles, radius, density, motion) come from the
  same CSS variables.
colors:
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  primary-text: "oklch(0.205 0 0)"
  secondary: "color-mix(in srgb, oklch(0 0 0) 8%, oklch(0.985 0 0))"
  secondary-foreground: "oklch(0.205 0 0)"
  neutral: "oklch(0.985 0 0)"
  background: "oklch(0.985 0 0)"
  foreground: "oklch(0.205 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "color-mix(in srgb, oklch(0.205 0 0) 12%, oklch(0.985 0 0))"
  surface-1: "oklch(0.985 0 0)"
  surface-2: "oklch(0.991 0 0)"
  surface-3: "oklch(1 0 0)"
  surface-4: "oklch(1 0 0)"
  surface-5: "oklch(1 0 0)"
  hover: "color-mix(in srgb, oklch(0 0 0) 4%, oklch(0.985 0 0))"
  active: "color-mix(in srgb, oklch(0 0 0) 7%, oklch(0.985 0 0))"
  track: "color-mix(in srgb, oklch(0.205 0 0) 5%, oklch(0.985 0 0))"
  focus-ring: "oklch(0.693 0.161 265.2)"
  info: "oklch(0.48 0.18 260)"
  info-text: "oklch(0.45 0.153 260)"
  info-surface-1: "oklch(0.97 0.035 260)"
  success: "oklch(0.48 0.13 150)"
  success-text: "oklch(0.45 0.1105 150)"
  success-surface-1: "oklch(0.97 0.035 150)"
  warning: "oklch(0.48 0.1 70)"
  warning-text: "oklch(0.45 0.085 70)"
  warning-surface-1: "oklch(0.97 0.035 70)"
  destructive: "oklch(0.48 0.19 25)"
  destructive-soft: "color-mix(in srgb, oklch(0.48 0.19 25) 12%, oklch(0.985 0 0))"
  destructive-text: "oklch(0.45 0.1615 25)"
  destructive-surface-1: "oklch(0.97 0.035 25)"
typography:
  hero:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: 450
    lineHeight: 1.06
    letterSpacing: -0.022em
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: -0.025em
  page-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: -0.025em
  title:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 700
    lineHeight: 1.25
  subtitle:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 450
    lineHeight: 1.4
  lead:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 450
    lineHeight: 1.5
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  control: 0.5rem
  container: 0.7rem
  checkbox: 6px
  pill: 1.25rem
  full: 9999px
spacing:
  unit: 4px
  control-height: 36px
  control-padding: 12px
  row-padding: 8px
  gap: 8px
  card-padding: 16px
  dialog-padding: 24px
  section-gap: 32px
  page-padding: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 36px
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 36px
  button-ghost:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.control}"
    height: 36px
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.foreground}"
  button-destructive:
    backgroundColor: "{colors.destructive-soft}"
    textColor: "{colors.destructive-text}"
    rounded: "{rounded.control}"
    height: 36px
  link:
    textColor: "{colors.primary-text}"
  input:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: 36px
    padding: 12px
  field-error:
    textColor: "{colors.destructive-text}"
    typography: "{typography.caption}"
  card:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.container}"
    padding: 16px
  popover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.container}"
    padding: 4px
  menu-item:
    textColor: "{colors.muted-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    height: 36px
    padding: 8px
  menu-item-highlighted:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.foreground}"
  dialog:
    backgroundColor: "{colors.surface-5}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.container}"
    padding: 24px
  dialog-title:
    typography: "{typography.title}"
  tooltip:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.background}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
  tabs-list:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.container}"
    height: 36px
    padding: 4px
  tabs-trigger:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.control}"
    height: 28px
  tabs-trigger-active:
    backgroundColor: "{colors.surface-4}"
    textColor: "{colors.foreground}"
  sidebar:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
  sidebar-row:
    rounded: "{rounded.control}"
    height: 32px
    padding: 8px
  sidebar-row-active:
    backgroundColor: "{colors.active}"
    textColor: "{colors.foreground}"
  badge:
    backgroundColor: "{colors.active}"
    textColor: "{colors.foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.control}"
    height: 24px
  badge-success:
    backgroundColor: "{colors.success-surface-1}"
    textColor: "{colors.success-text}"
  alert:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.container}"
    padding: 16px
  alert-info-high:
    backgroundColor: "{colors.info-surface-1}"
    textColor: "{colors.info-text}"
  alert-warning-high:
    backgroundColor: "{colors.warning-surface-1}"
    textColor: "{colors.warning-text}"
  alert-error-high:
    backgroundColor: "{colors.destructive-surface-1}"
    textColor: "{colors.destructive-text}"
  status-icon-info:
    textColor: "{colors.info}"
  status-icon-success:
    textColor: "{colors.success}"
  status-icon-warning:
    textColor: "{colors.warning}"
  switch-on:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.checkbox}"
  status-icon-error:
    textColor: "{colors.destructive}"
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.foreground}"
  app-shell-frame:
    backgroundColor: "{colors.surface-1}"
  app-shell-main:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.container}"
  focus-ring:
    backgroundColor: "{colors.focus-ring}"
  separator:
    backgroundColor: "{colors.border}"
    height: 1px
---

# Fabricator UI

The design system for products built with Fabricator UI. Read it before you design or write a screen, and check the finished screen against [the review checklist](#review-checklist).

**Using it in your project:** copy this file to the root of a project that uses Fabricator UI. Rewrite the Overview for your product and set your brand through the look (see [Brand colour](#brand-colour)); keep the rules.

**Tokens and code.** The YAML above is for tools that read DESIGN.md; the translucent overlays (`hover`, `active`, `secondary`, `border`, `track`, `destructive-soft`) are written there as their mix over the page. In code every value is a CSS variable with a Tailwind utility (`bg-surface-3`, `bg-hover`, `h-(--density-36)`, `duration-move`), and the installed components already use them. Write the utility; the value comes from the project's look, theme and density.

Examples import from `@/components/ui/*` and use the Base UI base. Read the project's real aliases and base from `npx fabricator-ui@latest info --json`; where Radix or React Aria differ, the [Components](#components) section says so.

## Overview

Fabricator interfaces are calm and exact. They feel like well-made tools: neutral surfaces, one clear action, quiet chrome and the content in front. Colour carries meaning (the main action, a selection, a status), so it stays rare and reads at once. Depth comes from surfaces lifted by shadow. Motion confirms what happened and gets out of the way. Every size follows the density of the region it sits in.

### Product modes

Pick the mode for the product, then for each region that differs (a marketing page inside an app, a dense table inside a spacious page).

| Mode    | For                                     | Density    | Motion             | Frame                                                       |
| ------- | --------------------------------------- | ---------- | ------------------ | ----------------------------------------------------------- |
| App     | Product UI people use every day         | `default`  | `default`/`snappy` | App Shell                                                   |
| Tool    | Dashboards, admin, editors, dense data  | `compact`  | `snappy`/`instant` | App Shell, compact toolbars and tables                      |
| Website | Marketing, landing pages, docs, pricing | `spacious` | `smooth`           | Site header with Navigation Menu, centred content, no shell |

Set both on `<html>` for the whole product (`<html data-density="compact" data-motion="snappy">`), or on the region.

### Principles

1. **Compose, then configure.** Reach for the component, then its variant and size props. `className` places a component (width, margin, grid placement); the component owns its colour, type, radius, spacing and states.
2. **One primary action per region.** The `default` button marks what the region is for. Everything else is `secondary`, `outline` or `ghost`.
3. **Hierarchy from surface, weight and muted text.** Elevation separates layers, `text-muted-foreground` steps content back, size and weight make titles. Colour and borders come last.
4. **The region decides the size.** Density is set on a container and every component inside follows it. A component pins its own size only when it must differ from its neighbours.
5. **Every view has all its states.** Loading, empty, error, partial and disabled are designed together with the happy path, each with its own component (see [States](#states)).
6. **Keyboard is a first-class pointer.** Every action is reachable from the keyboard, focus is always visible, and frequent actions have shortcuts shown with `Kbd`.
7. **Motion by role.** Custom UI moves with the same role utilities as the components, so one speed setting retimes the whole product.

### Before you build

1. Read the project: `npx fabricator-ui@latest info --json` gives the base (`base`, `radix` or `aria`), the icon library, the aliases and the installed components.
2. Set the mode: density and motion on `<html>` or the region.
3. Start from a block when one fits (see [Patterns](#patterns)), then delete what the product doesn't need.
4. Install what is missing with `npx fabricator-ui@latest add <name>`, and read each component's docs before writing with it: `npx fabricator-ui@latest docs <name>`, or any docs page with `.md` appended.

## Colors

Every colour comes from three layers: neutral surfaces, translucent interaction overlays, and six colour roles. Each layer is a CSS variable with a utility. Write the utility; tokens hold both themes.

### Neutrals

| Utility                    | Use                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `bg-background`            | The page (surface 1)                                                                                  |
| `text-foreground`          | Primary text: headings, values, labels the person acts on                                             |
| `text-muted-foreground`    | Secondary text: descriptions, captions, metadata, placeholders, resting list labels, icons by a label |
| `border-border`            | Hairlines: `Separator`, table rows, outline frames (12% of the foreground)                            |
| `bg-hover`                 | Hover wash and the Fluid Hover highlight (4% black, 6% white in dark)                                 |
| `bg-active`                | Pressed, selected rows, toggled on (7% black, 10% white)                                              |
| `bg-selected`              | A selection that must stay opaque                                                                     |
| `bg-tint`, `bg-tint-hover` | A stronger translucent fill (8% black, 25% white in dark), as in the neutral secondary button         |
| `ring-ring`                | The focus blue, the same in both themes and every palette                                             |

Text uses two neutral steps, `text-foreground` and `text-muted-foreground`. A third level of hierarchy comes from size or weight.

The overlays are translucent, so a hover or selection reads the same on every surface level.

### Colour roles

| Role          | Means                                   | Shows in                                                                                                    |
| ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `primary`     | The main action, and "on" or "selected" | Default button, links, checked checkbox and radio, switch on, progress, slider range, selected calendar day |
| `secondary`   | A soft second action                    | Secondary button (a translucent tint)                                                                       |
| `info`        | Neutral information                     | Alerts, badges, toasts                                                                                      |
| `success`     | Done, healthy, positive change          | Alerts, badges, toasts                                                                                      |
| `warning`     | Needs attention soon                    | Alerts, badges, toasts                                                                                      |
| `destructive` | Error, invalid, irreversible            | Destructive button and menu items, invalid fields and their messages, error alerts, badges and toasts       |

Primary and secondary are neutral until the project picks a hue: primary is the foreground colour (near black in light, near white in dark), so a default Fabricator product is black and white with status colour only. `error` is another name for `destructive` (`<Alert variant="error">`, `<Badge variant="error">`, toast type `error`).

Every role has the same tokens:

| Utility                                      | Use                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `bg-<role>`, `text-<role>`, `fill-<role>`    | The fill: buttons, checked controls, icons, dots                      |
| `text-<role>-foreground`                     | Text and icons on the fill                                            |
| `text-<role>-text`                           | Coloured text on any surface (AA on every level, tinted or not)       |
| `border-<role>-border`, `ring-<role>-border` | Hairlines                                                             |
| `bg-<role>-surface-1` … `8`                  | Tinted surfaces, paired with `shadow-surface-N` like the neutral ones |

States are opacity steps of the fill, the same for every role: solid `bg-<role> hover:bg-<role>/90 active:bg-<role>/80`; soft `bg-<role>/12 text-<role>-text hover:bg-<role>/16 active:bg-<role>/20`.

How to use them:

- **Status comes from components first:** `<Badge variant="success">`, `<Alert variant="warning" contrast="high">`, toast types. Hand-built status UI uses the role tokens above.
- **Coloured text is `text-<role>-text`.** The fill colour (`text-<role>`) is for icons, dots and checked marks, which need 3:1.
- **A status colour always means its status.** Brand accents and decoration use primary or secondary.
- **Colour never carries meaning alone.** A trend pairs `text-success-text` with an arrow icon; an invalid field pairs its red ring with a message.
- **Status families are fixed:** info stays blue (hue 215–275), success green (125–175), warning orange to yellow (45–100), destructive red to orange (10–50). The CSS clamps them.

### Brand colour

A brand enters through the look, never through raw hex values on the theme tokens (`--primary`, `--background`, …):

- `--primary-hue` and `--primary-chroma` (and the same pair for `secondary` and each status) set a role; every fill, text, border, surface and state is calculated from them and contrast-tested.
- `--surface-hue` and `--surface-chroma` (0 to 0.04) tint the neutral surfaces.
- The [Get started page](https://fabricator-ui.vercel.app/create) writes these into the install command (`init`), together with radius, density and motion. The [Colors page](https://fabricator-ui.vercel.app/docs/foundations/colors#in-your-project) gives the CSS to paste into an existing project, which also points `--primary`, `--background` and the other theme tokens at the recipes.

### Dark mode

`.dark` on `<html>` switches every token. One class covers both themes (`bg-primary`, `text-muted-foreground`). The one place a `dark:` class belongs is a hand-built tinted status panel, which steps up the ladder in dark so the tint reads: `bg-<role>-surface-1 dark:bg-<role>-surface-3`. Prefer `<Alert contrast="high">`, which already does it.

### Charts

The `@fabricator` registry has no Chart component for now, and `chart-1` … `chart-5` are a neutral ramp. Show numbers with stat cards, tables, `Progress` and role-coloured text. Install the base chart (`npx fabricator-ui@latest add chart --upstream`) only after the user asks for it.

## Typography

Inter, the variable font with its optical size axis (`next/font`: `axes: ["opsz"]`), as `font-sans`. Code, keys and IDs use `font-mono`. In the Fabricator palette `font-medium` is 450 and `font-semibold` 550, because Inter's variable weights read heavier than their numbers.

| Role     | Size (default density) | Weight           | Classes for your own markup                                                        | Use                                                                               |
| -------- | ---------------------- | ---------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Hero     | 48px, 60px from `sm`   | medium, -0.022em | `text-5xl sm:text-6xl font-medium tracking-[-0.022em] leading-[1.06] text-balance` | The one headline of a website page                                                |
| Display  | 28px                   | semibold, tight  | `text-[28px] font-semibold tracking-tight`                                         | Page titles outside the App Shell; inside it, `AppShellPageTitle` (24px semibold) |
| Title    | 16px                   | bold             | `text-(length:--density-text-16) font-bold`                                        | Dialog titles, section headings                                                   |
| Subtitle | 14px                   | medium           | `text-(length:--density-text-14) font-medium`                                      | Card titles, group headings                                                       |
| Lead     | 15px                   | regular, muted   | `text-[15px] text-muted-foreground text-balance`                                   | The paragraph under a hero or page title                                          |
| Body     | 13px                   | regular          | `text-(length:--density-text-13)`                                                  | Controls, menus, body copy                                                        |
| Caption  | 12px                   | regular, muted   | `text-(length:--density-text-12) text-muted-foreground`                            | Descriptions, group labels, errors, metadata                                      |

Components set their own type; this table is for headings and copy you write around them. Body, caption, subtitle and title follow the density (12/13/15px body from compact to spacious) when written with the `--density-text-*` tokens.

- **Weight is state.** Hover changes colour (muted to foreground) and icon stroke; weight changes only for persistent state: checked, selected, an open accordion. Tabs never change weight: the active tab is its colour and pill. To change weight without shifting layout, use `weight-normal`, `weight-medium`, `weight-semibold` or `weight-bold` (weight paired with optical size) with `transition-[font-variation-settings]`: `weight-normal aria-pressed:weight-semibold`.
- **Two weights per view** is the norm: regular for text, medium or semibold for titles and values. Bold is for dialog titles.
- **Figures:** `tabular-nums` on numbers that update or line up (tables, counters, prices, timers, durations).
- **Long text:** paragraphs `max-w-prose text-pretty`, headings `text-balance`.
- **Fixed-height custom controls:** `text-box-trim` centres the text optically.
- Fabricator UI ships no prose styles: style articles and docs with the roles above.

## Layout

### Density

Density sizes every component: controls, menu and table rows, text, icons, padding and gaps.

|                                  | `compact`                    | `default`     | `spacious`                    |
| -------------------------------- | ---------------------------- | ------------- | ----------------------------- |
| For                              | Dashboards, toolbars, tables | Apps          | Websites, touch-first screens |
| Controls, menu and table rows    | 28px                         | 36px          | 44px                          |
| Body text                        | 12px                         | 13px          | 15px                          |
| Icons                            | 14px                         | 16px          | 18px                          |
| Padding: buttons / inputs / rows | 12 / 8 / 6px                 | 16 / 10 / 8px | 20 / 12 / 10px                |
| Card spacing                     | 12px                         | 16px          | 20px                          |

Set it, from the widest scope to the narrowest:

| Scope                      | How                                                                                                                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The whole product          | `<html data-density="spacious">`, or Density on the Get started page                                                                                                                                                               |
| A region that opens popups | `<DensityProvider density="compact">` (menus, selects, popovers and dialogs follow it)                                                                                                                                             |
| A region without popups    | `data-density="compact"` on any element (works in Server Components)                                                                                                                                                               |
| By breakpoint              | `density-compact`, `density-default`, `density-spacious` classes: `md:density-spacious`                                                                                                                                            |
| One control                | `size="sm"` (compact) on Button, Toggle, Toggle Group, Select trigger, Switch and Search; `size="lg"` (spacious) on Button, Toggle, Toggle Group and Search; `icon-sm`/`icon-lg` for icon buttons; `data-density` on anything else |

Your own components stay density-aware with the tokens, named after their default value: `h-(--density-36)`, `px-(--density-12)`, `gap-(--density-8)`, `text-(length:--density-text-13)`, `size-(--density-icon-16)`. The scale runs from `--density-4` to `--density-48`.

### Spacing

Components space their own insides. Between components, space follows a 4px grid with flex and grid gaps (`flex flex-col gap-4`), one step per relationship:

| Relationship                                   | App                 | Website                             |
| ---------------------------------------------- | ------------------- | ----------------------------------- |
| Controls in one row (a toolbar, a button pair) | `gap-2`             | `gap-3`                             |
| Fields in a form                               | `FieldGroup`        | `FieldGroup`                        |
| Cards in a grid, blocks inside a section       | `gap-4`             | `gap-6`                             |
| A heading and the content it introduces        | `gap-4`             | `gap-6`                             |
| Sections of a page                             | `gap-8` to `gap-10` | `py-16` to `py-24` per section      |
| Page padding                                   | `p-4 md:p-6`        | `px-6`, content `mx-auto max-w-6xl` |

Tighter space binds, more space separates: a label sits closer to its control than to the next field. Space does the grouping before a border or a card does.

### Widths

| Content                                   | Width                                                  |
| ----------------------------------------- | ------------------------------------------------------ |
| Forms, settings, single-column flows      | `max-w-2xl`                                            |
| Sign in, sign up, one-task cards          | `max-w-sm`                                             |
| Reading text                              | `max-w-prose`                                          |
| Tables, boards, editors, chat transcripts | The full width of the main column                      |
| App pages in `AppShellContent`            | `size`: `sm` (672px), `md` (896px), `lg` (1152px)      |
| Website hero headline / lead              | about `max-w-[16ch]` / `max-w-[540px]`, `text-balance` |

### The app frame

Apps live in `AppShell`: the Sidebar, a main column, side panels, one shortcut registry and a saved layout. It replaces the hand-built sidebar, header and panel layout, and it handles what those usually get wrong: phones, focus regions, persistence and desktop windows.

```text
AppShell
├── Sidebar variant="inset"       WorkspaceSwitcher, AppNav, UserMenu
├── AppShellMain
│   ├── TabStrip?                 document tabs
│   ├── AppShellHeader            AppShellBreadcrumb, AppShellHeaderActions, AppShellPanelTrigger
│   ├── AppShellContent           the only scroller; holds AppShellPageTitle and the page
│   ├── AppShellStatusBar?
│   └── AppNavBottomBar?          the phone tab bar
└── AppShellPanel*                AppShellPanelHeader + AppShellPanelView (or AppShellPanelContent)
```

- **Surfaces:** the frame and sidebar sit on surface 1, side panels on surface 2, and the main column is a surface-3 card (from `md`, with the inset sidebar). Retint them through `--app-shell-frame`, `--app-shell-panel` and `--app-shell-main`; the shell rebinds `--background` inside the main column and panels, so leave `--background` alone on the shell.
- **Header:** `AppShellBreadcrumb items={[…]}` (current page last; middle items fold into a menu past `maxItems`), and `AppShellHeaderActions actions={[…]} primaryAction={…}`, each action `{ id, label, icon, onSelect, shortcut }`. On phones the actions collapse into one menu and the primary action floats.
- **Content width:** `AppShellContent size="sm" | "md" | "lg"` centres the page in a column with the page's padding; left out, the page has the full width of the main column. Don't hand-roll `mx-auto max-w-*` inside it.
- **Page title:** `AppShellPageTitle` (an `h1`) at the top of `AppShellContent`. When it scrolls away, the header shows it in the breadcrumb's place.
- **Panels:** `AppShellPanel id="details" label="Details" views={[…]}`, opened by `AppShellPanelTrigger panel="details"`, last in the header so it holds the same spot to open and close, or `useShellPanel("details")`. They dock while the main column keeps `minMainWidth` (520px) and float as a sheet when it can't; on phones they become a drawer (`mobile="drawer"`), take the screen (`"swap"`) or hide (`"none"`). Width, view and open state are saved. On React Native a phone's panel has centred tabs under a grab handle and no close button (the handle, a swipe or the scrim closes it; `mobile="swap"` keeps full-width tabs and a close button), and its trigger draws a bottom panel instead of the docked toggle.
- **Breakpoints follow the shell's width,** not the viewport: below 768px the sidebar is a sheet and the header shows only the current page.
- **Shortcuts:** register app shortcuts with `useShellShortcut({ id, keys: "mod+k", label }, handler)`; `useShellShortcuts()` lists them all for the command palette. `mod` is ⌘ on Apple platforms and Ctrl elsewhere. F6 moves focus between the sidebar, tabs, content and panels.
- **Layout storage:** a cookie by default. With server rendering, read it and pass `defaultLayout`; in SPAs and desktop apps pass `storage={createLocalStorage()}`.
- **A shell inside a page** (a demo or a preview card): `storage={null} shortcut={null} shortcutScope="focus"` and a fixed height in `className`, because the root is `h-svh`.
- **Desktop apps** (Electron, Tauri) pass `window={{ controls: "macos", isTranslucent: true }}`: the top rows clear the traffic lights and get drag regions, and the frame shows the window's material.

Use a plain `SidebarProvider`, `Sidebar` and `SidebarInset` only for a screen that needs none of this.

### Responsive

- Build mobile first and widen with `sm:`, `md:`, `lg:`. Grids collapse to one column: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`.
- On phones the App Shell's Sidebar sits behind the page, which moves aside and shrinks to show it (`mobileSidebar="reveal"`, the default); a Sidebar on its own, or `mobileSidebar="sheet"`, is a sheet over the page. Long tasks on phones belong in a `Drawer`; a common pattern renders `Dialog` from `md` and `Drawer` below it.
- Touch-first screens use `spacious` (44px targets; on a React Native tablet that resolves to 40pt controls with a 44pt reach). `compact` keeps every target above the 24px minimum, so keep it for pointer-first tools.
- Fabricator UI is left to right only. Write logical utilities anyway (`ms-*`, `ps-*`, `start-*`, `text-start`).

## Elevation & Depth

Depth is an eight-level ladder of surfaces. Each level pairs a background with a shadow, and the shadow starts with a 1px ring that draws the edge, so surfaces have no borders.

| Level      | Classes                         | Holds                                                                                                                                                   |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | `bg-background`                 | The page and the app frame                                                                                                                              |
| 2          | `bg-surface-2 shadow-surface-2` | Sidebar (`bg-sidebar`; in an App Shell it sits on the frame), side panels, inset regions, the default Card                                              |
| 3          | `bg-surface-3 shadow-surface-3` | Raised cards, the App Shell main column (with the inset sidebar), menus, selects, popovers, hover cards, sheets, drawers                                |
| 4          | `bg-surface-4 shadow-surface-4` | The active tab and segmented selection (in dark, the active tab is a translucent step over the track instead); anything raised inside a level-3 surface |
| 5          | `bg-surface-5 shadow-surface-5` | Dialogs, alert dialogs, toasts                                                                                                                          |
| 6–8        | `bg-surface-N shadow-surface-N` | Rare: surfaces stacked above a dialog                                                                                                                   |
| (inverted) | `bg-foreground text-background` | Tooltips                                                                                                                                                |

In light mode levels 3 and up are all white and only the shadow shows the height; in dark mode each level is a step lighter. Scrims behind dialogs and sheets belong to those components.

- **Pair the two classes:** `bg-surface-N` with `shadow-surface-N`.
- **A child sits above its parent.** Wells and insets inside a raised surface (a code block in a dialog, a quiet area in a card) use `bg-hover`, which works on every level.
- **Status surfaces** use the same ladder tinted: `bg-<role>-surface-N shadow-surface-N`.

### Cards

A Card holds one discrete thing: a plan, a metric, a project, a group of settings. The sections of one page are separated by headings and space (and a `Separator` where space alone is not enough).

- Use the full structure: `CardHeader` (`CardTitle`, `CardDescription`, `CardAction` for a header button), `CardContent`, `CardFooter`.
- Lists inside a card are `ItemGroup` rows or a `Table`, not more cards.
- `size="sm"` for dense grids; the spacing also follows the density.
- The default Card is light (`bg-card shadow-surface-2`). For a card that must lift off the page, use `bg-surface-3 shadow-surface-3`.

## Shapes

| Class          | Value                     | Shapes                                                                      |
| -------------- | ------------------------- | --------------------------------------------------------------------------- |
| `rounded-lg`   | `--radius` (0.5rem)       | Controls, items, rows, highlights, badges, tooltips                         |
| `rounded-xl`   | `--radius` × 1.4 (0.7rem) | Containers: cards, popups, dialogs, tab tracks, alerts, the app main column |
| `rounded-full` | full                      | Switches, avatars, status dots, slider thumbs                               |

- **Corners are concentric.** A container holds its items with `p-1`, so a `rounded-xl` container fits `rounded-lg` items. Your own containers that hold items follow the same rule.
- **The shape is a project setting.** Pill (`npx fabricator-ui@latest add radius-pill`, or Shape on Get started) sets `--radius: 1.25rem`: controls become full pills and containers round out with them. Write `rounded-lg` and `rounded-xl` and let the token decide.
- Images and media inside cards take `rounded-lg`; avatars stay round.

## Motion

Every animation belongs to a role, and one speed setting retimes all of them.

| Role       | Covers                                                       | Utility                           |
| ---------- | ------------------------------------------------------------ | --------------------------------- |
| feedback   | Hover, colour, focus, icon stroke, weight                    | `duration-feedback ease-feedback` |
| press      | Buttons and toggles while held                               | `motion-press`                    |
| glide      | The Fluid Hover highlight                                    | `duration-glide ease-enter`       |
| move       | Indicators, thumbs, selection, checkmarks, progress, sidebar | `duration-move ease-move`         |
| tooltip    | Tooltips                                                     | `motion-tooltip`                  |
| popup      | Menus, selects, comboboxes, popovers, hover cards            | `motion-popup`                    |
| dialog     | Dialogs and their scrims                                     | `motion-dialog`, `motion-scrim`   |
| sheet      | Sheets and drawers                                           | `motion-sheet`                    |
| disclosure | Accordion and collapsible panels                             | `motion-disclosure`               |
| toast      | Toasts                                                       | `motion-toast`                    |

Speeds: `smooth` (websites), `default`, `snappy` (apps used all day), `instant` (dashboards: fades only), and `off`. Set one with `data-motion` on `<html>` or any element; portalled popups follow `<html>`. `--motion-scale` multiplies every duration (`.onboarding { --motion-scale: 1.4 }`).

- **Custom UI uses the roles:** `transition-colors duration-feedback ease-feedback` for hover, `transition-transform duration-move ease-move` for something that moves, `motion-popup origin-(--transform-origin) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0` for a surface that opens.
- **JavaScript animation** (Motion, GSAP, scroll scenes on websites) reads the same tokens: `calc(var(--motion-move) * var(--motion-scale, 1))`.
- **Animate `transform` and `opacity`.** In your own UI, layout properties (width, height, top) stay still.
- **Exits are quicker than entrances and popups grow from their trigger.** The `motion-*` utilities carry both, so custom surfaces get them too. A surface opened from the keyboard to be used at once, like a command palette, skips its animation with `data-motion="off"`.
- **Reduced motion** keeps fades and drops slides, zooms, blur and press, at every speed. Custom keyframes go behind `motion-safe:`.
- **App content appears in place.** Pages, lists and cards in an app render without entrance animations; motion belongs to what the person just did.
- Loading text uses the `shimmer` utility (`<span className="shimmer">Thinking…</span>`), and scroll edges use `scroll-fade`, `scroll-fade-x` and `scroll-fade-b`.

### Fluid Hover

Menus, selects, comboboxes, command, navigation menu, menubar, tabs, the tab strip, toggle groups, the sidebar, accordions and table rows share one highlight that glides to the item nearest the pointer, and a selection background that slides between selected items. It is built in. For your own lists of choices, use `useFluidHover` from the `fluid-hover` item instead of per-row `hover:` backgrounds. Split a list into groups where the items stop being alternatives (a separator); the highlight never crosses a group.

### Sounds

`<SoundEffects />` (the `sounds` item), rendered once near the root, plays short synthesized sounds for every component, chosen from its role and `data-slot`. Sounds are on once it mounts, so give people a visible setting and remember their choice: `<SoundEffects enabled={soundsOn} />`. Set `data-sound="<name>"` to change an element's sound and `data-sound="none"` to silence a region. Sound is never the only feedback. It suits apps and tools; leave it out of websites unless asked.

## Iconography

- Icons come from the project's icon package (`@fabricator-ui/icons` by default; `npx fabricator-ui@latest info` shows the registry entry that says so). One library per product, one icon per meaning.
- Components size their icons. Inside a button, mark the icon's side and give it no size class: `<Button><PlusIcon data-icon="inline-start" />New project</Button>`.
- Strokes are 1.5 at rest and 2 on hover in the components. Your own icons take `size-(--density-icon-16)` and `text-muted-foreground` beside a label.
- Props that take an icon take the component: `icon={InboxIcon}` (SidebarMenuButton, App Nav items).
- An icon-only button has an `aria-label` and a `Tooltip` with the same words, plus the shortcut when there is one.

## Components

Component names, props, variants and `data-slot` values are stable, and new ones are only ever added. The docs for each one: `npx fabricator-ui@latest docs <name>`, or `https://fabricator-ui.vercel.app/docs/components/<base>/<name>.md`.

### Choosing a component

| Need                                       | Use                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| An action                                  | `Button` with a variant; `ButtonGroup` for joined actions and split buttons                                                                |
| One on/off tool (bold, pin, mute)          | `Toggle`                                                                                                                                   |
| A choice of 2 to 7 options, or a view mode | `ToggleGroup` (a segmented control)                                                                                                        |
| Switching between panels of content        | `Tabs`                                                                                                                                     |
| Short text                                 | `Input`; with icons, prefixes or buttons, `InputGroup`                                                                                     |
| A password                                 | `InputGroup` with a show button (never the browser's reveal)                                                                               |
| A number                                   | `NumberField` (steppers, limits, formatting), never `type="number"`                                                                        |
| A date, a time or a month                  | `DatePicker` (`hasTime` adds a time wheel), `TimeInput` (a wheel of hours, minutes and seconds), `MonthInput`; never the browser's pickers |
| A start and an end time on one day         | `TimeRangeInput`: the end's list shows durations and follows the start                                                                     |
| A file                                     | `FileUploadField` in a form, `FileUploadDropzone` for a large target; never `type="file"`                                                  |
| A color                                    | `ColorPicker`; `ColorPickerPopover` behind a trigger; never `type="color"`                                                                 |
| Long text                                  | `Textarea` (`InputGroupTextarea` for a composer with actions)                                                                              |
| Searching or filtering a page              | `Search` (collapses to a button in toolbars); `CommandInput` inside a palette                                                              |
| One choice from a known list               | `Select`; `RadioGroup` when every option should stay visible (up to about 5)                                                               |
| One choice from a long or searchable list  | `Combobox` (also multiple selection with chips)                                                                                            |
| Several independent options                | `Checkbox` in a `FieldSet`                                                                                                                 |
| A setting that applies at once             | `Switch`                                                                                                                                   |
| A date range, or a date as a button        | `Calendar` in a `Popover` (the Date Picker page's compositions)                                                                            |
| A one-time code                            | `InputOTP`                                                                                                                                 |
| An approximate value                       | `Slider` with the value shown beside it                                                                                                    |
| A focused task or form                     | `Dialog`                                                                                                                                   |
| Confirming something irreversible          | `AlertDialog`                                                                                                                              |
| Details or editing beside the current view | `Sheet`                                                                                                                                    |
| A bottom panel on phones                   | `Drawer`                                                                                                                                   |
| Small interactive content on a trigger     | `Popover`                                                                                                                                  |
| A preview of a linked thing on hover       | `HoverCard`                                                                                                                                |
| A label for an icon or a shortcut hint     | `Tooltip`                                                                                                                                  |
| Actions on a trigger                       | `DropdownMenu`; `ContextMenu` for right-click; `Menubar` for desktop-app menus                                                             |
| Jump anywhere, run any command             | `Command` in a `CommandDialog`                                                                                                             |
| An app frame                               | `AppShell` with `AppNav` (see [The app frame](#the-app-frame))                                                                             |
| A hand-built side navigation               | `Sidebar`                                                                                                                                  |
| Document tabs (files, records, chats)      | `TabStrip`                                                                                                                                 |
| Switching organization or workspace        | `WorkspaceSwitcher`                                                                                                                        |
| The signed-in person's menu                | `UserMenu`                                                                                                                                 |
| Website header navigation                  | `NavigationMenu`                                                                                                                           |
| Where am I                                 | `Breadcrumb`                                                                                                                               |
| More results than one page                 | `Pagination`                                                                                                                               |
| Records compared across columns            | `Table` (the Data Table guide adds sorting, filters and paging with TanStack Table)                                                        |
| A list of things (people, files, links)    | `Item` in an `ItemGroup`                                                                                                                   |
| One discrete object                        | `Card`                                                                                                                                     |
| A status or label                          | `Badge`                                                                                                                                    |
| A person or account                        | `Avatar` with `AvatarFallback`; `AvatarGroup` for several                                                                                  |
| A keyboard shortcut                        | `Kbd`, `KbdGroup`                                                                                                                          |
| A persistent message in the page           | `Alert`                                                                                                                                    |
| The result of an action                    | A toast (`toast` on Base UI, Sonner on Radix and React Aria)                                                                               |
| Progress of known length                   | `Progress`                                                                                                                                 |
| Waiting in place                           | `Spinner`                                                                                                                                  |
| Content loading                            | `Skeleton` in the shape of the content                                                                                                     |
| Nothing to show yet                        | `Empty`                                                                                                                                    |
| Sections that open and close               | `Accordion`; `Collapsible` for one                                                                                                         |
| Resizable split views                      | `Resizable`                                                                                                                                |
| A custom scroll area                       | `ScrollArea`                                                                                                                               |
| A conversation                             | `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`, `ChatInput`, `ModelPicker`                                                 |
| Questions an assistant asks                | `Questionnaire`                                                                                                                            |

The `@fabricator` registry leaves out Native Select (use `Select`) and, for now, Chart. React Aria projects have no `Menubar` or `NavigationMenu`; use a `DropdownMenu` per menu and a header of links.

React Native projects install the same names with the same variants, sizes and tokens. Where a web input doesn't exist, a touch one takes its place: `ContextMenu`, `Tooltip` and `HoverCard` open on a long press, `Select` is a sheet on phones and a popover on tablets, and `Menubar` and `NavigationMenu` open sheets from a row of triggers. Phones default to the spacious density, because 44pt is the touch target; tablets take their own step, 40pt controls with the same 15pt text, and keep the 44pt target through `hitSlop`. A finger takes the pointer's place in Fluid Hover: a press lights a row, and dragging across a strip or a menu moves the highlight, with letting go activating the lit row. Feedback is the same sounds with a haptic for each, and the ring switch silences the sounds. Wrap the app in `FabricatorRoot` once. `Text` is the only way to draw text, so text inside a container still goes through the container's `TextStyle`.

### Variants and sizes

| Component               | Variants                                                                                                | Sizes and other props                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button                  | `default`, `secondary`, `outline`, `ghost`, `destructive`, `link`                                       | `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`                                                                                               |
| Badge                   | `default`, `secondary`, `outline`, `ghost`, `link`, `info`, `success`, `warning`, `destructive`/`error` |                                                                                                                                                                    |
| Alert                   | `default`, `info`, `success`, `warning`, `destructive`/`error`                                          | `contrast`: `low` (default), `high`                                                                                                                                |
| Toggle                  | `default`, `outline`                                                                                    | `default`, `sm`, `lg`                                                                                                                                              |
| Toggle Group            | `default`, `outline`                                                                                    | `default`, `sm`, `lg`; `spacing`, `orientation`                                                                                                                    |
| Tabs                    | `default` (track with a sliding pill), `subtle` (no track; only the active tab shows its label)         | `orientation`                                                                                                                                                      |
| Search                  | `default`, `outline`                                                                                    | `default`, `sm`, `lg`                                                                                                                                              |
| Color Picker            |                                                                                                         | `default`, `sm`, `lg`; `format`, `swatches`                                                                                                                        |
| Select trigger, Switch  |                                                                                                         | `default`, `sm`                                                                                                                                                    |
| Card                    |                                                                                                         | `default`, `sm`                                                                                                                                                    |
| Avatar                  |                                                                                                         | `default`, `sm`, `lg`                                                                                                                                              |
| Item                    | `default`, `outline`, `muted`                                                                           | `default`, `sm`, `xs`; `ItemMedia` `variant`: `default`, `icon`, `image`                                                                                           |
| Empty                   | `EmptyMedia` `variant`: `default`, `icon`                                                               |                                                                                                                                                                    |
| Field                   |                                                                                                         | `orientation`: `vertical`, `horizontal`, `responsive`                                                                                                              |
| Input Group             | `InputGroupAddon` `align`: `inline-start`, `inline-end`, `block-start`, `block-end`                     | `InputGroupButton` `size`: `xs`, `sm`, `icon-xs`, `icon-sm`                                                                                                        |
| Dropdown / Context Menu | Item `variant`: `default`, `destructive`; `inset`                                                       |                                                                                                                                                                    |
| Sheet                   |                                                                                                         | `side`: `top`, `right`, `bottom`, `left`; `showCloseButton`                                                                                                        |
| Sidebar                 | `variant`: `sidebar`, `floating`, `inset`                                                               | `collapsible`: `offcanvas`, `icon`, `none`; `side`                                                                                                                 |
| Sidebar Menu Button     | `default`, `outline`                                                                                    | `default`, `sm`, `lg`; `isActive`, `icon`, `status`, `dot`, `tooltip`                                                                                              |
| Bubble                  | `default`, `secondary`, `muted`, `tinted`, `outline`, `ghost`, `destructive`                            |                                                                                                                                                                    |
| Marker                  | `default`, `separator`, `border`                                                                        |                                                                                                                                                                    |
| Attachment              | `icon`, `image`                                                                                         | `default`, `sm`, `xs`; `orientation`                                                                                                                               |
| App Shell               |                                                                                                         | `shortcutScope`: `window`, `focus`; `mobileSidebar`: `reveal`, `sheet`; `window.controls`: `none`, `macos`, `overlay`; Header `trigger`: `auto`, `always`, `never` |
| App Shell Panel         |                                                                                                         | `side`: `left`, `right`; `mobile`: `drawer`, `swap`, `none`; `views`, `shortcut`                                                                                   |
| App Nav item (model)    | `status`: `active`, `unread`, `idle`                                                                    | `badge`, `children`, `actions`, `mobile: "tab"`; group `collapsible`, `reorderable`                                                                                |
| Tab Strip               | Tab `status`: `loading`, `error`, `dirty`, `waiting`                                                    | `size`: `default`, `sm`; Tab `pinned`, `preview`, `closable`                                                                                                       |
| Workspace Switcher      | `menu` (a few), `command` (many, searchable)                                                            | `size`: `row`, `mark`                                                                                                                                              |
| User Menu               | `row`, `mark`                                                                                           | `side`, `align`                                                                                                                                                    |

### Buttons

| Variant       | Weight   | Use                                                                    |
| ------------- | -------- | ---------------------------------------------------------------------- |
| `default`     | Primary  | The one main action of a region: Save, Create project, Send            |
| `secondary`   | Soft     | A second real action beside the primary                                |
| `outline`     | Framed   | Standalone actions that need an edge: filters, actions on busy content |
| `ghost`       | Quiet    | Toolbars, icon-only buttons, row and header actions, Cancel            |
| `destructive` | Soft red | An action that destroys: Delete, Remove member                         |
| `link`        | Inline   | Navigation inside text                                                 |

- **Order:** in a dialog or form footer, the dismissing action comes first and the primary last, at the end edge. A destructive confirm replaces the primary.
- **Labels** are a verb and its object in sentence case: "Create project", "Invite people". The confirm button repeats the verb of the action it confirms.
- **Loading:** `<Button disabled><Spinner data-icon="inline-start" />Saving…</Button>`. There is no `isLoading` prop.
- **Pressed and toggled** state is a `Toggle` or `ToggleGroup`, which own `aria-pressed`. A row of buttons with a hand-made active variant is a toggle group.
- **Links that look like buttons** keep the link: `<Link href="/new" className={buttonVariants({ variant: "outline" })}>` on Base UI and React Aria (Base UI's `Button` would give the link `role="button"`), `<Button asChild><Link href="/new" /></Button>` on Radix.

### Forms

- **Anatomy:** `FieldGroup` > `Field` > `FieldLabel`, the control, `FieldDescription`, `FieldError`. Related checkboxes, radios and switches group in `FieldSet` + `FieldLegend`. Hidden labels stay in the tree with `className="sr-only"`.
- **Orientation:** `vertical` (labels above, the default for forms), `horizontal` (a control and its label in one row: switches, checkboxes, settings rows), `responsive` (stacked on narrow containers, label beside the control from `@md`).
- **Checkbox and radio rows:** the label comes right after the control (`<Checkbox /><FieldLabel />`), as its sibling. The style pads that label's hit area up to the next row, so the whole row toggles; don't add gaps or margins between the rows.
- **Validation:** `data-invalid` on `Field` and `aria-invalid` on the control, with the message in `FieldError`. Validate on blur and on submit; the message says how to fix the value ("Use at least 8 characters").
- **Disabled:** `data-disabled` on `Field` and `disabled` on the control.
- **Adornments:** icons, prefixes, units and inline buttons go in `InputGroupAddon`, around `InputGroupInput` or `InputGroupTextarea`.
- **Layout:** one column, `max-w-2xl`, related fields together, the submit row at the end. Two short related fields (first and last name) may share a row.
- **Settings save themselves.** A `Switch` applies on change, with a toast if it can fail. A form of several fields has one submit button.
- **Required and optional:** mark whichever is rarer, in the label ("Company (optional)").

### Overlays

- **Dialog** for a focused task the person returns from: a short form, a choice, a preview. Always a `DialogTitle` (and `DialogDescription`), `sr-only` when hidden. Keep it to one task; a long or multi-step flow is a page or a `Sheet`.
- **AlertDialog** only to confirm what can't be undone. The title asks the question with the object ("Delete Acme Inc.?"), the description states the consequence, and the action repeats the verb ("Delete"). For actions that can be undone, act at once and offer Undo in a toast.
- **Sheet** for details or editing next to the list it came from: a row's record, filters, settings for the current view. Right side by default.
- **Drawer** for bottom panels on touch screens.
- **Popover** for small interactive content tied to a trigger: a date picker, a share field, quick filters.
- **HoverCard** previews a linked person or record for pointer users; everything in it is also one click away.
- **Tooltip** names an icon button or shows a shortcut, in a few words. Content someone needs to read or click goes in a Popover.
- **Two modal layers at most.** A dialog may open a confirmation; a third layer means the flow needs a page.
- Overlays manage their own stacking and portals; they take no `z-*` classes.

### Menus and commands

- Items sit inside their group: `DropdownMenuGroup`, `ContextMenuGroup`, `MenubarGroup`, `SelectGroup`, `CommandGroup`. Separators go between groups.
- Order items by frequency, with the destructive item last in its own group (`variant="destructive"`).
- Show shortcuts with `DropdownMenuShortcut` / `CommandShortcut`. State items are `DropdownMenuCheckboxItem` and `DropdownMenuRadioItem`. An item that opens a dialog ends with "…" ("Rename…").
- A `ContextMenu` repeats actions available elsewhere (a row's "more" menu), because touch and keyboard users can't right-click.
- The command palette is `CommandDialog` on `mod+K`, grouped by kind (Navigation, Actions, Recent), each item with its icon and shortcut.

### Navigation

- **App navigation is data.** `AppNav` renders groups of items (`{ id, label, href, icon, badge, status, children, actions }`) into the Sidebar: the current page comes from `pathname` (the longest match wins), parents of the current page open, row actions appear in a hover menu and on right-click, `reorderable` groups sort by drag or ⌥⇧↑/↓, and `customizable` adds pinning and hiding (`AppNavCustomize` opens the dialog that shows or hides each item and puts rows in order, by grip or arrow keys, even in groups that aren't `reorderable`). Save the `preferences` it hands back. Hand-written `SidebarMenu` rows are for bespoke rows only.
- **Sidebar anatomy:** `SidebarHeader` holds the Workspace Switcher (a row, or marks beside the `SidebarTrigger`); `SidebarContent` holds the navigation; `SidebarFooter` holds the User Menu and `AppNavCustomize`. Rows are an icon and a short label, with counts as badges and live state as status dots; they keep 8px from the sidebar's edges, and every trailing control shares one axis. `collapsible="icon"` collapses to an icon rail: tooltips name every row, a dot stands for a badge, and a row with children opens a menu of them; `peek="hover"` (with `offcanvas`) shows the closed sidebar as a card. `mod+B` toggles it.
- **WorkspaceSwitcher:** `variant="menu"` for a few workspaces, `variant="command"` for many. Set `switchingTo` while the next one loads (a full-screen status overlay) and clear it when done. `mod+O` opens it inside an App Shell.
- **UserMenu:** `variant="row"` in the sidebar footer, `variant="mark"` (the avatar) in a header row. Its children are `DropdownMenuGroup`s: account items first, Sign out last in its own group.
- **TabStrip** holds documents the person opens and closes (files, records, chats), with pinned and preview tabs, drag to reorder, a reopen stack and editor shortcuts. Drive it with `useTabStripState` and link the content with `panelId`. Give it `min-w-0 flex-1` so it runs the full width of its row: `TabStripNew` follows the last tab, and `TabStripOverflow` ends the row. Keep the URL on the active tab with `router.replace`, so Back walks pages.
- **Tabs** switch between a fixed set of views of one thing, two to six short labels, on the default track. Where space is tight (a panel header, a toolbar), use `variant="subtle"` with an icon on every tab: only the active tab shows its label. Vertical tabs (`orientation="vertical"`) suit settings pages with more sections than fit across.
- **Breadcrumb:** in an App Shell, `AppShellBreadcrumb`; elsewhere the `Breadcrumb` parts with `BreadcrumbPage` last.
- **Search** in headers and toolbars: `<form role="search" action="/search"><Search name="q" /></form>`. It opens from a round button into a field; Escape clears, then closes. `collapsible={false}` keeps it open. `className` goes on its root and every other prop on the input.
- **Websites** use `NavigationMenu` in a site header; **long lists** use `Pagination` under the table.

### Data display

- **Table** for records compared across columns. Numbers align to the end with `tabular-nums`; the first column is the record's name; row actions live in a ghost icon `DropdownMenu` at the row's end; a row click opens the record (a page or a `Sheet`). Rows already get the fluid hover.
- **Item** for lists of things: people, files, integrations, links to settings. `ItemMedia` (icon, avatar or image), `ItemContent` with `ItemTitle` and `ItemDescription`, `ItemActions`. `Item` displays content; `Field` holds a form control.
- **Stat cards:** a `Card` per metric in `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`, the label in `CardDescription`, the value in `CardTitle` with `tabular-nums`, the change as `text-success-text` or `text-destructive-text` with an arrow icon.
- **Badge** for statuses and short labels: status variants for state, `secondary` for neutral counts, `outline` for tags. One or two words.
- **Avatar** always has `AvatarFallback` (initials); `AvatarGroup` with `AvatarGroupCount` for overflow, `AvatarBadge` for presence.
- **Kbd** for shortcuts in tooltips, menus and help text: `<KbdGroup><Kbd>⌘</Kbd><Kbd>K</Kbd></KbdGroup>`.

### Feedback

- **Toast** reports the result of an action ("Invite sent"), with Undo when the action can be undone. Base UI projects call `toast.add({ title, type })` from `@/components/ui/toast` (types `success`, `info`, `warning`, `error`, `loading`; `toast.promise` for async work). Radix and React Aria projects call Sonner's `toast.success()`. Form errors stay in the form.
- **Alert** holds a message that stays on the page: a section-level warning, a degraded service, a required step. `contrast="low"` (a neutral panel with a coloured icon) by default; `contrast="high"` (tinted panel) for what must not be missed. One alert per region.
- **Progress** for work of known length; **Spinner** for short waits in place (a button, a row); **Skeleton** for content loading, in the content's shape; `shimmer` for streaming text.

### AI and chat

- A conversation composes `MessageScrollerProvider` > `MessageScroller` > `MessageScrollerViewport` > `MessageScrollerContent` > `MessageScrollerItem`, with `MessageScrollerButton` after the viewport. The scroller owns following the stream, anchoring and jump to latest.
- Rows are `Message` (consecutive messages from one sender in a `MessageGroup`); surfaces are `Bubble`; files are `Attachment` in an `AttachmentGroup`; system notes and day dividers are `Marker`.
- The person's messages sit in bubbles; the assistant's replies are plain text on the page.
- "Thinking…" is `shimmer` text. Clarifying questions with options are a `Questionnaire`.
- The composer is a `ChatInput`: `ChatInputAttachments` (files riding along), `ChatInputTextarea`, then a `ChatInputFooter` with `ChatInputTools` (add menu, permissions) and `ChatInputActions` (`ChatInputContextMeter`, the model as a `ChatInputButton` opening a `ModelPicker` in a Popover, `ChatInputMic`, `ChatInputSubmit`). Pass `useChat`'s `status` and `stop`: send stops a reply while the field is empty, and with `queue` typed text waits behind it. With `onVoiceActiveChange`, an empty input offers voice chat in send's place; pass `voiceLevel` for the glow and the mic. `onAttach` takes dropped and pasted files in both layouts; `useChatInputAttachments` holds them (previews, uploads, `clear` on send), so every composer accepts files. A rotating `placeholder` list hints at the input's sigils, and `mentions` tints them as they're typed. Give popovers and menus opened from a `ChatInput` `bg-surface-5 shadow-surface-5`, two steps over its card, so they don't blend into it. Permissions and other modes are a footer pill opening a Popover with `ChatInputOptions` (icon, label, description, a check on the one in use), not a dropdown menu. `ChatInputCommands` is the `/` menu of commands (`/goal`, ones your app runs) and skills; pass their names to `isKnownMention`. An agent's session stacks trays just before the input, furthest back first: the goal (`level={3}`), background tasks (`level={2}`) and queued messages (`level={1}`), each row a `ChatInputTrayEntry` that opens to more; with `queue` and `onRecall`, ↑ in an empty field takes the last queued message back.
- `ChatInput` is a one-line pill that stacks once the draft wraps, for a chat on an empty page, a composer floating over content or docked under a transcript. Long-form drafts and composers with a full footer of controls use `layout="large"`, a card with the controls under the field.

### Composition per base

Custom triggers follow the project's base:

```tsx
// Base UI: the render prop
<DialogTrigger render={<Button variant="outline" />}>Edit profile</DialogTrigger>

// Radix: asChild
<DialogTrigger asChild>
  <Button variant="outline">Edit profile</Button>
</DialogTrigger>

// React Aria: the trigger wraps the button and the overlay
<DialogTrigger>
  <Button variant="outline">Edit profile</Button>
  <DialogContent>…</DialogContent>
</DialogTrigger>
```

Select, Toggle Group, Slider and Accordion props also differ per base (`multiple` vs `type`, value shapes). Read the component's docs page for the project's base.

## Patterns

Start from the closest pattern, install its block when there is one, and remove what the product doesn't need.

| Block                                              | What it is                                                                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-shell-01`                                     | Workspace app: account and organization marks in the sidebar, customizable grouped nav, breadcrumb handing over to the page title, a Details panel |
| `app-shell-02`                                     | Workbench: document tabs above the content, a resources panel switched from the tab row, a status bar, a peeking sidebar                           |
| `app-shell-03`                                     | Classic SaaS: team switcher on top, the person's menu at the bottom, a sidebar that collapses to icons                                             |
| `app-shell-04`                                     | Desktop app for Electron or Tauri: a translucent window, tabs in the top row clearing the native controls                                          |
| `app-shell-05`                                     | Mobile first: a tab bar and a floating primary action on phones, a message that swaps in over the list                                             |
| `login-01` … `login-05`, `signup-01` … `signup-05` | Sign in and sign up                                                                                                                                |
| `sidebar-01` … `sidebar-16`                        | Sidebar layouts                                                                                                                                    |

Install one with `npx fabricator-ui@latest add app-shell-01`; App Shell blocks arrive as `app/dashboard/page.tsx`.

### App page

```tsx
<AppShell storageKey="acme">
  <Sidebar variant="inset">
    <SidebarHeader>
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeId={workspace.id}
        onSelect={switchWorkspace}
      />
    </SidebarHeader>
    <SidebarContent>
      <AppNav
        groups={navigation}
        pathname={pathname}
        renderLink={(item) => <Link href={item.href ?? "/"} />}
      />
    </SidebarContent>
    <SidebarFooter>
      <UserMenu user={user}>
        <DropdownMenuGroup>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </UserMenu>
    </SidebarFooter>
  </Sidebar>
  <AppShellMain>
    <AppShellHeader>
      <AppShellBreadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Q4 launch" },
        ]}
      />
      <AppShellHeaderActions
        actions={[
          { id: "share", label: "Share", icon: ShareIcon, onSelect: share },
        ]}
        primaryAction={{
          id: "new-issue",
          label: "New issue",
          icon: PlusIcon,
          onSelect: createIssue,
          shortcut: "c",
        }}
      />
    </AppShellHeader>
    <AppShellContent>
      <AppShellPageTitle>Q4 launch</AppShellPageTitle>
      {/* the page */}
    </AppShellContent>
  </AppShellMain>
</AppShell>
```

### List

The index of a collection: issues, customers, invoices.

- **Header:** the breadcrumb or page title, and the primary action ("New invoice").
- **Toolbar** in `<DensityProvider density="compact">` (in an app at the default density): `Search`, filters as `Select`, `Combobox` or a `ToggleGroup` of states, a view switch as an icon `ToggleGroup`, and the result count in `text-muted-foreground`.
- **Body:** a `Table` when the records are compared by column, an `ItemGroup` when each is read on its own. Row actions in a ghost icon `DropdownMenu`; a row opens the record in a page or a `Sheet`.
- **Footer:** `Pagination`, or load more on scroll.
- **States:** skeleton rows while loading, `Empty` for the first use, an `Empty` with "Clear filters" for no results.

### Detail

One record: an issue, a customer, an order.

- **Header:** the title (`AppShellPageTitle`), its status `Badge`, and the actions: one primary, the rest in a ghost icon "More" `DropdownMenu` with the destructive item last.
- **Body:** the main content; sections as `Tabs` when they are views of the same record (Overview, Activity, Files).
- **Side:** metadata and activity in an `AppShellPanel` the person can close, so the content can take the room.

### Settings

- One column at `max-w-2xl`. Each section is a `FieldSet` with a `FieldLegend` and a `FieldDescription`, separated by space (and a `FieldSeparator`).
- Rows are `Field orientation="horizontal"`: label and description start, control end. A `Switch` applies on change; text settings save with one button per section.
- Many sections get their own pages in a sidebar group, or `Tabs` across the top.
- The danger zone is last: a `destructive` button that opens an `AlertDialog` naming what is lost.

### Create and edit

- Up to about five fields: a `Dialog`. Fields that need the list visible beside them: a `Sheet`. Long or multi-step: a page.
- The footer holds the dismissing action (`outline` or `ghost`) and the primary, last. The primary says what it creates ("Create invoice").
- Wrap the fields in a `<form>` so Enter submits. Escape closes and focus returns to the trigger; the primitives handle both.

### Dashboard

- A row of stat cards (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`), then the work: recent activity in an `ItemGroup`, the items needing attention in a `Table`.
- An `Alert` at the top only while something is wrong.
- Dense dashboards set `compact` density and `snappy` or `instant` motion on `<html>`.

### Sign in and sign up

- Start from `login-01` … `login-05` or `signup-01` … `signup-05`.
- One centred column at `max-w-sm`: the product mark, a title, the fields, one full-width primary button, other providers as `outline` buttons, and a link to sign up (or in) styled with `buttonVariants({ variant: "link" })`.
- Codes use `InputOTP`. Errors stay in the form (`FieldError`, or an `Alert` above the fields for "Wrong email or password").

### Website

- A website sets `data-density="spacious"` and `data-motion="smooth"` on `<html>`. A marketing section inside an app wraps itself in `<DensityProvider density="spacious" data-motion="smooth">`; its popups keep the app's speed, because portalled popups follow `<html>`.
- **Header:** the logo, `NavigationMenu`, then `ghost` "Sign in" and `default` "Get started" at the end.
- **Hero:** the hero type, a lead paragraph, one `default` and one `outline` (or `secondary`) button, `size="lg"`.
- **Sections** at `py-16` to `py-24`, each a heading (display type), a lead and its content: a feature grid (icon, subtitle, caption), proof, pricing, an FAQ `Accordion`, a closing call to action, a footer of muted link columns.
- **Pricing:** one `Card` per plan; the recommended plan carries a `Badge` and the only `default` button, the others `outline`.

### Command palette

- `CommandDialog` on `mod+K`, registered with `useShellShortcut` inside an App Shell.
- Groups: Navigation (every App Nav destination), Actions (every registered shortcut from `useShellShortcuts()`), Recent. Each item has its icon and `CommandShortcut`.

### Chat and assistants

- The conversation fills `AppShellContent` with the `MessageScroller` parts; the composer stays pinned at the bottom of the column.
- Conversations the person switches between are a `TabStrip` or an App Nav group with `status="unread"` dots.

## States

| State                 | Use                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| First load            | `Skeleton` in the shape of the content: table rows, card lines, a sidebar's `SidebarMenuSkeleton`                            |
| Refreshing            | Keep the current content; a `Spinner` in the control that triggered it                                                       |
| Submitting            | The button disabled with a `Spinner` and an "-ing…" label; the rest of the form stays readable                               |
| Streaming             | `shimmer` on the status text; content renders as it arrives                                                                  |
| Empty, first use      | `Empty`: icon media, a title naming what will be here, one sentence on why it's useful, the primary action                   |
| Empty, no results     | `Empty` with the query in the title and a button that clears the filters                                                     |
| Field error           | `FieldError` under the control, `data-invalid` on the field                                                                  |
| Section error         | `Alert variant="error"` with what failed and a Retry button                                                                  |
| Action failed         | An `error` toast with the reason and a retry action                                                                          |
| Page error, not found | `Empty` with the reason and a way back (home, retry)                                                                         |
| Disabled              | `disabled` (50% opacity); when the reason isn't obvious, say it in the description or a tooltip on a wrapper                 |
| Irreversible action   | `AlertDialog` naming the object and the consequence                                                                          |
| Reversible action     | Act at once; a toast with Undo                                                                                               |
| Unsaved changes       | Keep the primary button enabled and confirm on leave; for settings that save themselves, there is nothing to lose            |
| Selected              | The component's own selected state (`isActive`, `data-selected`, checked); selection is `bg-active`, never a coloured border |

## Accessibility

- **The primitives own keyboard and ARIA.** Keep their roles, keyboard maps and focus management. A custom interactive component implements its WAI-ARIA Authoring Practices pattern in full.
- **Focus is always visible:** custom controls use `focus-visible:ring-1 focus-visible:ring-ring`.
- **Everything has a name:** icon buttons an `aria-label`, dialogs and sheets a title, images `alt` text, form controls a label.
- **Contrast** holds as long as colour comes from the tokens: text and fills are tested AA in light and dark, for every hue a project can pick.
- **Colour never works alone:** pair it with an icon, a label or a pattern.
- **Targets:** at least 24px (compact), 44px on touch screens (spacious).
- **Reduced motion** is handled by the motion tokens; custom keyframes use `motion-safe:`.
- **Headings:** one `h1` per page, then levels in order.
- **Toasts** are announced, but they disappear: anything someone must act on also lives in the page.
- Check every screen with the keyboard alone and with axe (no violations).

## Content

- **Sentence case** everywhere: titles, buttons, menu items, tabs, labels.
- **Buttons** say what happens: a verb and its object. The same verb follows the action through the flow: "Delete project" opens "Delete project?", confirmed by "Delete".
- **Labels and titles** take no final period. Descriptions and messages are full sentences.
- **Errors** say what happened and how to fix it, in plain words, without blame.
- **Empty states** say what will be here and how to start.
- **"…"** ends an item that opens a dialog for more input ("Rename…") and a label in progress ("Saving…").
- **Numbers and dates** are formatted for the person's locale (`Intl.NumberFormat`, `Intl.DateTimeFormat`); recent times are relative ("5 min ago").
- Use the product's own nouns consistently, and the person's words over internal ones.

## Do's and Don'ts

- Do use variants and size props first; don't restyle a component's colour, type or height with `className`.
- Do set density on the region; don't shrink a component with `h-7 text-xs`.
- Do use semantic tokens (`bg-primary`, `text-muted-foreground`, `text-success-text`); don't use the Tailwind palette (`bg-blue-500`, `text-gray-600`) or `dark:` colour overrides.
- Do separate layers with `bg-surface-N shadow-surface-N`; don't add borders or Tailwind shadows (`shadow-md`) to surfaces.
- Do keep one `default` button per region; don't put two primaries side by side.
- Do time motion with the role utilities; don't write milliseconds, cubic-beziers or `transition-all`.
- Do lay out with `flex`/`grid` and `gap-*`; don't use `space-x-*`/`space-y-*`.
- Do write `size-*` for square boxes and `truncate` for one-line overflow.
- Do let overlays stack themselves; don't add `z-*` to Dialog, Sheet, Popover, Tooltip or menus.
- Do keep items inside their group components and give every Dialog, Sheet and Drawer a title.
- Do use the component made for the role: `Separator`, `Skeleton`, `Badge`, `Alert`, `Empty`, `Kbd`; don't rebuild them from styled `div`s and `span`s.
- Do confirm only what can't be undone; offer Undo for the rest.
- Do use `Search`, `AppShell`, `AppNav`, `TabStrip` and `WorkspaceSwitcher` where they fit; don't rebuild their shortcuts, persistence and responsive behaviour by hand.
- Do write logical utilities (`ms-*`, `ps-*`, `text-start`).
- Do install with the CLI (`add`, `view`, `diff`) and keep `components.json`'s `style` as the CLI wrote it (`<base>-<style>`, such as `base-nova`); the Fabricator look comes from the `@fabricator` registry URL.

### Review checklist

A screen is done when every line holds:

- [ ] Light and dark both read well; nothing uses a raw colour.
- [ ] It works with the keyboard alone, and focus is visible on every stop.
- [ ] It works on a phone and on a wide desktop.
- [ ] Density and motion match the product mode, set on the region.
- [ ] Each region has one primary action, and every icon-only button has a label and a tooltip.
- [ ] Loading, empty, error and disabled states exist and use their components.
- [ ] Surfaces follow the ladder; no borders or Tailwind shadows on cards and panels.
- [ ] Copy is in sentence case, buttons are verbs, errors say how to fix.
- [ ] axe reports no violations.
