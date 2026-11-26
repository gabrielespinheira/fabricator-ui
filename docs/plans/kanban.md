# Kanban: plan

Status as of 2026-11-25, after the interface was rebuilt: in progress on `release/v0.10.0`, for React web (Base UI, Radix, React Aria) and React Native. SwiftUI and Compose are out of this implementation.

| Area               | Built                                                                                                                                                                                                                                             | Remaining                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Drag (§7)          | Whole card, see-through while held, live slot with neighbours sliding, landing travel, tilt, blocked columns with a reason, multi-card stack, two-axis auto-scroll. Native: hold to drag, with a slot                                             | Column and lane drag, files dropped on a card, expanding a collapsed column on hold, a keyboard lift with Space |
| Columns (§5.3, §8) | Explicit or from a property, switching groups, glyphs, tinted columns, limits, rename (a double click or the menu), recolour, move, collapse to a rail, hide, add, delete when empty                                                              | Calculations, delete with a destination, multi-placement groups, date and number groups, virtual columns        |
| Cards (§8)         | Covers from a files property, key, people, tags, meta, link titles, quick create with pasted lines, selection, bulk actions, context menu, delete with undo                                                                                       | Inline rename, duplicate, archive, card properties edited in place                                              |
| Saving (§6.3)      | A queue of pending changes replayed over new data, changes to one card in order, revert and retry, undo of the last change                                                                                                                        | Redo, a 50-deep undo, conflicts, live patches and "3 new"                                                       |
| Views (§5.6, §9.3) | One compact toolbar line that adapts to its container, search, one filter pill with a panel (a drawer when narrow), group, sort, card fields, colour, hide empty                                                                                  | Filters for other kinds, and/or groups, several sorts, `parseKanbanView`                                        |
| Properties (§9)    | 25 types plus an app's own (`definePropertyType`), settings behind each label, validation, date ranges and times, number formats, files and pictures with upload, drop, paste and link, default values, visibility, manager with drag, conversion | Async options, merging options, conversion to and from custom types, the Data Table extraction (§9.4)           |
| Record (§10)       | Three modes, non-modal side panel, cover, title in place, aside column on a page, states                                                                                                                                                          | Resize, dock in the App Shell, one host moved between modes on Radix and Aria, unsaved-close question           |
| Elsewhere          | Docs, examples, shared palette model (D11)                                                                                                                                                                                                        | `board-01`, store selectors (D9), production budgets (§11), Android and physical devices                        |

Verified for this pass: the models' unit tests; an acceptance script over the compiled components on all three bases (drag, reorder, cancel, blocked drop, keyboard, multi-drag, menus, composer, search, filter, sort, group, columns, record modes, paging, errors, properties, manager); axe in light and dark on all three; the three densities and a phone width on Base UI; and hold-to-drag, cross-column drag with scroll, the card menu and the record on the iPhone simulator.

A Fabricator-exclusive `kanban` item in the Advanced group: a board of columns and cards with drag and drop, swimlanes, typed properties people create and manage, and a record that opens beside the board, in the centre or as a full page. It ships as three items that work alone (`kanban`, `properties`, `record-view`), one headless controller, and pure models that every platform follows. The app owns the data and the rules. The component owns the interface and everything between a gesture and a saved change.

References:

- **Arc UI's Kanban board** (`uiarc.dev/components/screens/kanban-board`, opened live at desktop width on 2026-11-25, docs page read): quiet column tracks, cards with a key, a title and one line of metadata, WIP counts in the header, a details panel floating over a live board with "5 of 21" and previous and next, physical drag. Its own docs call it "comfortable up to a few hundred cards" and it has no virtualization, loading, pagination, error or property management. We take the direction and design our own look, layout and code; none of its source is used (it is a paid product).
- **Notion's boards and properties** (help pages read on 2026-11-25): group by, sub-groups, hidden and empty groups, coloured columns, card size and preview, a calculation beside each heading, 22 property types, side peek, centre peek and full page per view.
- **Fabricator's own** Data Table, Event Calendar, Editor and App Shell: the controller, loader, optimistic and performance patterns this plan reuses, including the mistakes their plans recorded.

---

## 1. Summary of decisions

| #   | Decision         | Pick                                                                                                                                                                                      |
| --- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Items            | Three: `kanban` (Advanced), `properties` (Forms), `record-view` (Overlays). Each is useful without the others                                                                             |
| D2  | Data in          | Any row shape, through accessors. Three sources: a list, a promise loader, or pages the app pushes (Convex, TanStack Query, websockets)                                                   |
| D3  | Data out         | One typed change per domain (`onCardsChange`, `onColumnsChange`, `onPropertiesChange`, `onViewChange`), async, with `change.apply` for a local list                                       |
| D4  | Order            | A move names its neighbours (`afterId`, `beforeId`), never an index. The app or server picks its own rank scheme                                                                          |
| D5  | Optimistic layer | Pending changes replay over the newest server state. A rejection drops one change and replays the rest                                                                                    |
| D6  | Columns          | Derived from any groupable property, or given explicitly. What a drop writes is a pure rule per property type                                                                             |
| D7  | Drag on web      | `@dnd-kit` 0.5.3, already pinned, for sensors, overlay and drop animation. Hit-testing and auto-scroll are our own pure model, so they work with virtual lists and are shared with native |
| D8  | Virtualization   | `@tanstack/react-virtual` 3.14.26, already pinned: cards per column, columns across, lanes down                                                                                           |
| D9  | State            | One external store per board read through selectors (the Editor's pattern). A move re-renders two columns. Not built yet: the controller is React state                                   |
| D10 | Filters and sort | One property model. The Data Table's filter, format and compare rules move into it and the Data Table reads them from there                                                               |
| D11 | Colours          | The Event Calendar's 11-colour palette moves to a shared model. Options, columns and events use the same names                                                                            |
| D12 | Record content   | Rendered once and moved between the side, centre and page containers, so a mode switch keeps drafts and scroll                                                                            |
| D13 | New dependencies | None on web. Native reuses `@legendapp/list`, Reanimated and Gesture Handler, already in use                                                                                              |
| D14 | Block            | `board-01`, the name `blocks.md` reserved: a complete project board in the App Shell                                                                                                      |

---

## 2. Scope

### In (1.0)

- **Board:** columns, cards, swimlanes, horizontal and vertical scroll, drag to pan, collapsed and hidden columns, sticky headers.
- **Drag and drop:** reorder, move between columns and lanes, reorder columns and lanes, multi-card drag, drop into collapsed columns, auto-scroll on both axes, files dropped on a card or column. Mouse, pen, touch and keyboard.
- **Columns:** create, rename, recolour, icon, reorder, collapse, hide, delete (asking where its cards go), WIP limits that warn or block, entry rules, per-column calculations, per-column actions.
- **Cards:** cover, key, title, properties, progress, counts; inline rename, quick create (one, or one per pasted line), duplicate, archive, delete, move by menu, copy link, selection and bulk actions.
- **Properties:** 20 built-in types plus custom ones; create, rename, icon, describe, change type with a preview of what is lost, reorder, duplicate, hide, delete; options with colours, groups and order.
- **Views:** group, sub-group, filter, sort, search, card size, cover, visible properties, colour columns, hide empty. One JSON value the app can save.
- **Record:** side, centre, page, with copy link, mode switch, resize, sections, its own loading, not-found, read-only and error states.
- **Data:** per-column pagination, infinite scroll or a button, counts from the server, refresh, live patches, optimistic changes with undo and retry.
- **Every state** in §13, on web (Base UI, Radix, React Aria), desktop, and React Native. SwiftUI and Compose follow in their own phase.

### Later (the architecture leaves room)

- Dragging between two boards, or from an outside list onto a board.
- Dependency lines, timeline and calendar views over the same records (the Data Table and Event Calendar can already read the same properties).
- Live cursors and presence on cards (`renderCard` can draw presence today).
- A formula language. Formula and rollup values come computed from the app.

### Out

- A backend, sync engine, notifications or permissions model. The component reports changes, applies answers and respects the abilities it is told.
- Comments and activity as components. The block composes them from `Message`, `Marker` and `ChatInput`, as DESIGN.md does elsewhere.

---

## 3. Names and groups

- **`kanban`**, "Kanban", **Advanced**: a complete tool with its own state model. Upstream's catalog has no `kanban`, `properties` or `record-view` (checked with `shadcn view` on 2026-11-25). `board` was the alternative; the block keeps that word.
- **`properties`**, "Properties", **Forms**: typed values shown and edited as rows, plus the manager. A Detail panel, a CRM record or a settings page uses it with no board in sight.
- **`record-view`**, "Record View", **Overlays**: one record as a side panel, a dialog or a page. `peek` was the obvious name, but in this repo it already means the sidebar's hover reveal.
- Docs: a page each per base, `data-slot="kanban-*"`, `"properties-*"`, `"record-view-*"`, placeholders `cn-kanban-*` and so on.

---

## 4. Architecture

| Layer                 | Holds                                                                                                          | Shared by                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Models** (pure TS)  | Types, grouping, placement, moves, WIP, filters, sort, property conversion, hit-testing, paging, change replay | Web and React Native import them; SwiftUI and Compose port them against the same fixtures |
| **Store**             | One per board: normalized records, column pages, pending changes, selection, drag, focus                       | Web, React Native                                                                         |
| **Controller** (hook) | `useKanban(options)`: wires props to the store, exposes commands                                               | Web, React Native (same file, as the Event Calendar's)                                    |
| **Adapters**          | `lib/drag-board.tsx` (dnd-kit on web, Gesture Handler on native), virtual lists, clipboard, sounds             | One file per SDK per platform                                                             |
| **Parts**             | Board, column, card, lanes, menus, toolbar, bars, properties, record view                                      | Same names and props everywhere                                                           |

Rules that follow:

1. **The app decides, the model computes, the parts draw.** No part contains a business rule. "Can this card enter Done?" is a function the app passes; "what does dropping on Done write?" is a model function the app can replace.
2. **Headless first.** `useKanban` runs with no Kanban part rendered (tests, a custom board, a command palette). Every part reads the controller from context or takes `kanban`.
3. **One prop works.** `<Kanban items={issues} properties={properties} groupBy="status" />` draws a complete board. Composition replaces any region without giving up the rest.
4. **Only adapters import SDKs.** Replacing dnd-kit touches one file.

### 4.1 The lego

```text
Kanban                      provider + region (no children = the default layout)
├─ KanbanToolbar            KanbanSearch · KanbanFilter · KanbanSort · KanbanGroup · KanbanViewOptions · KanbanCount
├─ KanbanBoard              the scroller: pans, auto-scrolls, virtualizes columns
│  ├─ KanbanLane            KanbanLaneHeader (only with sub-groups)
│  ├─ KanbanColumn
│  │  ├─ KanbanColumnHeader KanbanColumnTitle · KanbanColumnCount · KanbanColumnCalculation · KanbanColumnMenu · KanbanColumnAdd
│  │  ├─ KanbanColumnBody   virtual list, drop zone, paging
│  │  │  ├─ KanbanCard      KanbanCardCover · KanbanCardKey · KanbanCardTitle · KanbanCardProperties · KanbanCardFooter · KanbanCardActions
│  │  │  ├─ KanbanCardComposer
│  │  │  └─ KanbanLoadMore · KanbanColumnError · KanbanColumnEmpty · KanbanColumnSkeleton
│  │  └─ KanbanColumnFooter
│  ├─ KanbanColumnCreate    "New group" at the end
│  └─ KanbanHiddenColumns   the rail of hidden and collapsed columns
├─ KanbanDragOverlay        what follows the pointer
├─ KanbanSelectionBar       bulk actions
└─ KanbanAnnouncer          live region

PropertyList · PropertyRow · PropertyValue · PropertyEditor · PropertyIcon
PropertyManager · PropertyForm · PropertyTypeMenu · PropertyOptions
PropertyFilter · PropertyFilterChip · PropertySort · PropertyVisibility

RecordView · RecordViewHeader · RecordViewTitle · RecordViewModeMenu
RecordViewActions · RecordViewBody · RecordViewSection · RecordViewFooter · RecordViewState
```

Every part takes `className`, spreads its props, has a `data-slot`, and works with the base's `render` or `asChild`. State a style needs is a `data-*` attribute (`data-dragging`, `data-drop-target`, `data-blocked`, `data-over-limit`, `data-pending`, `data-failed`, `data-selected`, `data-open`).

---

## 5. Data model

### 5.1 Properties

```ts
type PropertyDefinition = {
  id: string
  name: string
  type: PropertyType // built-in, or the id of a custom type
  icon?: string // an icon name; the type's icon otherwise
  description?: string
  options?: PropertyOption[] // select, multi-select, status, person, relation
  format?: PropertyFormat // number, currency, unit ("points"), ring or bar; date style; time
  defaultValue?: unknown
  required?: boolean
  isReadOnly?: boolean // computed, system and locked properties
  isSystem?: boolean // can't be deleted or retyped
}

type PropertyOption = {
  value: string
  label: string
  color?: PaletteColor
  icon?: string
  image?: string // a person's picture
  group?: "todo" | "inProgress" | "complete" // status only
  isArchived?: boolean // kept on old cards, not offered on new ones
}
```

- **Plain JSON.** People create properties at run time, so a definition is data an app can store. Icons are names; a component maps names to icons through `icons` on the provider.
- **Built-in types:** `title`, `text`, `number`, `select`, `multi-select`, `status`, `person`, `date` (with time, range), `checkbox`, `url`, `email`, `phone`, `files`, `relation`, `rating`, `key` (a readable id such as CHK-219), `created-time`, `created-by`, `edited-time`, `edited-by`. `isReadOnly` with any type covers formula and rollup. Of Notion's 22, Button and Place are left to custom types.

```ts
// A filter is the Data Table's: an operator and the value it compares with.
type PropertyFilterGroup = {
  match: "all" | "any"
  filters: (
    | { propertyId: string; operator: PropertyOperator; value?: unknown }
    | PropertyFilterGroup // one level deep
  )[]
}
```

- **Safe values:** a `url` renders as a link only for `http`, `https`, `mailto` and `tel`; anything else is plain text. Text is never parsed as HTML. Types parse with their own `parse`, so a bad stored value shows raw and read-only.
- **Custom types:** `definePropertyType({ id, icon, filterKind, format, parse, compare, isEmpty, convert, Value, Editor, groupBy? })`, passed as `propertyTypes`. The built-ins are written with the same function, so a custom type has no second-class gaps.

### 5.2 Records of any shape

```tsx
const kanban = useKanban<Issue>({
  items: issues,
  properties,
  groupBy: "status",
  getId: (issue) => issue.id, // default: item.id
  getTitle: (issue) => issue.name, // default: the title property
  getValue: (issue, propertyId) => issue.fields[propertyId], // default: item[propertyId]
  setValue: (issue, propertyId, value) => ({
    ...issue,
    fields: { ...issue.fields, [propertyId]: value },
  }),
  onCardsChange: (change) => setIssues(change.apply),
})
```

The board never asks for a `KanbanCard` type. Optional accessors add what a row may have: `getHref` (the record's URL, so a card is a real link), `getCover`, `getVersion` (for conflicts), `getAbilities` (per card).

### 5.3 Columns

`groupBy` a property, or pass `columns`. Both produce the same `KanbanColumn`:

```ts
type KanbanColumn = {
  id: string
  name: string
  color?: PaletteColor
  icon?: string
  category?: "todo" | "inProgress" | "complete"
  limit?: number
  limitMode?: "warn" | "block" // default warn
  isLocked?: boolean // no drops, no create
}
```

| Grouped by                  | Columns                                          | A drop writes                                                                       |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `select`, `status`          | One per option in option order, plus "No status" | The option (or empty)                                                               |
| `multi-select`              | One per option; a card appears in each           | Removes the column it left, adds the one it entered. Alt-drag adds without removing |
| `person`                    | One per person offered, plus "Unassigned"        | The person; with several, swaps the one it left                                     |
| `checkbox`                  | Two                                              | The value                                                                           |
| `date`                      | Relative, or by day, week, month                 | The period's date, keeping the time; "Overdue" takes no drops                       |
| `number`                    | The ranges configured                            | Nothing unless the range declares a `dropValue`                                     |
| `relation`                  | One per related record                           | The relation                                                                        |
| Computed or system property | One per value                                    | No drops between columns; cards still sort inside one                               |
| `columns` prop              | As given                                         | Whatever `moveTo(item, column)` returns                                             |

```ts
type KanbanLane = {
  id: string
  name: string
  color?: PaletteColor
  icon?: string
}

// "All 1,240 in Backlog", sent when not every card is loaded.
type KanbanSelectionQuery = {
  columnId: string
  query: KanbanQuery // the view's filters, search and sort
  exceptIds: string[]
}
```

- A card that appears in several columns has one identity and several **placements** (`columnId + laneId + id`). Selection, focus and virtual keys use the placement; changes use the card.
- Values with no matching option land in a trailing "Unknown" column and are reported in development. A stale option never makes cards disappear.

### 5.4 Placement and order

```ts
type KanbanPlacement = {
  columnId: string
  laneId: string | null
  afterId: string | null // null: first in the column
  beforeId: string | null // null: after the last card loaded
  isEndLoaded: boolean // false: more cards exist past the last loaded one
}
```

- **Neighbours, not indexes.** Two people moving cards at once, a filtered board and a half-loaded column all make an index wrong. Neighbours survive them.
- **Dropping at the end of a half-loaded column** sends `beforeId: null` with `isEndLoaded: false` and `afterId` set to the last loaded card, so the server places it after that card, where the person saw it land. Moving "To bottom" from a menu sends `position: "end"`.
- **Collapsed and unloaded columns** take a drop as `position: "start"`, or `"end"` by option.
- **Sorted views** have no manual order: the drop changes the column only and the card lands where the sort puts it (§7.4).
- No rank format ships. The docs show three recipes: an array, a fractional key (`fractional-indexing` 4.0.0), and a server that ranks between neighbours. Alternative considered: a built-in fractional key, rejected because it forces a column on every schema.

### 5.5 Changes

```ts
type KanbanCardsChange<TItem> = {
  id: string // a mutation id, to recognise your own echo
  reason:
    | "move"
    | "create"
    | "edit"
    | "duplicate"
    | "archive"
    | "delete"
    | "undo"
    | "redo"
  created: TItem[]
  updated: { item: TItem; previous: TItem; patch: Record<string, unknown> }[]
  deleted: TItem[]
  placement?:
    | KanbanPlacement
    | { position: "start" | "end"; columnId: string; laneId: string | null }
  selection?: KanbanSelectionQuery // "all 1,240 in Backlog", when not all are loaded
  apply: (items: TItem[]) => TItem[]
}
```

- A handler may return nothing (applied), a Promise (pending until it settles), or a Promise of saved items (merged: server ids, computed fields, automation results).
- Rejecting reverts. `KanbanCancel` reverts with no error (the person dismissed a question). `KanbanConflict({ current })` offers the two versions (§13).
- `onColumnsChange` (create, update, move, delete with `moveCardsTo`) and `onPropertiesChange` (property and option changes, type conversion) follow the same shape. Leaving a handler out turns that domain read-only, so a board with no handlers is a viewer.

### 5.6 View

```ts
type KanbanView = {
  version: 1
  groupBy: string
  groupSort?: "manual" | "ascending" | "descending"
  subGroupBy?: string
  filters?: PropertyFilterGroup // and/or, one level of nesting
  sort?: { propertyId: string; direction: "asc" | "desc" }[]
  search?: string
  cardProperties: string[] // order is display order
  cardSize: "sm" | "md" | "lg"
  cover?: { propertyId: string; fit: "cover" | "contain" } | null
  columnColor: "none" | "header" | "column"
  hideEmpty?: boolean
  hiddenColumns: string[]
  collapsedColumns: string[]
  collapsedLanes: string[]
  calculations: Record<string, { propertyId?: string; kind: PropertyAggregate }>
  openIn: "side" | "center" | "page"
}
```

`view` with `onViewChange`, or `defaultView`, as the Data Table does. `parseKanbanView(unknown, properties)` repairs a saved view against today's properties (a deleted group property falls back, unknown filters drop and are reported), so an old view never crashes a board.

---

## 6. Data sources, paging and realtime

### 6.1 Three sources, one board

| Source          | For                                                   | Shape                                                                |
| --------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `items`         | Local lists, small boards, server components          | The array. Grouping, filtering, sorting and search run in the model  |
| `load(request)` | REST, GraphQL, RPC                                    | A promise per batch of column pages; the board caches and aborts     |
| `pages`         | Reactive backends: Convex, websockets, TanStack Query | The app pushes each column's page and answers `onLoadMore(columnId)` |

```ts
type KanbanLoader<TItem> = (request: {
  columns: {
    columnId: string
    laneId: string | null
    cursor: string | null
    limit: number
  }[]
  query: {
    groupBy: string
    subGroupBy?: string
    filters?: PropertyFilterGroup
    sort?: KanbanSort[]
    search?: string
  }
  signal: AbortSignal
}) => Promise<{
  pages: {
    columnId: string
    laneId: string | null
    items?: TItem[]
    nextCursor?: string | null
    total?: number
    aggregates?: Record<string, number | null>
    error?: string // this column failed; the others stand
  }[]
  columns?: KanbanColumn[] // when the server owns the columns
  lanes?: KanbanLane[]
}>
```

- **Batched.** Requests made in one frame go out as one call, so ten columns make one round trip. A backend that prefers one per column fans out inside `load`.
- **`useKanbanPage(kanban, columnId, page)`** registers a page from inside a component, so a Convex `usePaginatedQuery` per column works without breaking the rules of hooks.
- The same query runs on a server: `queryRecords(items, query, properties)` is exported from the pure model (as `queryRows` is for the Data Table).

### 6.2 Paging

- **First page:** 25 cards for columns in view, visible columns first; columns within one board width next, at idle. Collapsed and hidden columns ask for `limit: 0`, a count only.
- **Infinite scroll** by default: the next page loads 1.5 viewports before the end, one request in flight per column. `paging="button"` shows "Load 25 more" with the number left.
- **Cursors, deduped.** A card that moved between pages while loading appears once (the newest copy wins). A page that brings nothing new but has a cursor asks again at most 3 times, then offers the button.
- **Counts** come from `total`, adjusted optimistically, and say "25 of 240" to assistive technology. Without `total` the count reads "25+".
- **Fast scrolling** shows skeleton cards at their estimated height, as the Data Table does above 4px/ms.
- **Cache** per query: changing a filter keeps the old board dimmed until the new first pages land, aborts stale requests, and keeps the last 5 queries for an instant return.
- **Columns too.** More than 50 columns (grouping by a relation) load through `loadColumns` with the same cursor shape.
- **Lanes:** each cell holds its own page; a cell shows 10 cards and "Show 14 more".

### 6.3 Optimistic changes

The store keeps the **server state** and an ordered list of **pending changes**. What people see is the second replayed over the first.

- A settled change folds into the server state. A rejected one leaves the list and the rest replay, so a failed move doesn't undo the edit made after it. A change that depended on it (a move of a card whose create failed) fails with it, reported once.
- Changes to one card are sent in order; changes to different cards in parallel. A newer move of the same card replaces a queued, unsent one.
- New server data (refetch, live patch) replaces the server state under the pending list, so nothing jumps back while a save is in flight.
- **Undo** is a new inverse change, 50 deep, local changes only. Undo of a delete re-creates with the same id.
- **Echo:** a live patch that carries the change's `id` settles it instead of applying twice.

### 6.4 Live updates

- `kanban.applyPatch({ upserted, deleted, columns })`, or new `items` / `pages`.
- **Scroll anchoring:** cards arriving above the fold never move what is being read. A scrolled column shows "3 new" at its top (DESIGN.md's rule for live rows). Cards that change column animate only if both places are in view.
- **During a drag:** structural patches to the board wait until the drop, then replay. If the dragged card is deleted, or the person loses access, the drag ends with a notice. If a neighbour disappears, the placement resolves to the next one that remains.
- **While editing:** a live change to the property being edited doesn't replace the draft; the row says "Changed by Maya" with "Use theirs".
- **Filtered out:** a card edited so it no longer matches stays, dimmed with "No longer matches", until the query changes or the view refreshes. It never vanishes under the pointer.

---

## 7. Drag and drop

### 7.1 Engine

**`@dnd-kit/react` 0.5.3, already pinned and npm's newest**, used for what is hard per browser: pointer, pen and touch sensors with activation rules, the overlay, and the drop animation. Sortable groups, collision and auto-scroll are not used. `lib/sortable.tsx` records why a sortable can't cross groups (the library re-parents the DOM node, which React can't follow), and a virtual list has no element for most drop positions.

So the drop target is ours: `kanban-drag-model.ts` takes the pointer, the dragged box, the columns' rectangles and each column's measured or estimated card offsets, and returns a placement. Pure, tested with numbers, the same on React Native and ported to Swift and Kotlin.

- A new `lib/drag-board.tsx` holds it beside `lib/sortable.tsx`; shared sensor settings move to one module, so the two stay the only dnd-kit imports. Column, lane, property and option reordering keep using `sortable.tsx`.

A lab ran this on 2026-11-25 (headless Chrome, React 19.3.1 development, two virtual columns, mouse and emulated touch). What it settles:

| Finding                                                                                              | Evidence                   | What the adapter does                                                       |
| ---------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------- |
| A drag survives its source unmounting; remounting the same id doesn't jump                           | Run                        | The source may recycle. It still stays mounted for its well                 |
| Zero droppables works                                                                                | Run                        | Registers none                                                              |
| `onDragMove` reads a stale `operation.position` (220 against a true 250)                             | Run                        | Reads `event.to`, or `position + by`                                        |
| No move events while the pointer rests and the board auto-scrolls                                    | Run: 0 events over 540px   | Hit-tests on scroll too                                                     |
| The provider's `onDragMove` runs inside `startTransition`                                            | Source                     | Subscribes with `useDragDropMonitor` and a memoized handler object          |
| dnd-kit's auto-scroll moves one element a tick: in a corner the column moved 644px and the board 0   | Run                        | Our own, both axes, from the shared model (§7.4)                            |
| `event.suspend()` then `resume()` or `abort()` holds a drop                                          | Run                        | Waits for the slot before landing                                           |
| A custom `dropAnimation` can travel to any rectangle, but gets none passed                           | Run                        | Closes over our slot, sets `data-dnd-dropping`, starts from `ctx.translate` |
| The default drop animation collapses to the top left when the source is gone                         | Run                        | Never used                                                                  |
| `feedback: "none"` also turns the overlay off                                                        | Source                     | Default feedback with the overlay                                           |
| Registering many draggables is quadratic ([#2188](https://github.com/clauderic/dnd-kit/issues/2188)) | Open issue                 | Registers mounted cards only                                                |
| StrictMode can destroy the manager ([#2116](https://github.com/clauderic/dnd-kit/issues/2116))       | Open issue, not reproduced | Browser test in StrictMode                                                  |
| About 0.56ms of script per move with 48 draggables                                                   | Run                        | Leaves room in the 8ms budget                                               |

Size (esbuild, minified, gzip, React external): this use is **34.5kB**, what `sortable.tsx` imports today is 38.9kB, and all of dnd-kit is 40.8kB. An app with App Nav or Tab Strip already pays it. `react-virtual` is 10.5kB, already paid by the Data Table.

Alternatives, rejected:

- **Pragmatic drag and drop 4.0.0** (about 4.7kB by its README): native HTML5 drag, so the preview can't be styled while it moves, touch start can't be controlled on iOS, and it has open reports on Firefox Android and Samsung Internet.
- **`@hello-pangea/dnd` 18.0.1** (28.8kB): one scroll parent per list, no nested auto-scroll, no release since 2025-02-09.
- **Raw Pointer Events:** smallest, and the fallback if dnd-kit breaks, since hit-testing and scroll are already ours. Costs us the sensor and overlay edge cases.

### 7.2 Hit-testing

- **Column:** the one under the dragged card's centre, with hysteresis (a column is left only once the centre is 12px past its edge), so edges don't flicker. Between columns, the nearest.
- **Position:** the first card whose centre is below the dragged card's leading edge, using offsets with the dragged card removed. Same centre-crossing rule as the sortable adapter, so cards of unequal height don't swap back and forth.
- **Lanes** are columns on a second axis. **Collapsed column:** the rail is a target; holding 600ms expands it for the drag. **Empty column:** the whole body.
- **Rules run here:** `canMove(cards, target)` is asked once per new target, not per pointer move. Its answer is `true`, `false` or `{ reason }`.

### 7.3 Gesture

| Input      | Lift                                                  | Move                                                   | Drop and cancel                        |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| Mouse, pen | 4px of travel anywhere on the card                    | Follows the pointer                                    | Release; Escape or right click cancels |
| Touch      | 250ms hold, 5px tolerance, so lists scroll            | Follows the finger; hold released still opens the menu | Release; a second finger cancels       |
| Keyboard   | Space                                                 | Arrows                                                 | Space or Enter; Escape cancels         |
| No drag    | Card menu: Move to…, Move up, down, to top, to bottom | A searchable list of columns, lanes and positions      | Enter                                  |

Parts inside a card that act on press (a link, a checkbox, a menu) carry `data-sortable-ignore`, the attribute the sortable adapter already reads. Text selection, images and links never start a native drag.

### 7.4 What people see

- **Lift:** the card raises to `surface-4`, its place becomes a quiet well of the same height, and the rest of the board keeps its size.
- **Gap:** cards under the pointer slide to open a gap of the dragged card's height (transforms on mounted cards only, the `move` role). In a sorted view there is no gap: the column takes a wash and its header says "Sorted by Priority", with "Use manual order" in the menu.
- **Blocked:** the column doesn't open a gap, takes `data-blocked`, shows the reason in its header, and the cursor is `not-allowed`. A drop there returns the card.
- **Over a `warn` limit:** the count turns warning with an icon and the text "5 of 4". The drop lands.
- **Several cards:** the selection lifts as one stack with its count. It drops in board order. Cards that can't move stay, and the notice names how many.
- **Drop:** the overlay travels to the slot's live position, then the real card shows in the same frame (the Event Calendar's "moving without a jump" lesson: never revert before the optimistic change paints).
- **Cancel:** travels home. **Reduced motion:** no tilt, no travel, fades only.
- **Tilt:** up to 2° from horizontal speed, `settle` role, off in compact density.
- **Auto-scroll (ours):** column under the pointer vertically and board horizontally at the same time, one frame loop, speed by distance into a 64px edge band, accelerating over 400ms. The column is found again as the board moves under a resting pointer. Edge bands sit inside sticky headers and the record panel's edge.
- Sound and haptic: `tick` on drop, the snap haptic per slot on native, one warning haptic on a blocked target.

### 7.5 Asking before a move lands

`onCardsChange` can return a Promise, so an app can open a dialog ("Why was this lost?") before saving. The card waits in its new place as pending; confirming saves, dismissing rejects with `KanbanCancel` and it goes home without an error. The docs show it as the recipe for required fields on entry.

---

## 8. Board behaviour

- **Scroll:** `scroll="column"` (default): each column scrolls, headers never move. `scroll="board"`: the board scrolls both ways with sticky headers (Notion's). Lanes always use `board`.
- **Pan:** dragging empty board, the middle button, or Shift and the wheel. Trackpads scroll natively. `scroll-fade-x` on the edges, `overscroll-behavior: none`.
- **Columns:** width from the view's card size (`--kanban-column-width`, resizable by the consumer). A board wider than its columns leaves space at the end; `fit="fill"` stretches up to 4 of them.
- **Collapse** turns a column into a 40px rail (a `--density-40` token) with its name turned, count and colour. **Hide** moves it to the "Hidden" list at the end, which still takes drops.
- **Quick create:** "New" under the list adds at the bottom; with `hasHeaderAdd`, "+" in the header adds at the top. A composer card with the title field: Enter saves and opens the next one, Shift+Enter saves and opens the record, Escape closes, blur with text saves. Pasting several lines offers "Create 12 cards". New cards inherit the column's and lane's value, active filters that name one value (so it doesn't vanish), and the app's `getDefaults`.
- **Inline edit:** F2 or a double click on the title. Property chips on a card open their editor in place when `cardEditing` is on.
- **Selection:** ⌘/Ctrl click toggles, Shift click ranges inside a column, `x` toggles the focused card, ⌘A selects the column's loaded cards, then offers "Select all 1,240". The bar floats over the bottom edge with count, Move to, Assign, Set property, Archive, Delete, Clear, and takes custom actions.
- **Menus:** one context menu and one dropdown instance for the whole board, moved to the card that asked. No card mounts its own popup root (§11).
- **Delete column:** a dialog asks where its cards go (another column, "No status", or delete them, which names the number). Archive is the quieter default offered first.
- **Empty column policy:** `hideEmpty` hides them from the board but shows them all, as slim rails, while a drag is under way, so they can still be dropped on.

---

## 9. Properties

### 9.1 Values and editors

One `PropertyValue` (read) and one `PropertyEditor` (write) per type, used by the card, the record, the selection bar, the filter and, for the types it shares, the Data Table.

| Type                     | Shown as                                                           | Edited with                                     |
| ------------------------ | ------------------------------------------------------------------ | ----------------------------------------------- |
| `title`, `text`          | Text; long text clamps to 3 lines on cards                         | Input, growing Textarea                         |
| `number`                 | Tabular figure, currency, percent, unit, ring or bar               | Number Field                                    |
| `select`, `status`       | Badge with its colour; status adds a progress glyph                | Combobox that can create an option              |
| `multi-select`           | Badges, then "+2"                                                  | Multi Select that can create                    |
| `person`                 | Avatar and name; Avatar Group for several                          | Combobox with avatars, "Assign to me"           |
| `date`                   | "Nov 18", relative when near, warning or overdue tone with an icon | Date Picker, range, time                        |
| `checkbox`               | Check                                                              | Checkbox                                        |
| `url`, `email`, `phone`  | Link with its icon and copy                                        | Input with validation on commit                 |
| `files`                  | Thumbnails, file icons, count                                      | File Upload with progress, retry per file       |
| `relation`               | Record chips that open in the record view                          | Async Combobox (`searchRelated(query, signal)`) |
| `rating`                 | Rating                                                             | Rating                                          |
| `key`, times and authors | Grey metadata                                                      | Read-only                                       |

- Editors commit on Enter, Tab or blur, cancel on Escape, and report the same `onValueCommitted`. A failed save keeps the typed value with the error under it and Retry.
- **Async options** (people, relations) show loading, empty and failed states in the popup and keep the current value on screen.
- **Empty** reads "Empty" in grey in the record and nothing on the card.

### 9.2 Managing properties

`PropertyManager` (a Popover on desktop, a Drawer on phones) lists the properties with search, drag handles and an eye per place (card, record). `PropertyForm` edits one.

- **Create:** name first, with the type suggested from the name ("Due date" suggests Date), then a searchable type list.
- **Change type:** `convertProperty(definition, values, nextType)` is pure and returns the new values and a report. The form shows it before anything happens ("38 of 40 values convert; 2 become empty") and offers Keep a copy. Select to multi-select, text to select (one option per distinct value, up to 100), number to text, date to text and the rest have tests for both directions.
- **Options:** add, rename, recolour, reorder by drag or menu, group (status), merge two, archive, delete. Deleting an option in use asks for its replacement and names the count.
- **Visibility in the record:** always, when filled, never. **On the card:** per view, ordered. Colour on cards comes from options, so no separate control.
- **Delete:** acts at once with Undo when the app can restore it, otherwise an Alert Dialog that names the property and how many cards have a value. A property a view groups, filters or sorts by says so first.
- **Limits the app sets:** `propertyAbilities` per definition (rename, retype, delete, edit options) and `propertyTypes` offered.
- `required` is checked by the editor and the composer; a card that fails a column's entry rule names the missing properties.

### 9.3 Filter and sort

- **Filter bar:** a "Filter" button, then one chip per filter ("Priority is any of High, Urgent"). A chip opens its operator and editor, the same as the Data Table's column filter. A group adds and/or.
- **Quick filters** are chips the app pins (Mine, Overdue).
- Operators per kind are the Data Table's: `matchesFilter`, `getOperators`, date presets, empty and not empty, plus "me" for people.
- **Sort:** several levels, manual order as the last tie break. Any sort shows in the toolbar with a one-click return to manual order.
- **Search** runs over the title, key and text properties: local at once, loader debounced 250ms.

### 9.4 What moves out of the Data Table

The Data Table already has this logic in `data-table-model.ts` (1,190 lines) and `data-table-cells.tsx`. A copy would be the parallel approach the repo forbids, so:

1. `property-model.ts` takes filters, operators, date presets, formatting, aggregates, comparison, search text and text parsing. `data-table-model.ts` re-exports them under its current names.
2. `property-value.tsx` takes the value drawing (number, date, status, tags, person, link). `DataTableValue` calls it and keeps its slots and classes.
3. The filter's operator select, option list and editors become `PropertyFilterEditor`; `DataTableColumnFilter` renders it.
4. The Data Table's type names stay (`tags`, `link`, `boolean`, `currency`). A map relates them to property types. No public export, prop, slot or placeholder changes.

Gate: the Data Table's unit and browser tests pass unchanged on all three bases, and its production bench stays within 5%.

---

## 10. Record view

### 10.1 Modes

| Mode     | Desktop and tablet                                                                                                                                                           | Phone                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `side`   | A level-3 panel floating over the board's end edge, 440px by default, resizable 360 to 60%, **not modal**: the board stays live, and clicking another card swaps the content | Drawer, full height, drag to close |
| `center` | A Dialog, up to 56rem wide and 90vh tall, modal                                                                                                                              | Same drawer                        |
| `page`   | Takes the board's place in its container, with a back action; or a route the app renders                                                                                     | A pushed screen                    |

- **One content, three containers.** The content renders into one host element that moves between containers, so switching modes keeps the editor's draft, scroll, open sections and upload progress. Phase 0 confirms focus, portals and React Aria's modal behave with a moved host. Fallback: keep drafts in the store and remount.
- **`dock`:** inside an App Shell, `<RecordView container="panel">` renders in an `AppShellPanel`, so the main column resizes instead of being covered.
- **Uncontrolled, or `openId` with `onOpenChange`.** The docs wire it to the URL with nuqs, to Next.js intercepted routes (a modal in the app, a page on reload), and to React Navigation.

### 10.2 Anatomy

```text
┌──────────────────────────────────────────────────────┐
│ ▣ Checkout v3 / CHK-219      5 of 21  ↑ ↓  ⤢ 🔗 ⋯ ✕ │  RecordViewHeader
├──────────────────────────────────────────────────────┤
│ Apple Pay sheet on product pages                     │  RecordViewTitle (edits in place)
│ Add a description                                    │
│                                                      │
│ Status      ○ Todo                                   │  PropertyList
│ Priority    ▂▄▆ High                                 │
│ Assignee    ● Marcus Johnson                         │
│ Labels      [Frontend]                               │
│ Due date    ▦ Nov 18                                 │
│ + Add a property · 4 empty                           │
│                                                      │
│ Sub-tasks 1/3 ─────────                              │  RecordViewSection (any content)
│ Description (Editor) · Files · Activity · Comments   │
├──────────────────────────────────────────────────────┤
│ Comment…                                         ➤   │  RecordViewFooter
└──────────────────────────────────────────────────────┘
```

- Labels take one column sized to the longest (max 40%), values fill the rest, a row is one hover target that opens its editor. Below 28rem of container width labels stack over values.
- **In `page` mode** at 64rem and wider, properties move to a side column (DESIGN.md's Detail pattern).
- **Previous and next** (`k`, `j`) follow the board's visible order across columns and load the next page when they reach the end ("5 of 21", "25 of 240"). Content swaps at once with one crossfade; nothing slides.
- **Description** is the `Editor`, loaded when the record opens, saved after 800ms idle and on close, with "Saving", "Saved" and "Couldn't save, Retry".
- **Closing with an unsaved failure** asks first. Everything else saves as it goes and has no Save button.
- **Focus:** opening from the keyboard moves focus to the title; by pointer, focus stays on the card so arrows keep moving through the board and the panel follows. Escape returns to the card. Closing scrolls it into view if it moved.

---

## 11. Performance

### 11.1 Rules

- **Store selectors.** A card subscribes to its own record, its pending state and its flags. A column subscribes to its id list, page state and count. Nothing subscribes to the board.
- **A cheap card.** Plain memoized markup: no Base UI root, Tooltip, Popover, Avatar primitive or Checkbox per card (the Data Table's finding: a popover root per cell cost a quarter of its scroll work). One shared instance of each popup.
- **Virtual cards** per column above 30, measured once per content and width, heights cached by card. **Virtual columns** above 12. **Virtual lanes** always. The focused, dragged and open cards stay mounted (`rangeExtractor`).
- **A drag renders nothing.** The overlay moves by transform outside React; the model runs on cached rectangles, remeasured on scroll and resize only; the store changes once per new target.
- **Gap by transform** on mounted cards after the target (about 10), never by layout.
- **Style rules from the Data Table and Event Calendar work:** no ancestor `:has()`, no transition on inherited properties, no CSS variable written on an ancestor during a drag, no `backdrop-filter` on cards, `contain: content` on column bodies and `content-visibility` off inside virtual lists.
- **Editor, File Upload, Date Picker and the manager load on demand** (`React.lazy`), so a board pays for none of them until a record opens.
- **`useDeferredValue`** for search and filters; a board of 10,000 local items filters off the typing path.
- **Images:** covers have a fixed ratio, `loading="lazy"`, `decoding="async"`.

### 11.2 Budgets

Production build, site CSS included and excluded, mid-range laptop and 4× CPU throttle. Phase 0 confirms or corrects them.

| Scenario                                      | Target                        |
| --------------------------------------------- | ----------------------------- |
| First render, 8 columns, 200 loaded cards     | 120ms                         |
| First render, 50 columns, 10,000 local cards  | 250ms                         |
| Column scroll, 2,000 cards                    | 16ms a frame, no blank frames |
| Drag frame with 10,000 cards                  | 8ms of script                 |
| Drop to painted                               | 50ms                          |
| Edit one property from the record             | 50ms, 1 card rendered         |
| Open a record                                 | 100ms to its frame            |
| Filter keystroke, 10,000 local cards          | 100ms                         |
| Memory after scrolling every column of 10,000 | Flat within 10%               |
| `kanban` own JS (without `record-view`)       | Reported in the PR            |

### 11.3 Bench

`tmp/kanban/bench.mjs` on a temporary example with 100,000 generated cards behind a fake server (latency, failures, live patches). Rerun after any change to the store, the drag adapter or the card.

---

## 12. Accessibility

- **Structure:** the board is a labelled region. A column is a `group` named by its header ("In progress, 12 cards, limit 10"). Cards are a `list` of `listitem`s with `aria-setsize` and `aria-posinset` from the full count, not the rendered one.
- **A card is one tab stop.** Its title is a real link (or button) stretched over the card, so ⌘ click, middle click and "open in new tab" work. Roving tabindex across the board; the focused card's own controls join the tab order, other cards' leave it. No interactive element contains another.
- **Dragging movements** (WCAG 2.2, 2.5.7): every drag has a menu path. **Target size** (2.5.8): 24px at compact, 44px on touch. **Single-letter keys** (2.1.4): active only while focus is in the board, and `shortcuts={false}` turns them off.
- **Announcements**, polite, one per step: "Picked up CHK-219. Todo, position 2 of 5." "In review, position 1 of 4." "Can't move to Done: needs an assignee." "Dropped." "Move failed, returned to Todo."
- Priority, due state, limits and status use a shape or text with the colour. Option colours pass AA on cards, tracks and popups in both themes (contrast test over the palette).
- Focus never lands on `body`: after a move it follows the card, after a delete it goes to the next card or the column, after a filter to the board.
- The non-modal side panel is a labelled `complementary` region in the F6 order; it doesn't trap focus or hide the board.
- Busy columns carry `aria-busy` and one name; skeletons are hidden.
- **Strings:** every string and announcement comes from one `labels` object with English defaults and functions for plurals, so next-intl can supply them. Dates and numbers format through `locale` with cached `Intl` formatters. Logical properties throughout; left and right follow DOM order.

### Keyboard

| Keys                          | Action                                                                    |
| ----------------------------- | ------------------------------------------------------------------------- |
| Arrows                        | Move focus by card and by column (and lane)                               |
| Home, End, Page Up, Page Down | First, last, a page within the column                                     |
| Enter, ⌘ Enter                | Open the record, open as a page                                           |
| Space                         | Lift. Then arrows move, Shift+↑↓ change lane, Space drops, Escape cancels |
| ⌥⇧ arrows                     | Move at once (the Tab Strip's and App Nav's keys)                         |
| `c`, F2                       | New card in this column, rename                                           |
| `m`, `a`, `l`, `p`, `d`       | Move to, assign, labels, priority, due date (mapped from `cardShortcuts`) |
| `x`, Shift+↑↓, ⌘A             | Select, extend, select column                                             |
| `/`, `f`                      | Search, filter                                                            |
| `[`, `]`                      | Collapse, expand the column                                               |
| Delete                        | Archive or delete (the app picks), with Undo                              |
| ⌘Z, ⌘⇧Z                       | Undo, redo                                                                |
| `?`                           | Shortcut list                                                             |

Inside an App Shell they register with its shortcut registry, so conflicts show in one place.

---

## 13. Every state

| Where    | State                        | What shows                                                                                                 |
| -------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Board    | First load, columns known    | Real headers at once, one skeleton per card at the card size, after 300ms                                  |
|          | First load, columns unknown  | Four column tracks with one skeleton each                                                                  |
|          | Refreshing, new filter       | Current cards dimmed, a primary sweep under the toolbar; never skeletons again                             |
|          | Failed, nothing loaded       | Error `Empty` with the reason and Try again                                                                |
|          | Failed refresh               | Cards stay, an `Alert` above with Try again                                                                |
|          | First use                    | `Empty` with Create a card and, if allowed, Add a column                                                   |
|          | No columns                   | "Choose a property to group by", with the ones that can                                                    |
|          | No results                   | Columns stay with 0; one line with Clear filters                                                           |
|          | Offline                      | A banner; changes stay pending and send on return (`isOnline`)                                             |
|          | No access                    | `Empty` saying who can grant it                                                                            |
| Column   | Loading more                 | 3 skeleton cards at the end                                                                                |
|          | More failed                  | Inline error with Retry; loaded cards stay                                                                 |
|          | Failed                       | The column shows its own error; the others work                                                            |
|          | Empty                        | A quiet line and "New"; "Drop here" during a drag                                                          |
|          | Over limit, at limit         | Count with icon and text; `block` refuses with the reason                                                  |
|          | Locked, sorted, filtered     | An icon in the header with a tooltip                                                                       |
|          | New cards above              | "3 new" at the top                                                                                         |
| Card     | Pending                      | A spinner in the key's place after 400ms; opens and moves as usual, later changes queue behind it          |
|          | Failed                       | Returns home, toast with the reason and Retry; a failed create keeps the typed card with Retry and Discard |
|          | Conflict                     | Their value on the card; toast "Maya changed this", Use mine                                               |
|          | Locked, read-only            | No grab cursor; the menu keeps Open and Copy link                                                          |
|          | No longer matches            | Dimmed with the reason, until refresh                                                                      |
|          | Deleted elsewhere            | Leaves; if focused, focus moves; if dragged, the drag ends with a notice                                   |
|          | Long title, many values      | 3 lines then ellipsis; "+2"; a 60-character word breaks                                                    |
|          | Cover loading, broken        | The ratio box, then the file icon                                                                          |
| Record   | Loading                      | Header and title from the card at once; the rest one skeleton per section                                  |
|          | Failed, not found, no access | `RecordViewState` with the reason, Retry or a way back                                                     |
|          | Deleted while open           | Content stays readable, an Alert says who and when; Undo if theirs                                         |
|          | Field saving, failed         | Spinner in the row after 400ms; value kept with the reason and Retry                                       |
|          | Read-only                    | Values without hover or editors; the reason in the header                                                  |
| Property | Options loading, failed      | In the popup; the value stays                                                                              |
|          | Unknown type or option       | The raw value in grey, read-only, never a crash                                                            |
|          | Computed failed              | "Error" in grey with the reason                                                                            |
| Bulk     | Partly failed                | "18 moved, 2 couldn't", with Retry for those 2 and a list                                                  |
|          | Not all loaded               | "All 1,240 selected" sends the query                                                                       |
| Limits   | 10,000+ in a column          | Works by paging; "Filter to find cards" after 500 loaded                                                   |

A render error in one `renderCard` is caught per card and drawn as a plain card with its title, so one bad record can't take down a board.

---

## 14. Permissions and rules

```ts
abilities?: {
  createCard?: boolean | ((columnId: string, laneId: string | null) => boolean | Denied)
  moveCard?: (items: TItem[], target: KanbanPlacement) => boolean | Denied
  editCard?: (item: TItem, propertyId: string) => boolean | Denied
  deleteCard?: (item: TItem) => boolean | Denied
  editColumns?: boolean
  editProperties?: boolean
  saveView?: boolean
}
type Denied = { reason: string }
```

What people can never do is left out; what they could do is disabled with the reason (DESIGN.md). `readOnly` turns everything off in one prop. These shape the interface; the docs say plainly that the server must check again.

---

## 15. Design

- **Board:** sits on the page (`surface 1`) with the App Shell's full-width content. `variant="flat"` (default) or `card`, as the Data Table.
- **Track:** `bg-hover` wash, `rounded-xl`, `--density-8` padding, no border. A column is a quiet area, so it stays below the level ladder.
- **Card:** `bg-card shadow-surface-2 rounded-lg` (concentric in the track), `--density-12` padding, title 13px medium, metadata 12px grey. Hover is a wash, pressed `bg-active`, selected and open take `bg-active` with the `ring-foreground/25` hairline, focus is the 1px blue ring. Dragging is `surface-4`.
- **Header:** icon or status glyph, name in medium, count in grey tabular, the calculation when set, "More" (and "+" with `hasHeaderAdd`) on hover and focus, always on touch. It spans the cards: the glyph starts on their edge and the dots end on the other.
- **Colour:** neutral by default: only the status glyph and option badges carry colour. `columnColor="header"` tints the name chip; `"column"` washes the track at the palette's wash, tested for AA. Never a coloured card.
- **Status glyphs:** a set of progress circles (empty, quarter, half, three quarters, check, cancelled) and priority bars, drawn from Fabricator Icons where they exist. Phase 0 lists what is missing for `packages/icons-core`.
- **Metadata order:** what needs action first (overdue date, blocked), then labels, estimate, counts; avatar at the end of the key row. Two lines at most at `md`.
- **Density:** compact, default, spacious change paddings, text and the column width (15, 17.5, 20rem as `calc()` of tokens).
- **Motion:** `move` for gaps and drops, `settle` for the overlay, `feedback` for washes, `disclosure` for lanes and collapse, `sheet` for the panel, `dialog` for centre. Cards appear in place on load. Counts change without rolling.
- **Fluid hover:** menus, the manager's rows, lanes' headers. Not cards: a wrong click there costs, and they are far apart.
- **Cursors:** pointer on a card, `grabbing` while it moves on the whole window, `grab` on empty board that pans, `col-resize` on the panel edge, `not-allowed` on a blocked target. DESIGN.md's cursor line says a board card is `grab`; a card that opens on click is `pointer`, so that line changes (§21).
- **Print** shows loaded cards and hides the chrome. **Forced colours** keep card edges, focus and the drop gap visible with system colours. **Text zoom** to 200% wraps, and column width grows with it.
- **Find in page** can't see cards that aren't drawn, so `/` search is always one key away and the docs say so.

---

## 16. Web implementation

### 16.1 Files

| Path (under `apps/web/registry/`)                                                                           | What                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `fabricator/shared/lib/palette-model.ts`                                                                    | The 11 colours and the recipe, moved from `event-calendar-model` (re-exported there) |
| `fabricator/shared/lib/property-model.ts`                                                                   | Types, filters, format, compare, aggregates, search (moved from the Data Table)      |
| `fabricator/shared/lib/property-convert.ts`                                                                 | Type conversion and its report, option merge and replace                             |
| `fabricator/shared/lib/kanban-model.ts`                                                                     | Columns from properties, placements, moves, limits, selection, view parse and repair |
| `fabricator/shared/lib/kanban-drag-model.ts`                                                                | Hit-testing, gaps, auto-scroll speed, keyboard targets                               |
| `fabricator/shared/lib/kanban-loader.ts`                                                                    | Batches, cursors, dedupe, cache, abort                                               |
| `fabricator/shared/lib/kanban-changes.ts`                                                                   | Pending list, replay, inverse, queue, patches                                        |
| `fabricator/shared/lib/kanban-store.ts`                                                                     | The store and its selectors                                                          |
| `fabricator/shared/lib/record-view-model.ts`                                                                | Mode by container, navigation, width                                                 |
| `fabricator/shared/lib/drag-sensors.ts`, `drag-board.tsx`                                                   | The dnd-kit adapter                                                                  |
| `fabricator/shared/hooks/use-kanban.ts`, `use-record-view.ts`                                               | Controllers                                                                          |
| `fabricator/shared/ui/kanban-{board,column,card,lane,drag}.tsx`                                             | Parts with no base-specific trigger                                                  |
| `fabricator/shared/ui/property-value.tsx`                                                                   | Values                                                                               |
| `fabricator/<base>/ui/kanban.tsx`, `kanban-menus.tsx`, `kanban-toolbar.tsx`                                 | Root, popups, toolbar                                                                |
| `fabricator/<base>/ui/properties.tsx`, `property-editor.tsx`, `property-filter.tsx`, `property-manager.tsx` | Editors and popups                                                                   |
| `fabricator/<base>/ui/record-view.tsx`                                                                      | Panel, Dialog, Drawer                                                                |
| `styles/fabricator/{kanban,properties,record-view}.css`                                                     | The look, with a why-comment per rule                                                |

Each file has its colocated `.test.ts`. No part file grows past one reason to change (the Data Table's 3,300-line file is the counter-example).

### 16.2 Registry

- `kanban`: `@dnd-kit/{react,dom,abstract}@0.5.3`, `@tanstack/react-virtual@3.14.26`; registry: `properties`, `sortable`, `palette`, `avatar`, `badge`, `button`, `context-menu`, `dialog`, `alert-dialog`, `dropdown-menu`, `empty`, `input`, `kbd`, `popover`, `search`, `select`, `skeleton`, `spinner`, `density`, and `toast` (Base UI) or `sonner` (Radix, Aria) through `baseRegistryDependencies`.
- `properties`: `calendar`, `checkbox`, `combobox`, `date-picker`, `drawer`, `field`, `file-upload`, `multi-select`, `number-field`, `progress`, `rating`, `textarea`, and the above it shares. `@internationalized/date` for Aria.
- `record-view`: `dialog`, `drawer`, `button`, `dropdown-menu`, `tooltip`, `resizable` handle styles. It doesn't depend on `kanban` or `properties`.
- Models are `registry:lib` so native installs the same files. `kanban` never depends on `record-view`; the docs and the block compose them.

### 16.3 Frameworks

- `"use client"` per file with hooks; the first render is deterministic (no measured layout), so a server component can pass `items` and get real HTML. `KanbanSkeleton` is a server component for `loading.tsx`.
- Checked in each CLI template (Next.js, Vite, React Router, TanStack Start, Astro, Laravel) through `packages/tests`, plus Electron and Tauri windows.
- Data recipes in the docs: `useState`, TanStack Query (optimistic), Convex (`usePaginatedQuery` per column), Server Actions, websockets. Each is checked against that library's current docs when written.

---

## 17. Platforms

### 17.1 React Native

Same exports, props and models (contract 9). What differs is layout and gesture.

- **Phone:** one column per screen with the next one showing at the edge, snap paging, a column strip on top (`Tabs` look) with counts. **Tablet and landscape:** the web layout.
- **Lists:** `@legendapp/list` per column (the Event Calendar's agenda already uses it), recycled, variable heights.
- **Drag:** `registry/native/lib/drag-board.tsx`, our own, on Gesture Handler and Reanimated with the shared `kanban-drag-model` as worklets. **One long-press pan on the board, not one per card:** a recycled card would take its gesture with it mid-drag. Offsets live in shared values, the overlay sits at the root, auto-scroll is `useFrameCallback` with `scrollTo`. Holding at a screen edge for 500ms pages to the next column; dragging to the strip drops into a column by name. `lib/sortable.tsx` stays for columns and properties (its context is per list, so it can't be extended).
- **No drag library.** `react-native-drax` 1.1.0 has an experimental board, but release-build drops fail with Gesture Handler 3 ([#296](https://github.com/nuclearpasta/react-native-drax/issues/296)); `react-native-reanimated-dnd`'s board is on an unreleased branch; `react-native-sortables` has no virtual cross-list support. Checked 2026-11-25.
- **Record:** `side` and `center` are a full-height Drawer on phones; on iPad the same three modes. `page` is a screen the app pushes.
- **Editors** are the native Combobox, Multi Select, Date Picker and Number Field, which already open in a sheet on phones.
- **Accessibility:** each card is one element with custom actions: Open, Move to, Move up, Move down, Next column, Previous column, Archive.
- `properties` lands native before `data-table` does. The Data Table's native exception stays as it is; its typed cells exception (`data-table-cells`) shrinks to what is left.
- Keyboard, pan and multi-select by modifier keys are dated parity exceptions; selection on touch is a "Select" action.

### 17.2 SwiftUI and Compose

- `FabricatorKanban`, `FabricatorPropertyList`, `FabricatorRecordView` with bindings (Swift) and state plus callbacks (Compose). The models port to `registry/{swiftui,compose}/models/` and run the same JSON fixtures: grouping, placement, hit-testing, replay, conversion, filters.
- SwiftUI: `LazyVStack` per column, a drag gesture feeding the ported hit-testing, `inspector` for the side record on iPadOS and macOS, sheets on iPhone. Compose: `LazyColumn` with `pointerInput`, a side sheet on wide windows. Both keep the platform's date and file pickers.
- Contract 10 asks for the port or a dated exception in the same change. The web release records the exception; Phase 9 clears it and reports coverage, compilation and behaviour separately.

### 17.3 Desktop and Tauri mobile

The web tree. Checks: drag works in Electron and Tauri windows with the title bar's drag regions (audited by rect, since CDP clicks skip the native hit test), files dropped from the OS, and touch drag in the Tauri mobile WebView.

---

## 18. Docs, examples and block

- **Docs per base and native** for the three items: Preview, Installation, Usage (the one-prop board first), Composition, Data sources, Columns, Properties, Record, Rules, States, Examples, API, Keyboard, Accessibility, Performance. Previews are `type="frame" fit`: the Event Calendar proved a drag inside the docs page restyles 12,000 elements.
- **Examples:** `kanban-demo` (an issue board), `kanban-playground`, `kanban-loader` (100,000 cards, latency and failure switches, a request log), `kanban-lanes`, `kanban-properties` (create and manage), `kanban-pipeline` (a sales pipeline with sums, entry rules and the "why was it lost" question), `kanban-content` (covers, dates), `kanban-states` (every row of §13), `kanban-custom-card`, `kanban-read-only`, `kanban-headless`, `properties-demo`, `properties-manager`, `record-view-demo`, `record-view-modes`.
- **Block `board-01`:** an issue board in the App Shell: projects and saved views in the sidebar, toolbar, board, record in all three modes with sub-tasks, linked pull requests, activity and comments. Category, summary, light and dark pictures; native port in the same change as the native item.
- **Site:** group, `meta.json`, `components.ts`, wide docs, desktop explorer, explorer install names, `llms.txt`, changelog. No homepage card (WEBSITE.md leaves Advanced frames out).
- **Skill and guide:** `skills/fabricator/components.md` today tells agents to build a board from `Item`s and a drag library (line 211); it changes to `kanban`, with rows for `properties` and `record-view`. DESIGN.md gains a Board pattern and a line under Data display.

---

## 19. Testing

TDD on every model, in Vitest, before any UI. Mock only network and time.

- **Model:** grouping per type, unknown options, multi-placement, placements at every edge (first, last, half-loaded, filtered, sorted, collapsed, lanes), limits, selection ranges, view repair. Property-based tests: any sequence of moves keeps every card exactly once; replay of N changes with any subset rejected equals applying the rest; change then inverse is identity.
- **Drag model:** fixtures of rectangles and pointers with expected placements, unequal heights, hysteresis, lanes, virtual estimates, auto-scroll speed.
- **Loader:** batching, dedupe across pages, abort on query change, failure per column, count adjustments, cache return.
- **Conversion:** every type pair that converts, with its report.
- **Extraction:** Data Table and Event Calendar suites unchanged.
- **Browser** (`__tests__/kanban.browser.mjs`, `properties.browser.mjs`, `record-view.browser.mjs`, three bases): drag within and across, out of a scrolled-away source, into collapsed, blocked, multi, cancel; touch drag against scroll; every key in §12; focus after each action; failure and retry; live patch mid-drag; mode switch keeps a draft; axe in light and dark at 390, 820, 1440.
- **Bench:** §11.2, production, recorded in this plan.
- **Native:** model tests, `native:parity --strict`, simulators (iPhone, iPad, Android), VoiceOver and TalkBack, frame rate on a device.
- **Install:** `shadcn add --dry-run` per base and item alone; `packages/tests` templates.

---

## 20. Phases

Each ends with its checks green and this plan updated. Sizes are rough, one person.

| Phase                    | Work                                                                                                                                                                                                                                   | Size        | Gate                                                                |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| 0. Spikes                | Drag adapter on §7.1's findings over virtual columns of 2,000, with our auto-scroll, on real iOS Safari and Android Chrome; moved host for the record on three bases; store bench; native drag across two Legend Lists; glyphs missing | 4 to 5 days | Drag frame budget holds, host keeps an editor's draft, native 60fps |
| 1. Models                | `kanban-*`, `property-convert`, `record-view-model`, fixtures                                                                                                                                                                          | 1.5 weeks   | Property-based tests pass                                           |
| 2. Extraction            | Palette and property model out of Event Calendar and Data Table; `PropertyValue`, filter editor                                                                                                                                        | 1 week      | Both suites unchanged, bench within 5%                              |
| 3. Properties (Base UI)  | Values, editors, list, manager, filter, sort, style map                                                                                                                                                                                | 2 weeks     | Every type, every state, keyboard                                   |
| 4. Board (Base UI)       | Store, controller, columns, cards, drag, virtualization, keyboard, composer, selection, lanes                                                                                                                                          | 2.5 weeks   | §11.2 and §12                                                       |
| 5. Record view (Base UI) | Three modes, navigation, sections, states                                                                                                                                                                                              | 1 week      | Mode switch, focus, phone                                           |
| 6. Data and states       | Loader, pages, pending layer wired, live patches, undo, every row of §13                                                                                                                                                               | 1.5 weeks   | `kanban-states`, fault injection                                    |
| 7. Radix and React Aria  | Per-base files                                                                                                                                                                                                                         | 1 week      | Browser suites on all bases                                         |
| 8. React Native          | Three items, gestures, sheets, block                                                                                                                                                                                                   | 4 weeks     | Parity strict, simulators, device                                   |
| 9. SwiftUI and Compose   | Ports with fixtures                                                                                                                                                                                                                    | 5 weeks     | Fixtures, compile, launch; gaps recorded                            |
| 10. Docs, block, release | §18, full definition of done                                                                                                                                                                                                           | 1.5 weeks   | AGENTS.md's list                                                    |

Web (0 to 7, 10) is about 13 weeks of one person's time; native adds 4; SwiftUI and Compose add 5. Phases 3 and 4 can run side by side after 2. `properties` and `record-view` can ship in a release before `kanban`.

---

## 21. Documents that change

- `COMPONENTS.md`, Dependencies: "Sorting by drag and drop goes through `lib/sortable.tsx`" becomes "Sorting one list goes through `lib/sortable.tsx`, moving cards between virtual lists through `lib/drag-board.tsx`; both share `drag-sensors` and are the only dnd-kit imports."
- `DESIGN.md`: Board pattern, Data display, the cursor line for a board card, `board-01` in Blocks; the version the repo copies to new projects.
- `docs/COMPONENT-GROUPS.md`: examples for Advanced, Forms and Overlays.
- `docs/plans/blocks.md`: `board-01`. `docs/plans/data-table.md` and `event-calendar.md`: what moved out.
- `registry/native/README.md`: cross-list drag. `docs/PLATFORMS.md`: the ports.
- `skills/fabricator/components.md` line 211 and its neighbours, `unreleased.mdx`, `llms.txt`.
- `parity-exceptions.json` (native, SwiftUI, Compose), dated.

### Risks

| Risk                                                        | Response                                                                                         |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| dnd-kit is pre-1.0 and its internals shift                  | Exact pins, one adapter, our own hit-testing; a fallback to raw Pointer Events replaces one file |
| A drag source scrolls out of a virtual list and unmounts    | Run: dnd-kit keeps the drag; the source also stays mounted (`rangeExtractor`)                    |
| Variable heights make virtual positions jump                | Cached heights per card and width, estimates from the card's properties, scroll anchoring        |
| Extraction breaks the Data Table or the Event Calendar      | Own phase, no public change, both suites and benches as the gate                                 |
| Scope: three items, five platforms                          | Items ship separately; every phase leaves something usable                                       |
| Optimistic replay has subtle bugs                           | Pure, property-based tests, a fault-injection example                                            |
| Moving the record's host breaks focus or React Aria's modal | Phase 0 gate; fallback is drafts in the store and a remount                                      |
| API too large                                               | One-prop default; abilities, sources and custom types are optional and documented apart          |
| The site's `:has()` rules hide real numbers                 | Frame previews and the production bench with and without site CSS                                |
| Native cross-list drag at 60fps on mid-range Android        | Worklet hit-testing, Phase 0 on a device; the strip and Move menu work without it                |

---

## 22. Decisions for you

**1. Three items or one.**
Pick: three (`kanban`, `properties`, `record-view`), because properties and the record are useful on every Detail page and Data Table.
Alternative: one `kanban` with everything, faster to ship, and the Data Table keeps its own copy of the logic.

**2. Extract from the Data Table first.**
Pick: yes, Phase 2, because the alternative is a second copy of 800 lines of filter and format rules.
Alternative: copy now and merge later, which saves about a week and leaves two rule sets to keep equal.

**3. Release shape.**
Pick: `properties` and `record-view` on web first, then `kanban` on web and React Native together, SwiftUI and Compose after, because cross-platform is the point and the two small items prove the base.
Alternative: web for all three at once, native next, as the Data Table did.
Alternative: wait for all five platforms.

**4. Where the record opens by default.**
Pick: `side`, floating and not modal, because it is Notion's default for boards and your reference.
Alternative: docked in the App Shell panel, which reflows the board every time it opens.

**5. Column colour by default.**
Pick: neutral tracks with colour only in the status glyph, as DESIGN.md asks; people turn colour on per view.
Alternative: tinted columns on, as Notion does.

**6. Branch.**
Pick: `feat/kanban` off `main` after `release/v0.10.0` merges, because that branch has uncommitted block work.
Alternative: on `release/v0.10.0`, tying it to that release.

---

## 23. Not verified

- The reference's drag and its phone layout: read from its docs, not performed. The desktop board and the details panel were opened.
- Notion: its help pages don't state load limits, what a drag does under a sort, property visibility per record, or how a type change treats values. §5.4, §7.4 and §9.2 are our own design there.
- Drag on real iOS Safari and Android (only emulated touch ran), inside iframes, and under hot reload. The moved host in React Aria. `content-visibility` inside virtual lists. §7.1's timings are a development build in headless Chrome.
- Anything native: no React Native code ran. Legend List notes that Reanimated's `scrollTo` can look like user scrolling with a screen reader on; Phase 0 checks it.
- Whether `@legendapp/list` (3.7.3 in the demo, 3.9.0 newest) reports scroll fast enough for cross-list hit-testing.
- Convex's, TanStack Query's and Next.js's current APIs in the recipes.
- Bundle sizes of our own code and every figure in §11.2: targets, not measurements.
  </content>
  </invoke>
