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
    note: "On tablets the sidebar's toggle stays in the header while the sidebar can collapse, the toggles have no tooltip, and the status bar is its row plus half the home indicator's space, with its ends the same distance inside the cards' edges. On phones the sidebar reveals behind the page, panels open as sheets with centred tabs and a grab handle in place of a close button, a panel's toggle draws a bottom panel, and the nav's mobile items become a tab bar, flat or floating, on a surface of your own through `capsule` (a `GlassView` for Liquid Glass). The page scrolls under the header, which sits on a fade behind the status bar, instead of showing a hairline. The breadcrumb shows the way up, and the page's name only once its heading has scrolled away. `window`, `shortcut` and `shortcutScope` are accepted and do nothing, since React Native has no window controls or global key events. Panels don't drag to resize, and the layout is only saved if you pass `storage`.",
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
  "button-group": SAME,
  calendar: {
    tier: "engine",
    note: "`react-day-picker` is DOM-only, so the grid is its own on `date-fns`, with the same props where they aren't DOM.",
  },
  card: SAME,
  carousel: {
    tier: "engine",
    note: "`embla` is DOM-only. Paging is native, with the same parts and `CarouselApi`. `loop` rewinds to the first slide instead of wrapping.",
  },
  "chat-input": {
    tier: "touch",
    note: "The on-screen keyboard's return key sends, and adds a line with `submitOn=\"mod-enter\"`, where only the send slot sends; Shift+Enter and Cmd+Enter have no equivalent. While a `/` menu is open, the return key picks its first row, a tap picks any, and a close button stands in for Escape. A streaming reply shows the stop square, where the website spins and shows it on hover. Escape and ↑ work only where a hardware keyboard reports them, so `recall` and `attach` are on `useChatInput()` for buttons of your own. There's no drag and drop or pasted files: `onAttach` and `useChatInputAttachments` take picked files (`ChatInputFile`: Expo's picker assets fit), and images preview from their URI. Attachments' remove buttons always show. Mentions are tinted inside the text field, skills in the syntax keyword's violet. There's no `voiceStream`: pass the level as `voiceLevel`. The voice glow is our own, three lobes in the colour roles along the card's bottom edge for each of voice-glow's palette names, rising with the level. `sticky` rides the keyboard for a composer pinned to the bottom of a screen, and needs `KeyboardProvider` from `react-native-keyboard-controller` at the app's root.",
  },
  checkbox: SAME,
  collapsible: SAME,
  combobox: {
    tier: "engine",
    note: "A filtered list in a dialog, in place of Base UI's combobox, with the same parts. Typing happens in the dialog rather than the trigger.",
  },
  command: {
    tier: "engine",
    note: "`cmdk` is DOM-only. A filtered list, with the same parts. Results keep their written order instead of ranking by score, and no keyboard shortcut opens it. Shortcuts show from the `sm` breakpoint, since a phone has no keyboard.",
  },
  "context-menu": {
    tier: "touch",
    note: "A long press opens it, in place of a right click. Shortcuts show from the `sm` breakpoint, since a phone has no keyboard.",
  },
  dialog: SAME,
  direction: {
    tier: "noop",
    note: "Fabricator UI is left-to-right only, so `DirectionProvider` passes its children through.",
  },
  density: {
    tier: "same",
    note: '`DensityProvider` sets scoped variables, with no wrapper view. Phones default to spacious, and there a control\'s `size="sm"` is a step down, 36pt, and `size="lg"` a step up, 52pt, rather than compact and spacious. Tablets take their own step in place of spacious: 40pt controls with the same 15pt text, `sm` 34pt, `lg` 48pt, and so does Default on a phone, where the website\'s pointer sizes would be too small for a finger. `FabricatorRoot` sets it from the window\'s width; compact stays as picked.',
  },
  drawer: {
    tier: "engine",
    note: "`vaul` is DOM-only. Gestures run on the UI thread, with swipe to dismiss and keyboard avoidance. `snapPoints` is accepted and does nothing. On iOS a bottom drawer has the system sheet's corner, 38pt and continuous. The swipe handle is also a button that closes it.",
  },
  "dropdown-menu": {
    tier: "same",
    note: "`side` takes `top` and `bottom`; `left` and `right` fall back to `bottom`. Shortcuts show from the `sm` breakpoint, since a phone has no keyboard.",
  },
  editor: {
    tier: "engine",
    note: "The surface is our own native text view (`@fabricator-ui/editor-native`, one `UITextView` holding the whole document), driven by the same store and rules as the website. iOS only for now: on Android the content shows the document read-only until the Android view lands, and the app needs a development build, not Expo Go. There's no selection bar on touch, so `EditorBubbleMenu` renders nothing and the keyboard bar carries the marks. There is no slash menu: formatting comes from the toolbar, the keyboard bar, Markdown shortcuts and a hardware keyboard's shortcuts. The link editor is a dialog. Tables draw as the Markdown preview's grid in the text view and edit in a sheet on phones and tablets (a tap on the table opens it): a grid of cell fields, rows and columns added and removed at the focused cell, the focused column's alignment, Cancel and Done, where the website edits them in place. Code blocks wrap their lines instead of scrolling sideways (one text view can't scroll a paragraph on its own); their language and Copy are drawn in the block's strip, and a tap on the language opens a sheet to pick another. While the editor has focus, `EditorKeyboardBar` takes the bottom of the screen from the App Shell's tab bar (through the `bottom-bar` slot): a floating capsule in the tab bar's place, docked full width on top of the on-screen keyboard while that's up, with Done giving the tab bar back. It needs `KeyboardProvider` from `react-native-keyboard-controller` at the app's root.",
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
  markdown: {
    tier: "same",
    note: "`components.a` receives `href`, `title` and `children` and renders inside a Text; the default opens the link with `Linking`. `components.img` receives `src`, `alt` and `title`; the default is React Native's `Image`. Tables scroll sideways with each cell on one line. Inline code takes the hover fill without the website's rounded, padded chip: React Native can't pad a run of text inside a paragraph.",
  },
  marker: SAME,
  menubar: {
    tier: "touch",
    note: "A desktop pattern: triggers in a row that scrolls, each opening its menu. A press lights a trigger; a drag scrolls the row. Shortcuts show from the `sm` breakpoint, since a phone has no keyboard.",
  },
  message: SAME,
  "message-scroller": {
    tier: "engine",
    note: "An inverted list that sticks to the bottom.",
  },
  "model-picker": {
    tier: "touch",
    note: "The effort slider takes a tap or a drag along its rail, previewing each level it crosses and taking the one under the finger when it lifts; a screen reader steps it with increment and decrement in place of the arrow keys. Model rows are 44pt tall on phones. A provider's label scrolls with its models instead of staying pinned, and `ModelPicker` is a scroll view that stops at 512pt or 60% of the screen. `onPress` replaces `onClick`, and a selected row or tile reports itself selected in place of `aria-current`.",
  },
  "navigation-menu": {
    tier: "touch",
    note: "A desktop pattern: each trigger opens its content in a popover, or a sheet on phones. A press lights a trigger; a drag scrolls the row.",
  },
  pagination: SAME,
  popover: {
    tier: "same",
    note: "`side` takes `top` and `bottom`; `left` and `right` fall back to `bottom`.",
  },
  progress: SAME,
  questionnaire: {
    tier: "same",
    note: "Each choice's chip shows its letter or number on every screen size, as a label rather than a key to press. With `advanceOnSelect`, a tap on a single choice moves on. The website's arrow over the chip, a pointer cue, isn't drawn.",
  },
  "radio-group": SAME,
  resizable: {
    tier: "engine",
    note: "`react-resizable-panels` is DOM-only. A drag handle, with increment and decrement actions for screen readers. Panels don't collapse.",
  },
  "scroll-area": {
    tier: "same",
    note: "Touch keeps native scrolling, so `ScrollBar` renders nothing, as it does on touch devices on the web.",
  },
  search: SAME,
  select: {
    tier: "touch",
    note: "Opens as a sheet on phones and a popover on tablets.",
  },
  separator: SAME,
  sheet: {
    tier: "engine",
    note: "Gestures run on the UI thread, with swipe to dismiss and keyboard avoidance. It travels its full size, so the finger stays on it, where the website's moves 2.5rem and fades.",
  },
  sidebar: {
    tier: "touch",
    note: "On phones it reveals behind the page, following the finger, or slides over it from an edge swipe. `SidebarRail` toggles on a tap instead of resizing. Row actions always show on phones; on tablets they wait for the current row or a trackpad's hover, and a long press reaches the rest. `persist`, `shortcut`, `peek` and `onWidthChange` are accepted and do nothing.",
  },
  skeleton: SAME,
  slider: SAME,
  sonner: {
    tier: "engine",
    note: "Sonner is DOM-only. It shares one engine with `toast`, keeping its API. `position` is accepted and unused: toasts stay at the top. A dialog opened later covers them.",
  },
  spinner: {
    tier: "same",
    note: "Twenty-two original Fabricator animations: 2×2, 3×3 and 4×4 grids, triangles, circles, squares, hexagons, bouncing dots and a classic ring, inspired by [Dot Matrix by Shawn](https://dotmatrix.zzzzshawn.cloud/). Pick the project default with `--spinner <variant>` in the CLI. `variant` overrides it per instance, `speed` scales the cycle, and `animated={false}` pauses it. Native shares the geometry with web and animates on the UI thread; Reduce Motion and motion off leave a still indicator.",
  },
  "syntax-highlight": {
    tier: "same",
    note: "The same tokenizer and colours. Lines scroll sideways in their own `ScrollView`, and Copy writes through `expo-clipboard` and announces the copy to VoiceOver and TalkBack. Android draws the code in its `monospace` font, as it has no Menlo.",
  },
  switch: {
    tier: "same",
    note: "Drawn by Fabricator UI, rather than the system's switch, so it matches the website.",
  },
  "tab-strip": {
    tier: "touch",
    note: "On a phone the strip shows the active tab and a count of the tabs; either opens a sheet of every tab as a card, with the new tab button. From a tablet up the strip scrolls sideways. Tabs reorder from their menu instead of by dragging.",
  },
  table: {
    tier: "same",
    note: "Views in a horizontal scroll: React Native has no table layout, so `rowSpan` isn't supported.",
  },
  tabs: {
    tier: "same",
    note: "In a subtle list the active tab's label appears without fading in.",
  },
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
  "video-player": {
    tier: "engine",
    note: "expo-video plays the video in place of the browser's `<video>`. A tap shows or hides the controls and a double tap plays or pauses. Captions are read from the same WebVTT files and drawn by the player. Settings open as a bottom sheet in the theme's colours, full screen is the system's player with its own controls, and there's no volume slider: the device's buttons set the volume. There are no keyboard shortcuts.",
  },
  "workspace-switcher": {
    tier: "same",
    note: "Opens as a sheet on phones. The search dialog has no key hints.",
  },
}
