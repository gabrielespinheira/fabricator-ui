# Components

Every component, by the need it answers. Names are the registry items (`add <name>`) and their exports. Parts and props come from the docs page or the installed source; this file decides which one. All ship for Base UI, Radix and React Aria except where said, and for React Native except `data-table` ([platforms.md](platforms.md)).

Pick in this order: an installed component, a registry component, a block, a composition of components. Hand-built markup comes after all four.

## Contents

[Frame and navigation](#frame-and-navigation) · [Acting](#acting) · [Choosing and entering](#choosing-and-entering) · [Overlays](#overlays) · [Showing records](#showing-records) · [Showing numbers](#showing-numbers) · [Showing time](#showing-time) · [Content and media](#content-and-media) · [Feedback and waiting](#feedback-and-waiting) · [Conversation and AI](#conversation-and-ai) · [Arranging](#arranging) · [Foundations](#foundations) · [Near neighbours](#near-neighbours) · [Instead of building](#instead-of-building) · [Blocks](#blocks)

## Frame and navigation

How these fit together, and what breaks them: [app-shell.md](app-shell.md).

| Component | Reach for it when | Worth knowing |
| --- | --- | --- |
| `app-shell` | Any app around its pages | `AppShellMain` > `AppShellHeader` + `AppShellContent size="sm\|md\|lg"`; `AppShellPanel` (`mobile="drawer\|swap\|none"`), `AppShellStatusBar`, `AppShellTitlebar`, `window` for desktop. Adapts to its own width, remembers itself, owns shortcuts (`useShellShortcut`) |
| `AppShellHeaderActions` | Page actions | `actions`, `primaryAction`, `menu`, `menuLabel`. On phones: one menu and a floating primary. Actions show as icons with tooltips |
| `app-nav` | Sidebar rows from data | `groups` with `icon`, `badge`, `status`, `children`, `actions`, `mobile: "tab"`; `AppNavBottomBar` on phones; `customizable`. Always pass `renderLink={(item) => <Link href={item.href ?? "/"} />}`: it gives client navigation and keeps the row's icon and badge |
| `sidebar` | The container `app-nav` sits in, or a custom sidebar | `variant="inset\|floating\|sidebar"`, `collapsible="offcanvas\|icon\|none"`, drags to resize, peeks |
| `workspace-switcher` | Several organizations | `variant="menu"` for a few, `"command"` for many; `switchingTo` covers the wait; ⌘O |
| `user-menu` | The signed-in person | `variant="row\|mark"`; the items are yours. `UserMenuTheme theme onThemeChange` for light, dark and system |
| `tab-strip` | Open documents: files, sessions, records | Pin, preview, dirty, loading and error states, reorder, reopen. `Tabs` is for views of one thing |
| `breadcrumb` | A path outside the shell | Inside it, `AppShellBreadcrumb items` |
| `navigation-menu` | A website's header | Not in React Aria |
| `pagination` | Pages of results with a known count | Records people work through load on scroll in `data-table` instead |
| `preview-rail` | Jumping through a long page or sequence | A compact rail whose names wait for the pointer |
| `command` | The ⌘K palette | `CommandDialog`; groups Navigation, Actions, Recent; list shortcuts from `useShellShortcuts()` |

## Acting

| Component | Reach for it when | Worth knowing |
| --- | --- | --- |
| `button` | Something happens on press | `default` once per region, `secondary`, `outline` (Cancel, filters, in cards), `ghost` (toolbars, rows, icons), `destructive` (soft red), `link`. Sizes follow density; `sm`, `lg`, `icon`, `icon-sm`. A link that looks like one: `buttonVariants` on the router's link |
| `button-group` | Actions that belong together; a split button | `ButtonGroupSeparator` + a `DropdownMenu` for the other choices ("Send" / "Send later") |
| `toggle`, `toggle-group` | Formatting and tool states that are on or off | Several at once, or a tool palette. For one of a few values use `Tabs` |
| `dropdown-menu` | The rest of the actions on one thing | Every action leads with its icon; destructive last, alone; "…" when it opens something; checkbox and radio items for view options |
| `context-menu` | The same actions on right click | Mirrors the row's "More" menu. A long press on touch |
| `menubar` | A desktop app's menus | Desktop windows only; not in React Aria |
| `kbd` | Showing a shortcut | In tooltips, menu rows (`DropdownMenuShortcut`) and search |

## Choosing and entering

Start at [asking.md](asking.md): most values should never reach this table.

| Component | Reach for it when | Worth knowing |
| --- | --- | --- |
| `tabs` | One of two to four short values, or views | Default `TabsList`; `variant="subtle"` (icons, active shows its label) in tight toolbars; `orientation="vertical"` for settings sections |
| `radio-group` | One of a few that need explaining | As choice cards: `FieldLabel` > `Field orientation="horizontal"` > `FieldContent` + `RadioGroupItem` |
| `select` | One of five or more | Pass `items` on Base UI; `SelectGroup` always |
| `combobox` | One of many, found by typing | Items with avatars, groups; also the person picker |
| `multi-select` | Several of many; many typed values | Chips in the field, the list stays open between picks. Picks from `items`; for free text see [Many values in one box](recipes/create.md#many-values-in-one-box) |
| `switch` | On or off, at once | In a settings row: `Field orientation="horizontal"` |
| `checkbox` | A submitted yes, or rows to select | `indeterminate` for part of a set |
| `slider` | A level or share | Show the value in the label row; `showSteps`; two thumbs for a range |
| `number-field` | An exact number | Steppers, `min`, `max`, `format` (Intl), Shift and Alt steps |
| `rating` | A score | Half stars; takes a role colour |
| `date-picker` | A date, a moment, a month, a year | `hasTime`, `granularity`, `editable`, `minDate`, `maxDate` |
| `calendar` | A range, or a date always in view | In a `Popover` with presets for ranges |
| `time-input` | A time, or a start and end | `TimeRangeInput` shows the duration; reads typed times |
| `time-wheel` | A time picked on touch, inside your own panel | `DatePicker` and `TimeInput` already use it |
| `color-picker` | A colour | `ColorPickerPopover` with `triggerLabel`, swatches first |
| `file-upload` | Files | `FileUploadDropzone`, `FileUploadField` (input-sized), `FileUploadTrigger` (a button); rejections carry a reason |
| `input-otp` | A one-time code | Pastes and autofills |
| `search` | Filtering or searching | `collapsible={false}` in a toolbar; closed it is one round button |
| `input`, `textarea` | What only the person can write | Last resort; see the ladder |
| `input-group` | A fixed part, a unit, a button in a field | `InputGroupInput` first, then `InputGroupAddon align`, `InputGroupButton`, `InputGroupText` |
| `field` | Around every control | `FieldGroup` > `Field` > `FieldLabel`, control, `FieldDescription`, `FieldError`; `FieldSet` + `FieldLegend` for a group |
| `label` | A lone label | Inside a form, `FieldLabel` |
| `questionnaire` | One decision per step, with skip and review | Single, multiple and free answers, shortcuts, progress; `advanceOnSelect`. Not only for chat |
| `editor` | Formatted writing | Value is Markdown; toolbar, slash menu, tables, keyboard bar |

## Overlays

| Component | Reach for it when | Worth knowing |
| --- | --- | --- |
| `dialog` | A focused task of one to three asks | A drawer on phones is your composition ([recipes/create.md](recipes/create.md)) |
| `alert-dialog` | Only what can't be undone | Title names the object, action repeats the verb |
| `sheet` | A task that needs the page beside it | Details someone keeps open belong in an `AppShellPanel` |
| `drawer` | Phone tasks, filters, pickers | `showSwipeHandle`, `snapPoints`; primary above Cancel |
| `popover` | One or two controls, a filter, a small preview | `PopoverHeader`, `PopoverTitle` |
| `hover-card` | A preview of a linked person or record | Never holds the only copy of something; a long press on touch |
| `tooltip` | The name of an icon button, a truncated value | Never essential, never interactive |

Every dialog, sheet and drawer has a title. Two modal layers at most.

## Showing records

| Component | Reach for it when | Worth knowing |
| --- | --- | --- |
| `table` | A few to a hundred records compared by column | Columns fold into the name cell in narrow containers ([recipes/list.md](recipes/list.md)); row hover is built in |
| `data-table` | Records people sort, filter, edit, or have by the thousand | Typed columns through `meta` (`status`, `person`, `currency`, `progress`, `tags`, `date`), `editable` cells, `load`, footers, selection bar, views. Web only; needs a height |
| `item` | Things read one by one: people, files, tasks, apps | `ItemGroup` > `Item size="default\|sm\|xs" variant="default\|outline\|muted"`; `ItemMedia variant="icon\|image"`; a link through `render`/`asChild`; rows carry `role="listitem"` ([rules/composition.md](rules/composition.md)) |
| `card` | One discrete thing | `CardHeader` (`CardTitle`, `CardDescription`, `CardAction`), `CardContent`, `CardFooter`; `--card-spacing` is its inset |
| `badge` | A stage or a delta | `success`, `info`, `warning`, `destructive`, `outline` (no urgency), `secondary` (a tag) |
| `avatar` | A person or company | Always `AvatarFallback`; without a photo it takes a stable hue from the id, readable in both themes: ``style={{ background: `oklch(0.88 0.06 ${hue})`, color: `oklch(0.36 0.09 ${hue})` }}``. `AvatarBadge` for presence; `AvatarGroup` with `tooltip` names and `AvatarGroupCount` |
| `accordion` | Lines that open in place | Items part into cards; the base of draft-first setup and "Advanced" |
| `collapsible`| One region that folds | |
| `file-tree` | Folders and files | Guides, type icons, multiple selection |
| `carousel` | Media to swipe through | Never for content people must see |
| Status dot | Something live, beside its word | No component: `<span aria-hidden className="size-2 shrink-0 rounded-full bg-success" />` then the word |
| Metadata | Pairs of label and value | A `dl` in two columns: grey `dt`, foreground `dd` aligned to the end |

## Showing numbers

Every chart takes `data`, a `config` naming the series (or `nameKey`/`valueKey`) and a `label`, plus `formatValue`, `loading`, `empty`, `onActiveChange`. Give it a height with `className`. Recharts is never added beside them.

| Question | Component |
| --- | --- |
| How is it going against before or a target? | `line-chart`, the comparison dashed in `muted-foreground` |
| How does the total and its parts move? | `area-chart stack="stacked"`, or `bar-chart stack="stacked"` per period |
| How does the mix change? | `composition-chart` |
| Which are largest? | `bar-chart layout="horizontal"`, sorted, five to eight |
| What is it made of? | `donut-chart` with its list (about 560px), `pie-chart` for two to four parts, `treemap` for a hierarchy |
| Where do people drop out? Where does it flow? | `funnel-chart`; `sankey-chart` |
| How close to the goal? | `progress` for one; `radial-chart` for a few (`shape="half"` for a gauge) |
| When does it happen? | `heat-calendar` |
| Has it been up? | `status-bar`, one pill per day, one bar per service. In a table of services: `legend={false}` on each, one shared legend under the table. Pills stop at 4px and older days drop off, and the uptime counts only what is shown, so pass a window that fits the narrowest cell (30 days on a phone) and name it once |
| Who leads, over time? | `bump-chart` |
| How do a few compare on many measures? | `radar-chart` |
| What did the price do? | `candlestick-chart` |

One headline number is type (`Metric` role) with a delta `Badge`, not a chart.

## Showing time

| Component | Reach for it when |
| --- | --- |
| `event-calendar` | Anything with a start and an end: schedules, bookings, shifts, releases, on-call. Day, week, month and agenda views, drag to create and resize, recurrence, zones, undo; save from `onEventChange` |
| `calendar` | Picking a date |
| `heat-calendar` | How much, per day |
| Activity | `ItemGroup` of `Item`s with an `Avatar`, what happened and a relative time, newest first |

## Content and media

| Component | Reach for it when |
| --- | --- |
| `markdown` | Reading formatted text, including a model's reply |
| `syntax-highlight` | Code, a key, a command, a payload: header with language and Copy |
| `image-compare` | Before and after of one picture |
| `audio-player` | Audio with its waveform; `cover` for music, compact for voice messages |
| `video-player` | Video with captions and chapters; compact in cards |
| `aspect-ratio` | Holding the space of media before it loads |
| `typography` | Long-form HTML outside Markdown |

## Feedback and waiting

| Component | Reach for it when |
| --- | --- |
| `alert` | A message that stays: `info`, `success`, `warning`, `error`; `contrast="high"` for the one that must be dealt with; `AlertAction` |
| `toast`, `sonner` | A result just now. Base UI uses `toast`; Radix and React Aria use Sonner |
| `empty` | Nothing here, and what to do about it |
| `skeleton` | A box whose size is known before its data |
| `spinner` | In the control that started a wait; 22 variants, one per product |
| `progress` | Known length, a goal, a limit |
| `shimmer` | Utility: text being worked on ("Thinking…") |
| `sounds` | Optional interface sounds and haptics behind a setting |

How loud each is: [states.md](states.md#how-loud).

## Conversation and AI

| Component | Reach for it when |
| --- | --- |
| `message-scroller` | Any transcript: follows streams, anchors turns, jumps to latest |
| `message`, `bubble`| A row and its surface; the assistant's replies are plain `Markdown` |
| `attachment` | A file or image in a conversation, with upload states |
| `marker` | Day dividers, system lines, tool steps |
| `chat-input` | The composer: attachments, commands, mentions, context meter, queue, voice, stop |
| `model-picker` | Choosing a model and its effort |
| `questionnaire` | An assistant's clarifying questions, in the composer's place |
| `bot-face` | An assistant's identity and state |

## Arranging

`scroll-area` (a pane that scrolls on its own), `resizable` (panes people size), `separator` (inside menus and toolbars of components, never between sections), `aspect-ratio`.

## Foundations

`density` (`DensityProvider`), `theme-toggle`, `direction`, `desktop-window` (`useDesktopWindow`), and on React Native `fabricator-root` and `text`.

## Near neighbours

| Between | Choose |
| --- | --- |
| `Tabs`, `ToggleGroup`, `Select` | One of two to four: Tabs. Several on at once: ToggleGroup. Five or more: Select |
| `Switch`, `Checkbox` | Takes effect now: Switch. Submitted later, or part of a list: Checkbox |
| `Table`, `DataTable`, `ItemGroup`| Compared by column: Table. Worked on: DataTable. Read one by one, or under about 480px: ItemGroup |
| `Card`, `Item` | A thing with content of its own: Card. A row among equals: Item |
| `Dialog`, `Sheet`, `AppShellPanel`, page | Finish and go: Dialog. Needs the page: Sheet. Kept open while working: Panel. Has a URL or more than seven asks: page |
| `Popover`, `DropdownMenu` | Controls: Popover. Actions: DropdownMenu |
| `Alert`, toast | Still true in a minute: Alert. A result: toast |
| `Badge`, status dot | A stage it is in: Badge. Live right now: dot and word |
| `Progress`, `RadialChart` | One value: Progress. A few to compare: RadialChart |
| `DatePicker`, `Calendar`, `EventCalendar` | Enter a date: DatePicker. A range or always visible: Calendar. Things in time: EventCalendar |
| `Accordion`, `Collapsible`, `Tabs` | Several lines, one open: Accordion. One region: Collapsible. Equal views: Tabs |
| `LineChart`, `AreaChart` | Comparing: Line. A total, stacked or alone: Area |

## Instead of building

| Tempted to build | Use |
| --- | --- |
| A sidebar, topbar or split layout | `AppShell`, `AppNav`, `AppShellPanel` |
| A segmented control, pill filter row | `Tabs` |
| A grid of feature cards with icons | A list, a table, or the product itself |
| Stat tiles with icon squares | The KPI row ([recipes/dashboard.md](recipes/dashboard.md)) |
| A stepper with numbered circles | `Progress` and "Step 2 of 4"; `Questionnaire` |
| A long form | A shape from [asking.md](asking.md#choosing-the-shape) |
| A tag input | `MultiSelect` |
| A timeline with a rail | `ItemGroup` with avatars and times, or `Marker`s |
| A kanban board | A `Table` or `DataTable` first; for a real board, `Item variant="outline"` in columns with the project's drag library |
| A copy field | `InputGroup` with an `InputGroupButton`, or `SyntaxHighlight` |
| A dismissible banner | `Alert` with `AlertAction` |
| A custom scroll container for chat | `MessageScroller` |
| A progress bar, spinner, skeleton mosaic | `Progress`, `Spinner`, one `Skeleton` per box |
| A pricing toggle | `Tabs` |

## Blocks

Finished starting points. Inspect before installing, then replace the content.

| Block | What it is |
| --- | --- |
| `app-shell-01` … `-05` | Frames: workspace with a Details panel, workbench with tabs, classic SaaS, desktop window, mobile first |
| `finance-01` | A complete dashboard page |
| `mail-01`, `messenger-01`, `assistant-01`, `calendar-app-01` | Complete list and detail, messaging, AI chat, calendar apps |
| `sign-in-01`, `sign-up-01`, `forgot-password-01` | Authentication screens with their errors |
| `login-01` … `-05`, `signup-01` … `-05`, `sidebar-01` … `-16` | Other sign-in, sign-up and sidebar layouts |
