# Platforms

One feature, several bodies. The nouns, actions, statuses, copy, permissions and validation are the same everywhere; navigation, overlays, tables, row actions, density and input change shape. Design the job once, then decide each body.

## Find the targets

| Evidence | Target |
| --- | --- |
| Next.js, Vite, React Router, TanStack Start, Astro, Laravel | Web, always at phone width too |
| `apps/mobile`, `app.json` with `expo`, a `/r/fabricator/native/` registry URL | React Native: [rules/react-native.md](rules/react-native.md) |
| `apps/desktop`, `electron`, `src-tauri`, `useDesktopWindow`, a `window` prop on `AppShell` | Desktop window running the web components |
| `src-tauri` with iOS or Android | The web components in a phone WebView |

A monorepo usually has several. Ask which ones the feature ships on only when the code and the request don't say; otherwise cover them all, or name the ones left out.

## What each region becomes

| Region | Phone (web under 768px, React Native phone) | Tablet | Desktop web | Desktop window adds |
| --- | --- | --- | --- | --- |
| Navigation | Three to five `mobile: "tab"` items in `AppNavBottomBar`; the rest behind the sidebar trigger | Icon rail or docked sidebar | Docked sidebar, ⌘K | Toggle by the window controls, `TabStrip` |
| Breadcrumb | The current page, with a menu of its parents | Full | Full | The only way back, so always there |
| Page actions | One menu, the primary as a floating button (automatic) | Buttons | Buttons | Also in `Menubar` and shortcuts |
| Table | Identity, status and one number per row; the rest folds under the name or into the detail | Two or three more columns | All columns, `DataTable` when worked | Denser |
| Detail of a record | The whole screen (`mobile="swap"`) or a drawer | Sheet over the list | `AppShellPanel` docked beside the list | Wider, resizable |
| A queue: list and item | One at a time, with a way back | Side by side, sidebar as a rail | Side by side, context in a panel | The same; keys to act and advance |
| Filters | A "Filters" button with a count, opening a `Drawer` | Inline, wrapping | Inline | Inline |
| Toolbar | Two rows at most: view `Tabs`, then search and filters | One row | One row | Compact |
| Create, edit | `Drawer` for one to three asks, a full page beyond | `Dialog` or `Sheet` | `Dialog`, `Sheet` or page | The same; ⌘N |
| Pickers | Fill the width; a drawer when the list is long | Popover | Popover | Popover |
| Menus | `DropdownMenu` from a visible "More" button | The same | The same, and `ContextMenu` on right click | Right click everywhere something can be acted on |
| Selection | A "Select" mode with actions in a bar at the bottom | Checkbox column | Checkbox column, Shift and ⌘ ranges | The same |
| KPI row | Two by two | Two or four across | Four across | Four across |
| Charts | Full width, 200 to 224px, scrubbed by finger, fewer labels | Half or full | By the grid | By the grid |
| Two columns | One, in order of importance | One or two | Two | Two or three |
| Confirmation | `AlertDialog` | The same | The same | The same |
| Toast | Clear of the bottom nav | The same | The same | A system notification when unfocused |

## Responsive on the web

- **Lay out by the container, not the window.** The main column narrows when the sidebar or a panel opens. Put `@container` on the page's wrapper and use `@2xl:` (672px), `@3xl:` (768px), `@4xl:` (896px). The shell itself reports `useAppShell().size`.
- **Phone first.** Write the single column, then widen: `grid-cols-1 @4xl:grid-cols-12`.
- **Fold, don't scroll.** `hidden @2xl:table-cell` on a column, and the same fact under the name with `@2xl:hidden`. Sideways scrolling is for tables whose columns are the point.
- **Change a component only when the interaction changes** (dialog to drawer, table to list), with `useIsMobile()` from `@/hooks/use-mobile`, and keep one set of contents and one state for both.
- **Touch targets** are 44px, or 36px with 8px of space around. On a screen that is mainly touched, wrap the region in `<DensityProvider density={isMobile ? "spacious" : "default"}>`.
- **Hover reveals are extras.** Row actions fade in with `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100`. Tooltips name things that also have a label or an accessible name.
- **Keyboards cover half a phone:** submit stays reachable, the focused field scrolls into view, and `inputMode`, `enterKeyHint` and `autoComplete` are set. Inputs already use 16px text on phones, so iOS doesn't zoom.
- **Safe areas:** anything fixed to the bottom pads by `env(safe-area-inset-bottom)`. The shell's own parts already do.
- **The floating primary** is an icon over the page's end. Give every `primaryAction` an icon that says it, repeat it as a labelled button where the task ends when an icon can't, and leave room under the last row: `in-data-[size=phone]:pb-20` on the page's wrapper.
- **Back works:** period, filters, tab, page and the open record live in the URL.

- **Tablets are the trap.** At 834px a docked 256px sidebar leaves a column of about 530px, a wide phone. Collapse the sidebar to a rail there ([recipes/app-shell.md](recipes/app-shell.md#tablets)), or lay that width out on purpose: one column, two or three table columns, controls on one row.

Check 390, 834 and 1440px, then 1280px with the sidebar and a panel open: that is the tightest desktop.

## Desktop windows

Same components, one layout for browser and window: `const { shellWindow } = useDesktopWindow(...)`, then `<AppShell window={shellWindow}>`. The shell handles traffic lights, insets, drag regions, translucency and fullscreen. What the feature owes the window:

- **Keyboard first.** Register each frequent action with `useShellShortcut`; show it in tooltips, menus and the palette. `keys` apply in a window; `webKeys` stand in for what browsers keep (⌘T, ⌘W, ⌘1).
- **Right click** on every record opens the actions its "More" menu has.
- **Documents open in tabs** (`TabStrip`), with dirty, loading and error states, reopened on launch.
- **Files drop anywhere** they make sense, with the target shown while dragging.
- **No browser around it:** back and forward, reload, zoom, find and an address are yours to provide or do without.
- **Compact and snappy.** Set the density and motion for the product; people use it all day.
- **Offline is normal.** Show the last data with its time, queue edits, say when they sync.
- **Mark interactive parts you build inside a drag region** with `data-no-drag`.
- **Unfocused:** long jobs end in a system notification, and the dock or tray badge carries the count.

## React Native

Components keep their names, parts and variants, so the screen's component map carries over; the markup does not. Read [rules/react-native.md](rules/react-native.md) before writing.

- **Missing:** `data-table` and its cells, and the blocks `sign-in-01`, `sign-up-01`, `forgot-password-01`, `finance-01`, `assistant-01`, `messenger-01`, `mail-01`, `calendar-app-01`. Use `Table` or a virtualized list of `Item`s, and compose the screen.
- **Adapts itself:** `Select`, `UserMenu` and `WorkspaceSwitcher` open as sheets on phones; the App Shell reveals its sidebar behind the page and opens panels as sheets; default density is 44pt on phones and 40pt on tablets.
- **Touch stands in for pointers:** a long press opens `ContextMenu`, `Tooltip` and `HoverCard`; toasts sit at the top; `Sheet` and `Drawer` follow the finger and avoid the keyboard.
- **Differs:** `DatePicker` has no time yet, so pair it with `TimeInput`; `ChatInput` has no drag and drop; `Combobox` and `MultiSelect` type inside a dialog.
- **Lists are virtualized** with a fixed row height, pull to refresh, and a sticky toolbar. Frequent row actions stay visible; the rest sit in the row's menu.
- **One primary at thumb reach:** the header's primary becomes the floating button; a flow's primary sits above the keyboard.
- **Feedback you feel:** `SoundEffects` gives the same sounds with a haptic for each.
- **Tablets are not big phones:** dock the sidebar and the panel; use two columns.

## Several at once

- **Share the thinking, not the markup.** Put types, validation schemas, formatters, permission checks, state machines and status maps in a shared package; import them from each app. Navigation is data: `lib/app-shell-model` drives web, desktop and native from one config.
- **One table of facts.** Each status has one label, role and icon for every platform. Each action has one name, icon and shortcut.
- **Same order, same words.** A person who learned it on the web finds the action on the phone under the same name.
- **Say what is missing.** When a platform can't do something yet, show it read only or say where it can be done, rather than leaving a hole.
- **Build the hardest body first,** usually the phone: what survives there is what the feature is about.

Verify each body in its own place: browser at three widths, a window, a simulator at phone and tablet size. Name the ones not run.
