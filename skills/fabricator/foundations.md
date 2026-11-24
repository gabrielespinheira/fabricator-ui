# Foundations

What every screen is made of, with the classes that write it. The look is quiet because each of these spends little; depth, hierarchy and polish come from using them precisely. To change their values, read [setup/theming.md](setup/theming.md).

## Surfaces

Depth is a ladder of levels. Each pairs a background with a shadow whose first layer is a hairline, so the surface needs no border. In light mode the higher levels are white and the shadow carries the height; in dark mode each level is a step lighter.

| Level | Holds | Written as |
| --- | --- | --- |
| 0 | A screen that stands alone: sign in, reset, a finished flow | `bg-surface-0` |
| Frame | The App Shell's frame and its sidebar, a step darker than the page | comes with `AppShell` |
| 1 | The page; the App Shell's main column and panels | `bg-background`, comes with `AppShellMain` |
| 2 | The default `Card`, inset regions | comes with `Card`; by hand `bg-surface-2 shadow-surface-2 rounded-xl` |
| 3 | Menus, popovers, sheets, drawers; a raised picture on a website | comes with them; `bg-surface-3 shadow-surface-3` |
| 4 | The active tab; anything raised inside level 3; an empty state's icon | comes with them |
| 5 | Dialogs, alert dialogs, toasts | comes with them |
| Inverted | Tooltips | comes with `Tooltip` |

- **Height means layering,** never importance. A thing is raised because it sits over something else.
- **A child sits above its parent or on a wash.** A quiet area inside a surface (a code block, a summary, a nested option) is a **well**: `rounded-lg bg-hover`, or `Item variant="muted"`. Going back down the ladder reads as a hole.
- **Two steps per screen are usually enough:** page and cards, with overlays above. If three levels are visible at rest, one of them wants to be space.
- **Plane against plane:** the sidebar on the frame, the main column and panels as cards in front. That single contrast gives an app its depth, so leave the frame's colour alone.
- Scrolling edges fade with `scroll-fade` (`scroll-fade-x`, `scroll-fade-b`) instead of a line or a shadow.

## Colour

Neutral until it has a reason. Until a project picks a brand hue, primary is the text colour itself.

**Text.** `text-foreground` for headings, values and what people act on. `text-muted-foreground` for descriptions, metadata, placeholders, resting navigation and the icon beside a label; it holds AA on every surface level, but not on a wash. On a well, an accordion item, a muted `Item` or a chosen card, secondary text is `text-foreground/70`, as `AlertDescription` does.

**Washes.** Interaction is translucent, so it works on any surface: `bg-hover` under the pointer, `bg-active` pressed or selected. Use components' own; write one only on markup you make interactive.

**Roles.** Six meanings, each with the same tokens:

| Role | Means | Where it belongs |
| --- | --- | --- |
| `primary` | The main action; on or selected | One button per region, links, checked controls, progress, a chosen date |
| `secondary` | A soft second action | A real second action |
| `info` | Under way, neutral news | Badges, alerts, running jobs |
| `success` | Done, healthy, a change that went the right way | Badges, deltas, done marks |
| `warning` | Late, near a limit, worth a look | Badges, alerts, checks that don't block |
| `destructive` | Failed, invalid, irreversible, the wrong way | Field errors, deltas, delete actions, outages |

| Token | Use |
| --- | --- |
| `bg-<role>`, `text-<role>` | Fills, icons and dots, 3:1 on every surface |
| `text-<role>-foreground` | Text on that fill |
| `text-<role>-text` | Coloured text on any surface, AA |
| `bg-<role>-surface-1` to `-8` | A tinted ladder, with `shadow-surface-N`; prefer `Alert`/`Badge` |

- **Colour never works alone:** pair it with an icon, a sign or a word.
- **Destructive rests soft** (a red tint with red text) and is loud only inside its confirmation.
- **Life comes from content:** coloured avatars, `AvatarGroup`s, brand marks (`@fabricator-ui/icons/brands`), file icons, chart series, a colour the person picked. A screen that feels grey usually needs real content, not more colour.
- **A brand is one hue** on primary with a low surface tint. Backgrounds, headings and numbers stay neutral.
- **Dark mode is free** when colour comes from tokens. A `dark:` class means a token was missed.

**Charts.** Series take `--chart-series-1` to `-8` in config order and keep their colour when others hide. A comparison (previous period, target) is `color: "muted-foreground", dashed: true`. Rankings of one measure use one colour. Only `StatusBar` and candlesticks use status colours. Text in and around charts stays in the text colours.

## Type

Inter, small and precise; a monospace face for code, keys and IDs. Components set their own type. Text you write around them takes a role:

| Role | Use | Classes |
| --- | --- | --- |
| Page title | The page's name | `AppShellPageTitle` |
| Lead | One sentence under it | `text-[15px] text-pretty text-muted-foreground` |
| Metric | A stat's value, a chart's headline | `text-2xl tracking-tight tabular-nums weight-semibold` |
| Title | A section heading inside a page | `text-(length:--density-text-16) weight-semibold` |
| Subtitle | A group's name; `CardTitle` is this already | `text-(length:--density-text-14) font-medium` |
| Body | Text, a stat's label | `text-(length:--density-text-13)` |
| Caption | Metadata, freshness, group labels | `text-(length:--density-text-12) text-muted-foreground` |
| Display | Website headings, prices | `text-[28px] tracking-tight weight-semibold` |
| Hero | A website's one headline | `text-5xl md:text-6xl tracking-tight weight-medium text-balance` |

- Two weights per view. Weight is state or title; hover changes colour, never weight.
- One step at a time: a heading is larger or heavier than its neighbour, never both plus coloured.
- Sentence case everywhere. No all-caps labels, no wide tracking.
- Figures that sit in a column or change take `tabular-nums`; in a column they end-align.
- Running text caps near 65 characters (`max-w-prose`). Documents use `Markdown` or `Editor`, which have their own type.

## Space

Space does the grouping. Tighter binds, wider separates, and each relationship has one step that tightens and loosens with density:

| Relationship | App | Website |
| --- | --- | --- |
| A heading and its lead | `gap-(--density-4)` | 12px |
| Controls in one row | `gap-(--density-8)` | 12px |
| Cards in a grid; a heading and its content | `gap-(--density-16)` | 24 to 40px |
| Fields of a form | `FieldGroup` | `FieldGroup` |
| The bands of a page (title, toolbar, body) | `gap-(--density-24)` | 40px |
| Sections of a page | `gap-(--density-40)` | 64 to 96px |

Page padding comes from `AppShellContent`. Use `gap`, and let siblings own no margins.

## Density

One setting sizes every control, row, icon, text and gap:

| Density | For | Controls | Text | Card inset |
| --- | --- | --- | --- | --- |
| `compact` | Toolbars, dense tables, editors, ops | 28px | 12px | 12px |
| `default` | Apps | 36px | 13px | 16px |
| `spacious` | Websites, kiosks, touch-first screens | 44px | 15px | 20px |

Set it on the widest region it is true for with `DensityProvider`, which also reaches the menus and dialogs opened inside. `data-density` or `density-*` classes do the same without the portals, and take breakpoints. `size="sm"` and `size="lg"` pin one control apart from its neighbours. If a region feels too big, its density is wrong.

Your own parts follow it with tokens named after their default value: `h-(--density-36)`, `px-(--density-12)`, `gap-(--density-8)`, `size-(--density-icon-16)`.

## Shape

Two corners: controls and rows `rounded-lg` (8px), containers `rounded-xl`. A container holds its rows with a small inset so the corners share a centre. Media takes the corner of its place. Avatars, switches and status dots are round. Pill is a project setting, so write the classes and never pixels.

## Motion

It ships with the components: hover fades, presses, one highlight that glides between rows, selections that slide, popups that grow from their trigger, charts that draw in and morph. Pick a speed per product (`data-motion` on `<html>`: `smooth` websites, default, `snappy` all-day apps, `instant` dense tools) and write none yourself.

App content appears in place. Something you animate uses a role: `duration-feedback ease-feedback` for colour, `duration-move ease-move` for things that travel, `motion-popup`, `motion-disclosure`. Reduced motion is handled.

## Craft

Small decisions that separate finished from generated:

- **Optical edges.** A ghost button at an edge pulls out by its own padding (`-me-3` at small size) so its label, not its hover area, sits on the line. A full-width table bleeds by its cell padding (`-mx-(--density-12)`) so text aligns with the page while the row's wash extends past it.
- **Edge to edge in cards.** A table in a card drops the content's padding and pads its end cells by `--card-spacing`; a list pads by the inset minus its rows' own padding.
- **Names shorten, facts don't.** Truncate names with a tooltip; numbers, dates and statuses always show in full. In a table the name column is `w-full max-w-0` with a `min-w-*`, so it takes the slack and truncates.
- **Missing has a shape:** a grey "None" or "No data", never a dash that could be a minus.
- **Nothing shifts:** tabular figures, buttons sized for their longer label, skeletons that fill boxes sized before the data.
- **Rows have one voice:** in a list, every row has an icon or none does, and every row has the same parts in the same order.
- **Relative time while it is fresh** ("2 hours ago"), a date after a week, the full timestamp in a tooltip.
- **Keyboard shown quietly:** `Kbd` in tooltips and menu rows, `⌘K` in the search field's end.
- **Quiet at rest.** A control repeated on every row rests as text and shows its frame under the pointer or focus. Framed controls are for toolbars and forms.
- **Status dots for live things, badges for stages.** One per row; never both.
- **Empty space is fine.** A page with three things on it looks confident; filling the rest looks nervous.

## Access

Components own their keys, roles and focus; composing them keeps that. What a screen adds:

- **Names:** every icon button, slider, switch, chart, dialog and region. A visible label names its control with `htmlFor` or `aria-labelledby`.
- **One `h1`** (`AppShellPageTitle`), then levels in order. A row's name is its link or button, so the row has one tab stop before its actions.
- **Announce what changes by itself:** counts, saving, results and freshness sit in `aria-live="polite"`; a waiting region is `aria-busy` with one name.
- **Focus goes where the work is:** into an overlay, back to its trigger, to the first invalid field, to the neighbour of a deleted row.
- **Drag always has a menu or keyboard twin.** Hover always has a focus twin.
- **Targets** are 24px at least with a pointer, 44px by touch.
