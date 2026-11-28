---
version: alpha # the DESIGN.md format's version
fabricatorVersion: 0.9.0 # the Fabricator UI release
name: Fabricator UI
description: >-
  Calm, precise interfaces for SaaS apps, dashboards and websites: neutral
  surfaces lifted by shadow, colour kept for meaning, one grid with one edge,
  rich controls in place of empty fields, and size and motion set per region.
# Token values come from the project's look; the sections below describe them.
omitted: [colors, typography, rounded, spacing, motion, components]
---

# Fabricator UI

The design guide for products built with Fabricator UI. Read it as a designer would: it decides what a screen is for, how it is laid out, and which component each part calls for. How to write a component (props, parts, base differences) is in its docs page (`npx fabricator-ui@latest docs <name>`); working layout code is in the fabricator skill's recipes. Read the docs of every component you use before writing with it.

- **Any screen:** follow [Designing a screen](#designing-a-screen) and check the result against [the review checklist](#review-checklist).
- **A dashboard or any page of cards:** [The grid](#the-grid), [Cards](#cards) and [Dashboards](#dashboards).
- **A form, a settings page or any input:** [Forms and settings](#forms-and-settings).
- **A product feature** (billing, members, integrations): [SaaS features](#saas-features).

**Using it in your project:** keep this file at the project's root and point your agent instructions at it. Rewrite the first paragraph of the Overview for your product, and delete the patterns you will never build. Keep the rules.

## Overview

Fabricator interfaces are calm and exact, and they feel alive under the hand. Neutral surfaces, one clear action, quiet chrome and the content in front. Colour carries meaning (the main action, a selection, a status, a chart series), so it stays rare and reads at once. People choose more than they type: a switch, a slider, a segmented control or a card to pick is always nicer than an empty field.

### The look

- **Neutral first.** A product starts black, white and grey. The main action is the darkest thing on the screen; the only hues are statuses, charts, avatars and logos, until the brand adds one of its own.
- **Lifted surfaces.** Cards, menus and dialogs sit above the page on a soft shadow with a hairline edge. That shadow is the edge, so surfaces carry no border.
- **Small and precise.** Interface text is 13px and controls are 36px tall. Nothing is oversized to look friendly.
- **Aligned to the pixel.** A page has one start edge and one grid; a card has one inset. The title, the toolbar, the cards and the first word in every card sit on those lines.
- **Soft geometry.** Controls have 8px corners and containers slightly rounder ones, so a row sits evenly inside its container.
- **Quiet chrome.** Navigation, labels and metadata rest in grey and come forward only when pointed at or selected.
- **Alive under the hand.** One highlight glides to whatever the pointer is nearest, a selection slides to its new place, a button gives a little when pressed, a chart draws itself in. All of it is built in.
- **One system at every size.** A dense dashboard, a roomy website and a phone use the same components at a different density and speed.

### Product modes

Pick the mode for the product, then for each region that differs (a marketing page inside an app, a dense table inside a spacious page).

| Mode    | For                                   | Density  | Motion            | Frame                             |
| ------- | ------------------------------------- | -------- | ----------------- | --------------------------------- |
| App     | Product UI, overviews, settings       | Default  | Default or snappy | The App Shell                     |
| Tool    | Operations dashboards, admin, editors | Compact  | Snappy or instant | The App Shell, compact toolbars   |
| Website | Marketing, landing pages, pricing     | Spacious | Smooth            | A site header and centred content |

### Principles

1. **Compose, then configure.** Reach for the component, then its variant and size. The component owns its colour, type, corners, spacing, motion and states; you decide where it goes.
2. **Choose before you type.** Every answer that comes from a set, a range or a date is picked with a control made for it. A text field is for what only the person can write.
3. **One primary action per region.** The filled button marks what the region is for. Everything else is quieter.
4. **Hierarchy from space, surface, weight and grey.** Space groups, height separates layers, grey steps content back, size and weight make titles. Colour comes last, and dividing lines not at all.
5. **One grid, one edge.** Every region, card and row starts on a shared edge, and every gap is a step of the spacing scale. Alignment is most of what makes a screen look expensive.
6. **The region decides the size.** Density is set on a region and everything inside follows it.
7. **Every view has all its states.** Loading, empty, error, partial and disabled are designed with the happy path.
8. **The keyboard is a first-class pointer.** Every action is reachable from it, focus is always visible, and frequent actions have shortcuts the interface shows.

### Designing a screen

Work through these in order. Each step is done when its last sentence is true.

1. **Name the job.** One sentence: who is on this screen and what they came to do ("A finance lead checks this month's revenue and chases the failed payments"). Done when it names one person and one task; two jobs are two screens, or a screen and a panel.
2. **Know the project:** its mode, its look (brand hue, shape, density), web or React Native, and the installed components. Done when you know all four.
3. **Pick the pattern.** The closest [pattern](#patterns) or [dashboard type](#dashboard-types) sets the regions; start from a block or a recipe. Done when every region has a name (header, toolbar, KPI row, body, panel).
4. **Rank the content:** what the job needs first gets the top of the main column and the primary action; the rare case goes into the [page menu](#the-page-menu), a panel or its own page. Done when the screen has [one focal point](#hierarchy).
5. **Lay out the regions** on [the grid](#the-grid) with space and alignment first, then surfaces where space isn't enough, and never a dividing line. Done when the screen reads as plain blocks of text and gaps, and every gutter continues down the page.
6. **Choose the components** from [Wrappers by scenario](#wrappers-by-scenario), [Choosing a control](#choosing-a-control) and [Choosing a component](#choosing-a-component). Done when nothing is hand-built that a component covers, and no text field asks for something a control could offer.
7. **Design every state** in the same pass (see [States](#states)). Done when each region answers loading, empty, error, partial, disabled and long or missing values.
8. **Write the words** (see [Content](#content)) with real data: real names, real magnitudes, a negative change, an empty list. Done when every button is a verb and every error says how to fix it.
9. **Review** the running screen against [the checklist](#review-checklist): light and dark, phone and wide desktop, keyboard only.

### Hierarchy

A screen has a budget of emphasis, and the calm look comes from spending little of it.

- **One focal point per screen:** the page title with its primary action, or the one number or document the person came for. Squint: the focal point and the primary action are the two things still visible.
- **Spend emphasis in this order** and stop at the first that works: position and space, size, weight, dark text against grey, a raised surface, colour.
- **One step at a time.** A title is larger or heavier than its neighbours, never larger, heavier and coloured at once.
- **Equal things look equal.** Rows of a list, cards of a grid and fields of a form share one size, one alignment and one set of parts. A difference in look means a difference in meaning.

## Built into Fabricator

Most of what makes a screen feel finished is already in the components. Use it; never rebuild it.

- **Motion:** hover fades, presses that give, gliding highlights, sliding selections, popups that grow from their trigger, charts that draw in and morph. One speed per region (`data-motion`) retimes it all, and reduced motion is handled.
- **Fluid hover:** one gliding highlight in menus, selects, tabs, toggle groups, the sidebar, accordions, table rows and the file tree, never a hover colour per row.
- **Density:** one setting (`DensityProvider`) sizes every control, row, icon, text and gap.
- **Colour roles and surfaces:** primary, secondary and four statuses tested for contrast in both themes; a ladder of surfaces with their own shadow and edge.
- **Charts:** a colour-blind-safe palette, crosshairs, tooltips, legends, keyboard inspection, a table for screen readers.
- **The App Shell:** sidebar, header, panels, shortcuts, phone layouts and desktop windows, remembered between visits.
- **Loading:** a quiet `Skeleton`, a chart's `loading`, `DataTable`'s skeleton rows and refresh bar, shimmering text, `Spinner`, `Progress`. See [Loading](#loading).
- **Focus, keyboard, cursors, names, sounds:** every component handles its keys, focus ring, cursor and roles; optional quiet sounds and haptics sit behind a setting.

## Colors

### Neutral by default

The page, the surfaces and the text are neutral, and so is the main action: until a project picks a brand hue, primary is the text colour itself, near black in light mode and near white in dark.

- **Text has two steps.** The foreground for headings, values and labels people act on; the muted grey for descriptions, captions, metadata, placeholders, resting navigation and the icon beside a label. A third level comes from size or weight, never a third grey.
- **No dividing lines.** Space groups and separates, and a surface lifts what must stand apart (see [Separating without lines](#separating-without-lines)). The only lines are the few a component draws to be read: a table's faint row rules, a field's frame, the focus ring.
- **Hover and selection are washes:** a faint translucent wash under the pointer, a stronger one for pressed or selected, with no coloured edge or text.
- **Focus is one blue ring** in both themes and every palette.

### Colour roles

Six roles carry the interface's colour, each with one meaning everywhere:

- **Primary:** the main action, and "on" or "selected": the filled button, links, checked controls, a switch that is on, a slider's range, progress, a selected date.
- **Secondary:** a soft second action.
- **Info:** neutral information, work under way. **Success:** done, healthy, a change that went the right way. **Warning:** late, or needs attention soon. **Destructive:** error, invalid, irreversible, a change that went the wrong way.

Rules:

- **A status colour always means its status.** Green is never decoration and red is never emphasis. Brand accents use primary.
- **Colour never carries meaning alone.** A trend pairs its green with an arrow and a sign; an invalid field pairs its red ring with a message.
- **Status hues stay in their family:** info blue, success green, warning orange to yellow, destructive red.
- **Destructive is soft:** a red tint with red text, so a dangerous action doesn't shout before it is confirmed.
- **Colour you can use freely** comes with content: avatars in colour, company logos, file-type icons, chart series, a colour the person picked. They make a screen lively without spending the roles.

### Brand colour

A brand enters through the project's look ([Get started](https://fabricator-ui.vercel.app/create) or the [Colors page](https://fabricator-ui.vercel.app/docs/foundations/colors)), with every fill and state tested for contrast in both themes. One brand hue is enough: give it to primary and keep the surface tint low. The hue shows in the main button, links and selected controls; backgrounds, headings and stat values stay neutral.

### Dark mode

One design covers both themes: a screen built from the components and the roles needs no second pass. In light mode raised surfaces are white and the shadow shows their height; in dark mode each level is a step lighter. Check every screen in both.

### Charts

Series take the chart palette (blue, orange, aqua, amber, magenta, green, violet, red) in the order of the chart's config. Every slot keeps 3:1 against the page and the card, and neighbours stay apart for red-green colour blindness.

- **Colour means the series, nothing else,** and a series keeps it when another is hidden. Categories of one series share its colour.
- **Eight at most;** a ninth is grey, so fold the smallest into "Other". Pie, treemap and sankey read best with three or four.
- **A comparison is grey:** a previous period or a target is a dashed series in the muted grey.
- **A brand colour is a series' choice** (`color: "primary"`), never a change to the palette. Only `StatusBar` and candlesticks use status colours.
- **Text stays in the text colours,** beside a coloured key.

## Typography

Inter throughout, with a monospace face for code, keys and IDs. Interface text is 13px and titles only a little larger. Medium and semibold are drawn lighter than usual, because Inter reads heavy at interface sizes.

Components set their own type; the roles are for the text you write around them. A browser's default is 16px, so text you write takes its role's size and weight, never the default.

| Role       | Size       | Weight   | Use                                                       |
| ---------- | ---------- | -------- | --------------------------------------------------------- |
| Hero       | 48 or 60px | Medium   | The one headline of a website page                        |
| Display    | 28px       | Semibold | Website section headings, prices, proof numbers           |
| Page title | 24px       | Semibold | The title of an app page: `AppShellPageTitle`             |
| Metric     | 24px       | Semibold | A stat's value or a chart's headline, tabular             |
| Title      | 16px       | Semibold | Section headings inside an app page                       |
| Subtitle   | 14px       | Medium   | Card titles (`CardTitle`), group headings, feature titles |
| Lead       | 15px       | Regular  | The sentence under a page title or a hero, in grey        |
| Body       | 13px       | Regular  | Body text, a stat's label                                 |
| Caption    | 12px       | Regular  | Descriptions, group labels, errors, metadata, in grey     |

- **Body, caption, subtitle and title follow the density:** body is 12px compact and 15px spacious.
- **Two weights per view:** regular for text, medium or semibold for titles and values.
- **Weight is state.** Hover changes colour; weight changes only for state that lasts (checked, selected, open).
- **Sentence case everywhere,** with no all-caps labels or wide letter-spacing.
- **Numbers line up:** figures that update or sit in a column use tabular figures, and in a column they align to the end.
- **Long text** is capped near 65 characters, with balanced headings.
- **Documents are their own role:** `Markdown` or `Editor` at 14, 16 or 18px, unaffected by density.

## Layout

### Density

Density sizes every component at once. It is the main way a Fabricator product changes character.

|                                  | Compact                  | Default | Spacious                      |
| -------------------------------- | ------------------------ | ------- | ----------------------------- |
| For                              | Dense dashboards, tables | Apps    | Websites, touch-first screens |
| Controls, menu rows, table heads | 28px                     | 36px    | 44px                          |
| Body text                        | 12px                     | 13px    | 15px                          |
| Icons                            | 14px                     | 16px    | 18px                          |
| A card's inset                   | 12px                     | 16px    | 20px                          |

Set it on the widest region it is true for. A single control changes size (`size="sm"` or `"lg"`) only to differ from its neighbours. If a region feels too big, it is in the wrong density.

### Spacing

Components space their own insides. Between them, space follows a 4px grid, one step per relationship, and tightens or loosens with the density.

| Relationship                               | App  | Website                    |
| ------------------------------------------ | ---- | -------------------------- |
| A heading and its lead                     | 4px  | 12px                       |
| Controls in one row                        | 8px  | 12px                       |
| Cards in a grid; a heading and its content | 16px | 24px; 40px under a heading |
| Fields of a form                           | 20px | 24px                       |
| The bands of a page (title, toolbar, body) | 24px | 40px                       |
| Sections of a page                         | 40px | 64 to 96px                 |

Page padding comes from `AppShellContent`: 16px on phones, 24px on desktop. Tighter space binds and more space separates: a label sits closer to its control than to the next field, and a section sits further from the next than any two things inside it.

### Separating without lines

Layouts never draw a line to part things. Reach for these in order and stop at the first that works:

1. **Space.** More space between groups than inside them, following the steps above. Most separations need nothing else.
2. **A heading.** A Title-role heading opens a section; with 40px above it, the section needs no rule.
3. **Alignment.** Things that share a start edge and a size read as one set; a different edge or size reads as another.
4. **A surface.** Lift what must stand apart: a `Card` on the page, the main column and panels on the App Shell's frame, a muted well inside a card (the faint wash a surface's children sit on, such as `Item variant="muted"`). A step of the ladder separates more clearly, and more quietly, than a line.

So no `Separator` between sections, no border on a column or panel, no rule between settings rows, stat cards or list items, no bar between toolbar groups, no divider under a card's header. Only components keep the lines they need to be read: a table's faint row rules, a field's frame, a menu's group separators.

### Widths

Use the App Shell's content sizes on `AppShellContent`, which centre the page with its padding:

- **`size="sm"`, 672px:** forms, settings, single-column flows. Sign-in and one-task cards are about 384px.
- **`size="md"`, 896px:** most app pages.
- **`size="lg"`, 1152px:** dashboards and dense pages.
- **No size:** tables, boards, editors and transcripts take the full main column.

### The grid

Pages of cards (dashboards, overviews, settings hubs, integration galleries) sit on one 12-column grid with 16px gutters inside the content column.

- **Lay out by the column, not the window.** The App Shell's main column narrows when the sidebar or a panel opens, so the grid responds to the column's own width (container queries): 12 columns from an 896px column, one below.
- **One rhythm per page,** so every gutter continues down the page:

| Rhythm   | Rows it allows                | Gutters at       |
| -------- | ----------------------------- | ---------------- |
| Quarters | 4 stats, 6 + 6, 3 + 3 + 6, 12 | 3, 6 and 9 of 12 |
| Thirds   | 3 stats, 8 + 4, 4 + 4 + 4, 12 | 4 and 8 of 12    |

- **Rows are equal.** The cards of a row share one height and the same parts in the same order; charts in a row share one height.
- **Below 896px** cards stack in order of importance, and a row of stat cards goes two by two.
- **Half a laptop is about 480px.** On a 1280px screen with the sidebar open, a half-width card is about 480px: design for that, not for a 1920px monitor.

### Wrappers by scenario

Every part of a screen has a component made to hold it. Reach for it before a plain box.

| Scenario                                         | Wrap it in                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| The app around every page                        | `AppShell`, with `AppShellContent` at the page's width            |
| A section of a page                              | Nothing: a Title-role heading with 40px of space above it         |
| One discrete thing (a metric, a chart, a plan)   | `Card`, with its header, content and footer                       |
| A region that stands apart inside a card         | A muted well, such as `Item variant="muted"`                      |
| A group of fields with a heading                 | `FieldSet` with a `FieldLegend` and a `FieldDescription`          |
| Fields that belong together                      | `FieldGroup` of `Field`s: label, control, help                    |
| A setting: name and description beside a control | `Field orientation="responsive"`, `"horizontal"` for any `Switch` |
| A choice that needs a sentence to explain it     | Choice cards: a `FieldLabel` around a horizontal `Field`          |
| A list of people, files, apps or tasks           | `ItemGroup` of `Item`s: picture, title, description, actions      |
| Folders browsed as tiles, as a drive shows them  | A grid of `Folder`s, `w-full` in an `auto-fill` grid              |
| Records compared by column                       | `Table`; `DataTable` when people sort, filter or edit             |
| Views of one thing                               | `Tabs` with the default `TabsList` or a `Select`                  |
| Options most people never touch                  | An `Accordion` or `Collapsible` named "Advanced", closed          |
| Details beside the current view                  | An `AppShellPanel`, or a `Sheet` for a task                       |
| Nothing to show yet                              | `Empty`, with an icon, a title, a sentence and an action          |
| Media at a fixed shape                           | `AspectRatio`                                                     |
| A region that scrolls on its own                 | `ScrollArea`                                                      |
| Panes the person sizes                           | `Resizable`                                                       |

### The app frame

Apps live in the `AppShell`. It replaces a hand-built sidebar, header and panel layout and handles what those get wrong: phones, focus, remembering the layout, desktop windows.

- **Sidebar:** `WorkspaceSwitcher` at the top, `AppNav` in the middle, `UserMenu` at the bottom. It sits on the frame, a step darker than the page, so the main column and panels read as cards in front.
- **Header:** the breadcrumb, the page's actions (`AppShellHeaderActions`) with the primary action when the page has one, [the page menu](#the-page-menu), and the panel trigger. Once the `AppShellPageTitle` scrolls away, the header shows it.
- **Content:** the page, the one thing that scrolls.
- **Side panels:** details, activity, an inspector, which the person opens, resizes and closes. They dock while there is room, float when there isn't, and become a bottom drawer on phones.
- **Optional rows:** a `TabStrip` of open documents above the header, a status bar for what is true of the whole workspace, a bottom nav on phones.

### Page anatomy

An app page reads top to bottom in four bands at most, 24px apart:

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

### The page menu

The ellipsis at the end of the header (`menu` on `AppShellHeaderActions`) holds what belongs to the whole page without being used on every visit: what the page shows, how it refreshes, sharing and export, the page's settings. It keeps the header to a breadcrumb, two or three actions and the primary action, and keeps setting controls off the content.

- **What goes where.** A control used on most visits stays on the page: the period in the toolbar, a card's own switch in its header. A page-wide setting changed now and then goes in the page menu. A card's own rare options go in that card's ghost "More" menu. Settings that need fields open a `Sheet` from the page menu, or live on a settings page.
- **Groups, in this order:** what the page shows, under a "View" label (checkbox items such as "Compare with previous period"; sub-menus for longer choices such as which cards show and auto-refresh); sharing and export; the page's own settings ("Dashboard settings…", "Reset layout"); anything destructive, alone and last.
- **Behaviour:** a toggle applies at once and keeps the menu open; an action closes it. Choices persist for the person, and go in the URL when they change what a shared link shows.
- **Look:** a ghost icon button with `EllipsisIcon`, last in the header before the panel trigger, named for the page ("Dashboard options"). Every action leads with its icon; shortcuts sit at the end of their rows. Past about ten rows, the settings need their own page.
- **Phones:** the header's actions fold into the same menu as its first group, so there is one ellipsis at every width.

### Responsive

Design the phone first and widen it. Components adapt to their room: the App Shell rearranges itself by its own width (on phones the sidebar sits behind the page, actions fold into one menu and the primary action floats), and responsive fields stack. Some changes are yours: a `Dialog` becomes a bottom `Drawer`, and a table folds its columns under the name.

## Elevation & Depth

Depth is a ladder of surfaces. Each level is a background and a shadow that starts with a hairline, so a surface needs no border.

| Level    | Holds                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------- |
| 0        | A screen that stands alone (sign in, sign up, a reset): white in light, a step under the page in dark |
| Frame    | The App Shell's frame and its sidebar, a step darker than the page                                    |
| 1        | The page; in an App Shell, the main column and the side panels                                        |
| 2        | A sidebar on its own, inset regions, the default `Card`                                               |
| 3        | Raised cards, menus, popovers, sheets, drawers                                                        |
| 4        | The active tab; anything raised inside a level-3 surface                                              |
| 5        | Dialogs, alert dialogs, toasts                                                                        |
| Inverted | Tooltips: dark on a light page, light on a dark one                                                   |

- **Height means layering,** never importance: a menu over a page, a dialog over everything.
- **A child sits above its parent.** A quiet area inside a surface (a code block in a dialog) is a faint wash, never a lower level.
- **No borders and no other shadows on surfaces.** Status surfaces are the same ladder tinted with the status colour.

## Cards

A `Card` holds one discrete thing: a metric, a chart, a list of things to do, a plan, a project, a group of settings. Sections of a page that isn't a grid are separated by headings and space.

### Anatomy

- **Header:** `CardTitle` names the thing in a few words ("Revenue", "Needs attention"). `CardDescription` gives its scope: the grain, the sort, the unit ("Daily", "By monthly recurring revenue"); the page's period is in the toolbar. `CardAction` holds at most one quiet control: default `Tabs` or a `Select`, a ghost "View all" link, or a ghost "More" menu with the card's own rare options.
- **Content:** the one thing the card shows. A headline value sits above a chart; a list or table runs to the card's edges.
- **Footer:** only when it has content: a summary line, or the buttons of a settings or plan card.

### Alignment inside a card

A card has one inset (12, 16 or 20px by density). The title, the description, a headline value, a list's icons and a table's first column start on it; a table's last column and a "View all" link end on it.

- **Tables and lists reach the card's edges** so their hover wash spans the card, while their text stays on the inset. Lists keep rounded rows, inset just enough that the row's icon lands on the line.
- **Stat cards** keep the default card size, so their labels sit on the same inset as the titles of the cards below.
- **A ghost control at an edge** (a "View all" link, a "More" button) pulls out by its own padding, so its text, not its hover area, sits on the line.

### Kinds of card

- **KPI row:** three to six stat cards side by side on the grid, parted by the gutter alone. On phones they go two by two.
- **Stat:** a label, one number and its change. In a KPI row it keeps the default size, so its inset matches the cards below; `size="sm"` when six go across. **Goal:** a stat with a `Progress` and "62% of $80K".
- **Chart:** the header, a headline value, one chart.
- **List:** five to seven `Item`s to do or read, and "View all". **Activity:** `Item`s with an `Avatar` and a relative time, newest first.
- **Table:** five records edge to edge, and "View all".
- **Settings:** a group of related settings as horizontal fields, with a footer only when it holds text that saves. See [Settings](#settings).
- **Checklist:** a `Progress`, then an `Item` per setup step with a done mark and its action.
- **Object:** one record in a grid: its name and status `Badge`, a few pairs, an `AvatarGroup` of its people, its menu.
- **Plan:** name, price, who it's for, what's included, the button. **Connection:** a logo, a name, one line, a `Switch` or "Connect".

Rules:

- Lists inside a card are rows or a table, never more cards. Cards don't nest, and a whole page is never wrapped in one.
- Every card in a grid has the same parts in the same order.
- The title introduces the card, with no icon tile, coloured header, gradient or coloured border.
- Use `size="sm"` for four or more small cards across. A card that must stand off the page, such as a product picture on a website, goes up a level.

## Dashboards

A dashboard answers three questions, in order: **what needs me now**, **how are we doing** compared with before, and **where do I go to act**. Every number and row is a way into the page where the person acts on it.

### Before you lay it out

- **Name the person and the decision** ("A finance lead sees whether revenue is on track and chases what is at risk"); a metric that changes no decision is left out.
- **Four headline numbers** by default, three to six at most; more belong on a second page or a report.
- **One question per card,** and pick the [type](#dashboard-types) to start from.

### The order of a dashboard

```text
Header      Acme Inc > Overview                       Share  ...  [Primary]
Title       Overview
            Revenue, customers and what needs you today.
Toolbar     [7 days|30 days|90 days|12 months]  Compared with the previous
            30 days                            Updated 2 min ago  (refresh)
Alert       Only while something is wrong                              (12)
KPI row     MRR | Active customers | Churn rate | Revenue per account (12)
Hero chart  Revenue, this period against the last, with its headline   (12)
Work        Needs attention (6)            | Top customers (6)
Breakdowns  Revenue by plan (6)            | Recent activity (6)
```

1. **Alert,** only while something is wrong, with its action ("2 payouts failed. Update bank details").
2. **KPI row:** the headline numbers the job depends on.
3. **Hero chart:** the trend of the most important number, full width (quarters) or eight columns (thirds).
4. **Work:** what needs the person, as a list with ways in; then the records they check most, as a short table.
5. **Breakdowns and archive:** rankings, mixes, sources, recent activity. Nothing lower is more important than anything above it.

### Choosing a widget

Spans are columns of 12.

- **Headline numbers:** the KPI row, 12. **One number against a target:** a goal card with `Progress`, 3, 4 or 6; a `RadialChart` for a few targets at once.
- **A trend against the last period:** `LineChart`, the previous period dashed and grey, 12 or 8.
- **A total and its parts over time:** a stacked `AreaChart`, or a stacked `BarChart` per period, 12, 8 or 6. **A mix changing over time:** `CompositionChart`.
- **A ranking (plans, pages, sources):** `BarChart layout="horizontal"`, sorted, top five to eight, 6 or 4.
- **A mix of a few parts:** `DonutChart` with its list, 8 or 12.
- **Stages that lose people:** `FunnelChart`. **Activity per day:** `HeatCalendar`. **Uptime:** a `StatusBar` per service.
- **Things needing action:** a list card with a status `Badge` per row, 6 or 4. **A few records:** a table card, 6 or 12. **What's next:** `EventCalendar` in its agenda view. **Who's involved:** an `AvatarGroup`.
- **Many records to work through:** a `DataTable` on its own page, linked from a card.

### Make it engaging

A dashboard is boring when every card is the same shape and every value is grey text. Use the system's range before reaching outside it:

- **Vary the shapes:** a row of stat cards, one wide chart, a list with icons, a short table, a ranking of bars, a goal with progress. Six identical chart cards read as a wall.
- **Show people and things:** coloured `Avatar`s, an `AvatarGroup`, company logos, file-type icons, status dots.
- **Show progress and state:** `Progress` for goals and limits, `StatusBar`, `HeatCalendar`, status `Badge`s, a delta on every number that moved.
- **Let it respond:** the headline follows the pointer, rows open their record, card controls switch views in place, charts morph with the period.
- **Design the empty and first-run moments:** an `Empty` with one clear action, a setup checklist, never a blank card.

### Numbers

- **Locale formatting,** compact from 10,000 in stats and axes ("$48.3K"), full in tables and tooltips. Money in whole units in stats, cents in transaction tables; units in the same type ("320 ms"); a rate changes in points ("−0.4 pt").
- **Deltas** are a status `Badge` with a sign, one decimal and an arrow: success when the change is good, destructive when bad, flipped for metrics where down is good (churn, cost, latency). No change is an outline "0%".
- **Say the comparison once,** in the toolbar; each stat shows its delta and, with room, its previous value ("from $42,960").
- **Freshness** ("Updated 2 min ago") ends the toolbar with a refresh button; live data says "Live" with a status dot.
- **Missing is not zero:** a grey "No data" with no delta; zero shows "0"; a tiny share "<0.1%". Demos use real magnitudes, a negative change and an empty card.

### Period and filters

- **The toolbar controls the page:** period presets in default `Tabs` or a `Select`, a range `Calendar` in a `Popover` for custom dates, then filters and freshness. A card with its own period says so in its description.
- **Period and filters live in the URL.** A new period keeps the old numbers on screen, dimmed, until the new ones arrive. On phones the filters fold into a "Filters" button that opens a `Drawer`.

### Charts on a dashboard

- **One question and one axis per chart;** two measures on different scales are two cards.
- **Comparisons are lines:** a `LineChart` with the previous series dashed and grey. `AreaChart` is for one series or stacked totals; under a comparison it becomes a grey fog.
- **Rankings are horizontal bars,** sorted, five to eight. **A donut with its list needs about 560px;** in a half-width card use bars.
- **Heights:** the hero chart about 256px, others about 224px, one per row. The headline follows the pointer (`onActiveChange`) and values are formatted (`formatValue`).

### Widget states

- **Loading:** the card's frame, title and description render at once; its content area at its set height is one `Skeleton` block or the chart's `loading`, and a row of cards appears together (see [Loading](#loading)).
- **Empty:** an `Empty` at the content's height with what will show and an outline action ("Connect Stripe"). **Error:** an error `Alert` in that card with Retry; others keep their data. **Partial data:** said in the description or a warning `Badge`. **No access:** leave the card out.

### Polish

Check each on the running page:

- The title, the toolbar and every card's edge start on one line; inside every card, everything starts on the inset. Gutters continue down the page; cards in a row share a height and their parts.
- Values use the metric role with tabular figures; labels are three words at most and never cut off on a phone.
- At most one filled button on the dashboard, often none. Nothing is parted by a line.
- No greeting banner, no illustration, no paragraph of "insights" restating the numbers.

### Dashboard types

- **Overview,** the home page (default density and motion, quarters): the KPI row, the hero chart, needs attention beside the top records, then breakdowns beside recent activity.
- **Analytics,** one area over time (default, snappy, quarters): filters in the toolbar, the KPI row, a hero chart with a metric picker, rankings in halves whose rows link to the filtered view, a table.
- **Operations,** a system's live health (compact, instant, thirds): a `StatusBar` per service, live numbers with status dots, latency lines (p50, p95) in eight columns beside open incidents in four, a log table, and "Live" with a Pause button.
- **Revenue** (default, quarters): an MRR row of stat cards, MRR movements as a stacked `BarChart` per month, plans ranked beside failed payments, a transactions table.
- **Usage,** against the plan (default, thirds): a goal card per limit, usage over time in eight columns beside the plan card in four, usage per member or project as a table.

A person often sits between two types (an on-call engineer reading a week of analytics). Take the type of the data, keep [the order of a dashboard](#the-order-of-a-dashboard), and give anyone with things to act on a work band right under the hero chart.

## Forms and settings

### Choosing a control

Every text field is a question the person must answer from memory. Replace it whenever the answer comes from a set, a range, a date or a picture. Pick by the shape of the answer:

| The answer is                            | Use                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------- |
| On or off, applied at once               | `Switch`                                                             |
| Yes or no, sent with a form              | `Checkbox`                                                           |
| One of two to four values on one line    | Single-select `ToggleGroup` with a shared track                      |
| One of a few that need a sentence each   | Choice cards: a `RadioGroup` of horizontal `Field`s                  |
| Five or more, or labels that do not fit  | `Select`                                                             |
| One of many, or found by typing          | `Combobox`                                                           |
| Several of many (tags, people, regions)  | `MultiSelect`, chips in the field                                    |
| Several independent options              | `Checkbox`es in a `FieldSet`, or switch choice cards                 |
| A level, an amount or a share in a range | `Slider`, value shown; `showSteps` for stops; two thumbs for a range |
| An exact number                          | `NumberField` with steppers; `format` for currency, percent, units   |
| A score                                  | `Rating`                                                             |
| A date, a month or a year                | `DatePicker` (`granularity`; `editable` reads "tomorrow at 9pm")     |
| A time or a span on one day              | `TimeInput`, `TimeRangeInput`                                        |
| A date range                             | A range `Calendar` in a `Popover`, with presets beside it            |
| A colour                                 | `ColorPicker`, with the brand's `swatches` first                     |
| A file or an image                       | `FileUploadDropzone`; `FileUploadField` in a form, with previews     |
| A one-time code                          | `InputOTP`                                                           |
| A URL, a price, a handle, a size         | `InputGroup`, the fixed part as an addon: "https://", "$", "@"       |
| Something only the person can write      | `Input`, `Textarea`, or `Editor` for formatted text                  |

**Short single choices.** Keep every label visible on a shared track. Use `Tabs` with the default `TabsList` and a `TabsContent` panel for each view. Use a single-select `ToggleGroup` for a setting or other value that changes in place. Give either control an accessible name. Use `Select` where the full labels, including translations, would wrap, clip or crowd adjacent controls.

- **Defaults are answers.** Pre-fill what you can know or guess (the workspace's currency, the person's time zone, the most common plan), so most forms are reviewed, not filled.
- **Ask less.** Leave out what can be inferred, changed later or set by an admin. Put what most people never change in a closed "Advanced" `Accordion`. A form past about seven fields is a [setup page](#setup), a [multi-step flow](#multi-step-flow) or a settings page.
- **Show the result as they choose.** A slider's value updates beside its label, a choice card shows its consequence ("Billed yearly, save 20%"), a colour previews on the thing it colours.
- **Never the browser's controls** for dates, times, numbers, files, colours or selects: the library's match the look, follow the density and behave the same everywhere.

### Laying out a form

- **One column** in `AppShellContent size="sm"`, or about 384px in a dialog; two short related fields may share a row.
- **Each `Field` stacks** a visible label, the control and the help people need while answering; the placeholder shows an example, never the label. `FieldSet` and `FieldGroup` group them under a legend, 20px apart.
- **A field's width hints at its answer.** Mark whichever of required or optional is rarer ("Company (optional)").
- **Validate on leaving a field and on submit,** never while typing: a red ring and how to fix it; after a failed submit, focus goes to the first invalid field.
- **The submit row** ends the form: the primary at the end edge, saying what it does, an outline Cancel before it.

### Settings

A stack of setting cards in one column (`size="sm"`), one per subject, in the order people need them.

- **Each card** has a title and a sentence, then one-line fields: name and one-line description at the start, the smallest fitting control at the end. `Field orientation="responsive"` for `ToggleGroup`, a `Select`, a `NumberField` or a `Slider` with its value, which stack on phones; `"horizontal"` for a `Switch` or a `ColorPicker` swatch, which stay beside their label at every width. Rows are parted by space; a text setting sits under its label at full width.
- **Switches and choices save at once,** with a quiet "Saved" toast and Undo when it matters. A card with text fields has its own Save in its footer, enabled once something changed.
- **Choice cards** for settings that change how the product behaves, each with its consequence. Many subjects become pages in a sidebar group or vertical `Tabs`.
- **The danger zone** is the last card, with a destructive button that opens an `AlertDialog` naming what is lost.

## Shapes

- **Two corner sizes:** 8px for controls, rows, badges and tooltips; about 11px for containers (cards, menus, dialogs, tab tracks, alerts, the main column).
- **Corners are concentric:** a container holds its rows with a small inset so both share a centre.
- **Full rounds** for switches, avatars, status dots and slider thumbs.
- **The shape is a project setting:** the Pill look rounds controls fully and containers with them. Design with "control corner" and "container corner" in mind.
- **Media takes the shape of its place:** the control corner inside a card, the container corner standing alone.

## Motion

Every animation has a role and comes with the components (see [Built into Fabricator](#built-into-fabricator)). Pick the speed per region: smooth for websites, default for most products, snappy for apps used all day, instant for dense dashboards. Exits are quicker than entrances, and things come from somewhere: a popup from its trigger, a sheet from its edge. App content (pages, lists, cards, stats) appears in place; charts draw in once because the motion explains the data. Waiting text shimmers. Reduced motion keeps the fades and drops the rest. Websites may let content fade and rise a few pixels into view, once, and give their words one moment per view with `TextMotion`: the hero headline and lead in sequence, a section heading as it arrives, one headline word that cycles. Text in apps (titles, labels, buttons, numbers) appears in place.

## Iconography

- **One icon library per product, one icon per meaning.** The default is Fabricator Icons, a line set at the text's weight whose strokes thicken on hover with their row or button. Never emoji, never two libraries on one screen.
- **Components size their icons** and colour them with their label; beside a label an icon rests in grey.
- **An icon supports a label.** Icon-only buttons are for actions everyone knows (close, search, more, add, refresh) and toolbars.
- **A button without a clear label names itself in a `Tooltip`:** every icon-only button, and any button whose visible text doesn't say the action (a count, an avatar, a lone value). The tooltip says the button's accessible name, one to three words in sentence case with no period ("Refresh", "Copy link", "Close panel"), then the shortcut in `Kbd` when the action has one: "Search ⌘K". Components with a `tooltip` or `shortcut` prop (sidebar rows, header actions) draw it themselves.
- **Before a label an icon names the action; after it, it shows direction:** an arrow for going somewhere, a chevron for a menu or a row that opens.
- **Menu items lead with an icon** (see [Menus and commands](#menus-and-commands)); in a list, every row has an icon or none does, so the labels share one edge.
- Company logos come from the brand set and file types from the file set.

### Images and media

- **The product is the picture:** a website shows real screens; an app shows the person's own content. Empty states and feature rows use an icon, never an illustration.
- **Hold the space:** photos, screenshots, maps and embeds sit in an `AspectRatio`. A screenshot on a page sits on a raised surface. Text over an image sits on a scrim.
- **People are `Avatar`s** with initials as the fallback; companies are their logo; files their type icon.
- **Media:** `ImageCompare` for two versions of a picture, `AudioPlayer` with its waveform, `VideoPlayer` with captions for speech.

## Components

The library covers most of what a product needs, so a screen is mostly a matter of choosing well. Names are the same on the web and React Native. For inputs, see [Choosing a control](#choosing-a-control).

### Choosing a component

- **Actions:** `Button`, `ButtonGroup`, `Toggle`; `DropdownMenu`, `ContextMenu`; `Command` in a `CommandDialog`; `HoldButton` for one action worth a second thought without a dialog, `SlideToConfirm` for a commit on a touch screen.
- **Overlays:** `Dialog`, `AlertDialog`, `Sheet`, `Drawer` on phones, `Popover`, `HoverCard`, `Tooltip`.
- **Frame:** `AppShell`, `AppNav`, `Sidebar`, `TabStrip`, `WorkspaceSwitcher`, `UserMenu`, `NavigationMenu` on websites, `Breadcrumb`, `Pagination`, `PreviewRail`, `Stepper` for a flow done in steps, `BottomNav` for a phone web app outside the App Shell.
- **Records:** `Card`, `ItemGroup`, `Table`, `DataTable`, `EventCalendar`, `FileTree`, `Folder`, `Badge`, `Avatar`, `AvatarGroup`, `Kbd`, `SyntaxHighlight`.
- **Graphs:** `Canvas` for things people connect and arrange: workflow editors, flowcharts, schemas, maps of a system; `mode="view"` to explore one, `mode="static"` for a diagram in a page.
- **Charts:** [Choosing a widget](#choosing-a-widget), plus `PieChart`, `RadarChart`, `Treemap`, `CandlestickChart`, `BumpChart`, `SankeyChart`.
- **Feedback and structure:** `Alert`, toasts, `Progress`, `SegmentedMeter` for one limit split into parts, `MorphIsland` for one live activity, `PasswordStrength` under a new password, `Spinner`, `Skeleton`, `Empty`, `Accordion`, `Collapsible`, `Resizable`, `ScrollArea`.
- **Media and chat:** `AudioPlayer`, `VideoPlayer`, `ImageCompare`, `AspectRatio`, `Carousel`; `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`, `ChatInput`, `ModelPicker`, `Questionnaire`, `BotFace`.
- **Words in motion:** `TextMotion` for a website headline that plays in, `TextMotionGroup` for a headline and lead in sequence, `TextMotionRotate` for a word that cycles.
- **Components in motion:** `Blueprint` sketches a component into place on a website (a hero's product, a feature grid in a `BlueprintGroup`), or holds its sketch with `loading` on the first load of a showcase panel. Product screens keep their skeletons.

### Buttons

- **Variants:** default (filled) for the one main action; secondary for a second real one; outline for Cancel, filters and actions inside cards; ghost for toolbars, icon buttons, card headers and rows; destructive, a red tint, to delete; link inside text.
- **Labels** are a verb and its object ("Create project"); a confirm repeats the verb. In a footer the dismissing action comes first and the primary last, at the end edge.
- **Pending:** disabled, a `Spinner` in the icon's place, the "-ing" label ("Saving…"). What goes to another page is a link, even when it looks like a button.

### Overlays

- **Dialog** for a focused task, its actions in the footer. **AlertDialog** only for what can't be undone ("Delete Acme Inc.?", the consequence, "Delete"); everything else acts at once with Undo in a toast.
- **Sheet** beside the list from the end edge, **Drawer** on touch screens, **Popover** for small interactive content, **HoverCard** for previews, **Tooltip** for an icon button's name and shortcut ([Iconography](#iconography)).
- **Two modal layers at most. Escape closes, and focus returns to what opened it.**

### Menus and commands

- Group items by how often they are used, label groups when it helps, put the destructive item last and alone, show shortcuts, and end an item that opens a dialog with "…" ("Rename…"). A menu holds actions and view toggles; a `Select` holds a value.
- **Every item leads with an icon** in a `DropdownMenu` or `ContextMenu`: the icon names the action before the label is read and gives the labels one edge. One icon per action across the product; a person, workspace or file leads with its avatar, logo or file icon. Checkbox items and sub-menu triggers keep theirs, with the check or chevron at the end. A sub-menu of values ("Every 5 minutes") is a choice list without icons; an action with no fitting icon takes `inset` to stay on the labels' edge.
- The command palette opens on ⌘K, grouped (Navigation, Actions, Recent), each item with its icon, shortcut and synonyms.

### Navigation

- Five to seven nouns at the top level, ordered by use; what people make in its own group; settings and help last. Sidebar rows are an icon and a short label, with counts and status dots at the end.
- `TabStrip` for open documents, `Tabs` or `Select` for [views of one thing](#choosing-a-control), breadcrumbs ending on the current page, `NavigationMenu` on websites.

### Data display

- **Table:** the name first, in the foreground with its avatar or logo; other cells grey; numbers end-aligned and tabular; statuses as `Badge`s; row actions in a ghost "More" menu; faint row rules and no column lines. A few records in a card read better as `Item`s.
- **DataTable** when people work the records: typed columns, the full column, a height, more rows on scroll. A row opens its record; the name is the link.
- **Badge** colour is what the state asks: success done, info under way, warning late or soon, destructive failed, outline no urgency. **Metadata** is pairs of a grey label and a foreground value.

### Feedback

- **Toast** for the result of an action, with Undo or Retry; it leaves, so anything that must be acted on also lives in the page. **Alert** for a message that stays, one per region. For waits, see [Loading](#loading).

### AI and chat

- **The transcript** is a `MessageScroller`: the person's messages in bubbles at the end edge, the assistant's replies as plain formatted text, files as `Attachment`s, day markers as `Marker`s.
- **The composer is a `ChatInput`** docked under the transcript, with the `ModelPicker` and send at its end. Clarifying questions are a `Questionnaire` in its place; an assistant's identity is a `BotFace`.

### Cursors

The cursor says what a press will do, on the web and in desktop windows. Components set their own; anything you make interactive takes the cursor of its interaction, so first decide what it does.

- **Pointer** on what acts on a click: links, buttons, toggles, triggers, menu and list rows, sortable headers, and a card or table row that opens as a whole (its inner controls keep theirs). What doesn't act keeps the arrow and gets no hover wash.
- **Text** where people type or edit text. **Grab** on what only drags (a handle, a canvas to pan); a board card opens, so it keeps the pointer, **grabbing** while it moves. **Col-resize** or **row-resize** on a resize edge. **Zoom-in** on an image that enlarges.
- **Not-allowed** on a disabled control that keeps hover for its tooltip; **progress** on a region that works but stays usable; never **wait**.
- **During a drag or resize** the whole window holds the cursor, so it doesn't flicker when the pointer outruns the edge. A desktop title bar's drag area keeps the arrow. Touch has no cursor, so nothing depends on hover.

### Platforms

- Base UI, Radix and React Aria look and behave the same; read the docs for the project's base (React Aria has no `NavigationMenu`). React Native shares the components and rules; not there yet: `DataTable`, `TextMotion` (its text shows at rest), and the time in `DatePicker`. Touch turns hover and right-click into a long press.

## Patterns

Start from the closest pattern, install its block when there is one, and remove what the product doesn't need.

- **Blocks:** `app-shell-01` (workspace app with a Details panel), `app-shell-02` (workbench with document tabs and a status bar), `app-shell-03` (classic SaaS: team switcher on top, the person's menu at the bottom, an icon rail), `app-shell-04` (desktop app in a translucent window), `app-shell-05` (mobile first, with a bottom nav), the screens `sign-in-01`, `sign-up-01`, `forgot-password-01`, `finance-01` (a dashboard), `assistant-01` (AI chat), `messenger-01`, `mail-01`, `calendar-app-01` and `board-01` (a ticket board), `login-01` … `login-05`, `signup-01` … `signup-05`, `sidebar-01` … `sidebar-16`. The App Shell blocks fill their content with placeholders; build the content from this guide and the skill's recipes, or from the screen blocks, which are finished pages.
- **Pick by what the screen is about:** the state of things ([Dashboards](#dashboards)); many records ([List](#list)); one record ([Detail](#detail)); a queue ([List and detail](#list-and-detail)); preferences ([Settings](#settings)); one record to make or change ([Create and edit](#create-and-edit)); something to configure before it goes live ([Setup](#setup)); a long task ([Multi-step flow](#multi-step-flow)); a product feature ([SaaS features](#saas-features)); open documents ([Workbench](#workbench)); one document ([Document](#document)); a conversation ([Chat](#chat)); getting in ([Sign in](#sign-in-and-sign-up)); selling the product ([Website](#website)).

### List

- **Header:** the breadcrumb and the primary action. **Toolbar:** `InputSearch`, filters, a view switch, the count at the end; active filters stay visible with one way to clear them.
- **Body:** `Table` or `DataTable` to compare, `Item`s to read one by one, `Card`s to recognise by picture. A checkbox column selects; the toolbar then shows the count and bulk actions.
- Filters, sort and page live in the URL. First use shows an `Empty` with the primary action; no results, one that clears the filters.

### Detail

The title, its status `Badge`, one primary action and a "More" menu in the header; `Tabs` or `Select` for views of the record (an overview may open with its own KPI row); metadata, people and activity in a panel that closes; a field or two edits in place, more in a `Sheet`.

### Board

A board groups work by status or another field. Put the board’s title and view controls above the scroll area. Use neutral column tracks with a status glyph and count in each header. Cards keep the title first and show only the fields people use to make decisions at a glance. Give cards and column actions separate hit targets. Provide a move action alongside drag and drop. On a phone, let people scroll across columns and keep the next column visible at the edge. Open the record in a side panel or a full-width surface when space is limited (`board-01`).

### List and detail

The list fills the main column and the open record sits in a side panel (the whole screen on phones); ↑ ↓ move through the queue, and an `Empty` waits until something is open (`app-shell-05`). When the record is what people read or answer (mail, support, messages), turn it around: the list is a resizable start panel and the record the main column, capped at a reading width (`mail-01`, `messenger-01`).

### Create and edit

Up to five fields in a `Dialog`, fields that need the list beside them in a `Sheet`, more on a page. Every field follows [Choosing a control](#choosing-a-control); forms open with defaults and the first field focused; the primary says what it creates. Enter submits, Escape closes.

### Setup

For a campaign, a workflow, a job post: many settings before something goes live. Creating makes a draft at once from its name, and it saves itself. The page is a column of one-line decisions in an `Accordion`, each with a state icon, its name and its current answer; one opens at a time to a few controls. Beside it, a live preview and a list of checks: what blocks, what to look at, what is fine, each opening the line that fixes it. Good defaults make most lines done on arrival. The primary action reviews who it reaches, when and how much before it commits.

### Multi-step flow

One decision per step, built from choice cards, toggle groups and sliders; "Step 2 of 4" or a `Progress` on top; Back at the start, the primary at the end, a ghost Skip when optional. Answers survive Back and reload, and the last step reviews before it commits.

### Workbench

Open documents in a `TabStrip` above a full-width body (`app-shell-02`), a `FileTree` in the sidebar, inspectors as end panels; compact and snappy.

### Document

One column at reading width, the `Editor` with a toolbar or a menu on selected text, `Markdown` to read it back. It saves itself ("Saved 2 min ago" in grey); comments and history go in a side panel.

### Chat

The transcript fills the main column above the docked composer, capped at a reading width; conversations are a `TabStrip` or a sidebar group. See [AI and chat](#ai-and-chat).

### Sign in and sign up

Start from the `sign-in-01`, `sign-up-01` or `forgot-password-01` block: one centred 384px column on level 0 (`bg-surface-0`), with the product mark, a title, the fields, one full-width primary button, other providers as outline buttons, and a link to sign up (or in). Codes use `InputOTP`; errors stay in the form.

### Website

- **Spacious density and smooth motion.** One hero headline per page; display type for section headings, prices and proof numbers; a lead under each heading.
- **Header,** about 64px: the logo, the navigation, a ghost "Sign in" and the filled call to action at the end.
- **Hero:** what the product does, a lead, a filled and an outline button, then the product itself on a raised surface. The headline and lead may play in once as one `TextMotionGroup`.
- **Sections** up to 1152px wide, one idea each, neighbours in different layouts; only the hero and the closing call to action are centred.
- **Order:** hero, proof, what it does, how it works, pricing (monthly and yearly `Tabs` above one `Card` per plan), questions in an `Accordion`, a closing call to action, a footer.

## SaaS features

The pages almost every product needs, each built from a pattern above.

### Billing and plan

- **The plan card first** (eight columns, thirds): name, status `Badge`, price, renewal date, "Change plan" and, with limits, "Upgrade"; beside it the payment method with its brand logo.
- **Usage under it:** a goal card per limit ("7,240 of 10,000 API calls" with a `Progress`); a warning badge at 80%, an `Alert` with the upgrade action at 100%.
- **Invoices** in a table card: the date, the amount, a status `Badge`, a download icon button.
- **Changing plan** is a page of plan cards under monthly and yearly `Tabs`. **Cancelling** opens an `AlertDialog` naming the end date.

### Team and members

A `Table` of members (avatar, name, email, a role `Select` admins change in place, last activity, "Remove member…" in the menu). "Invite people" opens a `Dialog` with a `Textarea` of addresses and role choice cards that say what each role can do; pending invites sit above with "Resend" and "Revoke".

### Integrations

A grid of connection cards (thirds) grouped by kind, with `InputSearch` and a category picker. Each card has the logo, the name, one line and "Connect", or once connected a `Switch` and "Manage"; it changes in place with a toast.

### API keys and webhooks

Keys are a table with the name, the key masked to its last four characters, dates and "Revoke…". "Create key" opens a `Dialog` with switch choice cards for scopes and an expiry picker; the key shows once in `SyntaxHighlight` with Copy. Webhooks are a table of endpoints with a status dot; a row opens its deliveries in a `Sheet`.

### Notifications

An inbox in a `Popover` from a bell button with an unread count; rows are `Item`s with the actor's `Avatar`, what happened and when. Preferences are a settings card per channel: a `Switch` per event and a digest picker.

### Activity and audit log

A `DataTable` of time, actor, action, object and source, newest first, filters in the URL, a CSV export; a row opens the event's before and after in a `Sheet`.

### Onboarding and setup

A checklist card at the top of the overview until it is done ("3 of 5 done", a `Progress`, an `Item` per step with its action; the next step is the only filled button). Onboarding questions are a [multi-step flow](#multi-step-flow) of choice cards.

### Reports and exports

A report is a dashboard with a fixed period and filters named in its title ("Revenue, October 2026"). Exports run in the background and end in a toast with "Download".

## States

Every region answers each of these, designed with the happy path:

- **Loading, refreshing, submitting, streaming:** see [Loading](#loading). The frame and everything known render at once; what waits is one skeleton block filling its card or row.
- **Empty, first use:** `Empty` with an icon, a title naming what will be here, a sentence on why it's useful, the primary action. **No results:** `Empty` naming the search, with a button that clears the filters.
- **Field error:** a red ring and a message under the field. **Section error:** an error `Alert` with Retry; loaded regions stay. **Action failed:** an error toast with the reason and Retry; typed input is kept. **Not found:** `Empty` with the reason and a way back.
- **No access:** `Empty` saying what is restricted and who can grant it. Actions a person can never take are left out; ones they could take are disabled.
- **Success:** the result itself (the new row, the changed value) and a toast. A success screen only ends a flow.
- **Disabled:** half opacity, with the reason in a description or tooltip when it isn't obvious.
- **Irreversible:** an `AlertDialog` naming the object and the consequence. **Reversible:** act at once, Undo in a toast. **Unsaved changes:** confirm on leaving.
- **Long or missing value:** names shorten with a tooltip; a missing value is a grey "None", so the row keeps its shape.

## Loading

The layout is settled before the data arrives. Everything whose size is already known renders at once, and each part that waits holds the exact space its content will take, so nothing moves when the data lands, on a slow connection or a fast one.

### What shows at once

- **The frame never reloads.** The App Shell, its sidebar and its header stay on screen between pages; only the content changes.
- **Everything known is real, not a placeholder:** the page title, the toolbar, card titles and descriptions, a stat's label, table headers, field labels, buttons. Only the content areas that wait are placeholders.
- **Layout decisions come with the first render.** An alert, a banner or a setup checklist that depends on data arrives with the page's first data or not at all; it never slides in above what someone is reading.

### Choosing the indicator

| Waiting for                                     | Show                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| The first data of a page or a region            | One `Skeleton` filling each card's content area, or one per row          |
| New data for what is on screen (period, filter) | The current content, dimmed (a chart's `loading`, `DataTable`'s bar)     |
| The result of an action (save, send, invite)    | The result at once when it can be undone; else a `Spinner` in the button |
| Work of known length (import, upload, export)   | `Progress` with words: "Importing 240 of 1,200 rows"                     |
| Text being written (an assistant, a summary)    | Shimmering status text, then the text streaming in                       |
| An image, a map, a video                        | Its `AspectRatio` box on the muted fill until it loads                   |
| Under about 300ms                               | Nothing                                                                  |

The project's [loader](https://fabricator-ui.vercel.app/docs/foundations/loader) decides how every placeholder looks: `skeleton` (the default, a quiet pulse) for product screens, `blueprint` for websites and showcases that should feel built in front of you: the placeholders of base components (buttons, inputs, lines of text) are traced by a pen, while layout placeholders keep the quiet block. `Blueprint` likewise sketches a component's controls, not its containers. Set it once with the look (`loader=blueprint`) and, where one region differs, with `data-loader` on its container; one view uses one loader.

### Skeletons fill boxes

A skeleton fills a box whose size is settled before the data arrives (a card, a row, a plot), never the shape of the text inside it.

- **One block per card.** The card's surface, title and description stay real; its content area becomes one `Skeleton` that fills it. A stat card's value and delta are one block; a chart is its own `loading` plot.
- **The box has the size.** Every card or region that waits has a set height or minimum height (the chart's height, the rows' total, a stat card's value area), so the skeleton and the content fill the same box. Size the card, then skeleton it.
- **Whole cards when the card is data.** In a grid of projects or a gallery, each card is one skeleton at the card's size, as many as will arrive.
- **One block per row** in a list or a table, at the row height, the page's worth of rows. `DataTable` already does it.
- **No mosaics.** Never compose a skeleton from text bars, avatar circles and badge pills: text, names and badges take their size from the content, so the page shifts when the real text wraps or a name is longer.
- **Quiet.** The skeleton is the hover wash with a slow pulse, at home on any surface in both themes. No gradients, colours, borders or spinners inside it, and never a skeleton of a skeleton.
- **Only what waits:** no skeleton for headers, navigation, buttons, empty states or content already on screen.
- **Announce once.** The waiting region is marked busy with one name ("Loading revenue"); the blocks themselves are hidden from assistive technology.

### Timing

- **Fast waits show nothing.** A skeleton fades in only once a wait passes about 300ms, so a quick load goes straight from the frame to the content.
- **Neighbours arrive together.** Cards in one row share one loading boundary and appear at once, rather than popping in one by one.
- **Refreshing never goes back to skeletons.** The old content stays, dimmed, until the new arrives; scroll position, selection and open panels are kept.
- **Empty only after loading.** "No data" and `Empty` show when a load has finished with nothing, never while it is under way.
- **More arrives below.** Loading more appends under the last row; live rows wait behind a "3 new" button instead of pushing the list down.

### Reserve the space

- **Media:** every image, map and embed sits in an `AspectRatio` or declares its size. An `Avatar` shows its initials at once and swaps to the photo in the same circle.
- **Charts and tables** have a set height, so their first draw fills a box that is already there. A chart given `loading` keeps its place and never flashes "No data".
- **Numbers** use tabular figures, so a value that ticks or refreshes keeps its width.
- **Pending buttons** keep their width: the spinner takes the icon's place, and the button is sized for its longer label.
- **Fonts** load through the framework's font loader, so text doesn't reflow when the typeface arrives.

### With the framework

**Use the framework's tools:** route-level loading states and streaming boundaries per region, transitions that keep the current view while the next prepares, optimistic results for quick actions, the previous data kept while refetching, and sized images and fonts. The fabricator skill's `rules/loading.md` maps them for Next.js, React and React Native.

A page loaded on a slow connection moves nothing after its first paint except placeholders filling in; its layout-shift score stays under 0.1.

## Accessibility

- **The components own keyboard and screen-reader behaviour;** keep it by composing them. Custom interactive parts follow the standard pattern for their kind in full.
- **Focus is always visible** and goes where the work is: into a dialog, back to its trigger, to the first invalid field.
- **Everything has a name:** icon buttons, dialogs, sheets, images, every control (a slider and a switch too), charts.
- **Contrast** holds while colour comes from the roles. **Colour never works alone:** pair it with an icon, a sign or a label.
- **Targets** are at least 24px in compact regions and 44px on touch screens.
- **Headings:** one main heading per page, then levels in order.
- **Check every screen** with the keyboard alone and an automated checker.

## Content

- **Sentence case** everywhere. Labels and titles take no final period; descriptions and messages are full sentences.
- **Buttons** are a verb and its object, and the verb follows the action through the flow: "Delete project" opens "Delete Acme Inc.?", confirmed by "Delete".
- **Errors** say what happened and how to fix it, without blame. **Empty states** say what will be here and how to start.
- **Field help says why or what for,** not what the label already says. A choice card's description states the consequence.
- **One name per thing,** in the person's words. **Short first:** a title is a few words, a description one sentence, a stat's label three words at most.

## Do's and Don'ts

- Do choose the component and its variant first; don't restyle a component's colour, type, size or motion.
- Do pick answers with switches, tabs, sliders, choice cards, pickers and steppers; don't ask people to type what a control could offer.
- Do pre-fill and leave out what you can; don't build a form past seven fields when a flow or settings cards would do.
- Do set density on the region; don't resize components one by one.
- Do take colour from the roles and from content (avatars, logos, charts); don't pick colours by hand.
- Do separate layers with the surface ladder; don't add borders or other shadows to surfaces.
- Do keep one filled button per region; don't put two primaries side by side.
- Do put page-wide settings in the header's page menu; don't scatter setting controls over the content.
- Do put a page of cards on the 12-column grid in one rhythm; don't mix 8 + 4 rows with four-across rows.
- Do vary the shapes on a dashboard; don't fill it with identical chart cards.
- Do align everything in a card to its inset; don't let a list's icons or a table's text drift off the title's line.
- Do let surfaces, type, space and content carry the page; don't decorate with gradients, glows, blurred glass, icon tiles or bands of colour.
- Do separate with space, then a heading, then a surface; don't draw lines between sections, rows, cards, columns or panels, nest cards or wrap a page in one.
- Do show status with `Badge`, `Alert` and status dots; don't use a coloured side border or a tinted row.
- Do compare periods with a dashed grey line; don't use two axes or coloured comparison areas.
- Do align text to the start in apps; don't centre lists, forms, stats or body text.
- Do use what is built in (motion, fluid hover, density, focus, the App Shell); don't hand-code transitions, hover colours or a sidebar.
- Do settle the layout before the data arrives; don't let content, alerts or images push the page as they load, or send a refreshing page back to skeletons.
- Do confirm only what can't be undone; offer Undo for the rest.

### Review checklist

A screen is done when every line holds. Check it in the running app, never from the code alone.

- [ ] The screen's job fits in one sentence, and its focal point is the first thing seen.
- [ ] Each region has one primary action; every icon-only button has a name and a tooltip with its shortcut; every menu action leads with an icon.
- [ ] Title, toolbar and body share one start edge; space is tighter inside groups than between them.
- [ ] No line divides the layout: space, headings and surfaces part every section, row, card and panel.
- [ ] A page of cards uses one grid rhythm; gutters continue down the page and cards in a row are equal height.
- [ ] Inside each card, the title, values, list icons and table text start on the card's inset.
- [ ] Short single choices keep all labels visible. Tabs have named content panels, and settings use a single-select toggle group. Five or more options, or labels that do not fit, use `Select`.
- [ ] Every number has its unit and period and, where it changed, a signed delta coloured by whether the change is good.
- [ ] Colour appears only where it means something or where content brings it.
- [ ] Light and dark both read well; surfaces follow the ladder, with no borders or stray shadows.
- [ ] It works with the keyboard alone, with focus visible on every stop.
- [ ] Every cursor says what a press does: a pointer only on what acts, grab on what drags, the arrow elsewhere.
- [ ] It works on a phone and a wide desktop, with no label cut off at phone width.
- [ ] Loading, empty, error and disabled states exist and use their components.
- [ ] Nothing moves when data arrives, on a slow connection or a fast one: skeletons fill cards and rows sized before the data, and refreshes keep the content on screen.
- [ ] It holds with the longest name, the largest number and no data at all.
- [ ] Copy is in sentence case, buttons are verbs, errors say how to fix.
