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
  "theme-toggle": {
    tier: "engine",
    note: "Button variants, sizes, labels and the animated sun/moon swap with a transient blur use native views. Theme ownership stays in the app. Full-screen snapshot reveals are not implemented yet: variant and start are accepted for API parity, while the app's theme changes immediately. Reduced motion disables icon motion.",
  },

  "color-picker": {
    tier: "touch",
    note: "The color area follows touch and the sliders expose hue and opacity. HEX, RGB, HSL, OKLCH, swatches and popover triggers share the web model. There is no screen eyedropper or hover cursor.",
  },
  "file-tree": {
    tier: "touch",
    note: "Tap selects, a second tap opens, and a folder's chevron expands. Multiple selection toggles each row. A long press calls onNodeContextMenu; accessibility actions open or request deletion. Keyboard navigation and pointer modifier keys have no native equivalent.",
  },
  "file-upload": {
    tier: "touch",
    note: "Files are URI assets with name, type and size. The host supplies onPick or FileUploadPickerProvider; validation, rejection reasons, controlled values, chips, previews and removal share the web rules. Browser drag/drop, hidden inputs and HTML forms have no native equivalent. The component does not send files to a server.",
  },
  "image-compare": {
    tier: "touch",
    note: 'A horizontal drag moves the line and a vertical one scrolls the page; a tap glides it there and a flick sends it to the edge, with a notch every step. One SVG draws both pictures with the same cover crop and clips the "before" one along the curve. Screen readers adjust it by `step` with swipes up and down. There\'s no hover or keyboard, and the labels have no backdrop blur.',
  },
  "preview-rail": {
    tier: "touch",
    note: "A finger scrubs the rail: a press lights the tick under it and shows its card, a drag moves the light with a tick on each step, and lifting on the rail chooses the lit item. An `href` with a scheme opens through `Linking`; in-page anchors and paths have nowhere to go in an app, so navigate from `onValueChange`. Screen readers activate a tick with a double tap and hear its description as a hint. There's no hover or keyboard.",
  },
  "number-field": {
    tier: "touch",
    note: "A decimal keyboard and touch steppers use the same clamping, locale parsing, formatting, fractional steps and bounds. Browser keyboard shortcuts and pointer scrubbing have no native equivalent.",
  },
  "time-input": {
    tier: "touch",
    note: "Typing commits on blur or return; the clock opens snapping native wheels. The shared model preserves 12/24-hour time, seconds, minute steps, bounds and range duration. name is accepted without HTML form submission.",
  },
  "time-wheel": {
    tier: "touch",
    note: "Native scroll views snap each column to its rows; accessibility adjustment actions step it. Values and bounds use the same shared time model. DOM keyboard shortcuts and hover effects have no native equivalent.",
  },

  accordion: SAME,
  alert: SAME,
  "alert-dialog": SAME,
  "app-nav": {
    tier: "touch",
    note: "Rows reorder on a long press, so a reorderable row's menu sits on its trailing button, and on the icon rail it has none. Keyboard reordering has no equivalent.",
  },
  "app-shell": {
    tier: "touch",
    note: "On tablets the sidebar's toggle stays in the header while the sidebar can collapse, the toggles have no tooltip, and the status bar is its row plus half the home indicator's space, with its ends the same distance inside the cards' edges. On phones the sidebar reveals behind the page, panels open as sheets with centred tabs and a grab handle in place of a close button, a panel's toggle draws a bottom panel, and the nav's mobile items become a bottom nav, flat or floating, on a surface of your own through `capsule` (a `GlassView` for Liquid Glass). The page scrolls under the header, which sits on a fade behind the status bar, instead of showing a hairline. The breadcrumb shows the way up, and the page's name only once its heading has scrolled away. `window`, `shortcut` and `shortcutScope` are accepted and do nothing, since React Native has no window controls or global key events. Panels don't drag to resize, and the layout is only saved if you pass `storage`.",
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
  "multi-select": {
    tier: "engine",
    note: "A filtered list in a dialog, like Combobox, that stays open between picks, with the same parts. Typing happens in the dialog. Chips rise in and glide on Reanimated; a removed chip fades and shrinks instead of the website's clip-path wipe.",
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
    note: "`DensityProvider` sets scoped variables, with no wrapper view. `FabricatorRoot` sizes each density for the device from the window's width, since the website's are sized for a pointer: Default is a phone's 44pt controls with 15pt text and a tablet's 40pt, Compact a step down (40pt on a phone, 34pt on a tablet) and Spacious a step up (52pt on a phone, 44pt on a tablet). At a phone's Default a control's `size=\"sm\"` is a step down, 36pt, and `size=\"lg\"` a step up, 52pt.",
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
    note: "The surface is our own native text view (`@fabricator-ui/editor-native`, one `UITextView` holding the whole document), driven by the same store and rules as the website. iOS only for now: on Android the content shows the document read-only until the Android view lands, and the app needs a development build, not Expo Go. There's no selection bar on touch, so `EditorBubbleMenu` renders nothing and the keyboard bar carries the marks. There is no slash menu: formatting comes from the toolbar, the keyboard bar, Markdown shortcuts and a hardware keyboard's shortcuts. The link editor is a dialog. Tables draw as the Markdown preview's grid in the text view and edit in a sheet on phones and tablets (a tap on the table opens it): a grid of cell fields, rows and columns added and removed at the focused cell, the focused column's alignment, Cancel and Done, where the website edits them in place. Code blocks wrap their lines instead of scrolling sideways (one text view can't scroll a paragraph on its own); their language and Copy are drawn in the block's strip, and a tap on the language opens a sheet to pick another. While the editor has focus, `EditorKeyboardBar` takes the bottom of the screen from the App Shell's bottom nav (through the `bottom-bar` slot): a floating capsule in the bottom nav's place, docked full width on top of the on-screen keyboard while that's up, with Done giving the bottom nav back. It needs `KeyboardProvider` from `react-native-keyboard-controller` at the app's root.",
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
    note: "On a phone the strip shows the active tab on a pill with a count of the tabs; a press opens a sheet of every tab as a card, with the new tab button, so `TabStripNew` and `TabStripOverflow` draw nothing there. From a tablet up the strip scrolls sideways. Tabs reorder from their menu instead of by dragging.",
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
  "audio-player": {
    tier: "engine",
    note: "expo-audio plays the file in place of the browser's `<audio>`. The seek bar is dragged or tapped, and shows the time under the finger while dragged; it has no hover preview and doesn't show what has loaded. There's no volume slider: the device's buttons set the volume, and mute stays. The play glyphs fade and scale without the blur. There are no keyboard shortcuts.",
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
