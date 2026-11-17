---
version: alpha
name: Fabricator UI
description: >-
  Calm, precise interfaces for SaaS apps, dashboards and websites: neutral
  surfaces lifted by shadow, colour kept for meaning, one grid with one edge,
  and size and motion set per region. This file is the design guide: the look,
  the layout system, cards, dashboards, SaaS features and which component each
  part of a screen calls for. Props and values live in the component docs.
omitted:
  - section: colors
    reason: Colours come from the project's look and are documented on the Colors page.
  - section: typography
    reason: The type roles are described in prose with their classes; their values are on the Typography page.
  - section: rounded
    reason: Corners follow one radius the project sets.
  - section: spacing
    reason: Sizes follow the density of the region; the spacing steps are in Layout.
  - section: components
    reason: Each component's variants and props are in its own docs page.
---

# Fabricator UI

The design guide for products built with Fabricator UI: how they look, how they are laid out, how they behave, and which component each part of a screen calls for. Read it whole before you design a screen. Then:

- **Any screen:** follow [Designing a screen](#designing-a-screen) and check the result against [the review checklist](#review-checklist).
- **A dashboard or any page of cards:** read [The grid](#the-grid), [Cards](#cards) and [Dashboards](#dashboards), and start from the [recipes](#recipes).
- **A product feature** (billing, members, integrations, settings): read [SaaS features](#saas-features).

How to write each component (props, parts, base differences) is in its docs page (`npx fabricator-ui@latest docs <name>`) and at [fabricator-ui.vercel.app/docs](https://fabricator-ui.vercel.app/docs). Read the docs of every component you use before writing with it.

**Using it in your project:** keep this file at the project's root and point your agent instructions at it. Rewrite the first paragraph of the Overview for your product, and delete the patterns you will never build. Keep the rules.

## Overview

Fabricator interfaces are calm and exact. They feel like well-made tools: neutral surfaces, one clear action, quiet chrome and the content in front. Colour carries meaning (the main action, a selection, a status, a chart series), so it stays rare and reads at once. Depth comes from surfaces lifted by shadow. Every edge lines up with another. Motion confirms what happened and gets out of the way.

### The look

- **Neutral first.** A product starts black, white and grey. The main action is the darkest thing on the screen; the only hues are statuses and charts, until the brand adds one of its own.
- **Lifted surfaces.** Cards, menus and dialogs sit above the page on a soft shadow with a hairline edge. That shadow is the edge, so surfaces carry no border.
- **Small and precise.** Interface text is 13px and controls are 36px tall. Nothing is oversized to look friendly.
- **Aligned to the pixel.** A page has one start edge and one grid; a card has one inset. The title, the toolbar, the cards and the first word in every card sit on those lines.
- **Soft geometry.** Controls have 8px corners and containers slightly rounder ones, so a row sits evenly inside its container.
- **Quiet chrome.** Navigation, labels and metadata rest in grey and come forward only when pointed at or selected.
- **Alive under the hand.** One highlight glides to whatever the pointer is nearest, a selection slides to its new place, a button gives a little when pressed. Each lasts a fraction of a second.
- **One system at every size.** A dense dashboard, a roomy website and a phone use the same components at a different density and speed.

### Product modes

Pick the mode for the product, then for each region that differs (a marketing page inside an app, a dense table inside a spacious page).

| Mode    | For                                   | Density  | Motion            | Frame                             |
| ------- | ------------------------------------- | -------- | ----------------- | --------------------------------- |
| App     | Product UI, overviews, settings       | Default  | Default or snappy | The App Shell                     |
| Tool    | Operations dashboards, admin, editors | Compact  | Snappy or instant | The App Shell, compact toolbars   |
| Website | Marketing, landing pages, pricing     | Spacious | Smooth            | A site header and centred content |

### Principles

1. **Compose, then configure.** Reach for the component, then its variant and size. The component owns its colour, type, corners, spacing and states; you decide where it goes.
2. **One primary action per region.** The filled button marks what the region is for. Everything else is quieter.
3. **Hierarchy from surface, weight and grey.** Height separates layers, grey steps content back, size and weight make titles. Colour and lines come last.
4. **One grid, one edge.** Every region, card and row starts on a shared edge, and every gap is a step of the spacing scale. Alignment is most of what makes a screen look expensive.
5. **The region decides the size.** Density is set on a region and everything inside follows it.
6. **Every view has all its states.** Loading, empty, error, partial and disabled are designed with the happy path.
7. **The keyboard is a first-class pointer.** Every action is reachable from it, focus is always visible, and frequent actions have shortcuts the interface shows.
8. **Motion has a job.** It shows where something came from or confirms what just happened.

### Designing a screen

Work through these in order. Each step is done when its last sentence is true.

1. **Name the job.** One sentence: who is on this screen and what they came to do ("A finance lead checks this month's revenue and chases the failed payments"). Done when it names one person and one task; two jobs are two screens, or a screen and a panel.
2. **Know the project:** its mode, its look (brand hue, shape, density), web or React Native, and the installed components. Done when you know all four.
3. **Pick the pattern.** The closest [pattern](#patterns) or [dashboard type](#dashboard-types) sets the regions; start from a block or a [recipe](#recipes). Done when every region has a name (header, toolbar, KPI strip, body, panel).
4. **Rank the content:** what the job needs first gets the top of the main column and the primary action; the rare case goes into a "More" menu, a panel or its own page. Done when the screen has [one focal point](#hierarchy).
5. **Lay out the regions** on [the grid](#the-grid) with space and alignment before any line or card. Done when the screen reads as plain blocks of text and gaps, and every gutter continues down the page.
6. **Choose the components** from [Choosing a component](#choosing-a-component), and read each one's docs. Done when nothing is hand-built that a component covers.
7. **Design every state** in the same pass (see [States](#states)). Done when each region answers loading, empty, error, partial, disabled and long or missing values.
8. **Write the words** (see [Content](#content)) with real data: real names, real magnitudes, a negative change, an empty list. Done when every button is a verb and every error says how to fix it.
9. **Review** the running screen against [the checklist](#review-checklist): light and dark, phone and wide desktop, keyboard only.

### Hierarchy

A screen has a budget of emphasis, and the calm look comes from spending little of it.

- **One focal point per screen:** the page title with its primary action, or the one number or document the person came for. Squint: the focal point and the primary action are the two things still visible.
- **Spend emphasis in this order** and stop at the first that works: position and space, size, weight, dark text against grey, a raised surface, colour.
- **One step at a time.** A title is larger or heavier than its neighbours, never larger, heavier and coloured at once.
- **Per region:** one filled button, one title, at most one tinted alert.
- **Equal things look equal.** Rows of a list, cards of a grid and fields of a form share one size, one alignment and one set of parts. A difference in look means a difference in meaning.

## Colors

### Neutral by default

The page, the surfaces and the text are neutral, and so is the main action: until a project picks a brand hue, primary is the text colour itself, near black in light mode and near white in dark.

- **Text has two steps.** The foreground for headings, values and labels people act on; the muted grey for descriptions, captions, metadata, placeholders, resting navigation and the icon beside a label. A third level comes from size or weight, never a third grey.
- **Lines are faint** hairlines that divide content inside a surface; they never frame one.
- **Hover and selection are washes:** a faint translucent wash under the pointer, a stronger one for pressed or selected, with no coloured edge or text.
- **Focus is one blue ring** in both themes and every palette.

### Colour roles

Six roles carry the interface's colour, each with one meaning everywhere:

- **Primary:** the main action, and "on" or "selected": the filled button, links, checked controls, progress, a selected date.
- **Secondary:** a soft second action.
- **Info:** neutral information, work under way. **Success:** done, healthy, a change that went the right way. **Warning:** late, or needs attention soon. **Destructive:** error, invalid, irreversible, a change that went the wrong way.

Rules:

- **Status comes from components first:** a status `Badge`, `Alert` or toast already pairs the right tint, text and icon.
- **A status colour always means its status.** Green is never decoration and red is never emphasis. Brand accents use primary.
- **Colour never carries meaning alone.** A trend pairs its green with an arrow and a sign; an invalid field pairs its red ring with a message.
- **Status hues stay in their family:** info blue, success green, warning orange to yellow, destructive red.
- **Destructive is soft:** a red tint with red text, so a dangerous action doesn't shout before it is confirmed.

### Brand colour

A brand enters through the project's look, chosen on the [Get started page](https://fabricator-ui.vercel.app/create) or the [Colors page](https://fabricator-ui.vercel.app/docs/foundations/colors): a hue and strength per role and an optional surface tint, each fill and state worked out from those and tested for contrast in both themes. One brand hue is enough: give it to primary. Keep the surface tint low. The hue shows in the main button, links and selected controls; backgrounds, headings, card icons and stat values stay neutral.

### Dark mode

One design covers both themes: a screen built from the components and the roles needs no second pass. In light mode raised surfaces are white and the shadow shows their height; in dark mode each level is a step lighter. Check every screen in both.

### Charts

Series take the chart palette (`--chart-series-1` to `--chart-series-8`: blue, orange, aqua, amber, magenta, green, violet, red) in config order. Every slot keeps 3:1 against the page and the card, and neighbours stay apart for red-green colour blindness.

- **Colour means the series, nothing else,** and a series keeps it when another is hidden. Categories of one series share its colour.
- **Eight at most;** a ninth is grey, so fold the smallest into "Other". Pie, treemap and sankey read best with three or four.
- **A comparison is grey:** a previous period or a target is a dashed series in `var(--muted-foreground)`.
- **A brand colour is a series' choice** (`color: "primary"`), never a change to the palette. Only `StatusBar` and candlesticks use status colours.
- **Text stays in the text colours,** beside a coloured key.

## Typography

Inter throughout, with a monospace face for code, keys and IDs. Interface text is 13px and titles only a little larger. Medium and semibold are drawn lighter than usual, because Inter reads heavy at interface sizes.

Components set their own type; the table is for the text you write around them. A browser's default is 16px, so text without a role's classes comes out too big: give every heading, value, label and sentence you write its role.

| Role       | Size       | Use                                             | Write it as                                                       |
| ---------- | ---------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Hero       | 48 or 60px | The one headline of a website page              | `text-5xl md:text-6xl weight-medium tracking-tight text-balance`  |
| Display    | 28px       | Website section headings, prices, proof numbers | `text-[28px] leading-tight weight-semibold tracking-tight`        |
| Page title | 24px       | The title of an app page                        | `AppShellPageTitle`, or `text-2xl weight-semibold tracking-tight` |
| Metric     | 24px       | The value of a stat, a chart's headline number  | `text-2xl weight-semibold tracking-tight tabular-nums`            |
| Title      | 16px       | Section headings inside an app page             | `text-(length:--density-text-16) weight-semibold`                 |
| Subtitle   | 14px       | Card titles, group headings, feature titles     | `CardTitle`, or `text-(length:--density-text-14) weight-medium`   |
| Lead       | 15px       | The sentence under a page title or a hero       | `text-[15px] text-muted-foreground text-pretty`                   |
| Body       | 13px       | Body text, a stat's label                       | `text-(length:--density-text-13)`                                 |
| Caption    | 12px       | Descriptions, group labels, errors, metadata    | `text-(length:--density-text-12) text-muted-foreground`           |

- **Body, caption, subtitle and title follow the density** through their tokens: body is 12px compact and 15px spacious. Dialog titles are bold; the component sets it.
- **Two weights per view:** regular for text, medium or semibold for titles and values.
- **Weight is state.** Hover changes colour and thickens the icon's stroke; weight changes only for state that lasts (checked, selected, open).
- **Sentence case everywhere,** with no all-caps labels or wide letter-spacing.
- **Numbers line up:** figures that update or sit in a column use tabular figures, and in a column they align to the end.
- **Long text** is capped near 65 characters, with balanced headings.
- **Documents are their own role.** Notes, articles, comments and an assistant's replies use `Markdown` or `Editor` (14px in chat and panels, 16px by default, 18px for long reading) and don't follow the density.

## Layout

### Density

Density sizes every component at once: controls, rows, text, icons, padding and gaps. It is the main way a Fabricator product changes character.

|                                  | Compact                  | Default | Spacious                      |
| -------------------------------- | ------------------------ | ------- | ----------------------------- |
| For                              | Dense dashboards, tables | Apps    | Websites, touch-first screens |
| Controls, menu rows, table heads | 28px                     | 36px    | 44px                          |
| Body text                        | 12px                     | 13px    | 15px                          |
| Icons                            | 14px                     | 16px    | 18px                          |
| Card inset (`--card-spacing`)    | 12px                     | 16px    | 20px                          |

- **Set it on the widest region it is true for** with `DensityProvider`, so popups opened from the region follow it.
- **A single control changes size only to differ from its neighbours;** its small and large sizes are its compact and spacious sizes.
- **Never shrink a component by hand.** If a region feels too big, it is in the wrong density.

### Spacing

Components space their own insides. Between them, space follows a 4px grid, one step per relationship. Write the app column with density tokens (`gap-(--density-16)`) so a compact region tightens with its controls.

| Relationship                               | App  | Token          | Website                    |
| ------------------------------------------ | ---- | -------------- | -------------------------- |
| A heading and its lead                     | 4px  | `--density-4`  | 12px                       |
| Controls in one row                        | 8px  | `--density-8`  | 12px                       |
| Cards in a grid; a heading and its content | 16px | `--density-16` | 24px; 40px under a heading |
| The bands of a page (title, toolbar, body) | 24px | `--density-24` | 40px                       |
| Sections of a page                         | 40px | `--density-40` | 64 to 96px                 |

Page padding comes from `AppShellContent`: 16px on phones, 24px on desktop. Tighter space binds and more space separates: a label sits closer to its control than to the next field, and space groups before a line or a card does.

### Widths

Use the App Shell's content sizes, which centre the page with its padding:

- **`size="sm"`, 672px:** forms, settings, single-column flows. Sign-in and one-task cards are about 384px.
- **`size="md"`, 896px:** most app pages. Reading text is capped near 65 characters.
- **`size="lg"`, 1152px:** dashboards and dense pages.
- **No size:** tables, boards, editors and transcripts take the full main column.

### The grid

Pages of cards (dashboards, overviews, settings hubs, integration galleries) sit on one 12-column grid inside the content column.

- **The grid:** `grid grid-cols-1 gap-(--density-16) @4xl:grid-cols-12` inside a wrapper with `@container`; cards take `@4xl:col-span-<n>`.
- **Container queries, not the viewport.** The App Shell's main column narrows when the sidebar or a panel opens, so a page laid out by the viewport claims room it doesn't have. `@4xl:` (a 896px column) and `@3xl:` (768px) follow the column itself.
- **One rhythm per page,** so every gutter continues down the page:

| Rhythm   | Rows it allows                | Gutters at       |
| -------- | ----------------------------- | ---------------- |
| Quarters | 4 stats, 6 + 6, 3 + 3 + 6, 12 | 3, 6 and 9 of 12 |
| Thirds   | 3 stats, 8 + 4, 4 + 4 + 4, 12 | 4 and 8 of 12    |

- **Rows are equal.** The cards of a row share one height (the grid stretches them) and the same parts in the same order; charts in a row share one height.
- **Below 896px** the grid is one column, cards stack in order of importance, and a strip of stats goes two across.
- **Half a laptop is about 480px.** On a 1280px screen with the sidebar open, a half-width card is about 480px: design for that, not for a 1920px monitor.

### The app frame

Apps live in the `AppShell`. It replaces a hand-built sidebar, header and panel layout and handles what those get wrong: phones, focus, remembering the layout, desktop windows.

- **Sidebar:** `WorkspaceSwitcher` at the top, `AppNav` in the middle, `UserMenu` at the bottom. It sits on the frame, a step darker than the page, so the main column and panels read as cards in front.
- **Header:** the breadcrumb, the page's actions (`AppShellHeaderActions`) with the primary action when the page has one, and the panel trigger. Once the `AppShellPageTitle` scrolls away, the header shows it.
- **Content:** the page, the one thing that scrolls.
- **Side panels:** details, activity, an inspector, which the person opens, resizes and closes. They dock while there is room, float when there isn't, and become a bottom drawer on phones.
- **Optional rows:** a `TabStrip` of open documents above the header, a status bar for what is true of the whole workspace, a bottom nav on phones.
- **Shortcuts** are registered with the shell, which shows them in tooltips and menus; F6 moves focus between regions.

### Page anatomy

An app page reads top to bottom in four bands at most, `--density-24` apart:

1. **Header:** where am I and what can I do to this page.
2. **Title:** the page title, with one lead sentence when the name isn't enough.
3. **Toolbar:** what am I looking at: the period, search and filters at the start; the view switch, the result count and the data's freshness at the end.
4. **Body:** one list, table, form or document, or one grid of cards.

- **Page actions live in the header;** actions on one item in its row or card; actions on a selection replace the toolbar while it lasts.
- **One scroller.** A second is only for a pane with content of its own.
- **One start edge.** The title, the toolbar and the body begin on the same line, a card's outer edge and a table's text included. Centring is for what stands alone: an empty state, a sign-in card, a hero.
- **Fill or cap.** Records take the full column; what people read or fill in is capped.
- **Long values:** names shorten with an ellipsis and a tooltip; numbers, dates and statuses always show in full.
- **A fifth band** (a second toolbar, tabs under tabs) means two pages, or a page and a panel.

### Responsive

Design the phone first and widen it. Components adapt to their room: the App Shell rearranges itself by its own width (on phones the sidebar sits behind the page, actions fold into one menu and the primary action floats), form rows stack, and a `Dialog` becomes a bottom `Drawer`. Touch-first screens are spacious, with 44px controls.

## Elevation & Depth

Depth is a ladder of surfaces. Each level is a background and a shadow that starts with a hairline, so a surface needs no border.

| Level    | Holds                                                                |
| -------- | -------------------------------------------------------------------- |
| Frame    | The App Shell's frame and its sidebar, a step darker than the page   |
| 1        | The page; in an App Shell, the main column and the side panels       |
| 2        | A sidebar on its own, inset regions, the default `Card`              |
| 3        | Raised cards, menus, selects, popovers, hover cards, sheets, drawers |
| 4        | The active tab; anything raised inside a level-3 surface             |
| 5        | Dialogs, alert dialogs, toasts                                       |
| Inverted | Tooltips: dark on a light page, light on a dark one                  |

- **Height means layering,** never importance: a menu over a page, a dialog over everything.
- **A child sits above its parent.** A quiet area inside a surface (a code block in a dialog) is a faint wash, never a lower level.
- **No borders and no other shadows on surfaces.** Status surfaces are the same ladder tinted with the status colour.

## Cards

A `Card` holds one discrete thing: a metric, a chart, a list of things to do, a plan, a project, a group of settings. Sections of a page that isn't a grid are separated by headings and space, with a `Separator` where space is not enough.

### Anatomy

- **Header:** `CardTitle` names the thing in a few words ("Revenue", "Needs attention"). `CardDescription` gives its scope: the grain, the sort, the unit ("Daily", "By monthly recurring revenue"). The page's period is in the toolbar, so a card names a period only when it has its own. `CardAction` holds at most one quiet control: a small `ToggleGroup`, a ghost "View all" link, or a ghost "More" menu.
- **Content:** the one thing the card shows. A headline value sits above a chart; a list or table runs to the card's edges.
- **Footer:** only when it has content: a summary line, or the buttons of a settings or plan card.

### Alignment inside a card

A card has one inset, `--card-spacing` (12, 16 or 20px by density). The title, the description, a headline value, a list's icons and a table's first column start on it, and a table's last column ends on it.

- **Tables run edge to edge:** `CardContent` drops its side padding (`px-0`) and the first and last cells pad to the inset, so the hover wash reaches both edges and the text stays on the line. A table that ends the card pulls up the bottom padding (`-mb-(--card-spacing)`).
- **Lists keep rounded, inset rows:** the content's padding is the inset minus the row's own padding (`px-[calc(var(--card-spacing)-var(--density-12))]` for a small `Item`), so the row's icon lands on the inset.
- **Cells of a strip** pad by the inset on every side, so their labels line up with the titles of the cards below.
- **A ghost control at the card's end edge** pulls out by its own padding (`-me-3` on a small ghost button or link), so its text ends on the inset with the last column.

### Kinds of card

- **KPI strip:** three to six headline numbers in one `Card` divided into cells.
- **Stat:** one number with its change, in `Card size="sm"`. **Goal:** a stat with a `Progress` and "62% of $80K".
- **Chart:** the header, a headline value, one chart.
- **List:** five to seven `Item`s to do or read, and "View all". **Activity:** `Item`s with an `Avatar` and a relative time, newest first.
- **Table:** five records edge to edge, and "View all".
- **Checklist:** a `Progress`, then an `Item` per setup step with a done mark and its action.
- **Object:** one record in a grid: its name and status `Badge`, a few pairs, its menu.
- **Plan:** name, price, who it's for, what's included, the button. **Connection:** a logo, a name, one line, a `Switch` or "Connect".

Rules:

- Lists inside a card are rows or a table, never more cards. Cards don't nest, and a whole page is never wrapped in one.
- Every card in a grid has the same parts in the same order.
- The title introduces the card, with no icon tile, coloured header, gradient or coloured border.
- Use `size="sm"` for four or more small cards across. A card that must stand off the page, such as a product picture on a website, goes up a level.

## Dashboards

A dashboard answers three questions, in order: **what needs me now**, **how are we doing** compared with before, and **where do I go to act**. Every number and row is a way into the page where the person acts on it.

### Before you lay it out

- **Name the person and the decision:** "A finance lead sees whether revenue is on track and chases what is at risk." The decision picks the metrics; a metric that changes no decision is left out.
- **Four headline numbers** is the default, three to six at most. More numbers belong on a second page, a `Tabs` view or a report.
- **One question per card.** "How did revenue move this month?" is a card; "revenue, signups and churn" is a KPI strip.
- **Pick the [type](#dashboard-types)** and start from its layout.

### The order of a dashboard

```text
Header      Acme Inc > Overview                          Export  ...  [Primary]
Title       Overview
            Revenue, customers and what needs you today.
Toolbar     [7 days|30 days|90 days|12 months]  Compared with the previous 30
            days                                  Updated 2 min ago  (refresh)
Alert       Only while something is wrong                                 (12)
KPI strip   MRR $48,290 +12.4% | Customers 1,284 +3.1% | Churn 2.1% -0.4 pt
            | Revenue per account $37.60 -1.2%                            (12)
Hero chart  Revenue, this period against the last, with its headline      (12)
Work        Needs attention (6)              | Top customers (6)
Breakdowns  Revenue by plan (6)              | Recent activity (6)
```

1. **Alert,** only while something is wrong, with its action ("2 payouts failed. Update bank details").
2. **KPI strip:** the headline numbers the job depends on.
3. **Hero chart:** the trend of the most important number, full width (quarters) or eight columns (thirds).
4. **Work:** what needs the person, as a list with ways in; then the records they check most, as a short table.
5. **Breakdowns and archive:** rankings, mixes, sources, recent activity. Nothing lower is more important than anything above it.

### Choosing a widget

Spans are columns of 12.

- **Headline numbers:** the KPI strip, 12. **One number against a target:** a goal card, 3, 4 or 6; `RadialChart` for a few targets at once.
- **A trend against the last period:** `LineChart`, the previous period dashed and grey, 12 or 8.
- **A total and its parts over time:** stacked `AreaChart`, or stacked `BarChart` per period, 12, 8 or 6. **A mix changing over time:** `CompositionChart`.
- **A ranking (plans, pages, sources):** `BarChart layout="horizontal"`, sorted, top five to eight, 6 or 4.
- **A mix of a few parts:** `DonutChart` with its list, 8 or 12.
- **Stages that lose people:** `FunnelChart`. **Activity per day:** `HeatCalendar`. **Uptime:** a `StatusBar` per service.
- **Things needing action:** a list card with a status `Badge` per row, 6 or 4. **A few records:** a table card, 6 or 12. **What's next:** `EventCalendar` in its agenda view.
- **Many records to work through:** a `DataTable` on its own page, linked from a card.

### Numbers

- **Format with the person's locale** (`Intl.NumberFormat`), passed explicitly so the server and the browser write the same text. Stats and axes go compact from 10,000 ("$48.3K"); tables and tooltips show the full value.
- **Money:** whole units in stats and charts, cents in tables of transactions. **Units** follow the value in the same type ("320 ms", "18 seats"). A rate changes in points ("−0.4 pt").
- **Deltas** carry a sign (a true minus, "−"), one decimal and an arrow (`ArrowUpRightIcon`, `ArrowDownRightIcon`) in a status `Badge`: success when the change is good, destructive when bad. Where down is good (churn, cost, latency, errors), flip the colour and keep the arrow. No change is an outline badge, "0%".
- **Say the comparison once,** in the toolbar ("Compared with the previous 30 days"). Each stat shows its delta and, where there is room, its previous value ("from $42,960"), never "vs last 30 days" four times.
- **Freshness:** "Updated 2 min ago" at the end of the toolbar with a refresh button. Live data says "Live" with a success status dot, and its numbers change in place.
- **Missing is not zero:** no data is a grey "No data" with no delta; zero shows "0"; a tiny share shows "<0.1%".
- **Real magnitudes in every demo,** with a negative change and an empty card. A dashboard where every delta is green looks invented.

### Period and filters

- **The toolbar controls the whole page:** the period as a small `ToggleGroup` of three to five presets, "Custom…" opening a range `Calendar` in a `Popover` when exact dates matter, then filters (`Select`, or `Combobox` for long lists), then freshness at the end. A card with its own period says so in its description.
- **The period and filters live in the URL,** so a shared link shows the same dashboard and Back returns to it.
- **A new period keeps the old numbers on screen** (charts take `loading`, which dims the last drawing) until the new ones arrive; the page never flashes to skeletons.
- **On phones** the filters fold into one "Filters" button that opens a `Drawer`; the period stays.

### Charts on a dashboard

- **One chart per card, one question per chart, one axis per chart.** Two measures on different scales are two cards.
- **Comparisons are lines:** a `LineChart` with the previous series `dashed` and `color: "var(--muted-foreground)"`. An `AreaChart` washes under every series, so a dashed comparison becomes a grey fog; it is for one series or stacked totals.
- **Rankings are horizontal bars,** sorted, five to eight, the rest in "Other" or behind "View all".
- **A donut needs room:** with its list it needs about 560px, and in a half-width card its names cut off. Use horizontal bars there.
- **Heights:** the hero chart `h-56 @4xl:h-64`, charts in rows `h-56`, one height per row.
- **The headline follows the hand:** the value above a chart is the period's total until someone points at the chart, then the inspected point (`onActiveChange`).
- **Format the values** with `formatValue`, so the tooltip reads "$1,612".
- **Charts draw in once,** then morph to new data. Cards and stats appear in place.

### Widget states

- **Loading:** the card's frame, title and description render at once; the content is a `Skeleton` of its own height, or the chart's `loading`, so nothing moves when data lands.
- **Empty:** an `Empty` in the content at the chart's height: what will show and how to start ("No revenue yet. Connect Stripe to import payments" with an outline "Connect Stripe" button).
- **Error:** an error `Alert` in that card with Retry; other cards keep their data.
- **Partial or late data:** said in the description ("Today's data is still processing") or a warning `Badge` in the `CardAction`.
- **No access:** leave the card out.

### Responsive dashboards

The KPI strip is four across from a 896px column and two by two below it; previous values show from 768px. Rows stack below 896px in code order, so write cards in order of importance. Tables in cards keep the name, the status and the value on phones. The toolbar wraps, the period first.

### Polish

What separates a dashboard that looks designed from one that looks assembled. Check each on the running page:

- The page title, the toolbar and every card's outer edge start on one line; inside every card, everything starts on the inset.
- Gutters continue down the page; cards in a row are equal height with the same parts; charts in a row share a height.
- Values use the metric role with tabular figures; labels are three words at most and never cut off at phone width.
- Colour appears only in chart series, deltas and status badges.
- At most one filled button on the whole dashboard, often none: its actions are the ways into other pages. Buttons inside cards and alerts are outline or ghost.
- No greeting banner, no illustration, no paragraph of "insights" restating the numbers.

### Recipes

Working code for each part of a dashboard is in the fabricator agent skill, `rules/dashboards.md` (in a project under `.claude/skills/fabricator/` or `.agents/skills/fabricator/`; add the skill with `npx fabricator-ui@latest agents add <assistant>`): the page, the toolbar, the delta badge, the KPI strip, the chart card, the list card and the table card. Each was checked in a running app at phone and desktop widths in both themes. Start from them, change the content, and keep the layout and alignment classes.

### Dashboard types

- **Overview,** the home page (default density and motion, quarters): the KPI strip, the hero chart, needs attention beside the top records, then breakdowns beside recent activity.
- **Analytics,** one area explored over time (default, snappy, quarters): filters in the toolbar, the KPI strip, a hero chart whose metric is picked in its `CardAction`, rankings in halves, a table. A ranking people filter by is a list or table whose rows link to the filtered view (charts only inspect); the active filter shows in the toolbar with a way to clear it.
- **Operations,** a system's live health (compact, instant, thirds): a `StatusBar` per service, live numbers with status dots, p50 and p95 latency lines in eight columns beside open incidents in four, a log table. "Live" with a Pause button; new rows wait behind a "3 new" button instead of moving rows under the pointer.
- **Revenue** (default, quarters): an MRR strip, MRR movements as a stacked `BarChart` per month, plans ranked beside failed payments, a transactions table.
- **Usage,** against the plan (default, thirds): a goal card per limit, usage over time in eight columns beside the plan card in four, usage per member or project as a table.

A person often sits between two types (an on-call engineer reading a week of analytics). Take the type of the data, keep [the order of a dashboard](#the-order-of-a-dashboard), and give anyone with things to act on a work band right under the hero chart.

## Shapes

- **Two corner sizes:** 8px for controls, rows, badges and tooltips; about 11px for containers (cards, menus, dialogs, tab tracks, alerts, the main column).
- **Corners are concentric:** a container holds its rows with a small inset so both share a centre. Your own containers do the same.
- **Full rounds** for switches, avatars, status dots and slider thumbs.
- **The shape is a project setting:** the Pill look rounds controls fully and containers with them. Design with "control corner" and "container corner" in mind.
- **Media takes the shape of its place:** the control corner inside a card, the container corner standing alone.

## Motion

Every animation has a role, and one speed setting retimes them all.

- **Hover, colour, focus, an icon's stroke:** a quick fade. **A held button** gives slightly and springs back.
- **The hover highlight** glides from row to row; **indicators, thumbs, selections, checkmarks, progress** slide to their new place.
- **Tooltips** fade in fast, instantly once one shows. **Menus and popovers** grow from their trigger. **Dialogs** grow slightly from the centre over a fading scrim. **Sheets and drawers** slide from their edge, the slowest motion in the system.
- **Accordions** open by height. **Toasts** slide in from the edge and stack. **Charts** draw in once, then morph to new data.
- **Four speeds:** smooth for websites, default for most products, snappy for apps used all day, instant for dense dashboards, where surfaces only fade. Set one with `data-motion` on the widest region it is true for; popups follow the speed on `<html>`.
- **Exits are quicker than entrances,** and things come from somewhere: a popup from its trigger, a sheet from its edge.
- **App content appears in place:** pages, lists, cards and stats have no entrance animation. A command palette summoned from the keyboard opens with none either.
- **Reduced motion** keeps the fades and drops slides, zooms and the press. Your own animation does the same, on the components' motion roles.
- **Loading text shimmers** ("Thinking…"), and a scrolling region fades at the edge where more content waits.

### Fluid Hover

Lists of choices share one highlight that fades in under the item nearest the pointer and glides to the next, while a separate selection background slides between selected items. Menus, selects, tabs, toggle groups, the sidebar, accordions, table rows and the file tree have it built in. Give your own lists of alternatives the same highlight in place of a hover colour per row. It never crosses a separator, and on touch a press lights the row and a drag moves the highlight.

### Sounds

Components can play short, quiet, synthesised sounds per family. They suit apps and tools, never websites unless asked. Offer a visible setting and remember it; sound is never the only feedback.

## Iconography

- **One icon library per product, one icon per meaning.** The default is Fabricator Icons, a line set at the text's weight whose strokes thicken on hover with their row or button. Never emoji, never two libraries on one screen.
- **Components size their icons** (16px default, 14px compact, 18px spacious) and colour them with their label; beside a label an icon rests in grey.
- **An icon supports a label.** Icon-only buttons are for actions everyone knows (close, search, more, add, refresh) and toolbars, each with an accessible name and a tooltip with the same words and its shortcut.
- **Before a label an icon names the action; after it, it shows direction:** an arrow for going somewhere, a chevron for a menu or a row that opens.
- Company logos come from the brand set and file types from the file set.

### Images and media

- **The product is the picture:** a website shows real screens; an app shows the person's own content. Empty states and feature rows use an icon, never an illustration.
- **Hold the space:** photos, screenshots, maps and embeds sit in an `AspectRatio`. A screenshot on a page sits on a raised surface. Text over an image sits on a scrim.
- **People are `Avatar`s** with initials as the fallback; companies are their logo; files their type icon.
- **Media:** `ImageCompare` for two versions of a picture, `AudioPlayer` (pass `peaks` for a waveform), `VideoPlayer` with captions for speech.

## Components

The library covers most of what a product needs, so a screen is mostly a matter of choosing well. Names are the same on the web and React Native. Use the library's inputs for dates, times, numbers, files and colours in place of the browser's.

### Choosing a component

- **Actions:** `Button`; joined or split: `ButtonGroup`; one on/off tool: `Toggle`; actions on a trigger: `DropdownMenu`, `ContextMenu` on right-click, `Menubar` in desktop apps; jump anywhere: `Command` in a `CommandDialog`.
- **Choices:** two to seven options, a view mode or a period: `ToggleGroup`; views of one thing: `Tabs`; a known list: `Select`, or `RadioGroup` to keep up to five visible; a long or searchable list: `Combobox`; several from a long list: `MultiSelect`; independent options: `Checkbox`es in a `FieldSet`; a setting that applies at once: `Switch`.
- **Values:** `Input`, `InputGroup` (an icon, a unit, a show-password button), `NumberField`, `DatePicker` (also months and years), `TimeInput`, `TimeRangeInput`, a range `Calendar` in a `Popover`, `FileUploadField` or `FileUploadDropzone`, `ColorPicker`, `InputOTP`, `Slider`, `Rating`, `Textarea`, `Editor` to write formatted text and `Markdown` to show it, `Search` to filter a page.
- **Overlays:** a focused task: `Dialog`; confirming the irreversible: `AlertDialog`; details beside the view: `Sheet`; a bottom panel on phones: `Drawer`; small content on a trigger: `Popover`; a hover preview: `HoverCard`; an icon button's name: `Tooltip`.
- **Frame:** `AppShell` with `AppNav`, or a plain `Sidebar`; `TabStrip`, `WorkspaceSwitcher`, `UserMenu`; on websites `NavigationMenu`; `Breadcrumb`, `Pagination`, `PreviewRail`.
- **Records:** `Card`; `Item`s in an `ItemGroup`; `Table`; `DataTable` for records people sort, filter, edit or pick; `EventCalendar`; `FileTree`; `Badge`; `Avatar`, `AvatarGroup`; `Kbd`; `SyntaxHighlight`.
- **Charts:** see [Choosing a widget](#choosing-a-widget); also `PieChart` where a donut's list doesn't fit, `RadarChart` for several measures of a few subjects, `Treemap` for parts in groups, `CandlestickChart`, `BumpChart` for rank over time, `SankeyChart` for flows.
- **Feedback and structure:** `Alert`, toasts, `Progress`, `Spinner`, `Skeleton`, `Empty`, `Accordion`, `Collapsible`, `Separator`, `Resizable`, `ScrollArea`.
- **Media and conversation:** `AudioPlayer`, `VideoPlayer`, `ImageCompare`, `AspectRatio`, `Carousel` (for content people can afford to miss); `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`, `ChatInput`, `ModelPicker`, `Questionnaire`, `BotFace`.

### Buttons

- **Default,** filled: the one main action of a region. **Secondary,** a soft tint: a second real action. **Outline:** Cancel, filters, standalone actions on busy content. **Ghost:** toolbars, icon buttons, card actions, row and header actions. **Destructive,** a red tint: Delete, Remove member. **Link:** navigation inside text.
- **Order:** in a footer the dismissing action comes first and the primary last, at the end edge.
- **Labels** are a verb and its object ("Create project"); the confirming button repeats the verb it confirms.
- **Loading:** disabled, a `Spinner` before the label, the label in its "-ing" form ("Saving…").
- **A row of buttons where one looks active** is a `ToggleGroup`. Buttons together share a size; full width only in a narrow column.
- **What goes to another page is a link,** even when it looks like a button: style the router's link with `buttonVariants`.

### Forms

- **One column,** about 672px, related fields together, the submit row at the end. Two short related fields may share a row.
- **A visible label above every control;** the placeholder shows an example; help people need while typing sits under the control.
- **A field's width hints at its answer.** Ask in the order people think of the answers, only for what the task needs now, and mark whichever of required or optional is rarer: "Company (optional)".
- **Group related controls** under a legend. Checkbox, radio and switch rows put the label beside the control, and the whole row toggles.
- **Validate when the person leaves a field and on submit,** never while they type: a red ring and a message saying how to fix it ("Use at least 8 characters"). After a failed submit, focus goes to the first invalid field.
- **Settings save themselves:** a switch applies at once; a form of several fields has one submit button.

### Overlays

- **Dialog** for a focused task the person returns from, with a title and its actions in the footer. A long or multi-step flow is a page or a `Sheet`.
- **AlertDialog** only for what can't be undone: the title asks with the object ("Delete Acme Inc.?"), the description states the consequence, and the action repeats the verb beside an outline Cancel. Everything reversible acts at once with Undo in a toast.
- **Sheet** for details or editing beside the list, from the end edge. **Drawer** for bottom panels on touch screens.
- **Popover** for small interactive content on a trigger; **HoverCard** previews for pointer users; **Tooltip** names an icon button in a few words.
- **Two modal layers at most. Escape closes, and focus returns to what opened it.**

### Menus and commands

- **Group the items** by how often they are used, with the destructive item last in its own group, in red. Show each item's shortcut.
- **An item that opens a dialog for more input ends with "…"** ("Rename…").
- **A menu holds actions; a `Select` holds values.** A right-click menu repeats actions available elsewhere.
- **The command palette** opens on ⌘K, grouped by kind (Navigation, Actions, Recent), each item with its icon and shortcut, finding things by the words people use.

### Navigation

- **Five to seven top-level destinations,** named with nouns, ordered by how often people go there. What people make (projects, chats) gets its own group below; settings and help go last or in the user menu.
- **Sidebar rows** are an icon and a short label; counts are small badges at the end, live state a status dot. The current page is the selected row. The sidebar collapses to an icon rail or peeks back on hover, and remembers which.
- **`WorkspaceSwitcher`** is a menu for a few workspaces and a searchable dialog for many. **`UserMenu`** has account items first and Sign out last.
- **`TabStrip`** holds documents a person opens and closes; **`Tabs`** switch two to six views of one thing. Breadcrumbs end with the current page and fold a long middle into a menu. Websites use a `NavigationMenu`, or plain links for five or fewer.

### Data display

- **Table:** the first column is the record's name in the foreground and medium weight; other cells rest in grey and darken with the row under the pointer. Numbers align to the end in tabular figures, statuses are `Badge`s, row actions sit in a ghost "More" menu at the end.
- **DataTable** when people work the records: declare each column's type rather than drawing cells, give it the full column and a height, and load more on scroll.
- **A row opens its record:** the name is the link, and clicking anywhere on the row is the shortcut to it.
- **Badge** colour follows what the state asks of the person: success for done, info for under way, warning for late or soon, destructive for failed or blocked (`error` is the same look), outline for no urgency (draft, archived).
- **Item** has a picture (icon, avatar or logo), a title, a description and its actions. **Avatar** always falls back to initials; a group shows a few, a count and each name in a tooltip.
- **Metadata** is a list of pairs: the label in grey, the value in the foreground. **EventCalendar** colours events by their source, never their status.

### Feedback

- **Toast** reports the result of an action ("Invite sent") with Undo or Retry. It leaves by itself, so anything someone must act on also lives in the page.
- **Alert** holds a message that stays: a section warning, a degraded service, a required step, with room for one action. One per region; the tinted version only for what must not be missed.
- **Progress** for work of known length, **Spinner** for a short wait in place, **Skeleton** for loading content in its shape. A longer wait has words: "Importing 240 rows…".

### AI and chat

- **The transcript** is a `MessageScroller`. The person's messages are bubbles at the end edge; the assistant's replies are plain text formatted as a document; files are `Attachment`s and day dividers `Marker`s. Waiting is shimmering text ("Thinking…").
- **The composer is a `ChatInput`** docked under the transcript: attachments above the text, tools at the start of its footer, the `ModelPicker`, the microphone and send at the end; send turns into stop while a reply streams.
- **Clarifying questions** are a `Questionnaire` in the composer's place. **An assistant's identity** is a `BotFace`. A new chat centres the composer under a short greeting and a few suggested prompts.

### Platforms

- **Three web bases, one design.** Base UI, Radix and React Aria look and behave the same; how parts connect in code differs, so read the docs for the project's base. React Aria has no `Menubar` or `NavigationMenu`.
- **React Native has the same components and rules.** Not there yet: `ChatInput`, `ColorPicker`, `FileTree`, file upload, `ModelPicker`, `NumberField` and the time inputs.
- **Touch takes the pointer's place:** hover and right-click become a long press; phones use 44pt controls, tablets 40pt; a `Select` or a menu is a bottom sheet on a phone.

## Patterns

Start from the closest pattern, install its block when there is one, and remove what the product doesn't need.

- **Blocks:** `app-shell-01` (workspace app with a Details panel), `app-shell-02` (workbench with document tabs and a status bar), `app-shell-03` (classic SaaS: team switcher on top, the person's menu at the bottom, an icon rail), `app-shell-04` (desktop app in a translucent window), `app-shell-05` (mobile first, with a bottom nav), `login-01` … `login-05`, `signup-01` … `signup-05`, `sidebar-01` … `sidebar-16`.
- **The App Shell blocks fill their content with placeholders.** For a dashboard, keep the shell (`app-shell-03` for a classic SaaS) and build the content from the [recipes](#recipes).
- **Pick by what the screen is about:** the state of things ([Dashboards](#dashboards)); many records ([List](#list)); one record ([Detail](#detail)); a queue ([List and detail](#list-and-detail)); preferences ([Settings](#settings)); one record to make or change ([Create and edit](#create-and-edit)); a long task ([Multi-step flow](#multi-step-flow)); a product feature ([SaaS features](#saas-features)); open documents ([Workbench](#workbench)); one document ([Document](#document)); a conversation ([Chat](#chat)); getting in ([Sign in](#sign-in-and-sign-up)); selling the product ([Website](#website)).

### List

- **Header:** the breadcrumb and the primary action ("Create invoice").
- **Toolbar,** compact: `Search`, filters, a view switch, the result count in grey at the end. A filter is a `ToggleGroup` when its states fit the row at every width, a `Select` otherwise, a `Combobox` when long or multiple. Active filters stay visible with one control that clears them.
- **Body:** a `Table` or `DataTable` when records are compared by column, `Item`s when each is read alone, `Card`s when each is recognised by its picture.
- **Selection:** a leading checkbox column; while rows are selected, the toolbar shows their count and the bulk actions.
- **States:** skeleton rows; on first use an `Empty` with the primary action and no toolbar; for no results an `Empty` naming the search with "Clear filters".
- **Filters, sort and page survive a reload and a shared link,** and Back returns to the list as it was.

### Detail

- **Header:** the title, its status `Badge`, one primary action, the rest in a "More" menu with the destructive item last.
- **Body:** `Tabs` for views of the same record (Overview, Activity, Files); an overview may open with a KPI strip of the record's own numbers.
- **Side:** metadata and activity in a panel the person can close. Edit a field or two in place; many fields edit in a `Sheet` or a page.

### List and detail

A queue (`app-shell-05`): the list fills the main column and the open record sits in a side panel; on a phone the record takes the screen with a way back. The open row is selected and ↑ ↓ move through the list. Until something is open the panel shows an `Empty`. The record's actions live in its panel header.

### Settings

- One column (`size="sm"`). Each section has a title and a sentence on what it covers, a `Separator` between sections.
- A row has its label and description at the start and its control at the end; on a phone, rows with a text field stack.
- Switches apply at once; text settings save with one button per section. Many sections become pages in a sidebar group or vertical `Tabs`.
- The danger zone is last: a destructive button opening an `AlertDialog` that names what is lost.

### Create and edit

Up to about five fields: a `Dialog`. Fields that need the list beside them: a `Sheet`. Longer: a page. The footer has an outline Cancel and the primary last, saying what it creates ("Create invoice"). Enter submits and Escape closes; edit forms open with current values, create forms with defaults and the first field focused.

### Multi-step flow

One decision per step, each titled with what it is for, and "Step 2 of 4" or a `Progress` at the top. Back at the start of the footer, the primary at the end (Continue, then the final verb), a ghost Skip on optional steps. Going back or reloading keeps every answer, and the last step shows what was chosen before it commits.

### Workbench

Open documents in a `TabStrip` above a full-width body (`app-shell-02`), a `FileTree` in the sidebar or a start panel, inspectors as end panels. Compact density, snappy motion, a shortcut for every frequent action.

### Document

One column at reading width with the title as its first line. The `Editor` with a toolbar or a menu on selected text; `Markdown` reads it back. It saves itself and says "Saved 2 min ago" in grey. Comments, the outline and the history go in a side panel.

### Chat

The transcript fills the main column between the header and the docked composer, both capped at a reading width on wide screens. Conversations are a `TabStrip` or a sidebar group with dots on the unread. See [AI and chat](#ai-and-chat).

### Sign in and sign up

Start from a `login` or `signup` block: one centred 384px column with the product mark, a title, the fields, one full-width primary button, other providers as outline buttons, and a link to sign up (or in). Codes use `InputOTP`; errors stay in the form.

### Website

- **Spacious density and smooth motion.** One hero headline per page; display type for section headings, prices and proof numbers; a lead under each heading.
- **Header,** about 64px: the logo, the navigation, a ghost "Sign in" and the filled call to action at the end.
- **Hero:** what the product does, a lead, one filled and one outline button, then the product itself on a raised surface at the app's own density.
- **Sections** in one container up to 1152px, one idea each, neighbours in different layouts. The hero and the closing call to action are centred; the rest start at the container's edge.
- **Order:** hero, proof, what it does, how it works, pricing, questions in an `Accordion`, a closing call to action, a footer, with one call to action worded the same everywhere.
- **Features** are an icon, a subtitle and a line of caption with no card around each. **Pricing** is one `Card` per plan; the recommended plan has a `Badge` and the only filled button.
- **Motion:** content may fade and rise a few pixels into view, once.

## SaaS features

The pages almost every product needs, each built from a pattern above.

### Billing and plan

- **The plan card first** (eight columns, thirds): the plan's name and status `Badge`, the price and renewal date ("Renews on Dec 1"), "Change plan" (outline) and, when the plan has limits, "Upgrade" (filled). Beside it in four columns: the payment method with its brand logo and "Update".
- **Usage under it:** a goal card per limit ("7,240 of 10,000 API calls", `Progress`, "Resets on Dec 1"); a warning badge at 80%, an `Alert` with the upgrade action at 100%.
- **Invoices** in a table card: the date, the amount (end-aligned), a status `Badge`, a named download icon button.
- **Changing plan** is a page of plan cards with the current one marked; the confirmation shows the new price and what is charged today. **Cancelling** is a destructive button at the end opening an `AlertDialog` that names the end date.

### Team and members

- A `Table` of members: the `Avatar` with the name and the email under it in grey, the role as a `Select` an admin changes in place, the last activity, and a "More" menu with "Remove member…" last.
- "Invite people" is the primary action: a `Dialog` with a `Textarea` for several addresses and a role `Select`. Pending invites sit above the members with "Resend" and "Revoke".
- Roles are explained once, in a `HoverCard` or under the title, never per row.

### Integrations

A grid of connection cards (thirds) grouped under headings by kind, with `Search` and a category `ToggleGroup` in the toolbar. Each card has the logo, the name, one line on what it does, and "Connect" (outline), or once connected a success `Badge` and "Manage". Connecting opens a `Dialog` or the provider's flow, and the card changes in place with a toast.

### API keys and webhooks

Keys are a table: the name, the key masked to its last four characters in monospace, created and last-used dates, and "Revoke…" in its menu. "Create key" opens a `Dialog` that shows the new key once in `SyntaxHighlight` with Copy, and says it won't show again. Webhooks are a table of endpoints with a status dot for the last delivery; a row opens its deliveries in a `Sheet`.

### Notifications

An inbox in a `Popover` from a bell icon button with an unread count. Rows are `Item`s: the actor's `Avatar`, what happened ("Ana commented on Q4 plan"), the relative time, a dot while unread; clicking opens the object and marks it read, and "Mark all as read" sits in the header. Preferences are a settings table of events against channels.

### Activity and audit log

A `DataTable` of time, actor, action, the object as a link and the source (IP, API key), newest first, with actor, action and period filters in the URL and a CSV export of the filtered rows. A row opens the full event, with before and after values, in a `Sheet`.

### Onboarding and setup

A checklist card at the top of the overview until it is done: "3 of 5 done" with a `Progress`, then an `Item` per step with a done mark, a one-line reason and its action; the next step is the only filled button. It can be dismissed, and leaves with a toast when the last step is done. Empty states elsewhere point at the step that fills them.

### Reports and exports

A report is a dashboard with a fixed period and filters, a title that states them ("Revenue, October 2026"), and Export and Share in the header. Exports run in the background: "Exporting…", then a toast with "Download", or an email for large ones.

## States

Every region answers each of these, designed with the happy path:

- **First load:** `Skeleton`s in the content's shape; the frame, the title and each card's header render at once.
- **Refreshing:** keep the content, with a `Spinner` in the control that triggered it. **Submitting:** the button disabled with a `Spinner` and an "-ing…" label. **Streaming:** shimmering status text.
- **Empty, first use:** `Empty` with an icon, a title naming what will be here, a sentence on why it's useful, the primary action. **No results:** `Empty` naming the search, with a button that clears the filters.
- **Field error:** a red ring and a message under the field. **Section error:** an error `Alert` with Retry; loaded regions stay. **Action failed:** an error toast with the reason and Retry; typed input is kept. **Not found:** `Empty` with the reason and a way back.
- **No access:** `Empty` saying what is restricted and who can grant it. Actions a person can never take are left out; ones they could take are disabled.
- **Success:** the result itself (the new row, the changed value) and a toast. A success screen only ends a flow.
- **Disabled:** half opacity, with the reason in a description or tooltip when it isn't obvious.
- **Irreversible:** an `AlertDialog` naming the object and the consequence. **Reversible:** act at once, Undo in a toast. **Unsaved changes:** confirm on leaving.
- **Selected:** the stronger wash. **Long or missing value:** names shorten with a tooltip; a missing value is a grey "None", so the row keeps its shape.

## Accessibility

- **The components own keyboard and screen-reader behaviour;** keep it. Custom interactive parts follow the standard pattern for their kind in full.
- **Focus is always visible** and goes where the work is: into a dialog, back to its trigger, to the first invalid field.
- **Everything has a name:** icon buttons, dialogs, sheets, images, form controls, charts (`label`).
- **Contrast** holds while colour comes from the roles, tested to AA in both themes. **Colour never works alone:** pair it with an icon, a sign or a label.
- **Targets** are at least 24px in compact regions and 44px on touch screens. **Reduced motion** is respected everywhere.
- **Headings:** one main heading per page, then levels in order. A stat strip is a description list (`dl`).
- **Toasts** disappear, so anything someone must act on also lives in the page. Check every screen with the keyboard alone and an automated checker.

## Content

- **Sentence case** everywhere. Labels and titles take no final period; descriptions and messages are full sentences.
- **Buttons** are a verb and its object, and the verb follows the action through the flow: "Delete project" opens "Delete Acme Inc.?", confirmed by "Delete".
- **Errors** say what happened and how to fix it, without blame. **Empty states** say what will be here and how to start.
- **"…"** ends an item that opens a dialog ("Rename…") and a label in progress ("Saving…").
- **Numbers and dates** follow the person's locale; recent times are relative ("5 min ago").
- **One name per thing,** in the person's words. **Short first:** a title is a few words, a description one sentence, a stat's label three words at most.
- **Design with real content:** real names and magnitudes, the longest value and the emptiest.

## Do's and Don'ts

- Do choose the component and its variant first; don't restyle a component's colour, type or size.
- Do set density on the region; don't resize components one by one.
- Do take colour from the roles; don't pick colours by hand, in either theme.
- Do separate layers with the surface ladder; don't add borders or other shadows to surfaces.
- Do keep one filled button per region; don't put two primaries side by side.
- Do put a page of cards on the 12-column grid in one rhythm; don't mix 8 + 4 rows with four-across rows.
- Do align everything in a card to its inset; don't let a list's icons or a table's text drift off the title's line.
- Do let surfaces, type and space carry the page; don't decorate with gradients, glows, blurred glass, icon tiles or bands of colour.
- Do group with space, then a heading, a `Separator`, a `Card`; don't nest cards or wrap a page in one.
- Do show status with `Badge`, `Alert` and status dots; don't use a coloured side border or a tinted row.
- Do compare periods with a dashed grey line; don't use two axes or coloured comparison areas.
- Do state the period and the comparison once; don't repeat "vs last month" on every number.
- Do align text to the start in apps; don't centre lists, forms, stats or body text.
- Do let motion follow the roles; don't animate app content in or move things for decoration.
- Do use the component made for the role (`Separator`, `Skeleton`, `Badge`, `Alert`, `Empty`, `Kbd`) and the App Shell's parts; don't rebuild them.
- Do confirm only what can't be undone; offer Undo for the rest.

### Review checklist

A screen is done when every line holds. Check it in the running app, never from the code alone.

- [ ] The screen's job fits in one sentence, and its focal point is the first thing seen.
- [ ] Each region has one primary action; every icon-only button has a name and a tooltip.
- [ ] Title, toolbar and body share one start edge; space is tighter inside groups than between them.
- [ ] A page of cards uses one grid rhythm; gutters continue down the page and cards in a row are equal height.
- [ ] Inside each card, the title, values, list icons and table text start on the card's inset.
- [ ] Every number has its unit and period and, where it changed, a signed delta coloured by whether the change is good.
- [ ] Colour appears only where it means something: the action, a selection, a status, a chart series.
- [ ] Light and dark both read well; surfaces follow the ladder, with no borders or stray shadows.
- [ ] It works with the keyboard alone, with focus visible on every stop.
- [ ] It works on a phone and a wide desktop, with no label cut off at phone width.
- [ ] Density and motion match the product mode.
- [ ] Loading, empty, error and disabled states exist and use their components.
- [ ] It holds with the longest name, the largest number and no data at all.
- [ ] Copy is in sentence case, buttons are verbs, errors say how to fix.
- [ ] An automated accessibility check reports no violations.
