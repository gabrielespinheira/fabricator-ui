# Event Calendar: plan

Status: built on the web (Base UI, Radix, React Aria) and React Native on `@super-calendar/native` (2026-11-14); §21 lists what the build changed against this plan, what was checked and what is left.

A Fabricator-exclusive `event-calendar` item in the Advanced group: a Google Calendar-class scheduler with day, N-day, week, month, year and agenda views, drag to create, move and resize, recurring events, time zones, a range loader for thousands of events and a default UI that works from one prop. Web and desktop draw it with FullCalendar 7; React Native draws it with a native engine. Both run on one shared model and expose the same exports, props and callbacks.

Facts about FullCalendar and the native libraries were checked against their docs, npm and GitHub on 2026-11-14; §19 lists what wasn't.

---

## 1. Summary of decisions

| #   | Decision                                           | Pick                                                                                                                                 |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Name                                               | `event-calendar` ("Event Calendar"). `calendar` is upstream's date grid and stays untouched (contract 1)                             |
| D2  | Web engine                                         | FullCalendar 7.1.5 (`@fullcalendar/react`), MIT views only, behind one adapter file, styled by our style map through its class props |
| D3  | Native engine                                      | `@super-calendar/native` behind a native adapter, gated by the Phase 0 spike; our own renderer on the shared model if it fails (§6)  |
| D4  | Public API                                         | Ours, engine-neutral; FullCalendar's options and `CalendarApi` exposed as a web-only escape hatch                                    |
| D5  | Recurrence                                         | Expanded in the shared model, so web and native show the same occurrences                                                            |
| D6  | Dates and zones                                    | `date-fns` 4 (already used by Calendar and Date Picker) plus `@date-fns/tz` (new); ISO strings at the edges                          |
| D7  | Premium FullCalendar plugins (resources, timeline) | Not shipped and never referenced by our source; documented as a consumer opt-in through the escape hatch with their own key          |
| D8  | Drag and drop on web                               | FullCalendar's interaction plugin, not `lib/sortable.tsx` (§20 edits COMPONENTS.md)                                                  |
| D9  | Mutations                                          | Async callbacks with optimistic display (`useOptimistic`), revert on rejection, Undo toast                                           |

§18 lists the ones that need your call.

---

## 2. Scope

### In (1.0)

- **Views:** Day, N days (4 by default, any 2 to 7), Week (with or without weekends), Month, Year, Agenda (Google's "Schedule").
- **Time grid:** all-day row, sticky day headers, a time gutter, the now line, business hours, 15-minute snap, overlapping events laid out side by side, auto-scroll to the working day.
- **Month:** multi-day bars, "+N more" opening the day in a popover, week numbers on request.
- **Create:** drag across slots, click a slot (a draft of the default length), the Create button, `c`. A quick-create popover (title, time, calendar) on desktop, a Drawer on phones; "More options" opens the full form.
- **Edit:** drag to move (across days and into or out of the all-day row), resize from the end (and the start on desktop), the details popover with Edit, Duplicate, Delete and Change calendar, a right-click and long-press menu with the same actions, keyboard move and resize.
- **Recurring events:** RRULE strings; edits ask "This event / This and following / All events" as Google does.
- **Calendars:** a list of sources with colour and visibility (Google's "My calendars"), a mini month, both usable in an App Shell sidebar.
- **Data:** a local list (`events`) or a range loader (`load`) with caching, aborts, prefetch of the neighbouring range and a loading sweep.
- **Feedback:** optimistic changes, pending state, revert on failure with Retry, Undo on every change.
- **Settings:** weekends, week numbers, first day, 12/24h, slot zoom, density, declined events; `defaultSettings` or controlled.
- **Platforms:** web on all three bases, desktop (Electron, Tauri), iOS, iPadOS and Android.

### Later (the architecture leaves room)

- Resource views (people, rooms) on web through FullCalendar Premium for licensed consumers; a native resource column view.
- Find a time (free/busy across attendees), tasks and reminders, event search, printing, iCal and Google Calendar feeds as ready-made loaders.

### Out

- A calendar backend, sync or notifications. The component draws and edits; the app stores.

---

## 3. Name, group and place

- **Not `calendar`.** Upstream's `calendar` is the react-day-picker date grid in Forms; replacing it breaks every `date-picker`, `data-table` filter and project that installs it (contract 1). The new item is `event-calendar`, title "Event Calendar", slug `event-calendar`, group **Advanced**: it loads, lays itself out and edits, a product of its own like `data-table`.
- `scheduler` was the alternative; it reads as resource scheduling, which is the part we don't ship.
- The block is `event-calendar-01` (a full calendar app in the App Shell). `calendar-0N` names collide with upstream's date-picker blocks in the shadcn catalog.
- The mini month in the sidebar is the existing `calendar` item, so date picking looks the same everywhere.

---

## 4. Architecture

Four layers, one contract between them. Domain code never imports FullCalendar (Ports and Adapters).

| Layer                 | Web and desktop                                                                                                             | React Native                                                                       | Shared?                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Model** (pure TS)   | Types, ranges per view, recurrence, zones, keyboard moves, conflicts, colours, loader cache                                 | Same files                                                                         | Yes, one copy                                   |
| **Controller** (hook) | `useEventCalendar`: view, date, settings, events, optimistic layer, undo stack, selection                                   | Same API, native file                                                              | API identical                                   |
| **Engine** (adapter)  | `event-calendar-engine.tsx`: maps controller state to FullCalendar options and FullCalendar callbacks back to typed changes | `event-calendar-engine.tsx` (native): the same mapping onto the native engine (§6) | Mapping functions shared where the shapes match |
| **Chrome** (parts)    | Header, view switch, popovers, forms, menus, mini month: per base where triggers differ                                     | Native parts on rn-primitives                                                      | Names and props identical                       |

- The model is where behaviour is decided: which range a view shows, where a keyboard move lands, what a recurring edit with "This and following" produces, which ranges the loader fetches. Both engines only draw and report gestures, so a fix lands once.
- The web adapter is the only file that imports `@fullcalendar/*`. Swapping the engine, or moving FullCalendar to a new major, touches it alone.
- Event chips, day headers and the "+N more" link are our JSX in FullCalendar's content props; every other element takes our placeholders through its class props. The look comes from our style map, not from a FullCalendar theme. Popovers and forms sit outside FullCalendar, anchored to what it drew.
- FullCalendar's own toolbar stays off (v7's default); our header parts drive the controller, and the adapter drives FullCalendar.

---

## 5. Web engine: FullCalendar 7

### 5.1 What v7 gives us

- **Stable since 2026-06-19**; 7.1.5 (2026-11-12) is npm's `latest`. v6 is `legacy` (6.1.22) and isn't considered: v7 is the version with a React renderer, and v6 knowledge (`fc-*` CSS, option names) doesn't carry over.
- **One package.** `@fullcalendar/react` holds the views as entry points: `/daygrid`, `/timegrid`, `/list`, `/interaction`, `/multimonth`, `/locales/*`. `temporal-polyfill` is a required peer (tree-shaken, not installed globally). ESM only.
- **Real React.** v7's component is written in React (v6 wrapped Preact), so JSX in `eventContent` and the other content props renders without portals, and server rendering and StrictMode work. React 17 to 19 are supported.
- **Unstyled by default.** No CSS ships in the JS. A calendar imports `skeleton.css` (structure) and then a theme; the markup has no `fc-*` classes, and every element takes a class prop that is a string or `(info) => string` (`eventClass`, `dayCellClass`, `slotHeaderClass`, …). That is exactly what our placeholder build needs.
- **Named time zones** without a plugin, through Temporal.
- **`useCalendarController()`** for a custom toolbar, and custom views as React components (`views={{ agenda: AgendaView }}` with `sliceEvents`).
- **Accessibility:** every view passes axe (one known false positive), events are focusable `role="button"`, popovers take the keyboard, today has `aria-current="date"`. No keyboard path to drag, resize or select was found: that part is ours (§11).
- **An official shadcn registry** (`@fullcalendar/<theme>-event-calendar`, five themes) with a toolbar of shadcn Buttons and Tabs and about 19 kB of Tailwind class props. We don't install it: its `registryDependencies` are bare names (contract 3 would install upstream's Button over ours), its files lack `"use client"`, and its look is shadcn's. We read it as the upstream for this component, the way COMPONENTS.md has us read shadcn's source first: it lists every class prop a complete theme has to set.

### 5.2 How we use it

| FullCalendar                                                                | Our use                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timeGrid` with `duration: { days: n }`                                     | Day (`n = 1`), N days (`days`), Week (`timeGridWeek`, `weekends` from settings)                                                                                                      |
| `dayGridMonth`                                                              | Month; `dayMaxEvents` on, so since 7.1.0 only the events that fit are rendered                                                                                                       |
| `multiMonthYear`                                                            | Year, with events not drawn: days that have events take a marker class computed by the model, so a year of events costs twelve grids                                                 |
| Custom React view                                                           | Agenda: ours, virtualized with `@tanstack/react-virtual` (already pinned by the Data Table), infinite in both directions from the loader; also usable alone as `EventCalendarAgenda` |
| Custom React view                                                           | Phone month: dots per day over the picked day's agenda                                                                                                                               |
| `interaction`                                                               | `selectable`, `editable`, `eventDrop`, `eventResize`, `select`, `dateClick`, `eventAllow`, `snapDuration`, external `Draggable`                                                      |
| `businessHours`, `nowIndicator`, `slotMinTime`, `slotMaxTime`, `scrollTime` | From props and settings                                                                                                                                                              |
| `eventLongPressDelay`, `selectLongPressDelay`                               | 250ms, the hold `lib/sortable.tsx` uses on touch (FullCalendar's default is 1000ms, which feels broken on a phone)                                                                   |
| `datesSet`                                                                  | Feeds the controller's range and `onRangeChange`                                                                                                                                     |
| `locales/*`                                                                 | Loaded on demand to match `locale`, for FullCalendar's own ARIA strings; every visible string is formatted by our model with date-fns                                                |
| `temporal-polyfill`                                                         | A dependency of the item, at the version FullCalendar's peer range asks for                                                                                                          |
| `@fullcalendar/react-scheduler`                                             | Never imported by our source (§5.4)                                                                                                                                                  |

### 5.3 Events in, changes out

- The adapter gives FullCalendar only what the visible range needs: the controller's events for the range plus a margin, recurring ones already expanded (§12), as one memoized array. Unchanged events keep their object identity between renders, so FullCalendar and our memoized chip skip them; a single move re-creates one object.
- Every option object and callback the adapter passes is stable for the calendar's life; callbacks read the latest props through refs (the Data Table's `editCell` pattern). FullCalendar's docs warn that inline arrays and functions count as changes on every render, and `rerenderDelay` does nothing in the React component, so identity is the whole performance story.
- FullCalendar's drop and resize callbacks become one typed `EventChange`; the adapter calls `info.revert()` when the controller's handler rejects, and otherwise lets the optimistic layer own the event's position.
- Whether v7 accepts the date and view as controlled props wasn't confirmed. If it doesn't, the adapter calls `gotoDate` and `changeView` on the controller's changes and listens to `datesSet`; the public API is the same either way.

### 5.4 Premium and the escape hatch

FullCalendar's Premium plugins (timeline, resource views, print) are AGPLv3 for open-source projects, CC BY-NC-ND for non-profits and commercial otherwise, keyed by `schedulerLicenseKey`. Their licence page allows a library to support them as long as it ships no Premium code and no key. So:

- No `@fullcalendar/react-scheduler` in the item's dependencies, no import in our files.
- The docs show a licensed consumer adding it through `fullCalendar={{ plugins: [...], schedulerLicenseKey }}` (§7.6), with the licence spelled out.
- Our `CalendarView` stays the six free views; resource views appear only as raw FullCalendar views through the escape hatch until §2's "Later".

---

## 6. React Native

FullCalendar can't run there: its React package needs `react-dom`. Native needs its own engine behind the same controller.

### 6.1 Options

| Option                                                          | Verdict                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@super-calendar/native`** 2.17.0 (MIT)                       | **Pick, if Phase 0 passes.** The only native library with month, day, 3-day, N-day, week and agenda views plus drag to move, resize and create, all-day events, time zones and recurrence. Virtualized with Legend List, Reanimated 4 or later. Released 2026-11-08, but first published in June 2026 by one author. Its own comparison table is the only source for some claims |
| Our own renderer on Reanimated, Gesture Handler and Legend List | **Fallback.** The full feel and control the editor got from its own text view, and no third-party risk. Three to four weeks on top of §16's native phase; the overlap layout and hit-testing move into the shared model                                                                                                                                                          |
| `@howljs/calendar-kit` 2.5.6                                    | Rejected. No month view (an issue open since 2023), no release since 2025-10-10, and an open report of endless re-renders on Reanimated 4.7, the version `demos/react-native` runs                                                                                                                                                                                               |
| `react-native-big-calendar` 4.19.0                              | Rejected. No drag (declined upstream), overlapping events indent instead of sitting side by side, its v5 rewrite was dropped                                                                                                                                                                                                                                                     |
| `react-native-calendars` (Wix)                                  | Rejected. Its Timeline has N days, the now line and an overlap layout, but no drag to move or resize                                                                                                                                                                                                                                                                             |
| FullCalendar in an Expo DOM component (`'use dom'`)             | Rejected. Props cross an async bridge, any prop change re-renders the whole web tree, no children or native views inside, and drag inside the web view is untested. It would also put web chrome on a native screen                                                                                                                                                              |

### 6.2 What the spike has to prove for `@super-calendar/native`

- It installs on Expo 58, React Native 0.88 and Reanimated 4.7 in a fresh project and under `demos/react-native`.
- Its events and slots can be drawn by our components (a render prop or slot API), styled with Uniwind classes from the native style map. If it only takes a theme object, the native look comes from `native-theme.ts` values instead.
- Drag, resize and create hold 60fps with 300 events in a week on an iPhone and an Android emulator; the snap, auto-scroll and long-press timings can be set to ours.
- VoiceOver and TalkBack reach every event, and we can add custom actions to its event views (§11).
- It accepts our expanded occurrences as plain events, so recurrence stays in the shared model.

One miss on the first two or the fourth points to the fallback. The controller, model and props don't change either way: only `native/ui/event-calendar-engine.tsx` does.

### 6.3 The native item

- Same exports and props as web (contract 9). `fullCalendar` and `engine` are a dated `parity-exceptions.json` entry; native may add its own pass-through for its engine.
- Chrome on rn-primitives as every native item: the header, a native Select for views, quick create and details in a sheet on phones and a popover on tablets, the event menu on long press.
- Gestures follow `registry/native/README.md`: snap haptic per slot crossed, the drop sound and haptic, swipe between ranges following the finger, pinch to zoom the hour height.
- iPad gets the week view by default; a phone gets N days with 3 columns.
- The parity check for behaviour is the shared model: given the same events, view and gestures, both platforms produce the same ranges, snaps, changes and occurrences (fixture tests in `event-calendar-model.test.ts`). Pixel layout of overlaps can differ between engines, and the docs say so.

---

## 7. API

### 7.1 Data types

```ts
type CalendarEvent<TData = unknown> = {
  id: string
  title: string
  start: string // ISO 8601; a date only ("2026-11-14") when allDay
  end: string // exclusive, as in iCalendar and FullCalendar
  allDay?: boolean
  calendarId?: string // which source; colour and editability come from it
  color?: CalendarColor // overrides the source's colour
  recurrence?: string // RRULE (and EXDATE lines); start is the first occurrence
  recurringEventId?: string // set on an occurrence that was edited on its own
  status?: "confirmed" | "tentative" | "cancelled"
  editable?: boolean
  location?: string
  description?: string
  attendees?: CalendarAttendee[]
  data?: TData // the app's own fields, typed
}

type CalendarSource = {
  id: string
  name: string
  color: CalendarColor
  visible?: boolean
  editable?: boolean
}

// A hue (0–360) through the role recipe, or one of the six roles.
type CalendarColor =
  | { hue: number }
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "destructive"

type CalendarView = "day" | "days" | "week" | "month" | "year" | "agenda"
```

- ISO strings at the edges, because they cross the native bridge, JSON APIs and server components unchanged; the model works in `TZDate`.
- `data` is generic, so `event.data.priority` is typed in callbacks and render props (the Data Table's `meta` precedent).

### 7.2 The one-prop default

```tsx
const [events, setEvents] = React.useState(initialEvents)

<EventCalendar events={events} onEventsChange={setEvents} />
```

That draws the header (Today, previous, next, the title, the view switch, Create), the week view on desktop and the 4-day view on a phone, and turns on creating, moving, resizing, editing, deleting, Undo and the keyboard map. `defaultEvents` alone makes a local playground.

### 7.3 Props

| Prop                                                | Default                       | What                                                                                |
| --------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `events` / `defaultEvents`                          |                               | A local list                                                                        |
| `onEventsChange(events, change)`                    |                               | The next list and the change that made it, for a controlled list                    |
| `load({ start, end, signal })`                      |                               | A range loader, instead of `events`; returns events for the range                   |
| `onEventCreate(draft)`                              | applies locally               | May return a Promise of the saved event; rejection removes the draft                |
| `onEventChange({ event, previous, reason, scope })` | applies locally               | `reason`: `move`, `resize`, `edit`, `calendar`; `scope` for recurring events        |
| `onEventDelete({ event, scope })`                   | applies locally               | Undo restores it                                                                    |
| `onEventOpen(event)`                                | opens the details popover     | Return `false` to handle it yourself (a route, a side panel)                        |
| `onRangeChange({ start, end, view })`               |                               | Fires after navigation settles                                                      |
| `calendars`                                         | one default source            | Sources with colour, visibility and editability                                     |
| `view` / `defaultView` / `onViewChange`             | `week` (phone: `days`)        |                                                                                     |
| `views`                                             | all six                       | What the view switch offers                                                         |
| `days`                                              | `4`                           | Columns in the N-day view                                                           |
| `date` / `defaultDate` / `onDateChange`             | today                         | The focused date                                                                    |
| `settings` / `defaultSettings` / `onSettingsChange` | see §8.5                      | Weekends, week numbers, first day, hour format, zoom, density, declined             |
| `timeZone`                                          | the device's                  | IANA name; events keep their own zone when they carry an offset                     |
| `locale`                                            | `enUS`                        | A date-fns `Locale`, mapped to FullCalendar's locale on web                         |
| `businessHours`                                     | `false`                       | Shaded outside; `true` is Mon–Fri 9–17                                              |
| `editable` / `selectable`                           | `true` when a change can land | Off when the list is uncontrolled and no handler is passed                          |
| `readOnly`                                          | `false`                       | No creating or editing at all, details still open                                   |
| `renderEvent(props)`                                | Fabricator chip               | Custom content per event; gets the event, view, `isPast`, `isDragging`, `isPending` |
| `renderEventDetails(props)`                         | details card                  | Replaces the popover's body                                                         |
| `renderEventForm(props)`                            | quick-create form             | Replaces the create and edit form; gets a typed `save` and `cancel`                 |
| `variant`                                           | `card`                        | `card` or `flat`, as the Data Table                                                 |
| `size`                                              | `default`                     | `sm` and `lg` map to densities                                                      |
| `fullCalendar`                                      |                               | **Web only.** FullCalendar options merged last (§7.6)                               |

Every `on*` handler may be async. While its Promise is pending the event shows as pending; when it rejects, the change reverts and a toast offers Retry.

### 7.4 Composition

`<EventCalendar>` with no children renders the default layout. Composing it is the Data Table's pattern: a hook owns the state and every part takes it.

```tsx
const calendar = useEventCalendar({ load, calendars, onEventChange })

<AppShell>
  <AppShellSidebar>
    <EventCalendarCreateButton calendar={calendar} />
    <EventCalendarMiniMonth calendar={calendar} />
    <EventCalendarSources calendar={calendar} />
  </AppShellSidebar>
  <AppShellMain>
    <EventCalendar calendar={calendar}>
      <EventCalendarHeader>
        <EventCalendarToday />
        <EventCalendarNavigation />
        <EventCalendarTitle />
        <EventCalendarViewSelect />
        <EventCalendarSettings />
      </EventCalendarHeader>
      <EventCalendarContent />
    </EventCalendar>
  </AppShellMain>
</AppShell>
```

Parts: `EventCalendar`, `EventCalendarHeader`, `EventCalendarToday`, `EventCalendarNavigation`, `EventCalendarTitle`, `EventCalendarViewSelect`, `EventCalendarSettings`, `EventCalendarCreateButton`, `EventCalendarContent`, `EventCalendarEvent` (the default chip, for reuse inside `renderEvent`), `EventCalendarEventDetails`, `EventCalendarEventForm`, `EventCalendarMiniMonth`, `EventCalendarSources`, `EventCalendarAgenda` (the agenda list on its own, for a dashboard card), `EventCalendarEmpty`. Each renders `data-slot="event-calendar-<part>"`. Parts inside `EventCalendar` read the controller from context; parts outside it take `calendar`.

### 7.5 The controller

`useEventCalendar(options)` returns `EventCalendarController`:

- State: `view`, `date`, `range`, `settings`, `events` (visible, with the optimistic layer), `isLoading`, `error`, `selection`.
- Navigation: `next()`, `previous()`, `today()`, `goTo(date)`, `setView(view)`.
- Changes: `createEvent(draft)`, `updateEvent(id, patch, scope?)`, `deleteEvent(id, scope?)`, `undo()`, `redo()`.
- UI: `openEvent(id)`, `startCreate(range?)`, `scrollToTime(time)`, `refetch()`.

The same object drives web and native, and is what apps test against.

### 7.6 Reaching FullCalendar (web only)

- `fullCalendar` takes any FullCalendar `CalendarOptions` and merges them last. It can add plugins (Premium resources, `@fullcalendar/google-calendar`, `@fullcalendar/icalendar`), set `schedulerLicenseKey`, or override a hook we set. Options we own (`events`, `eventDrop`, …) still call ours first.
- `calendar.engine` on web is FullCalendar's `CalendarApi` (`undefined` on native), for anything the controller doesn't cover.
- Both are a dated `parity-exceptions.json` entry: they are the engine, not the component.

---

## 8. The default experience

### 8.1 Views

| View   | Desktop                                                | Phone                                                     | Shortcut |
| ------ | ------------------------------------------------------ | --------------------------------------------------------- | -------- |
| Day    | Time grid, one column                                  | Same, swipe to the next day                               | `d`      |
| N days | Time grid, `days` columns (4)                          | 3 columns when 4 don't fit at 64pt each                   | `x`      |
| Week   | Time grid, 7 or 5 columns                              | Offered on tablets; phones get N days                     | `w`      |
| Month  | Day grid, bars for multi-day events, "+N more"         | Dots per day over an agenda of the picked day (Apple's)   | `m`      |
| Year   | Twelve mini months, days with events marked            | Same, scrolling                                           | `y`      |
| Agenda | Days with events, grouped, infinite in both directions | Same; the default on phones when `views` lacks time grids | `a`      |

### 8.2 Pointer and touch

| Gesture                                 | Result                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| Drag across slots                       | A draft event follows; release opens quick create anchored to it      |
| Click an empty slot                     | A draft of the default duration (1 hour, settings) and quick create   |
| Click an event                          | Details popover (Drawer on phones)                                    |
| Drag an event                           | Moves on the snap; into the all-day row turns it all-day; Esc cancels |
| Drag an event's edge                    | Resizes on the snap; a minimum of one snap                            |
| Alt-drag (Option on Mac)                | Duplicates                                                            |
| Right-click, long press                 | The event menu: Open, Edit, Duplicate, Change calendar, Delete        |
| Touch: long press an event, then drag   | Lift (haptic on native), move, drop                                   |
| Touch: long press empty time, then drag | Create by range                                                       |
| Swipe horizontally (touch)              | Previous or next range, following the finger                          |
| Pinch (touch), Ctrl/⌘ + wheel (desktop) | Zoom the hour height between the density's bounds                     |

Dragging near the grid's top or bottom auto-scrolls; near the side edges of Day or N-days it pages after a hold (Google's behaviour).

### 8.3 Keyboard

The grid is one tab stop with a focus cursor on a slot or day; events are reached with Tab from the cursor's cell. How the cursor sits on FullCalendar's DOM is settled in Phase 0 (§11).

| Keys                         | Action                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Arrows                       | Move the focus cell by day and by slot                                                 |
| Enter                        | On a cell: quick create there. On an event: open it                                    |
| Space on an event            | Grab it; arrows move by day and by snap, Shift+arrows resize, Enter drops, Esc cancels |
| `e`, Delete/Backspace        | Edit, delete the focused event                                                         |
| `t`, `j`/`n`, `k`/`p`        | Today, next range, previous range                                                      |
| `d`, `x`, `w`, `m`, `y`, `a` | Switch view                                                                            |
| `c`                          | Create                                                                                 |
| ⌘Z / ⌘⇧Z                     | Undo, redo                                                                             |
| `?`                          | Shortcut help (a dialog listing these with `Kbd`)                                      |

Shortcuts are on by default, scoped to the calendar's region (not the page) unless `shortcuts="global"`, and never fire while typing.

### 8.4 States

- **Loading:** first load draws the grid with no events and a primary sweep under the header; refetches keep the events and show the sweep after a short delay (the Data Table's timing).
- **Pending:** an event whose change is in flight is drawn at its new place at reduced opacity with a spinner in the chip; it can't be dragged again until it lands.
- **Error:** a load failure is an inline Alert under the header with Try again; a failed change reverts and a toast says what failed with Retry.
- **Empty:** the agenda shows `EventCalendarEmpty` ("No events in this range" + Create); time grids stay drawn, since empty time is meaningful.
- **Read-only:** no draft on click, no handles, no menu actions but Open.
- **Past:** past events and slots dim one grey step.
- **Declined and tentative:** declined struck through (hidden unless the setting is on), tentative striped outline.

### 8.5 Settings

`EventCalendarSettings` is a Popover of Switches and Selects, like the Data Table's: show weekends, show week numbers, show declined events, first day of the week, 12 or 24 hour, default event length, slot length (15, 30, 60), density. `settings` / `onSettingsChange` persist them; examples store them in the URL with nuqs.

---

## 9. Design-system fit

- **Surface:** `variant="card"` is a level 2 card, `flat` sits on the page. The header is the page's toolbar pattern: the title as an outline field that opens the date picker, Today as an outline button, previous and next as ghost icon buttons, the view switch as a Select (a ToggleGroup above 1024px when there are four views or fewer), Create as the one filled button.
- **Grid:** hairlines at `border/60` (the menu and table divider), hour lines full, half-hour lines at half that. Today's column header carries a filled `primary` date disc (Google's and Apple's cue); weekends and outside business hours wash with `bg-hover`. The now line is `destructive` with a dot at the gutter.
- **Event colours:** each source's colour runs through the role recipe, so it meets AA in light and dark at any hue. A chip sets only `--event-calendar-hue` and `--event-calendar-chroma` inline; the item's `cssVars` derive `--event-calendar-fill`, `-text`, `-foreground` and `-border` from them with `colorSlotCss` (`color-roles.ts`), the same function the roles use. The chip draws the soft step (`/12` of the fill, `/16` hovered) with `-text` and a 3px start bar in the fill; selected and dragging chips switch to the solid fill with `-foreground`. A role name reads that role's variables instead. The contrast test sweeps the hue wheel for these tokens on surfaces 1 to 3.
- **Chips:** 13px title, 12px muted time, location on a third line when the chip is tall enough; titles truncate before times; 2px gap between side-by-side events; control corner (8px) at default, 4px under 24px tall.
- **Drag:** the lifted copy takes `shadow-surface-4` and a slight scale on the press timing; the drop settles on the move timing; the origin stays as a dashed outline until the drop lands.
- **Popovers:** details and quick create are our `Popover` at level 3, anchored to the chip or draft. On phone widths they are a `Drawer` from the bottom (DESIGN.md: a desktop dialog is a drawer on a phone). Dialogs (recurring scope, shortcut help) are level 5. One popover instance serves every chip and moves its anchor; no chip mounts its own (a popover root per cell cost a quarter of the Data Table's scroll work).
- **Density:** compact, default and spacious set the hour height (56, 72, 88px at zoom 1: two `--density-36` slots), chip text and header controls. The tokens are `--density-*`, never pixels, so `density-usage.test.ts` holds.
- **Motion:** view and range changes appear in place (DESIGN.md: app content appears in place), except a touch swipe, which follows the finger. Popovers grow from their chip. Reduced motion keeps fades.
- **Fluid hover:** the view switch, settings rows and menus have it from their components. The grid doesn't: slots aren't a list of alternatives.
- **Sounds and haptics:** `tick` on drop and resize release, `popup` on popovers, the snap haptic on native at each slot crossed while dragging.
- **Cursors:** pointer on events, `ns-resize` on handles, `grabbing` while dragging, the arrow over empty slots, per the style spec's cursor rule.
- **Placeholders:** every look in `registry/styles/fabricator/event-calendar.css` as `cn-event-calendar-*`. FullCalendar's class props get them through module-level `cn("cn-event-calendar-…")` constants, or a function that picks between such constants from `info` (past, today, weekend, selected), so the build compiles them (placeholders only compile as `cn()` arguments). The adapter file imports FullCalendar's `skeleton.css` and no theme: the style map is, in effect, a sixth FullCalendar theme. Fabricator-only placeholders need no rule in the upstream maps.
- **No ancestor `:has()`** in the style map, and no inherited `color` transitions (both cost whole-document restyles in the Data Table work).

---

## 10. Performance

FullCalendar 7 doesn't virtualize the time grid or the day grid (virtual rendering exists only for Premium timelines). So the work is bounded by what one range shows, and the adapter keeps every render cheap.

### 10.1 Rules

- **Only the range.** FullCalendar gets the visible range plus a margin, never the whole list. 10,000 events over two years is a few hundred per week.
- **Stable identity.** Options, callbacks and unchanged events keep their identity (§5.3). A move re-renders one event.
- **A cheap chip.** `EventCalendarEvent` is plain markup memoized on the event and its pending state: no Base UI part, no Avatar, no Tooltip per event (the Data Table's per-row lessons). Attendee faces are plain images.
- **One popover, one menu.** Details, quick create and the event menu are single instances that move their anchor.
- **Month caps itself.** `dayMaxEvents` renders only what fits (7.1.0); the rest is a "+N more" popover rendered on open.
- **Year draws no events,** only day markers from the model.
- **Agenda is virtual** and loads windows from `load`, as the Data Table does.
- **Loader:** the visible range first, then the previous and next range at idle; requests for ranges left behind are aborted; ranges are cached with their fetch time and refetched on `refetch()` or focus after a staleness window.
- **No drag state in React.** FullCalendar owns the drag mirror; our layer updates nothing per pointer move, and the live region announces only on drop.
- **CSS:** no ancestor `:has()`, no transitions on inherited properties, `contain: content` on the scroll body, hour lines as one background gradient instead of an element per line where FullCalendar allows it.

### 10.2 Budgets

Targets for Phase 0 to confirm or correct on a production build, docs-site CSS included and excluded (the Data Table's method):

| Scenario                                      | Target                                    |
| --------------------------------------------- | ----------------------------------------- |
| Week, 500 events: first render                | ≤ 120ms                                   |
| Next or previous week                         | ≤ 80ms to paint                           |
| Switch Week → Month, 5,000 events loaded      | ≤ 150ms                                   |
| Drag or resize frame, 500 events in view      | ≤ 16ms                                    |
| Create, move or delete one event (optimistic) | ≤ 50ms to show                            |
| Agenda fling over 10,000 events               | No blank frames after the speed registers |
| Bundle, web: the calendar's own JS            | Reported in the PR                        |

Bundlephobia puts `@fullcalendar/react` 7.1.5's main entry at about 31.7 kB gzip, before the view entries and `temporal-polyfill`; the PR reports the real figure from `next build`. Apps that show the calendar on one route load it with `next/dynamic` and get the header's server-rendered shell meanwhile; the docs show it.

### 10.3 Bench

`tmp/event-calendar/bench.mjs` on a temporary example with 10,000 in-memory events and a latency-free loader, against a production build. Rerun after any adapter change and on every FullCalendar bump.

---

## 11. Accessibility

- **Grid:** FullCalendar 7's markup is the base: axe-clean views, events as focusable buttons, `aria-current="date"` on today. We add names: events read "Standup, 10:00 to 10:30, Work calendar", headers the full date, "+3 more" the count and the day.
- **Empty time:** FullCalendar has no keyboard way to select a range. Our focus cursor (§8.3) is a highlighted slot the arrows move, announced as "Tuesday, 18 November, 10:00"; Enter creates there. Phase 0 decides whether it can be a real APG grid over FullCalendar's DOM (roles set through class and content props) or a single focusable layer above the grid that mirrors the slot under the cursor.
- **Keyboard:** §8.3 in full. Every drag has a keyboard path (grab and arrows) and a menu path (Edit with fields, Duplicate, Change calendar), as COMPONENTS.md requires of drag and drop.
- **Announcements:** a polite live region says what each move, resize, create, delete and undo did, and the range after navigation ("Week of 16 November").
- **Focus:** opening details moves focus into the popover; closing returns it to the chip; deleting moves it to the cell.
- **Contrast:** event text and fills from the recipe pass 4.5:1 on every surface the grid uses; the contrast check covers the calendar's tokens.
- **Native:** every chip is an accessible element with the same label; VoiceOver and TalkBack custom actions for Move earlier, Move later, Next day, Previous day, Lengthen, Shorten, Delete, since drag isn't available to them.

FullCalendar's own ARIA (§5.1) is the floor; the gaps found in Phase 0 are filled in the adapter, never by forking or patching FullCalendar.

---

## 12. Time zones, locales and recurrence

- **Zones:** the model converts with `@date-fns/tz` (`TZDate`), which runs the same on Hermes and in browsers; FullCalendar 7 takes the same IANA name through Temporal, so the adapter passes `timeZone` straight through. `timeZone` sets the calendar's zone; an event with an offset in its ISO string is placed by it. DST: a 30-minute slot that doesn't exist (spring forward) is skipped; one that repeats (fall back) draws twice, as Google does. Tests pin Lisbon, New York and Lord Howe (30-minute DST).
- **Locales:** one date-fns `Locale` drives titles, headers and formats on both platforms; the web adapter maps it to FullCalendar's matching locale for its internal strings. Left to right only (COMPONENTS.md).
- **Recurrence:** `recurrence` holds RRULE lines. The model expands occurrences inside the visible range (plus a margin) and hands both engines plain instances with ids `<eventId>::<occurrenceStart>`, so web and native agree and FullCalendar's rrule plugin isn't needed. Scoped edits are pure functions: "This event" adds an EXDATE and an exception event, "This and following" ends the series with UNTIL and starts a new one, "All" edits the master. The expansion library is chosen in Phase 0 (§18).

---

## 13. Registry items and files

| Path (under `apps/web/registry/`)                                                                       | What                                                                                 |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `fabricator/shared/lib/event-calendar-model.ts` + test                                                  | Types, view ranges, navigation, keyboard moves, conflicts, settings, colours         |
| `fabricator/shared/lib/event-calendar-recurrence.ts` + test                                             | Expansion, scoped edits, ids                                                         |
| `fabricator/shared/lib/event-calendar-loader.ts` + test                                                 | Range cache, aborts, prefetch, merging optimistic changes                            |
| `fabricator/shared/hooks/use-event-calendar.ts`                                                         | The controller (web)                                                                 |
| `fabricator/shared/ui/event-calendar-engine.tsx`                                                        | The FullCalendar adapter: the only `@fullcalendar/*` import                          |
| `fabricator/shared/ui/event-calendar-event.tsx`                                                         | The chip, plain markup (no Base UI parts per event)                                  |
| `fabricator/<base>/ui/event-calendar.tsx`                                                               | Root, header parts, popovers, menus, forms, settings, mini month, sources            |
| `styles/fabricator/event-calendar.css`                                                                  | `cn-event-calendar-*` rules                                                          |
| `native/ui/event-calendar.tsx`, `native/ui/event-calendar-engine.tsx`, `native/lib/event-calendar-*.ts` | The native item; the engine file is the only one that imports the native engine (§6) |
| `styles/native/event-calendar.css`                                                                      | Native rules, same placeholder names                                                 |
| `examples/<base>/event-calendar-*.tsx`, `examples/native/event-calendar-example.tsx`                    | Demos (§14)                                                                          |

The web item declares `@fullcalendar/react@7.1.5` (exact, as the Data Table pins TanStack: the adapter is written against one version's option names), `temporal-polyfill` (its peer), `date-fns`, `@date-fns/tz`, `@tanstack/react-virtual@3.14.26` and the recurrence library, and `registryDependencies` on `button`, `select`, `toggle-group`, `popover`, `dialog`, `dropdown-menu`, `context-menu`, `drawer`, `input`, `textarea`, `field`, `switch`, `checkbox`, `calendar`, `date-picker`, `time-input`, `kbd`, `skeleton`, `empty`, `alert`, `density`, and `toast` on Base UI or `sonner` on Radix and Aria (COMPONENTS.md). Its colour variables ship in `cssVars` (contract 4). The model, recurrence and loader files are `registry:lib` so the native item installs the same source. The native item declares its engine (§6) at an exact version, `react-native-reanimated`, `react-native-gesture-handler`, `@rn-primitives/*` as its chrome needs, `date-fns`, `@date-fns/tz` and the recurrence library.

---

## 14. Docs, examples and site

- **Docs page per base** (`content/docs/components/<base>/event-calendar.mdx`): Preview, Installation, Usage (the one-prop default first), Composition, Views, Loading data, Editing and callbacks, Recurring events, Time zones, Customising events, Using FullCalendar directly, Examples, API reference, Accessibility, Keyboard shortcuts. The page names FullCalendar and links its licence.
- **Examples:** `event-calendar-demo` (a Google-style app: sidebar, mini month, sources, a team's month of events), `event-calendar-views`, `event-calendar-loader` (10,000 events over two years from a mock server with latency and failures), `event-calendar-controlled` (URL state), `event-calendar-custom-event`, `event-calendar-read-only`, `event-calendar-recurring`, `event-calendar-time-zones`, `event-calendar-external-drag` (tasks dragged from a list), `event-calendar-agenda` (a dashboard card), `event-calendar-full-calendar` (the escape hatch with `@fullcalendar/icalendar`).
- **Block:** `event-calendar-01`, the full app in the App Shell, on web and native.
- **Group and catalog:** `GROUP_BY_SLUG` under Advanced, a homepage card, `meta.json` for every base, the desktop explorer and the React Native example list.
- **Elsewhere:** changelog entry, `llms.txt` and the `.md` export, both DESIGN.md files (a "Calendar" entry under Data display and a "Schedule" pattern), `skills/fabricator` (when to reach for it, the one-prop default, the escape hatch).

---

## 15. Testing

TDD on the model before any UI, in Vitest (`bun run test`), colocated.

- **Model:** range per view and `days`, week start and weekends, navigation, keyboard moves and resizes with snap and day edges, clamping to `visibleHours`, all-day conversion, conflicts, settings defaults, colour recipe contrast.
- **Recurrence:** daily, weekly with BYDAY, monthly by weekday, yearly, COUNT and UNTIL, EXDATE, each scoped edit and its inverse (Undo), DST in three zones.
- **Loader:** range cache hits, prefetch of neighbours, aborts on fast navigation, optimistic merge and revert, a failed range retried.
- **Adapter:** pure mapping functions (controller state to FullCalendar options, FullCalendar event objects to our changes) tested without a DOM.
- **Browser** (`registry/fabricator/__tests__/event-calendar.browser.mjs`, dev server up, each base): create by drag, move across days and into all-day, resize, "+N more", keyboard grab and move, undo, recurring scope dialog, axe on every view, light and dark, phone and desktop widths.
- **Performance bench** (`tmp/event-calendar/bench.mjs`, production build): §10's budgets.
- **Native:** the shared model's tests cover logic; `bun run demo react-native:check`; simulator checks on iPhone, iPad and Android in light and dark with VoiceOver and TalkBack; `packages/tests` installs the item into a fresh Expo project.

---

## 16. Phases

Each phase ends with its checks green and the plan's status updated. Sizes are rough, for one person.

### Phase 0: spike, go or no-go (3 to 4 days)

- FullCalendar in the site on React 19.3 and Next 16 under `tmp/event-calendar/`: our chip through `eventContent`, our tokens, Tailwind 4's layers against FullCalendar's CSS, SSR without a layout shift.
- Measure with 5,000 events in a month and 500 in a week, production build: first render, navigation, view switch, a drag frame, a resize frame. Measure the bundle per plugin.
- Audit FullCalendar's keyboard and ARIA per view against §11; list what the adapter must add.
- Native: §6.2's checks on `@super-calendar/native` with 300 events in a week, on an iPhone and an Android emulator.
- Pick the recurrence library (§18).
- **Go** when the web budgets in §10 hold with our chip, the native drag holds 60fps on device, and the ARIA gaps can be filled from outside FullCalendar. **No-go** on web means FullCalendar's rendering is replaced by our own time grid behind the same adapter boundary; the API doesn't change.

### Phase 1: model and controller (1 week)

Types, view ranges, navigation, settings, keyboard moves, conflicts, colours, recurrence and the loader, test first. `useEventCalendar` with the optimistic layer and the undo stack. No UI.

### Phase 2: web engine on Base UI (1.5 weeks)

The adapter, the chip, the six views, create, move, resize, the now line, business hours, the style map, the registry item and tsconfig aliases. The one-prop default works in a scratch example.

### Phase 3: the default experience (1.5 weeks)

Header parts, the view switch, quick create, details, the full form, the event menu, recurring scope dialog, Undo toasts, the keyboard map with help, settings, mini month, sources, loading, error and empty states, phone layout. The 10,000-event loader demo; the bench against §10.

### Phase 4: Radix and Aria (3 to 4 days)

Only the parts whose triggers differ (Popover, Dialog, Drawer, Select, Dropdown Menu, Context Menu, Toast/Sonner). The engine, chip, model and controller are shared.

### Phase 5: native (3 to 4 weeks)

The native adapter on `@super-calendar/native` (or the fallback renderer, add 3 to 4 weeks): time grid views, month, year, agenda, gestures, haptics, the native chrome on rn-primitives, VoiceOver and TalkBack actions, iPad layout. `native:parity --strict` clean but for the dated escape-hatch exception.

### Phase 6: docs and release (1 week)

Docs per base, every example, `event-calendar-01` on web and native, catalog card, group, explorer, changelog, `llms.txt`, both DESIGN.md files, the skill, §20's doc edits, captures, the full definition of done.

---

## 17. Risks

| Risk                                                                                         | Response                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| FullCalendar's structural CSS fights the style map (order, Tailwind layers)                  | v7 ships no theme CSS and no `fc-*` classes, only `skeleton.css`; Phase 0 confirms where it loads relative to Tailwind's layers                                                |
| Custom React content per event is slow with thousands of events                              | Plain-markup chip, memoized on the event; month caps rows with "+N more"; Phase 0 measures it                                                                                  |
| Two engines drift: the same gesture gives a different result on web and native               | Ranges, snaps, keyboard moves, changes and recurrence live in the shared model, tested once with fixtures; only the overlap layout belongs to each engine, and the docs say so |
| `@super-calendar/native` is five months old with one author                                  | Phase 0 gate (§6.2); exact pin; everything above the engine is ours, so the fallback replaces one file and the API holds                                                       |
| `temporal-polyfill` and ESM-only packages trip a framework the CLI supports (Laravel, Astro) | `packages/tests` installs the item into every CLI template before release                                                                                                      |
| FullCalendar's touch defaults (1000ms hold, tap to select before drag) feel broken on phones | 250ms holds; the touch flow is checked on iOS Safari and Android Chrome at phone width                                                                                         |
| FullCalendar's accessibility falls short of APG's grid                                       | The adapter owns focus, labels and announcements; Phase 0 lists the gaps                                                                                                       |
| A FullCalendar major changes its API                                                         | One adapter file, exact pins, and the upgrade is its own change with the bench rerun                                                                                           |
| Consumers expect Premium features (resources, timeline) to just work                         | The docs say plainly they need a FullCalendar licence and show the escape hatch                                                                                                |
| The docs site's `:has()` rules slow the grid, as they did the Data Table                     | Bench in a production build with and without the site CSS; nothing in our map uses ancestor `:has()`                                                                           |
| Native scope (3 to 4 weeks) delays the web release                                           | Web can ship first with a dated `component` exception, as the Data Table did; the API is final either way                                                                      |
| App Router: FullCalendar's own shadcn files have no `"use client"`                           | Ours carry it on every file with hooks; SSR is documented for v7 but only shown with the Pages Router, so Phase 0 checks the App Router                                        |

---

## 18. Decisions for you

**1. Name.**
Pick: `event-calendar`, because `calendar` is upstream's date grid and replacing it breaks contract 1 for every project that has it.
Alternative: `scheduler`, which promises the resource views we don't ship.

**2. Native engine.**
Pick: `@super-calendar/native` behind our adapter, gated by §6.2, because it is the only maintained native library with month views and drag to move, resize and create.
Alternative: our own renderer from the start, with full control and no young dependency, for 3 to 4 more weeks.
Alternative: FullCalendar in an Expo DOM component, one engine everywhere but a web view with an async bridge on a native screen.

**3. Release shape.**
Pick: web and native in the same release when the native gate passes, because "cross-platform" is the point of the component.
Alternative: web first with a dated `component` exception, as the Data Table shipped, and native in the next release.

**4. Recurrence library.**
Pick: the `rrule` package if Phase 0 finds it maintained and correct across DST, because it is what FullCalendar's own rrule plugin builds on and you prefer a maintained library over our own.
Alternative: our own RRULE subset (DAILY, WEEKLY, MONTHLY, YEARLY with BYDAY, COUNT, UNTIL, EXDATE), small and ours, but RRULE's edge cases are where calendars break.

**5. Date and zone library.**
Pick: `date-fns` 4 with `@date-fns/tz`, because Calendar, Date Picker and the native tree already use date-fns and it runs on Hermes without a polyfill.
Alternative: Temporal through `temporal-polyfill`, which web installs anyway for FullCalendar, at the cost of a polyfill on native.

**6. Where it's built.**
Pick: a `feat/event-calendar` branch off `main` after `release/v0.9.0` merges, because that branch has uncommitted work of its own.
Alternative: on `release/v0.9.0`, which ties the calendar to that release.

---

## 19. Not verified

- Whether FullCalendar 7 takes the date and view as controlled props (§5.3 has the fallback).
- FullCalendar 7 under the Next.js App Router: SSR is documented, but the official example uses the Pages Router and the docs don't say where `"use client"` goes.
- The size of each view entry point and of `temporal-polyfill`; only the main entry's ~31.7 kB gzip (Bundlephobia) was found.
- That FullCalendar 7 has no keyboard path to drag, resize or select: none was found in its docs, which isn't proof.
- The exact import path of `skeleton.css`, and whether importing it from the adapter file works in every CLI template (Next.js, Vite, React Router, TanStack Start, Astro, Laravel).
- The licence of the files in FullCalendar's shadcn registry.
- For `@super-calendar/native`: its custom rendering API, Uniwind styling, accessibility, and compatibility with Expo 58, React Native 0.88 and Reanimated 4.7. Several of its features are claimed only in its author's comparison table.
- The `rrule` package's current maintenance and DST behaviour.
- §10's budgets are targets, not measurements.

---

## 20. Proposed edits to settled documents

- `docs/COMPONENTS.md`, Dependencies: "Drag and drop goes through `lib/sortable.tsx`" becomes "Sorting lists goes through `lib/sortable.tsx`; the Event Calendar's time-grid drag is FullCalendar's interaction plugin, inside its adapter." Both keep the keyboard and menu alternatives.
- `docs/COMPONENTS.md`, Dependencies: add FullCalendar to the reused libraries list once shipped.
- `docs/COMPONENT-GROUPS.md`: add `event-calendar` to the Advanced examples.
- Root `DESIGN.md`: a Calendar entry under Data display, and a Schedule pattern under Patterns.
- `apps/web/registry/fabricator/DESIGN.md`: the Event Calendar's look under Data and feedback.
- `NOTICE.md`: FullCalendar's MIT notice for any class lists or code derived from its shadcn registry (its licence there wasn't checked; §19).
- `registry/native/README.md`: the native engine and how its events take our chips, once Phase 0 settles it.

---

## 21. What the build found (2026-11-14)

### Built

- **Shared model** (`shared/lib/event-calendar-model.ts`, `-recurrence.ts`, `-loader.ts`): 60 Vitest tests, written first. Views, ranges, navigation, titles, zones (`@date-fns/tz`), keyboard nudges, drafts, changes and their inverses, colours through the role recipe (tested equal to `roleLiterals`), shortcuts, day grouping, RRULE parsing, expansion, scoped edits and deletes, month chunks.
- **Controller** (`shared/hooks/use-event-calendar.ts`): view, date, settings, calendars, a local list, a controlled list or a loader, `useOptimistic` for changes in flight, undo and redo, the scope prompt, panels.
- **Engine** (`shared/ui/event-calendar-engine.tsx`): FullCalendar 7.1.5 with every element on a style-map class, our chip through `eventContent`, drops and resizes left where FullCalendar put them and landed through the controller (see Moving without a jump, below).
- **Parts** on Base UI, Radix and React Aria (`<base>/ui/event-calendar.tsx`; Radix was written from Base UI by a script in the gitignored `tmp/event-calendar/`, and is ordinary source from here on), the chip and the agenda (shared), the style map, the registry item, the group, the docs pages, three examples per base, the changelog entry, the skill, both DESIGN.md files, COMPONENTS.md and COMPONENT-GROUPS.md.
- **Browser test** (`registry/fabricator/__tests__/event-calendar.browser.mjs`): axe on the calendar in light and dark at 1280 and 390 wide with no serious or critical violations, opening an event, creating one by dragging, a keyboard move that keeps focus, the view shortcuts, and the loader demo. Passes on all three trees. Development-build timings: switching views 43 to 730ms (year is the slowest), the next month in the loader demo 700 to 1,360ms including the stand-in server's 300ms. A production build wasn't measured.
- **Install:** `shadcn add @fabricator/event-calendar --dry-run` succeeds for each base against the local registry; Base UI installs Toast, Radix and Aria install Sonner.

### Changed against the plan

- **One change handler.** `onEventChange(change)` replaces `onEventCreate`, `onEventChange` and `onEventDelete` (§7.3). The change carries what the person did and the stored events to write, and `change.apply` makes `setEvents(change.apply)` the local-list case, so there is one path for local lists, controlled lists and loaders.
- **`locale` is a BCP 47 string**, not a date-fns `Locale`: titles and times are formatted with `Intl`, which Hermes has too, and FullCalendar takes the same tag.
- **No `calendar.engine`.** The web escape hatch is the `fullCalendar` prop alone.
- **Recurrence is our own RFC 5545 subset** (decision 4's alternative): `rrule` hasn't been released since 2023 and `rrule-temporal` bundles a 180 KB Temporal polyfill.
- **FullCalendar 7 facts:** dates and views aren't controlled props, so the adapter drives `changeView` and `gotoDate`; `businessHours` is read per calendar, so the adapter turns it off outside time grids; render hooks hand over UTC wall-time markers, so the adapter reads FullCalendar's strings (`startStr`, `weekdayText`); the build compiles placeholders outside JSX only in a `className: cn(…)` property, so the engine's class constants use that form.
- **Toasts per base:** the build gained `meta.baseRegistryDependencies`, so the item installs Toast on Base UI and Sonner on Radix and Aria.
- **No homepage card**, like the Data Table (WEBSITE.md).

### React Aria differences

- Popovers and dialogs focus the panel when they open, where Base UI focuses its first control; the quick panel and the details are modal, so a click outside only closes them.
- Right-clicking outside an open event menu closes it (React Aria's own behaviour) instead of moving it to the new event.
- The form, scope and shortcut dialogs carry their `data-slot` on the modal overlay, and the mini month renders upstream's `data-slot="calendar"`: the Aria `Dialog` and `Calendar` don't pass a slot to their content. Fixing the second needs a Fabricator override of the Aria Calendar.

### Found, not fixed here

- **Time Input** puts `aria-expanded` on a plain text input on every base (axe `aria-allowed-attr`, critical, in the event form). It's Time Input's bug; the fix is a `combobox` role or dropping the attribute, in that component and its native port.

### React Native

- **Engine:** `@super-calendar/native` 2.17.0 passed §6.2's gate: it installs on Expo 58, React Native 0.88 and Reanimated 4.7 with no native rebuild, draws our chip through `renderEvent`, takes Uniwind classes on every slot, and drags, resizes and creates on the iPhone and iPad simulators with about 350 events. Deps added to the item, exact: `@super-calendar/native@2.17.0`, `@legendapp/list@3.7.2`, `@date-fns/tz@1.5.0`.
- **Shared code:** the model, recurrence and loader install from `registry/fabricator/shared/lib/`, and the controller hook from `shared/hooks/` (`scripts/native-registry.ts` maps and rewrites it). Hermes has neither `Intl.DateTimeFormat#formatRange` nor `Intl.Locale`, so the model joins ranges itself and the hook guards the locale lookup; both tested.
- **Parity:** `native:parity --strict` is clean (91 of 93, the 2 deferred are the Data Table's). The checker now finds a part shipped inside another item (`findNativeOwner`), so the engine, chip and agenda are checked against the native files of the `event-calendar` item. 46 dated exceptions cover FullCalendar markup with no native counterpart, the web-only `fullCalendar` prop, the shortcuts dialog and the right-click menu (a long press picks the event up instead).
- **Accessibility:** each chip is a button named with its title, day, time and calendar, with VoiceOver actions to move it earlier or later, by a day, lengthen, shorten and delete. Read from the accessibility tree; VoiceOver itself wasn't run.
- **Checked:** iPhone 18 Pro Max and iPad 13 M5 simulators (iOS 27), light and dark, with the shipped code after the Hermes fix: the three-day grid, details in a sheet (phone) and a popover (tablet), month, year, agenda, drag, resize, create, Undo, the recurring scope dialog. Not checked: Android, a real device's frame rate, VoiceOver itself.
- **Engine limits:** hold times are fixed at 500ms to pick up and 300ms to create (the plan wanted 250ms); there's no callback per slot, so no snap haptic; holding a finger at a grid edge keeps paging; it reads a date-fns `Locale`, so its own headers stay English; an all-day event over several days draws one piece per day in the time grid. In development it repeats a Reanimated warning.

### Large calendars (2026-11-15)

- **Index:** `createEventIndex` and `queryEventIndex` (recurrence module) sort one-off events of a week or less by start and find a range by binary search; longer events and series are checked one by one. `expandEvents` runs through it, so there is one path. Dates parse once per event object (a `WeakMap`), and a day without a clock change resolves its midnight once, so wall times skip `TZDate`: 100,000 events index in 116ms cold and 10ms after an edit (Bun), a week query takes 1ms.
- **Controller:** indexes the list, queries the range, filters hidden calendars after the query (so a hidden calendar's exception still replaces its occurrence), and hands the grid a `useDeferredValue` of the result. Loaded months are capped at 24, the farthest from the view dropped first (`getKeysToEvict`).
- **Views:** the year view passes FullCalendar no events and marks days with `getMarkedDays`; the agenda is virtualized by day with `@tanstack/react-virtual` (web, added to the item) and LegendList (native). A time slot's overflow is a gray `+N` chip (`columnMoreLinkClass`).
- **Dense grids:** about 200 frosted chips (each `backdrop-filter` a compositing layer) left the docs page half-painted in headless Chrome and blank in Relay's browser. Over 60 events in a time grid, the engine sets `data-dense` and chips mix their wash into the surface (`color-mix` in sRGB, the same colour as the wash over the surface) with no blur. The time grid's `+N` chip is opaque without blur.
- **Formatting:** `Intl.DateTimeFormat` instances and time-range strings are cached; building a formatter per chip was a third of a week's render.
- **Bug fixed:** `groupEventsByDay` put events from outside the range on the first day; the agenda showed 925 rows for three days and blocked for 14.5s in development. Now tested.
- **Defaults:** `businessHours` is off; `true` gives Monday to Friday, 9 to 5. The native engine's own weekend tint is off too (`highlightWeekends={false}`), so weekends shade only through business hours, as on the web. Slots are two `--density-36` per hour. `4` switches to the N-day view.
- **Native check:** iPad Pro 13 M5 simulator: weekends unshaded by default, the agenda on LegendList scrolling inside the page.
- **Docs:** the first example is a playground (variant, size, business hours, weekends, 24-hour clock, week numbers, editable) with the generated code beside it; the loader example became Large calendars: about 100,000 events over ten years with a request log.
- **Measured (development build, 1440×1000, 28 events a day):** next week about 330ms of long tasks (the first click also pays about 140ms for the site's AudioContext), next month about 530ms, agenda 92ms (14.5s before the grouping fix and virtualization), year about 1.1s. The year view's cost is style recalculation over the docs site's CSS (every upstream style's rules and the desktop shell's `:has()` selectors), not the calendar's code; a project with only the Fabricator CSS pays far less. A production build wasn't measured.

### Header and views (2026-11-15)

- **Year view removed.** It cost the most to draw and earned the least; the model, controller, both engines, the style maps, the `y` shortcut, `getMarkedDays` and FullCalendar's multimonth plugin are gone. Views: day, N days, week, month, agenda.
- **Date picker:** the title leads the header (title, Today, arrows) and opens the mini month in a popover. The mini month marks the days in view with a band (`getVisibleDays`: the range's days, a month's own days; `getDayBand`: the band's ends at the first and last day and each week's edges, so the same rounding works where a calendar can't style a cell by CSS position, as React Aria's and the native one can't). Picking a day moves the calendar and closes the popover. Native has the same title, picker and band.
- **Day headers** are one line, weekday then date in a padded pill; narrow columns (FullCalendar's `isNarrow`, a compact week on native) stack them.
- **Week number** in the time grid's corner ends 8 from the hairline like "All day" and the hours (`weekNumberHeaderInnerClass`; FullCalendar zeroes the cell's padding).

### Continuity (2026-11-15)

- **What:** `continuous` (on by default): Day, N days and Week scroll sideways a day at a time and can start on any day. The model has `getColumnCount`, `getContinuousRange` (a range that starts on any day, weekdays only when weekends are hidden), `getContinuousWindow` (the columns drawn: those in view and a buffer either side) and `getContinuityBuffer` (a page, a week at least). The controller keeps a free start (`setStartDate`); Today, `goTo`, the date picker and a new view line the week up again; the arrows step by the columns in view.
- **Web:** FullCalendar's own sideways scrolling (`dayMinWidth`) throws without the paid scrollgrid plugin, so the engine renders one time grid over every column (`continuous` view), widens the three rows of columns (header, all-day, lanes; found by FullCalendar's `DidMount` hooks, sized with inline `!important` because FullCalendar's structure uses `!important` flex rules) and moves them with CSS variables. The gutter cells before them are lifted and opaque. Trackpad and Shift-wheel scrolls and touch drags write `--event-calendar-offset` each frame; on release it glides to the nearest day and the start moves; the offset resets when FullCalendar mounts the new columns, in its commit, so nothing jumps. A long scroll moves the start near the buffer's edge and keeps going. FullCalendar's hit testing measures the moved elements, so drag, select and create still land; the moved rows have `z-index: 1`, as a transform makes them stacking contexts that would otherwise sit under the hour lines.
- **Headers:** FullCalendar reports every drawn column as narrow, so day headers use container queries on their own width and format the weekday themselves.
- **Native:** `freeSwipe`: a fling crosses days in Day and pages in Week and N days; the engine has no per-day stop for multi-day pages.
- **Checked:** wheel (2 columns forward, 3 back, a long scroll across the buffer, Today), emulated touch swipe on a phone, mid-scroll frames in light and dark, the browser suite (drag-create, keyboard move, details) on all three trees. Not checked: a real touch device, a real trackpad's momentum.

### Drag to create (2026-11-15)

- **Found:** on the docs page a drag to create took ~400ms per snap and ~1.3s from release to the form (development build). FullCalendar removes and re-adds its selection highlight on every move, and the docs page carries every style's CSS (537 `:has()` rules), so each insert restyled all ~12,700 elements; a focus and the popover's first measure cost one more each. Style recalculation is the browser's, so a production build pays the same. PostHog's dead-click capture also reads styles after clicks.
- **Calendar:** in time grids the engine handles a mouse or pen drag on empty time itself (`useDragCreate`): one always-mounted preview, the draft chip with a live time range, moved by transform and changed by text; auto-scroll near the edges; Escape cancels; a click makes the default length. FullCalendar never starts a selection there (the press stops in the capture phase). The all-day row, month cells and touch keep FullCalendar's selection.
- **Docs:** the three previews are `type="frame" fit`: the demo restyles its own ~1,400 elements.
- **Measured (development build, docs page):** per snap ~400ms to the 50ms floor of the measurement; release to painted form 1.27s to 0.32s.
- **Not changed:** the site's `:has()` rules and PostHog's dead-click capture, which slow every docs page that changes its DOM.

### Moving without a jump (2026-11-15)

- **Found:** a drop called `info.revert()` and then handed the change to the controller, so the event went back to its old day for the few frames before the optimistic list (behind `useDeferredValue`) drew it in the new one: forward, back, forward.
- **Now:** the engine keeps FullCalendar's drop and lets the optimistic change land on it. It reverts only when there is nothing to land (no source event) or when a recurring event's scope question is cancelled (`updateEvent`'s `onCancel`; the dialog's Cancel and Escape call it). A failed save rolls back the optimistic list, which resets FullCalendar's events and moves the event back. Alt-drag keeps the dropped event too until the copy renders there and the original returns, so the drop spot never empties.
- **Measured** (every frame for 900ms after the drop, all three trees): a move sits in the new day from the first frame; a copy shows at the drop from the first frame, with the original back within 3 to 8 frames; a recurring drop waits at the drop under the question, and Cancel puts it back.
- **Native:** the engine already holds a drop the handler accepts; a recurring drop still returns `false`, so it waits where it was until the question is answered, because the engine has no way to undo an accepted drop after Cancel.
- **Title field:** the title is an `outline` button like Today and the view select (36 tall, t14 semibold, px12, chevron 8 from the text), so it reads as a field that opens the date picker instead of floating text. Native matches.

### Left to do

- Real-device frame rates, Android, VoiceOver and TalkBack passes.
- A production-build bench (§10's budgets were only measured on a development build).
- Time Input's `aria-expanded` bug (above).
- The engine's resize grips are hidden (`showDragHandle={false}`) because they covered short events' titles; edges still resize. An iPad screenshot from before that change still shows them, so the week view on a tablet is worth one more look.
