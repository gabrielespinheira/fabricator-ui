# App Shell

The frame an app lives in, and the one part of a product every screen depends on. Adapt it by composing its primitives: they already handle phones, tablets, focus, shortcuts, resizing, saved layout and desktop windows, and each of those depends on the parts being where the shell expects them. Code for everything here is in [recipes/app-shell.md](recipes/app-shell.md); props are in the docs pages (`/docs/components/<base>/app-shell.md` and `/docs/app-shell/<part>.md`).

## Contents

[The structure](#the-structure) · [What breaks it](#what-breaks-it) · [Design the frame from the product](#design-the-frame-from-the-product) · [The sidebar](#the-sidebar) · [The header](#the-header) · [Panels](#panels) · [Pages and routes](#pages-and-routes) · [Responsive and desktop](#responsive-and-desktop) · [Look](#look) · [Changing a shell that exists](#changing-a-shell-that-exists)

## The structure

```text
AppShell                       one per app, in the root layout, never remounted
├── Sidebar                    before the main column; AppNav and friends inside
├── AppShellPanel side="left"  optional: a list that belongs beside the page
├── AppShellMain               exactly one on screen
│   ├── TabStrip               optional, above or below the header
│   ├── AppShellHeader         breadcrumb, actions, panel trigger last
│   ├── AppShellContent        exactly one: the only page scroller
│   │   └── AppShellPageTitle  the h1
│   └── AppNavBottomBar        phones
├── AppShellPanel              optional, right by default
└── AppShellStatusBar          optional, last
titlebar={<AppShellTitlebar/>} a prop of AppShell: a row over sidebar and main
```

Three facts explain the rules:

1. **Layout is by direct children and order.** `Sidebar`, `AppShellMain`, `AppShellPanel` and `AppShellStatusBar` are siblings in the DOM, in that order. A component or a fragment that renders one of them is fine; an element around it is not.
2. **The shell provides the context.** `AppShell` already is the `SidebarProvider`, and `AppShellMain` already is the `SidebarInset`. `useAppShell`, `useShellPanel`, `useShellShortcut`, `useSidebar`, App Nav, Workspace Switcher and User Menu work only below it, in client components.
3. **It measures itself.** Phone, tablet and desktop are the shell's own width (768 and 1024px), panels dock while the main column keeps 520px, and everything it remembers is saved under `storageKey`.

## What breaks it

None of these throws or logs. Most look right at one width and wrong at another.

| Mistake | What happens | Instead |
| --- | --- | --- |
| A `div` around `Sidebar`, `AppShellMain` or a panel | The inset card, its corners and its margins disappear; the status bar runs under the sidebar | Make them siblings; put the wrapper inside |
| `SidebarProvider` or `SidebarInset` added inside | The sidebar and the shell keep two states; the status bar loses its start | `AppShell` takes the provider's props |
| `AppShellMain` before `Sidebar` | The page starts under the sidebar | Sidebar first |
| A panel inside `AppShellMain` or `AppShellContent` | It stacks under the page; its trigger lands off screen | A sibling after `AppShellMain` |
| A right panel placed before `AppShellMain`, or a left one after | The toggle lands off screen | Order follows `side` |
| `AppNavBottomBar` outside `AppShellMain` | Fine on desktop; on phones it takes a third of the width | Last in `AppShellMain` |
| `AppShellStatusBar` inside `AppShellMain` | It covers the page, shifted by the sidebar's width | Last in `AppShell` |
| A wrapper between `AppShellMain` and `AppShellContent` | Nothing scrolls, the page's end and the bottom nav are cut off | Direct child; wrap inside the content |
| `AppShellHeader` inside `AppShellContent` | It scrolls away and loses its edge | Above it |
| A second `AppShellContent`, or `h-screen` and `overflow-auto` around a page | Two scrollbars, a header that never learns the page scrolled | One scroller. Only a page split in panes takes it over: `className="overflow-hidden"` on the content, and panes that scroll |
| A shell inside a shell for a section | Two sidebars, two sets of shortcuts | Swap the groups ([The sidebar](#the-sidebar)) |
| `AppShell` rendered by each page | The sidebar remounts and flashes, panels forget | One in the root layout |
| `renderLink` missing on App Nav | Every click reloads the page; in older copies rows also lose their icon and badge, as with a link that has children | `renderLink={(item) => <Link href={item.href ?? "/"} />}` |
| An `AppShellPageTitle` that a width hides, or two of them | The header takes it for scrolled away and shows the wrong page's name | One, always displayed; move it to the pane that shows |
| A trigger for a panel the page doesn't render | A button that does nothing | Render them together |
| A right panel's trigger anywhere but last in its row | It jumps when the panel opens | Last, in the top row |
| Two panels open on one side | They dock without counting each other and leave the page about 160px at 1280; the pinned trigger of one sits on the other's header and takes the close button from both | One panel a side ([Panels](#panels)) |
| Panel `views` without icons | Under 360px the tabs show icons only, and 320 is the default width: blank tabs | An icon on each view |
| State kept inside a panel | Lost when the panel changes from docked to sheet to drawer | State above the panel |
| `--background` set on the shell, or a background on a part | Parts read different planes | `--app-shell-frame`, `--app-shell-main`, `--app-shell-panel` |

[probe.js](probe.js) reports those a page can show as `shellProblems`. Run it at 1440 and 390 after any change to the frame: an empty list is the check, because the eye misses them.

## Design the frame from the product

Decide from what people do, in this order.

1. **What do they switch between?** Places in the product become sidebar items; several organizations become a `WorkspaceSwitcher`; several open documents become a `TabStrip`; views of one thing stay in the page as `Tabs`.
2. **What do they make?** Their own things (projects, channels, boards) become groups of their own, from data, with a create action in the group's label.
3. **What stays open beside the work?** Details, comments, an inspector: a right panel. A list they pick from while reading: two panes of the main column, so the panel is free for context.
4. **What is true of the whole workspace all the time?** Sync, branch, environment, connection: the status bar. Nothing: no status bar.
5. **How many hours a day?** All day: resizable, peek, shortcuts, customizable order. Now and then: a fixed sidebar with labels.

| Product | Sidebar | Top | Beside | Extras |
| --- | --- | --- | --- | --- |
| SaaS admin, dashboard | `inset`, `icon` rail; switcher, search, 5 to 7 items, settings last | Breadcrumb, actions | Details panel where a page needs one | Bottom nav |
| Queue: inbox, support, approvals | `inset`, `icon` rail; queues with counts | Breadcrumb, filters in the page | List and open item as two panes of the page; the customer or the rules in a panel | Shortcuts to act and advance |
| Editor, IDE, design tool | `offcanvas` with `peek="hover"`, or a `FileTree` in it | `TabStrip` above the header | Inspector with `views`, triggers in the tab row | Status bar, compact, snappy |
| Chat, assistant | Conversations as a data group, newest first, create in the header | Conversation title, model | Sources or artifacts panel | `AppShellContent` without a size |
| Operations, monitoring | `icon` rail, closed | Environment in the header | Incident panel | Status bar with "Live" |
| Settings, admin area | The same sidebar, its groups swapped, with a way back | Breadcrumb | None | `size="sm"` |
| Onboarding, checkout, a focused flow | None; `AppShellHeader trigger="never"`, or outside the shell | A way out | None | |
| Desktop app | `offcanvas`, translucent frame | Tabs in the main column or titlebar | Panels | `window`, `createLocalStorage()` |
| Mobile-first | Behind the page; three to five tabs | Current page only | Swap | `app-shell-05` |

Start from the closest `app-shell-01` to `-05`, or the options at `/app-shell`, which install `components/app-shell-layout.tsx` with the choices made. That file is yours to edit.

## The sidebar

From top to bottom: identity (`WorkspaceSwitcher`, or a product mark), the toggle (`SidebarTrigger`), search, navigation (`AppNav`), then what belongs to the account (usage, `UserMenu`). `SidebarHeader` and `SidebarFooter` stay put, `SidebarContent` scrolls, `SidebarRail` drags to resize.

- **The toggle goes in `SidebarHeader`.** `AppShellHeader` shows one only while the sidebar is collapsed or on phones, so without it the expanded sidebar closes only by ⌘B or its edge.
- **Navigation is a pure function of the product:** `getNavigation({ role, plan, counts, projects })` returns `AppNavGroup[]`. Permissions leave items out, counts become `badge`, data becomes items. The same groups feed the sidebar, the bottom nav, breadcrumbs (`getNavPath`) and the palette, and React Native. Keep it in a client file: icons are components and can't cross from a server component as props.
- **Ids are permanent and unique** across groups and items. Saved order, pins and open groups are stored by them, so derive them from records, never from position or label.
- **The current page is found by path:** the longest `href` or `match.prefixes` wins. `match: { exact: true }` on Home. A section whose pages live elsewhere lists them in `prefixes`. A detail page lights its list without doing anything.
- **Order:** what is used most first; their own things in their own group; settings and help last, in a group without a label. Five to seven items before the first label.
- **Rows:** an icon and one or two words, sentence case. A count only when it asks for something. Give every row of a group an icon or none, never a mix.
- **`status` replaces the icon.** `unread`, `active` and `idle` draw a dot in the icon column and show only on rows without an icon. Use it for a whole group (`idle` for the quiet ones): a row with neither starts at the edge, out of line with the rest. With icons, use `badge`.
- **Row actions** go in `actions` (rename, archive, then `destructive` with `separatorBefore`); a group's create button goes in the group's `actions`.
- **Their own arrangement:** `reorderable` groups, `customizable` with `AppNavCustomize`, one `preferences` value stored per person and read back with `parseNavPreferences`.
- **A section with its own navigation** (settings, a project's admin) swaps the groups by path, with a row back as the first group and a `key` per set. The frame, the switcher and the account stay.
- **Two levels** are `children`. A third means a page with `Tabs`, or a panel.
- **Anything custom** composes the same parts: `SidebarGroup` > `SidebarGroupLabel` + `SidebarGroupContent` > `SidebarMenu` > `SidebarMenuItem` > `SidebarMenuButton icon tooltip`. Search, a usage meter, a checklist, a promotion go in the header or the footer, not between groups. Hide what a rail can't hold with `group-data-[collapsible=icon]:hidden`.
- **Loading:** the frame, the switcher and the search are real at once; only rows that come from data are `SidebarMenuSkeleton showIcon`, as many as usual.
- **Empty:** a data group with nothing keeps its label and its create action.

| `collapsible` | For | Collapsed |
| --- | --- | --- |
| `offcanvas` | Content first, desktop apps, editors | Gone; `peek="hover"` brings it back as a card |
| `icon` | Products people hop around in; tablets | A 48px rail with tooltips. Every top-level row needs its own icon: a group of identical ones is unreadable there |
| `none` | A short, constant list | Doesn't collapse |

`variant="inset"` (the main column is a card on the frame) suits most products, `"floating"` makes the sidebar the card, `"sidebar"` is flush with a hairline.

## The header

`AppShellHeader`: `AppShellBreadcrumb`, then `AppShellHeaderActions`, then the panel trigger. It is one row of fixed height.

- **The breadcrumb** is the page's place, current page last, real links, `renderLink` always. On phones it is the current page with a menu of its parents.
- **Actions are data,** not buttons dropped in the row: `actions` (icons with tooltips), one `primaryAction` with an icon, `menu` for the page. That is what lets phones fold them and float the primary. `shortcut` registers the key and shows it.
- **What doesn't belong:** search and filters (the toolbar), tabs of the page (the page), status (the title or the status bar).
- **Tabs of documents** are a `TabStrip`: inside `AppShellHeader` in place of the breadcrumb, as a row above or below it in `AppShellMain`, or in `AppShellTitlebar` across the whole frame. Keep the tab state above them, so moving the row keeps the selection.
- `AppShellPageTitle` is the h1 in the content; the header shows it once it scrolls away. Its text is what both say, so a page shows exactly one at every width. In a split page it belongs to the open item, and to the list while nothing is open.

## Panels

Something secondary that a person keeps open while working. A task with an end is a `Dialog` or a `Sheet`.

- **`id` is a role,** not a record: `details`, `thread`, `inspector`. Open state, width and view are saved under it, so one id per role keeps a person's choice across records, and a different id means a different panel. Saved values beat `defaultOpen` and `defaultWidth` from then on.
- **The record is state above:** the URL or the page holds which one is open; the panel renders it, and an `Empty` when there is none.
- **Opening from the page:** `useShellPanel("details").setOpen(true)`; `reveal(view)` shows a view, `select(view)` toggles it, as an activity bar does.
- **One body:** `AppShellPanelHeader` (title, close) and `AppShellPanelContent`. **Several views:** `views` on the panel, `AppShellPanelTabs` in the header, one `AppShellPanelView` each.
- **Anything floating starts closed** and doesn't save that it was opened, so a phone never opens on a drawer. What the page is about therefore never lives only in a panel: a left panel of threads is missing on a phone, and a conversation in a right panel leaves a tablet with a bare list. Reading and answering happen in the main column, split by a container query ([recipes/app-shell.md](recipes/app-shell.md#a-queue)); the panel holds what helps.
- **`mobile`:** `drawer` for details and filters, `swap` for a record opened from a table, `none` for what has another home on phones. A `swap` panel covers the page, so its header starts with a way back: `<AppShellPanelClose aria-label="Back to customers"><ArrowLeftIcon /></AppShellPanelClose>`, in place of the sidebar glyph it draws by default.
- **Widths:** 320 for details, 280 for a list, 420 to 560 for something read, with `minWidth` and `maxWidth`. Floating, it is 384px at most. A panel docks while the page keeps 520px, else it floats; `minMainWidth` on `AppShell` moves that line for the whole product.
- **One panel a side.** What two would hold is one panel with `views`. When two must exist, one is `defaultOpen`, the top row has that one's trigger only, the other opens from what it belongs to and closes from inside, and 1280 is looked at with both open.
- **One shortcut each.** The right panel owns ⌘\; another gets its own or `null`.

## Pages and routes

The frame must persist while pages bring their own header, actions and panel. A page can't put a panel beside `AppShellMain` from inside it, so the layout stops at the sidebar and **each page renders its column**:

- The root layout renders `AppShell`, the sidebar, `{children}` and the status bar.
- Each page renders a `PageFrame`, a fragment of `AppShellMain` (header, content, bottom nav) and, when it has one, its `AppShellPanel`.

A layout generated with the header inside it works while every page has the same header. Move to `PageFrame` with the first page that needs its own actions or panel.

- Route groups that have no frame (sign in, onboarding) sit outside the shell's layout.
- Route loading states render inside `AppShellContent`, with the page's real title; the sidebar and the header never reload.
- `AppShellContent size` is per page. A page that needs the full width leaves it out and pads itself.
- Server rendering: read the layout cookie into `defaultLayout` and the sidebar cookie into `defaultOpen`, so the first paint is right. `storageKey` is one per app, never per page. Apps without a server pass `storage={createLocalStorage()}`.

## Responsive and desktop

- **Phones:** the sidebar sits behind the page, panels are drawers or the screen, actions fold, the primary floats, the status bar hides. What people act on there (availability, an incident, offline) needs a second home: a small control in the header, or the user menu. Mark three to five items `mobile: "tab"` and render `AppNavBottomBar` (or `AppShellBottomNav` with `AppShellBottomNavItem`s when the tabs aren't sidebar destinations). It draws no `badge`, so a count that matters is also in the page's title or lead; leave `pb-20` under the page for the floating primary.
- **Tablets:** 834px minus an open sidebar is a phone's column. Use `collapsible="icon"` and collapse it on entering that size ([recipes/app-shell.md](recipes/app-shell.md#tablets)).
- **Don't branch on `window.innerWidth`.** Use `useAppShell().size` for behaviour and container queries for layout.
- **Desktop windows:** pass `window` from `useDesktopWindow()` and let the same tree render. The shell owns traffic lights, insets, drag regions and the toggle; mark custom interactive parts in a top row `data-no-drag`.
- **React Native** shares the model and the names; parts and props differ where the docs page says so ([platforms.md](platforms.md#react-native)).
- **Shortcuts:** register with `useShellShortcut`, never a `keydown` listener. Give `webKeys` for what browsers keep.

## Look

The planes are the depth: frame and sidebar a step darker, main column and panels as cards on it. Change the look in this order:

1. The project's surface tint and brand ([setup/theming.md](setup/theming.md)).
2. The sidebar `variant`.
3. The shell's tokens, in its `style`: `--app-shell-frame`, `--app-shell-main`, `--app-shell-panel`, `--app-shell-card-shadow`, with a surface or a shadow.
4. The density of a region.

Parts keep their own heights, borders, corners, hover and z-index. Custom rows use the sidebar's parts rather than styled links, so the gliding highlight, the rail and the keyboard keep working.

## Changing a shell that exists

1. Find the one `AppShell`. Read the layout, the navigation source and one page; draw its tree against [the structure](#the-structure).
2. Capture it first at 1440 with panels open and closed, 1440 collapsed, 834 and 390 with the sidebar open ([refine.md](refine.md)). Run the probe.
3. Change the smallest layer that does it: data (groups, actions, views), then a prop, then composition of parts, then tokens. The component's source is the last resort, in package mode never.
4. Keep every `id`, `storageKey` and shortcut that people's saved state depends on. Renaming one resets it for everybody; say so if it has to happen.
5. Check again with the same shots, the probe empty at 1440 and 390, the keyboard (⌘B, ⌘\, F6, arrows in the sidebar, Escape in a drawer), a reload (layout kept), a route change (the sidebar doesn't remount, the active row moves) and every role.
