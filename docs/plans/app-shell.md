# App Shell: plan

Status: built (2026-11-03) on `feat/app-shell`, with the recommended answer to every decision in §10. §12 records where the build departed from this plan.

The App Shell is the frame an application lives in: a sidebar with an organization switcher, grouped and collapsible navigation and a profile menu; a main area with a header and breadcrumb; an optional tab strip; an optional right panel; and the adaptations each platform needs (mobile web, Electron, Tauri, React Native).

This plan is grounded in a teardown of the two shells we already ship, SharpOS and Relay (§2), and in what Fabricator already has (§3). Decisions that need you are collected in §10.

---

## 1. Goals and non-goals

### Goals

- One shell that covers the common app layouts through composition, variants and blocks, not one hard-coded layout.
- Web, mobile web and desktop (Electron, Tauri) from one DOM source.
- A platform-agnostic model (navigation, tabs, panels, persistence) that a React Native shell can share.
- Built on what Fabricator already has: the Sidebar override (resize rail, peek, collapsible groups, row actions, status dots, arrow-key rows), Sheet, Drawer, Resizable, Tabs, Breadcrumb, Dropdown Menu, Context Menu, Command, Kbd, the density and motion tokens, Fluid Hover and the sound effects.
- Every interaction reachable from the keyboard, including reordering (WCAG 2.2 SC 2.5.7 requires a single-pointer alternative to every drag).

### Non-goals

- Routing. The shell takes `href`/`isActive`/`onSelect`; it never imports a router.
- Data fetching, auth and org membership logic. The switcher and profile menu render what they are given.
- Window management. The shell never imports `electron` or `@tauri-apps/*`; it takes callbacks and CSS hooks (Ports and Adapters).

---

## 2. Research: SharpOS and Relay

Paths are relative to `~/Dev/repos/sharpos` and `~/Dev/app-ideas/relay`.

### 2.1 SharpOS

The shell lives in `packages/shared/hub-kit` and is shared by web (Next.js), desktop (Electron) and native (Expo Router).

**Web layout.** `hub-kit/src/web/pages/hub-shell.tsx` nests about ten providers (sidebar, header banner, document title, page title, header rail, loading indicator, slots), then renders `AppSidebar` (`variant="inset"`), an agent chat dock, and `HubShellInset`, a `<main>` that is the only scroller. The sidebar is a vendored Fluid Functionalism sidebar with shadcn's names (`packages/core/ui/src/components/sidebar-core.tsx`), the same lineage as Fabricator's override: offcanvas plus hover peek, a 14 to 22rem resize rail with a throw-to-collapse overshoot, groups that collapse by measured height.

**Sidebar contents.**

- First row: account avatar, org mark, sidebar toggle. The profile menu is at the top, not the bottom.
- The org switcher is a mark that opens a Dialog with a cmdk list (⌘O): current org first, lazy-loaded pending invitations, "open in new desktop tab" on desktop, create for admins, an optimistic "Switching…" overlay (`core/organization/src/web/components/organization-switcher.tsx`).
- The account menu (`account-menu.tsx`) has a `variant: "mark" | "row"`, with Profile, Access, Notifications, What's new, theme rows and Logout.
- The nav model is headless: `getHubSidebarGroups()` (`hub-kit/src/sidebar-model.ts`) returns groups of keys, filtered by feature flags and access. Each platform maps keys to routes and icons, and a test asserts that the web sidebar's rows equal the model's.
- Active matching runs `matchesPath`, then `activePrefixes`, then `exact`, then prefix; the longest URL wins (`nav-main.tsx:46-75`).
- Collapsible groups persist in localStorage (`sidebar-group:<key>`). Tree sections fetch only while open, active or hovered (`useSidebarSection`).
- Row actions are data, `SidebarRowAction {key,label,icon,onSelect,destructive,separatorBefore,shortcut}`, shown in a right-click menu (Open, Open in new tab, Copy link) plus tree-specific Add, Rename and Delete.
- Drag and drop uses `@dnd-kit/core`, only in content trees (pages nest before/inside/after; boards reorder; studio moves into folders), with shared pointer-zone helpers (`lib/sidebar-dnd.ts`). It is off on mobile and for viewers. Top-level items and groups can't be reordered, by spec.

**Main area.**

- `HubPage` takes `breadcrumbs`, `actions`, `primaryAction` and `layout`. The primary action is a header button from `md` up and a FAB on phones.
- `HubHeader` is sticky. It shows the toggle only when the sidebar is closed, draws a hairline once the inset scrolls, and swaps the breadcrumb for the page title once the `<h1>` scrolls away.
- Breadcrumbs are passed per page, or derived from the pathname. More than four fold the middle into a popover; on phones the current crumb opens a popover of its parents.
- `HubHeaderActions` describes actions once, and they render as buttons, a `⋯` menu or a phone bar.

**Panels.** One `SidePanel` serves every feature column (`core/ui/src/shell/side-panel.tsx`):

- size steps: compact, default, wide, sheet
- its own pointer and keyboard resize handle
- persisted as `sharpos-panel:<key>:width|open`
- per-panel mobile role: `drawer`, `swap` (the panel becomes the screen) or `none`, with the phone's open state kept apart from the desktop preference

The agent chat dock is a sibling of the inset, so the page narrows beside it.

**Desktop.**

- The window uses `titleBarStyle: "hiddenInset"` with `trafficLightPosition {14,14}` and a 1280×750 minimum.
- The tab strip is a separate 40px `WebContentsView` with its own HTML (`apps/desktop/src/strip/`). It uses `-webkit-app-region: drag` with `no-drag` on tabs and an 86px traffic-light inset.
- Each tab is a `WebContentsView`, so the web shell has no title-bar code. It detects desktop through a `data-sharpos-desktop-app` attribute and a `window.sharposDesktop.tabs` bridge.

**Native.**

- Phones get `NativeTabs` (Hub, Inbox with a badge, Settings), with the org switcher in a bottom sheet.
- iPad switches mode by width: tabs, then overlay from 768pt, then pinned from 1024pt (`getHubShellMode`). The frame is the Stack's `layout` prop, so a resize never remounts the navigator.
- Sidebar width and group state are stored in SecureStore. Picking a row swaps the stack's root.
- ⌘K and ⌘\ come from a native `UIKeyCommand` module.

**Pain points:**

- Route paths, icon maps, active-match rules and slot types are duplicated between web and native.
- There are three org switchers and two account menus.
- There are four resize implementations: the rail, `SidePanel`, react-resizable-panels and a PanResponder.
- Shortcuts are separate `window` keydown listeners with no registry.
- `useIsMobile` is false on the first render, so breakpoint branches need CSS gates.
- Storage keys are inconsistent, and some are written but never read.
- The sidebar mounts above the org provider, so it re-derives the org from the route.

### 2.2 Relay

The client (`apps/client`, Vite + TanStack Router + Base UI shadcn, `base-vega`) runs in the browser and inside Electron. Mobile is Expo. Relay uses no Fabricator components today.

**Layout.**

- `features/app/app-shell.tsx` is a two-column grid (`var(--sidebar-width) minmax(0,1fr)`). The sidebar column animates to `0rem` when closed, and the hidden sidebar stays mounted but `inert`, so its shortcuts keep working.
- The sidebar toggle never moves: while the sidebar is hidden, a fixed copy sits in the same spot, and page headers reserve room for it with a `HeaderLead` spacer (imported in 20 files).
- There are no viewport breakpoints. The design spec asks for container queries, and the narrow-window fallback is ⌘B.

**Resize.**

- One `ResizeHandle` (`components/resize-handle.tsx`):
  - pointer capture and a rAF-throttled `onPreview` that writes the CSS variable straight to the DOM; `onCommit` runs once on release
  - double-click resets, arrow keys step 16px
  - `role=separator` with `aria-valuenow`
  - `html[data-resizing]` locks the cursor and pauses transitions
- Sizes:

  | Area        | Default | Min | Max |
  | ----------- | ------- | --- | --- |
  | Sidebar     | 272     | 208 | 440 |
  | Right panel | 320     | 280 | 640 |

- Both persist in localStorage, synced across windows.
- A second implementation, the workspace split `Sash`, has no keyboard support or ARIA.

**Tab strip** (`features/workspace/tab-strip.tsx`, model in `packages/protocol/src/workspace-grid.ts`). This is the reference implementation.

- Model:
  - Tabs are string keys `kind:id`. A group holds `tabs`, `recent` (MRU; the first open one is active), `pinned` (always first) and `preview` (italic, replaced by the next preview).
  - Groups form a split tree with sizes, a focused group, a maximized group and a reopen stack of 20.
  - Every operation is a pure `(workspace) => workspace` function: `openTab`, `closeTabs`, `moveTab` (crossing the pinned boundary pins or unpins), `togglePin`, `splitWith`, `openChildTab`, `reconcile`, `normalise`. Purity lets the store replay unsent edits over the daemon's copy after a 409.
- Rendering:
  - Tabs are `w-48 min-w-36`; pinned tabs are icon-only.
  - The close slot is always reserved, so titles never reflow. A dirty dot swaps to ✕ on hover.
  - Middle-click closes. Double-click or F2 renames.
  - Roving keys: ←/→, Home/End, Enter/Space, Delete.
  - Status icons: loading, crashed, waiting, plus favicons.
  - Overflow scrolls horizontally with a fade mask. There is no overflow menu.
  - The active tab is a static pill; it does not slide.
- Context menu: Rename, Pin, Close, Close others (spares pinned), Close to the right, Close all, Reopen, plus kind-specific items.
- Drag and drop needs no library: `features/workspace/drag/`.
  - An explicit state machine (`idle → pressed → dragging → dropping|cancelling`, 4px slop).
  - Geometry is measured when the drag starts, so hit-testing never touches iframes or native views.
  - Neighbours shift with `translateX`, the strip auto-scrolls near its ends, Esc cancels, and the ghost flies home unless motion is reduced.
- Shortcuts are matched by `event.code`. ⌘T and ⌘W need ⌥ added on the web, because the browser keeps them.

  | Keys            | Action              |
  | --------------- | ------------------- |
  | ⌘T / ⌘W         | New tab / close tab |
  | ⇧⌘T             | Reopen closed tab   |
  | ⌃Tab, ⇧⌘[ / ⇧⌘] | Next / previous tab |
  | ⌘1–8 / ⌘9       | Select tab / last   |

- Tabs are resources, not routes. A `RouteSync` writes the focused tab into the URL with `replace`, so Back walks pages, not tabs.

**Right panel** (`features/right-panel/`).

- State: `{ open, view, width, … }` saved as `relay.rightPanel`, restored leniently (old view names are migrated).
- `select(view)` toggles the panel off when that view is already showing, as VS Code's activity bar does. `reveal(target)` opens a sub-view.
- Shortcuts: ⌘\ toggles the panel; ⇧⌘E, ⇧⌘F and ⇧⌘G open views.
- The header holds Base UI tabs with a motion indicator, icons-only below 360px.
- Weak points: the panel only exists inside `ProjectPage`, the views are a hard-coded switch with no slot, and it has no open or close animation (it returns `null`).

**Sidebar.**

- There is no org switcher and no user menu (Profile is a footer link), and no nav data model: rows are hand-written components.
- Collapsible groups persist as `relay.sidebar.group.<id>`.
- Projects reorder with `motion/react` `Reorder`, using a draft order so a drop never snaps back. They have pinned, others and archived groups, and a context menu (Rename, Change icon, Pin, Archive).
- A shared measured hover highlight runs across each section.

**Desktop (Electron 45).**

- Window: `titleBarStyle: "hiddenInset"`, `trafficLightPosition {16,23}`, `vibrancy: "sidebar"`.
- The client finds Electron by sniffing the user agent, then sets `html[data-shell="electron"]` to make the page transparent.
- `.drag-region` sets `app-region: drag`, and interactive descendants become no-drag automatically through `:where(button, a, input, textarea, [role=button], [data-no-drag])`.
- Workarounds the code needs:
  - The hidden sidebar must drop its drag region, because Electron ignores opacity and clipping.
  - The floating toggle is rendered after `<main>` so its no-drag wins.
- The traffic-light inset is hard-coded in three places (`pl-[88px]`, `w-28`, `trafficLightPosition`).
- Nothing adapts to fullscreen, and there are no Windows or Linux controls (no `titleBarOverlay`).

**Mobile (Expo 58, RN 0.88, expo-router).**

- `getWorkbenchLayout()` is a pure function that scales every threshold by `fontScale`:
  - Sidebar: a drawer below 760pt; expanded at 1000pt or more when open; otherwise a 56pt rail.
  - Panel: inline while at least 520pt of content remains, otherwise an overlay.
- The tab strip is a horizontal `ScrollView`. A long press opens an action sheet (Move left, Move right, Pin, Close); there is no drag on mobile.
- Shared code is `@relay/protocol` types and pure functions. No React components are shared.

**Pain points:**

- Six or more global keydown listeners, mixing capture and bubble phases, `key` and `code`, plus a second table in Electron's main process.
- Close logic is duplicated between the strip and the sidebar, and the sidebar's copy skips confirmations.
- Tab kinds drift between two type lists.
- `{key, at}` "requests" are honoured only within 1000ms.
- There is no `PageHeader` primitive, so every page hand-rolls its header.

### 2.3 What the two shells agree on

Built separately, the two shells landed on the same answers. Where they disagree, one of them shows a cost.

| Topic                  | SharpOS                                                                | Relay                                                          | Fabricator takes                                                                            |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Cross-platform sharing | Headless nav model; routes, icons and matching duplicated per platform | Pure tab/grid model in `@relay/protocol`; no shared components | A DOM-free model that holds the routes and match rules too, so nothing is duplicated (§4.3) |
| Resize                 | Four implementations                                                   | Two, with uneven accessibility                                 | One handle for the sidebar rail, panels and anything else (§4.10)                           |
| Shortcuts              | A `window` listener per feature                                        | 6+ listeners, mixed phases and matching                        | One registry: `event.code`, `mod`, web fallbacks, listed for the palette and Kbd (§4.9)     |
| Traffic lights         | 86px padding in the strip                                              | Hard-coded in three places, no fullscreen                      | One `window` prop that sets CSS variables and reacts to fullscreen (§5.2)                   |
| Right panel            | Generic `SidePanel`: sizes, per-key persistence, mobile role           | Route-bound, hard-coded views, VS Code toggle                  | SharpOS's generic panel with Relay's view switching and shortcuts (§4.8)                    |
| Header                 | Sticky, scroll hairline, title handoff, actions described once         | None; every page hand-rolls one                                | SharpOS's header as a shell part (§4.7)                                                     |
| Breakpoints            | `useIsMobile` false on first render, CSS gates added after             | Container queries, no viewport fallback                        | Container width for layout, CSS container queries for first paint (§4.4)                    |
| Tabs                   | Desktop-only native strip view                                         | Pure model, reserved close slot, DnD state machine             | Relay's model and behaviour, plus a sliding indicator and an overflow menu (§4.5)           |
| Org switcher           | Command dialog with ⌘O, invites, optimistic switching                  | None                                                           | Both a menu and a command variant (§4.6)                                                    |
| DnD                    | `@dnd-kit/core`, with an `onDragOver` quirk and `as any`               | `motion` `Reorder` for lists, custom engine for tabs           | One adapter, one library (§4.10, decision 2)                                                |
| Persistence            | Cookie → proxy header → `defaultOpen`; mixed key namespaces            | localStorage, lenient restore                                  | A storage port, cookie by default for SSR, one namespace, lenient restore (§4.4)            |

---

## 3. What Fabricator already has

| Need                        | Existing piece                                                                                                       | Gap                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Left sidebar                | `registry/fabricator/<base>/ui/sidebar.tsx` (1,861 lines in Base UI)                                                 | Width from the rail is not persisted and has no `onWidthChange`; one provider = one sidebar.  |
| Collapsible groups          | `SidebarGroup collapsible`, `SidebarMenuSub open`                                                                    | Open state not persisted per group.                                                           |
| Row actions, badges, status | `SidebarMenuActions`, `SidebarMenuBadge`, `SidebarMenuButton status/dot`                                             | None.                                                                                         |
| Org switcher, profile menu  | Block-local `team-switcher.tsx`, `nav-user.tsx` in `sidebar-07` and others                                           | Not installable on their own; no create/manage actions, no search past ~7 orgs, no shortcuts. |
| Right panel                 | `sidebar-15` renders a second `Sidebar` with `collapsible="none"`                                                    | No independent open state, no resize, no toggle, no narrow-screen behaviour.                  |
| Resizable panes             | `resizable` (react-resizable-panels 4.15: pixel sizes, `preserve-pixel-size`, cookie storage via `useDefaultLayout`) | None for our use.                                                                             |
| Tabs                        | `tabs` override (Fluid Hover selection pill)                                                                         | Content tabs only: no close, reorder, pin, overflow or document semantics.                    |
| Breadcrumb                  | `breadcrumb`                                                                                                         | No collapse of middle items on narrow widths; no route-derived helper.                        |
| Mobile breakpoint           | `use-mobile` (768px)                                                                                                 | One breakpoint; the shell needs three (phone, tablet, desktop).                               |
| Drag and drop               | None in Fabricator (`@dnd-kit/*` is only in the excluded `dashboard-01` block)                                       | Needed for nav and tabs.                                                                      |
| Full-layout previews        | `ComponentPreview type="frame"` (used by the sidebar docs)                                                           | None.                                                                                         |

---

## 4. Architecture

### 4.1 Layers

```
app-shell-01…06        blocks: complete, opinionated shells to copy and edit (§6)
───────────────────────────────────────────────────────────────────────────────
app-nav  tab-strip  workspace-switcher  user-menu      composed components
───────────────────────────────────────────────────────────────────────────────
app-shell              the frame: regions, header, panels, shortcuts, window chrome
sidebar (existing)     the left sidebar, extended additively
───────────────────────────────────────────────────────────────────────────────
app-shell-model        DOM-free TypeScript: nav, tabs, layout, shortcuts, resize, storage port
```

Customisation happens at three depths: props and variants on the components, composition of the parts, and the blocks, which are source the user owns. The model sits underneath, so a team that wants a completely different look still gets the behaviour.

### 4.2 Registry items

All are Fabricator-exclusive (`meta.fabricator: true`), styled only in the Fabricator style map, and depend on each other as `@fabricator/<name>`. The names don't exist upstream (checked against `@shadcn`).

| Item                 | Type                 | Contents                                                                                                    | Registry dependencies                                                                                        |
| -------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `app-shell-model`    | `registry:lib`       | Types and pure functions (§4.3). No React, no DOM, so it installs into a React Native project too.          | none                                                                                                         |
| `app-shell`          | `registry:ui`        | `AppShell`, main, header, breadcrumb, content, status bar, panels, shortcut registry, window chrome, hooks. | `app-shell-model`, `sidebar`, `sheet`, `drawer`, `tabs`, `tooltip`, `kbd`, `breadcrumb`, `popover`, `button` |
| `tab-strip`          | `registry:ui`        | Document tabs (§4.5) and `useTabStripState`.                                                                | `app-shell-model`, `context-menu`, `dropdown-menu`, `tooltip`, `fluid-hover`, `sortable`                     |
| `app-nav`            | `registry:component` | Renders a nav model into Sidebar parts, with actions, reordering and a Customize dialog.                    | `app-shell-model`, `sidebar`, `context-menu`, `dropdown-menu`, `dialog`, `sortable`                          |
| `workspace-switcher` | `registry:component` | Org/workspace switcher, menu and command variants (§4.6).                                                   | `sidebar`, `dropdown-menu`, `command`, `dialog`, `avatar`, `kbd`                                             |
| `user-menu`          | `registry:component` | Profile menu, row and mark variants.                                                                        | `sidebar`, `dropdown-menu`, `avatar`                                                                         |
| `sortable`           | `registry:lib`       | The one drag-and-drop adapter (§4.10).                                                                      | none (npm: decision 2)                                                                                       |

Bases: Base UI first. `app-shell-model` and `sortable` are one shared source (`registry/fabricator/shared/`). The rest compose triggers (`render` in Base UI, `asChild` in Radix, RAC slots in Aria), so each gets a per-base file in the parity phase, as AGENTS.md "Bases" asks.

### 4.3 The model (`app-shell-model`)

One file of types and pure functions, unit-tested first (TDD). Field names mirror the component props they feed (`collapsible`, `disabled`), following the repo's shadcn naming.

```ts
// Navigation. TIcon is a React component on web and native alike.
type NavMatch = { exact?: boolean; prefixes?: readonly string[] }
type NavAction = {
  id: string
  label: string
  shortcut?: string
  destructive?: boolean
  separatorBefore?: boolean
  onSelect: () => void
}
type NavItem<TIcon> = {
  id: string
  label: string
  href?: string
  icon?: TIcon
  match?: NavMatch
  badge?: number | string
  status?: "filled" | "ring"
  disabled?: boolean
  children?: NavItem<TIcon>[]
  actions?: NavAction[]
  /** Phones: a bottom tab, a row in the menu, or left out. */
  mobile?: "tab" | "menu" | "hidden"
}
type NavGroup<TIcon> = {
  id: string
  label?: string
  items: NavItem<TIcon>[]
  collapsible?: boolean
  reorderable?: boolean
  actions?: NavAction[]
}
/** What the user changed. Serializable; the app stores it where it likes. */
type NavPreferences = {
  order: Record<string, string[]> // group id → item ids
  hidden: string[]
  pinned: string[]
  collapsed: string[]
}

getActiveNavItem(groups, pathname) // matches then prefixes then exact then prefix; longest wins
applyNavPreferences(groups, preferences) // order, hide, pin; unknown ids dropped (lenient restore)
moveNavItem(preferences, groups, { id, toGroupId, toIndex })
toggleNavCollapsed(preferences, id)

// Tabs: Relay's single-group model.
type TabStripState = {
  tabs: string[] // visual order, pinned first
  pinned: string[]
  recent: string[] // most recent first; the first open one is active
  preview: string | null
  closed: string[] // reopen stack, newest first, capped at 20
}
openTab(state, id, { preview?, after? })
activateTab(state, id)
closeTabs(state, ids) // the next active tab comes from `recent`
closeOtherTabs(state, id) // keeps pinned tabs
closeTabsToRight(state, id)
moveTab(state, id, toIndex) // crossing the pinned boundary pins or unpins
togglePinnedTab(state, id)
reopenClosedTab(state)
getActiveTab(state)

// Layout: decided from the shell's own width, never the viewport.
type ShellLayout = {
  sidebar: "drawer" | "rail" | "expanded" | "hidden"
  panel: "inline" | "overlay" | "drawer" | "hidden"
}
resolveShellLayout({ width, sidebar, panels, minMainWidth = 520, breakpoints = { tablet: 768, desktop: 1024 } })

// Shortcuts: event-shaped input, so it also serves native key commands.
parseShortcut("mod+shift+t") // { code: "KeyT", mod: true, shift: true, … }
matchesShortcut(event, shortcut, platform) // event.code, mod = ⌘ on Apple, Ctrl elsewhere
formatShortcut(shortcut, platform) // "⇧⌘T" | "Ctrl+Shift+T"

// Resize.
getResizedSize({ start, delta, min, max, collapseSlop }) // { size } | { collapsed: true }

// Breadcrumbs.
getBreadcrumbsFromPath(pathname, { labels, rootLabel }) // SharpOS's fallback derivation

// Persistence port: cookie (default, SSR-readable) and localStorage adapters ship
// with app-shell; React Native passes its own (MMKV, SecureStore).
type ShellStorage = { get(key: string): string | null; set(key: string, value: string): void }
```

Persisted keys share one namespace, `app-shell:<storageKey>:<part>`, and every restore is lenient: unknown views, tabs or items are dropped, never thrown on.

### 4.4 The frame (`app-shell`)

`AppShell` renders the existing `SidebarProvider` (its props pass straight through) and adds the shell context: panels, layout, the shortcut registry, window chrome and storage. The Sidebar keeps its upstream API and stays usable without the shell.

```tsx
<AppShell
  storageKey="acme"
  defaultLayout={layoutFromCookie} // read on the server: no first-paint flash
  window={{ controls: "macos", isFullscreen }} // desktop only (§5.2)
>
  <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader>
      <WorkspaceSwitcher workspaces={orgs} activeId={orgId} onSelect={switchOrg} />
      <UserMenu variant="mark" user={user}>…</UserMenu>
    </SidebarHeader>
    <SidebarContent>
      <AppNav
        groups={groups}
        pathname={pathname}
        preferences={preferences}
        onPreferencesChange={savePreferences}
        renderLink={(item, props) => <Link href={item.href} {...props} />}
      />
    </SidebarContent>
    <SidebarRail />
  </Sidebar>

  <AppShellMain>
    <TabStrip …/> {/* optional (§4.5) */}
    <AppShellHeader>
      <AppShellBreadcrumb items={crumbs} />
      <AppShellHeaderActions actions={actions} primaryAction={create} />
      <AppShellPanelTrigger panel="inspector" />
    </AppShellHeader>
    <AppShellContent>{children}</AppShellContent>
    <AppShellStatusBar>…</AppShellStatusBar> {/* optional */}
  </AppShellMain>

  <AppShellPanel id="inspector" defaultWidth={320} minWidth={280} maxWidth={640} mobile="drawer">
    <AppShellPanelHeader>
      <AppShellPanelTabs />
    </AppShellPanelHeader>
    <AppShellPanelView value="details" label="Details" icon={InfoIcon} shortcut="mod+shift+i">…</AppShellPanelView>
    <AppShellPanelView value="activity" label="Activity" icon={HistoryIcon}>…</AppShellPanelView>
  </AppShellPanel>
</AppShell>
```

**Parts.**

| Part                                               | Role                                                                                                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AppShell`                                         | Root: `SidebarProvider`, shell context, `@container app-shell`, `data-layout-*` attributes, the shortcut listener, window chrome variables, a "Skip to content" link.                                                      |
| `AppShellMain`                                     | `SidebarInset` plus a column for the strip, header, content and status bar. `role="main"` stays on the content, so a tab strip can sit above it.                                                                           |
| `AppShellTitlebar`                                 | Optional full-width row above everything (browser-like tabs, SharpOS desktop). A drag region on desktop.                                                                                                                   |
| `AppShellHeader`                                   | Sticky. Hairline once the content scrolls. A leading slot shows the sidebar trigger only while the sidebar is hidden or on phones, and keeps the traffic-light inset when the sidebar is hidden. A drag region on desktop. |
| `AppShellBreadcrumb`                               | Items array. More than four fold the middle into a popover; on phones the current crumb opens a list of its parents. Swaps to the page title once the page's `AppShellPageTitle` scrolls away.                             |
| `AppShellHeaderActions`                            | Actions described once: buttons from tablet up, a `⋯` menu on phones; `primaryAction` becomes a floating button on phones.                                                                                                 |
| `AppShellContent`                                  | The only scroller. Feeds the header hairline and title handoff.                                                                                                                                                            |
| `AppShellStatusBar`                                | Optional bottom bar, as in Relay and VS Code.                                                                                                                                                                              |
| `AppShellPanel`                                    | A side column, left or right (§4.8). Several are allowed.                                                                                                                                                                  |
| `AppShellBottomNav`                                | Optional phone tab bar, fed by nav items with `mobile: "tab"` (§5.1).                                                                                                                                                      |
| `useAppShell`, `useShellPanel`, `useShellShortcut` | Hooks for layout, panel state and shortcuts.                                                                                                                                                                               |

**Layout.**

- The shell measures its own width with a ResizeObserver and runs `resolveShellLayout`, so it behaves the same in an iframe preview, a split desktop window or a full browser.
- For the first paint, before JavaScript, the same thresholds are written as CSS container queries on `@container app-shell`. This fixes the first-render flash SharpOS hit with `useIsMobile`.
- Region widths are CSS variables on the root (`--sidebar-width`, `--app-shell-panel-<id>-width`). Opening and closing animates width on the move timing.
- Hidden regions stay mounted and `inert`, so their shortcuts keep working (Relay).

**State and persistence.**

- Sidebar open state keeps the existing `sidebar_state` cookie.
- The sidebar gains additive `defaultWidth`, `onWidthChange` and persisted width (superset rule), so the rail's width survives a reload.
- Panel open state, view and width persist through the storage port under the shell namespace. The default port is a cookie, so a Next.js layout reads `defaultLayout` on the server, as SharpOS does through its proxy.
- On phones, panel open state is temporary and never overwrites the desktop preference (SharpOS).

### 4.5 Tab strip (`tab-strip`)

Document tabs in the manner of Relay, a browser or an editor. The component is controlled; `useTabStripState` wraps the model's pure functions and the storage port for apps without a store of their own.

```tsx
<TabStrip
  value={activeId}
  onValueChange={activate}
  onReorder={moveTab}
  onClose={closeTabs}
>
  <TabStripList>
    {tabs.map((tab) => (
      <TabStripTab
        key={tab.id}
        value={tab.id}
        pinned={tab.pinned}
        preview={tab.preview}
        status={tab.status}
        icon={tab.icon}
        actions={menuFor(tab)}
        onRename={rename}
      >
        {tab.title}
      </TabStripTab>
    ))}
  </TabStripList>
  <TabStripNew onClick={newTab} />
  <TabStripOverflow /> {/* optional: a menu of every tab */}
</TabStrip>
```

- **Kept from Relay:**
  - reserved close slot; a dirty dot that swaps to ✕ on hover
  - middle-click close; double-click or F2 to rename
  - icon-only pinned tabs; italic preview tabs
  - status icons (`loading`, `error`, `dirty`, `waiting`)
  - scroll overflow with `scroll-fade`, keeping the active tab in view by setting `scrollLeft`
  - a context menu (Pin, Rename, Close, Close others, Close to the right, Close all, Reopen, then the tab's own `actions`)
- **Added:**
  - The active pill slides between tabs with Fluid Hover's selection (axis `x`), and the hover highlight glides.
  - An optional overflow menu.
  - Sizes from the density tokens.
  - Sounds through `data-slot` with no extra wiring.
- **Shortcuts** (`useTabStripShortcuts`, through the shell registry): ⌘T, ⌘W, ⇧⌘T, ⌃Tab/⌃⇧Tab, ⇧⌘[ / ⇧⌘], ⌘1–8, ⌘9. Each has a web fallback for keys the browser reserves (⌥ added, as in Relay).
- **Reorder:** drag along `x`, with neighbours shifting aside. Keyboard reordering through the DnD adapter, plus Move left and Move right in the context menu (the single-pointer alternative).
- **Out of v1:** split groups and moving tabs between groups (decision 3).
- **Routing** stays with the app: the docs show Relay's `RouteSync` pattern (URL follows the focused tab with `replace`).

### 4.6 Workspace switcher and user menu

**`WorkspaceSwitcher`** takes `workspaces: { id, name, logo?, description? }[]`, `activeId`, `onSelect`, and optionally `onCreate`, `onManage`, `isSwitching` and `children` for extra items.

- `variant="menu"` is the shadcn team-switcher made installable: logo, name, plan line, ⌘1–9, Create, Manage.
- `variant="command"` is SharpOS's: a dialog with a search list, ⌘O, a slot for pending invitations, and per-row actions (for example, "Open in new window" on desktop).
- `size="row"` fills the sidebar header; `size="mark"` is the logo alone, for a collapsed rail or a header row shared with the user menu.
- `isSwitching` shows SharpOS's optimistic "Switching…" overlay.

**`UserMenu`** has `variant="row" | "mark"` (SharpOS) and takes `user: { name, email, avatarUrl? }`, with `children` for the items. It opens to the side on desktop and from the bottom on phones. Blocks show it both at the top (SharpOS) and at the bottom (shadcn).

### 4.7 Header and breadcrumb

Taken from SharpOS's `HubHeader`, which Relay lacks (20 hand-rolled headers):

- sticky
- scroll hairline
- trigger only while the sidebar is hidden
- breadcrumb that hands over to the page title
- folded crumbs
- actions described once

`getBreadcrumbsFromPath` is the fallback when a page passes no items.

### 4.8 Panels

`AppShellPanel` merges SharpOS's `SidePanel` and Relay's right panel.

- **Props:** `id`, `side` (`right` by default), `defaultWidth`, `minWidth`, `maxWidth`, `defaultOpen`, `defaultView`, `mobile` (`drawer` | `swap` | `none`), `shortcut` (default `mod+alt+b`, VS Code's secondary sidebar).
- **Views:** register with `AppShellPanelView` (`value`, `label`, `icon`, `shortcut`). `AppShellPanelTabs` renders them with the Fabricator tabs and turns icon-only below 360px through a container query. This replaces Relay's hard-coded switch.
- **`useShellPanel(id)`** returns `{ open, view, width, toggle, select, reveal }`. `select(view)` closes the panel when that view is already showing (VS Code, Relay).
- **Placement by width:**
  - inline while the main column keeps `minMainWidth` (520px, Relay)
  - otherwise an overlay sheet on tablets
  - on phones, a drawer, or `swap` (the panel becomes the screen, for list and detail layouts)
- **Persistence:** width and resize as in §4.10. It animates open and closed on the move timing; Relay's panel doesn't animate at all.

### 4.9 Shortcut registry

There is one capture-phase keydown listener on `AppShell`.

```ts
useShellShortcut({ id: "panel.toggle", keys: "mod+alt+b", webKeys?: "…", label: "Toggle panel", allowInInputs?: false }, handler)
```

- Matching is by `event.code`, so keyboard layouts don't break shortcuts. `mod` is ⌘ on Apple and Ctrl elsewhere.
- Typing targets are skipped unless the shortcut allows them.
- `webKeys` takes over in a browser when `keys` is browser-reserved. The `window` prop marks desktop, where `keys` apply.
- `useShortcuts()` lists every registered shortcut, for a command palette and for `Kbd` labels in tooltips.
- F6 and ⇧F6 cycle focus between regions (sidebar, tab strip, content, panel), as browsers and VS Code do.
- The Sidebar keeps its own shortcut listener, so it still works without the shell. The registry lists that shortcut but does not handle it twice.

### 4.10 Resize and drag and drop

**Resize.** One `ResizeHandle` serves panels now, and the sidebar rail once its logic moves to the model's `getResizedSize`:

- Relay's handle behaviour: pointer capture, rAF writes to the CSS variable, commit on release, double-click reset, arrow keys, `role=separator` with values, `html[data-resizing]`.
- Fabricator's rail extra: dragging past the minimum by the slop collapses.

The rail refactor is additive inside the Fabricator override.

**Drag and drop.** One adapter file, `sortable`, exposes `SortableList`, `SortableItem` and `useSortableItem` for both axes:

- multiple containers (nav groups)
- keyboard sorting with live-region announcements
- auto-scroll
- reduced motion

`tab-strip` and `app-nav` import the adapter, never the library (Ports and Adapters), so changing the library touches one file. Which library is decision 2.

Every reorder also has menu actions (Move up/down/left/right, Move to group), which is the WCAG 2.5.7 single-pointer alternative and the only reorder on touch-first phones (Relay's mobile approach).

---

## 5. Platforms

### 5.1 Web and mobile web

| Shell width   | Sidebar                                        | Panel                     | Header                                                   |
| ------------- | ---------------------------------------------- | ------------------------- | -------------------------------------------------------- |
| under 768px   | sheet (existing), swipe from the edge in a PWA | drawer or swap            | compact breadcrumb, `⋯` actions, floating primary action |
| 768 to 1023px | icon rail or offcanvas with peek               | overlay sheet             | full                                                     |
| 1024px and up | expanded, resizable                            | inline while main ≥ 520px | full                                                     |

- On phones, `AppShellBottomNav` is opt-in, for PWAs. SharpOS's web shell has no bottom nav; its native app does.
- Coarse pointers get a 44px touch floor through the density scale (SharpOS).
- The sheet closes on route change through an `onNavigate` hook on `AppNav`.

### 5.2 Desktop (Electron, Tauri)

The DOM is the same as the web. The `window` prop adds the native-window details without importing either runtime:

```ts
type ShellWindow = {
  /** Where native controls sit: macOS traffic lights at the start, the Windows/Linux overlay at the end. */
  controls: "none" | "macos" | "overlay"
  isFullscreen?: boolean // drops the traffic-light inset (Relay never does)
  trafficLights?: { x: number; y: number } // the same values as BrowserWindow / tauri.conf
}
```

- **CSS variables:**
  - `--app-shell-window-inset-start`: the traffic-light inset, computed from `trafficLights`.
  - `--app-shell-window-inset-end`: from `env(titlebar-area-x)` and `env(titlebar-area-width)` for Electron's `titleBarOverlay` (Window Controls Overlay, per the Electron custom title bar docs).
  - `--app-shell-titlebar-height`: `env(titlebar-area-height, …)` with a density fallback.

  These replace Relay's three hard-coded offsets.

- **Drag regions:** surfaces marked `data-drag-region` (sidebar header, app header, titlebar, tab strip background) get `app-region: drag`. Interactive descendants get `no-drag` through Relay's `:where(button, a, input, textarea, [role=button], [data-no-drag])` selector. The same surfaces render `data-tauri-drag-region`.
  - Tauri applies its attribute only to the element itself, not its children. Its docs suggest `app-region: drag` on Windows for touch and pen. Our CSS sets both.
- **Hidden regions** drop their drag region, because Electron ignores opacity and clipping (Relay).
- **Detection** is the app's job: it passes `window` from its preload bridge. There is no user-agent sniffing (a Relay pain point).
- **Docs:** a "Desktop apps" guide with the matching `BrowserWindow` and `tauri.conf.json` settings, and Relay's desktop as the first real-app check.

### 5.3 React Native

What the two apps show: neither shares a React component between web and native, and both share a pure model. SharpOS duplicates routes, icons and matching between platforms; Relay duplicates titles and tab kinds. That is why this plan's model holds paths and match rules too.

What we ship depends on decision 1.

- **Now:** `app-shell-model` installs into an Expo project through the same CLI, because it has no DOM or React imports.
- **Later, as a native target**, built on the two proven designs:
  - The frame is the Stack's `layout`, so a resize never remounts the navigator (SharpOS).
  - `resolveShellLayout` with `fontScale` picks bottom tabs on phones, an overlay sidebar from 768pt, and a pinned sidebar from 1024pt (SharpOS, Relay).
  - The org switcher and profile menu go in bottom sheets.
  - The tab strip is a horizontal `ScrollView` with long-press actions (Relay).
  - The panel is inline, an overlay or a sheet.
  - Hardware keyboard shortcuts on iPad use the same registry format (SharpOS's `UIKeyCommand` module).
- **What the native target needs first:**
  - A `PLAN.md` change (React Native ports are a non-goal in §1).
  - A styling decision: Uniwind (Tailwind v4 on React Native, which fits D11), NativeWind (Tailwind v3) or StyleSheet with tokens.
  - A registry path outside the bases. The base trees and the parity rule are about DOM primitive libraries.
  - React Native Reusables shows the shadcn `components.json` and registry format working for Expo.

---

## 6. Variants (blocks)

Each block is a full shell, previewed in docs with `ComponentPreview type="frame"`, installable with `add`. The `/blocks` gallery stays removed.

| Block          | Modelled on                      | What it shows                                                                                                               |
| -------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app-shell-01` | SharpOS hub                      | Inset sidebar, avatar + org mark + toggle in the first row, collapsible groups, breadcrumb with title handoff, right panel. |
| `app-shell-02` | Relay workbench                  | Tab strip, right panel with view tabs and shortcuts, status bar, reorderable pinned/others project lists.                   |
| `app-shell-03` | Classic SaaS (shadcn sidebar-07) | Org menu on top, user menu at the bottom, icon-rail collapse, favourites group.                                             |
| `app-shell-04` | Multi-product                    | A narrow app rail beside a second-level nav (one icon per product, its sections beside it).                                 |
| `app-shell-05` | Mobile-first PWA                 | Bottom nav, sheet sidebar, floating primary action, panel as swap.                                                          |
| `app-shell-06` | Desktop app                      | Titlebar row with tabs, traffic-light and overlay insets, drag regions, a fullscreen toggle in the demo.                    |

---

## 7. Accessibility

- **Landmarks:** `nav` (sidebar, labelled), `main` (content), `aside` (each panel, labelled), a skip link, F6 region cycling.
- **Tab strip:** the WAI-ARIA tabs pattern.
  - The list is `role="tablist"`, each tab is `role="tab"` with `aria-selected` and `aria-controls` pointing at the content (`role="tabpanel"`), with roving focus.
  - The close button is a sibling of the tab, not inside it (nested interactive content fails axe). It is `tabIndex={-1}` and labelled "Close <title>". Keyboard users close with Delete or ⌘W.
- **Reordering:** keyboard sorting through the adapter, announced in a live region, plus menu actions (WCAG 2.5.7).
- **Panels:** inline panels are `aside`. Overlay and drawer panels are modal, with a focus trap and a Title. Collapsing a region that holds focus moves focus to its trigger.
- **Resize handles:** `role="separator"`, value attributes, arrow keys, Home/End to the limits.
- **Shortcuts:** shown in tooltips and listed for the palette. None fire while typing unless marked.
- **Motion:** the motion tokens, so reduced motion keeps fades and drops slides (DESIGN.md).

---

## 8. Design-system fit

- **Placeholders:** `cn-app-shell-*`, `cn-tab-strip-*`, `cn-app-nav-*`, `cn-workspace-switcher-*`, `cn-user-menu-*`, each in its own `registry/styles/fabricator/<item>.css`. Exclusive items need Fabricator rules only.
- **Surfaces:**
  - Main inset and panels use the inset card recipe (`bg-surface-2 shadow-surface-2 rounded-xl`).
  - The active tab is the surface-4 pill (the tabs recipe).
  - The overflow menu and the switcher follow the popup recipe.
  - On desktop, the titlebar is transparent over the sidebar, so it works with Electron's `vibrancy`.
- **Motion by role:**
  - Sidebar, panel and tab indicator: `move`.
  - Overlay panels: `motion-sheet`.
  - Tab open and close: `disclosure`.
  - Drag drop-in: `move`.

  No milliseconds; `motion-usage.test.ts` covers the new style files.

- **Density:** tab, header, titlebar and status bar heights come from density tokens (`density-usage.test.ts`). `size="sm"` on the strip pins it to compact.
- **New tokens:** `--app-shell-*`, shipped in the `app-shell` item's `cssVars`. The drag-region utilities ship in its `css`.

---

## 9. Phases

Every phase meets the AGENTS.md definition of done before the next starts, and ships with examples, a docs page per base, a homepage card, a component group, a changeset and a changelog entry.

| Phase | Scope                                                                                                                                                                                    | Proof                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0     | Your decisions (§10). `PLAN.md` edits: §1 non-goals, a D14 for the native target if approved, §9.1 backlog, Phase 5.                                                                     | This file approved.                                                                                    |
| 1     | `app-shell-model`, test-first: nav matching and preferences, tab operations, layout resolution, shortcut parse/match/format, resize math, breadcrumbs from paths.                        | `bun run test`.                                                                                        |
| 2     | `app-shell` on Base UI: frame, header, breadcrumb, actions, content, status bar, panels with views, shortcut registry, container layout, storage port. Additive Sidebar props for width. | Site check in light/dark, keyboard only, mobile and desktop widths; axe clean.                         |
| 3     | `sortable` adapter and `tab-strip`.                                                                                                                                                      | Same, plus keyboard reorder and the shortcut table.                                                    |
| 4     | `app-nav` (actions, reorder, Customize dialog), `workspace-switcher`, `user-menu`.                                                                                                       | Same.                                                                                                  |
| 5     | Desktop: the `window` prop, drag regions, overlay insets, fullscreen; the "Desktop apps" guide.                                                                                          | A real Electron window (Relay's desktop) and a Tauri sample on macOS; Windows overlay checked in a VM. |
| 6     | Radix and Aria parity for every item.                                                                                                                                                    | `shadcn add --dry-run` per base; `bun run test:e2e`.                                                   |
| 7     | Blocks `app-shell-01…06`; mobile web polish (bottom nav, edge swipe, floating action).                                                                                                   | Frame previews; recaptured mobile screenshots.                                                         |
| 8     | React Native target, if approved.                                                                                                                                                        | An Expo sample on iPhone and iPad simulators.                                                          |

---

## 10. Decisions (taken: the first option of each)

1. **React Native.**
   - **Pick:** ship the DOM-free model now, and build the native shell later as its own target (`PLAN.md` D14). Both SharpOS and Relay share models rather than components, and their pain is in what they duplicated.
   - Alternative: build the native shell alongside the web one now. That doubles phases 2 to 4 and needs the styling decision first.
   - Alternative: no native shell. Docs show how to drive Expo Router from the model.
2. **Drag-and-drop library behind the `sortable` adapter.**
   - **Pick:** `@dnd-kit/react` 0.5.3, pinned exactly. It is maintained (last published 2026-10-31) and has keyboard and screen-reader sorting, animated sorting and multiple containers built in. It is pre-1.0, a risk the adapter contains. About 33 kB gzipped (bundlephobia).
   - Alternative: `@dnd-kit/core` 6.3.1 + `@dnd-kit/sortable` 10.0.0. Stable, used by upstream's data table and by SharpOS, about 18 kB gzipped, but no release since December 2024.
   - Alternative: `@atlaskit/pragmatic-drag-and-drop` 4.0. Stable, maintained, small, and drags across windows. It uses native HTML5 drag and drop: drop lines instead of shifting items, and no keyboard sorting.
   - Alternative: an in-house engine based on Relay's tab drag. No dependency, but we own the hard parts.
3. **Tab strip scope for v1.**
   - **Pick:** one strip per shell. Split groups are a workbench feature (Relay) that needs a grid model and sashes; it could come later as a `tab-grid` item.
   - Alternative: splits in v1.
4. **Item split.**
   - **Pick:** the seven items in §4.2. Each installs alone, so an app that wants only the frame doesn't pull in drag and drop.
   - Alternative: one large `app-shell` item.
5. **Dogfooding.**
   - **Pick:** pilot the shell in Relay's client during phase 5. It runs the same stack (Vite, Base UI, Electron) and has the tab strip and panel to replace.
   - Alternative: SharpOS first. It is larger, uses Next.js and has a vendored sidebar.

---

## 11. Risks

| Risk                                                                                       | Mitigation                                                                                                 |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| The shell becomes a framework (routing, data, auth creep in).                              | §1 non-goals; render props and callbacks only.                                                             |
| The Sidebar override (1,861 lines) forks into a second sidebar.                            | `AppShell` wraps it; changes to it are additive props.                                                     |
| `useIsMobile` hydration flash in the Sidebar.                                              | The shell's own parts use container queries; moving the Sidebar off `useIsMobile` is a separate follow-up. |
| Electron drag-region quirks (opacity and clipping ignored; later siblings win).            | Hidden regions drop drag; tested in a real window, not only the browser.                                   |
| Browser-reserved shortcuts on the web.                                                     | `webKeys` fallbacks; desktop uses `keys`.                                                                  |
| A pre-1.0 DnD dependency changes its API.                                                  | One adapter file, exact pin.                                                                               |
| `next build` memory (8 GB ceiling, AGENTS.md toolchain notes) with six new frame previews. | Frames are lazy iframes; check the build in the 4 CPU / 8 GB container before adding them.                 |
| Three bases triple the composed components.                                                | Base UI first; the model and adapter are shared; the parity phase is scheduled explicitly.                 |

---

## 12. As built

- **Items:** `app-shell-model`, `sortable`, `app-shell`, `app-nav`, `tab-strip`, `workspace-switcher`, `user-menu`, and blocks `app-shell-01` (workspace), `02` (workbench), `03` (classic SaaS), `04` (desktop), `05` (mobile first). The multi-product block (`app-shell-04` in §6) was left for later; the mobile-first one took its number.
- **Bases:** Base UI per base file; Radix and Aria ported per base. The model, the adapter and the blocks are one shared source (the blocks use only the cross-base APIs).
- **Reordering between groups:** dnd-kit's optimistic sorting moves the dragged DOM node into the other list, which React can't reconcile (`removeChild` errors). Drops are limited to the item's own group; moving to another group is the row menu's Move to. Lifting this means updating state during the drag (dnd-kit's multi-list pattern) and is a follow-up.
- **Keyboard reordering** is the components' own (⌥⇧ arrows, menu actions, a live region): dnd-kit's keyboard sensor starts on Space and Enter, which activate tabs and links.
- **Floating panels** (overlay, drawer, swap) start closed and keep a temporary open state; only a docked panel's open state is saved. A modal sheet opening on load at tablet widths was the reason.
- **Icons** are components or elements everywhere (`IconLike`), so registry blocks can pass `IconPlaceholder` elements.
- **Embedded shells:** `shortcutScope="focus"` keeps a shell inside a page (a homepage card) from answering keys outside it.
- **Electron and Tauri** behaviour is verified in the browser through the `window` prop's CSS (insets, drag-region selectors), not in a real window; that check is phase 5 of §9.
- **Desktop look (after review):** desktop windows follow Relay's layout. The shell renders the sidebar toggle in the window's top band (after the traffic lights on macOS, fixed while the sidebar collapses), so `AppShellHeader`'s auto trigger only shows on phones there. On macOS the main column's and panels' first rows centre on the lights (`getTrafficLightsGeometry`; 44px in the inset cards at `{ x: 16, y: 23 }`). `isTranslucent` makes the frame and sidebar transparent over the native material (Electron `vibrancy: "sidebar"`, Tauri `windowEffects`); the playground and the desktop example simulate it with a wallpaper and a blurred tint. The desktop example and block `04` drop the titlebar row for tabs in the main card's top row; the titlebar row stays an option.
- **Sidebar rows (after review):** closer to Relay: labels `foreground/80`, icons muted at rest, the active row raised (`shadow-surface-2`, also on the sliding selection) with no semibold, group labels medium. The toggle draws the SharpOS/Relay glyph at 18px with the inner panel in `fill-background` instead of a mask.
- **Status bar (after review):** a child of `AppShell` (not of `AppShellMain`), absolutely placed on the frame under the main column and the panels, starting at the sidebar gap (`--app-shell-sidebar-gap`, mirrored from the gap's states in CSS so the first paint is right). The cards end above it through `--app-shell-status-bar-height`. Relay's look: 36px, no border, compact ghost buttons and 12px muted text; glass in a translucent window. Phones hide it.
- **Nested navigation (after review):** App Nav renders `children` to any depth (one recursive row; `SidebarMenuSub` publishes its depth through context as `--sidebar-menu-depth`). Relay's anatomy: 30px rows (new `--density-30` step), the chevron in the icon column on hover, 16px a level, 14px nested icons, muted nested labels, a hover-revealed guide line, the current nested row on a wash with its top-level ancestor raised. Reordering works within any parent (`moveNavItem` takes `toParentId`; children orders are keyed by item id); nested sortables use the row as a drag handle so a child never drags its parent. New model helpers: `findNavItem`, `getNavList`, `getNavPath`.
- **Panel surface (after review):** side panels match the main column: `--app-shell-panel` defaults to `var(--app-shell-main)` (surface 3) and the inset panel card takes `shadow-surface-3`, as in Relay where the workspace and the right panel share one card style.
- **Surfaces, second pass (after review):** the main column and panels start at the lowest surface (`--app-shell-main: surface-1`, phones included), the frame drops below it (`color-mix` with black: 4% light, 22% dark), the cards take Relay's inset-panel edge (`--app-shell-card-shadow`) and 6px gutters, and light-mode muted text on the frame darkens 10% for AA. The macOS sidebar header subtracts the inset sidebar's 8px so the app name lands where Relay's does. The desktop explorer nests components under icon group rows with counts.
- **React Native example (after review):** `apps/mobile` is an Expo SDK 58 dev build (`bun run mobile`) outside the bun workspace, because React Native 0.88 pins React 19.3.0 while the website runs 19.3.1. Metro resolves `@fabricator-ui/app-shell-model` to the registry's source file and disables hierarchical lookup, so the app keeps one React. It renders the shared model with native views: phones get a header, bottom tabs (`getMobileTabItems`, now shared with `AppNavBottomBar`), a drawer sidebar (swipe to close, reduced motion respected) and the panel as a native page sheet; iPads dock the sidebar and an inline panel card on the frame with a status bar, using `getShellSize` and `getPanelPlacement`. Workspace and account menus are native action sheets. Rows nest to any depth, with the disclosure chevron trailing (the iOS convention) instead of in the icon column.
