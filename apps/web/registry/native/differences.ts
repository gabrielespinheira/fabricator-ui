// How each native component differs from its web one, published on its docs
// page and in the compatibility table. "same" means the same use; the rest name
// what took a web input's or a DOM library's place.

export type NativeTier = "same" | "touch" | "engine" | "noop"

export const NATIVE_TIER_LABELS: Record<NativeTier, string> = {
  same: "Same",
  touch: "Touch input",
  engine: "New engine",
  noop: "Kept for imports",
}

const SAME: { tier: NativeTier; note?: string } = { tier: "same" }

export const NATIVE_DIFFERENCES: Record<
  string,
  { tier: NativeTier; note?: string }
> = {
  accordion: SAME,
  alert: SAME,
  "alert-dialog": SAME,
  "app-nav": {
    tier: "touch",
    note: "Rows reorder on a long press, so a reorderable row's menu sits on its trailing button, and on the icon rail it has none. Keyboard reordering has no equivalent.",
  },
  "app-shell": {
    tier: "touch",
    note: "On phones the sidebar reveals behind the page, panels open as sheets and the nav's mobile items become a tab bar. `window`, `shortcut` and `shortcutScope` are accepted and do nothing, since React Native has no window controls or global key events. Panels don't drag to resize, and the layout is only saved if you pass `storage`.",
  },
  "aspect-ratio": SAME,
  attachment: SAME,
  avatar: SAME,
  badge: SAME,
  breadcrumb: {
    tier: "same",
    note: "Links are pressables: use `onPress` or `render`.",
  },
  bubble: SAME,
  button: {
    tier: "same",
    note: "`onPress` replaces `onClick`. Small sizes keep a 44pt target through `hitSlop`.",
  },
  "button-group": {
    tier: "same",
    note: "Grouped buttons keep their press scale.",
  },
  calendar: {
    tier: "engine",
    note: "`react-day-picker` is DOM-only, so the grid is its own on `date-fns`, with the same props where they aren't DOM.",
  },
  card: SAME,
  carousel: {
    tier: "engine",
    note: "`embla` is DOM-only. Paging is native, with the same parts and `CarouselApi`. `loop` rewinds to the first slide instead of wrapping.",
  },
  checkbox: SAME,
  collapsible: SAME,
  combobox: {
    tier: "engine",
    note: "A filtered list in a dialog, in place of Base UI's combobox, with the same parts. Typing happens in the dialog rather than the trigger.",
  },
  command: {
    tier: "engine",
    note: "`cmdk` is DOM-only. A filtered list, with the same parts. Results keep their written order instead of ranking by score, and no keyboard shortcut opens it.",
  },
  "context-menu": {
    tier: "touch",
    note: "A long press opens it, in place of a right click.",
  },
  dialog: SAME,
  direction: {
    tier: "noop",
    note: "Fabricator UI is left-to-right only, so `DirectionProvider` passes its children through.",
  },
  density: {
    tier: "same",
    note: "`DensityProvider` sets scoped variables, with no wrapper view. Phones default to spacious.",
  },
  drawer: {
    tier: "engine",
    note: "`vaul` is DOM-only. Gestures run on the UI thread, with swipe to dismiss and keyboard avoidance. `snapPoints` is accepted and does nothing.",
  },
  "dropdown-menu": {
    tier: "same",
    note: "`side` takes `top` and `bottom`; `left` and `right` fall back to `bottom`.",
  },
  empty: SAME,
  field: SAME,
  "hover-card": {
    tier: "touch",
    note: "A long press opens it; a tap still goes through to the trigger.",
  },
  input: {
    tier: "same",
    note: "`onChangeText` is the usual way to read a value, as with any `TextInput`.",
  },
  "input-group": SAME,
  "input-otp": {
    tier: "engine",
    note: "`input-otp` is DOM-only. A hidden `TextInput` takes the code, with one-time-code autofill.",
  },
  item: SAME,
  kbd: {
    tier: "same",
    note: "Visual only. Useful on tablets with a hardware keyboard. It doesn't invert inside a tooltip.",
  },
  label: SAME,
  marker: SAME,
  menubar: {
    tier: "touch",
    note: "A desktop pattern: triggers in a row that scrolls, each opening its menu. Rows paint their own pressed fill, with no gliding highlight.",
  },
  message: SAME,
  "message-scroller": {
    tier: "engine",
    note: "An inverted list that sticks to the bottom.",
  },
  "navigation-menu": {
    tier: "touch",
    note: "A desktop pattern: each trigger opens its content in a popover, or a sheet on phones. Rows paint their own pressed fill, with no gliding highlight.",
  },
  pagination: SAME,
  popover: {
    tier: "same",
    note: "`side` takes `top` and `bottom`; `left` and `right` fall back to `bottom`.",
  },
  progress: SAME,
  questionnaire: SAME,
  "radio-group": SAME,
  resizable: {
    tier: "engine",
    note: "`react-resizable-panels` is DOM-only. A drag handle, with increment and decrement actions for screen readers. Panels don't collapse.",
  },
  "scroll-area": {
    tier: "same",
    note: "Touch keeps native scrolling, so `ScrollBar` renders nothing, as it does on touch devices on the web.",
  },
  search: {
    tier: "engine",
    note: "A filtered list in an overlay, with no keyboard shortcut to open it.",
  },
  select: {
    tier: "touch",
    note: "Opens as a sheet on phones and a popover on tablets.",
  },
  separator: SAME,
  sheet: {
    tier: "engine",
    note: "Gestures run on the UI thread, with swipe to dismiss and keyboard avoidance.",
  },
  sidebar: {
    tier: "touch",
    note: "On phones it reveals behind the page, following the finger, or slides over it from an edge swipe. `SidebarRail` toggles on a tap instead of resizing, row actions always show, and rows paint their own pressed fill. `persist`, `shortcut`, `peek` and `onWidthChange` are accepted and do nothing.",
  },
  skeleton: SAME,
  slider: SAME,
  sonner: {
    tier: "engine",
    note: "Sonner is DOM-only. It shares one engine with `toast`, keeping its API. `position` is accepted and unused: toasts stay at the top. A dialog opened later covers them.",
  },
  spinner: SAME,
  switch: {
    tier: "same",
    note: "Drawn by Fabricator UI, rather than the system's switch, so it matches the website.",
  },
  "tab-strip": {
    tier: "touch",
    note: "The strip scrolls sideways, and tabs reorder from their menu instead of by dragging.",
  },
  table: {
    tier: "same",
    note: "Views in a horizontal scroll: React Native has no table layout, so `rowSpan` isn't supported.",
  },
  tabs: SAME,
  textarea: SAME,
  toast: {
    tier: "engine",
    note: "Swipe to dismiss. It shares one engine with `sonner`, and a dialog opened later covers it.",
  },
  toggle: SAME,
  "toggle-group": SAME,
  tooltip: {
    tier: "touch",
    note: "A long press shows it, and screen readers read it as the trigger's hint.",
  },
  "user-menu": {
    tier: "same",
    note: "Opens as a sheet on phones.",
  },
  "workspace-switcher": {
    tier: "same",
    note: "Opens as a sheet on phones.",
  },
}
