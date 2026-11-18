# Platforms

Fabricator UI shares component names, design tokens, icon geometry and behavior
intent across renderers. React web and React Native keep their API parity
contract. SwiftUI and Compose expose idiomatic native APIs.

| Platform                       | Components                                        | Icons                                                        | Example app         |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| Web                            | Base UI, Radix or React Aria base trees           | `@fabricator-ui/icons`                                       | `apps/web`          |
| Desktop                        | The web components in an Electron or Tauri window | `@fabricator-ui/icons` (+ PNGs from `icons-static`)          | `apps/desktop`      |
| iOS, iPadOS, Android           | The native tree, on Expo and Uniwind              | `@fabricator-ui/icons-react-native`                          | `apps/mobile`       |
| iOS, iPadOS, macOS             | SwiftUI source (qualification in progress)        | Generated Fabricator outline/brand geometry and file artwork | `apps/swiftui`      |
| Android, desktop JVM           | Kotlin Compose source (qualification in progress) | Generated Fabricator outline and brand geometry              | `apps/kotlin`       |
| iOS, iPadOS, Android via Tauri | Existing React web components in a WebView        | `@fabricator-ui/icons`                                       | `apps/tauri-mobile` |
| No framework                   | (none)                                            | `@fabricator-ui/icons-static`                                | (none)              |

What a platform lacks is recorded, never silent: `registry/native/parity-exceptions.json` for native gaps (published on the React Native compatibility page by `native:docs`), the item's `meta` for a base fallback.

The expansion and its qualification checklist are specified in
[`plans/native-platforms.md`](plans/native-platforms.md). New renderer source
coverage does not mean every advanced behavior or OS host is verified. Read
`registry/{swiftui,compose}/parity-exceptions.json` for current implementation gaps
and platform mappings. Repository demos use
`bun run example:<platform>-<framework>[:device|check]`. New launch commands land
with runnable apps; `desktop`, `desktop:tauri` and `mobile:*` remain aliases.

## SwiftUI, Kotlin Compose and Tauri mobile

- `platforms:generate` exports the canonical registry catalog, literal light/dark
  colors, radius, density, motion, sound recipes and outline/brand icon geometry into
  `apps/web/generated/platforms/`. CSS token names keep their meanings; React
  Native convenience aliases cannot override them. Native assets also include
  Inter 4.1 with its OFL notice.
- Generated `registry/{swiftui,compose}/manifest.json` declares each family's owning source
  and namespaced dependencies. `registry:platforms` validates catalog coverage
  and dependency cycles, runs native asset adapters and exports the copy-in
  payloads. The full registry build runs it too. Generated resources are rebuilt.
- Native projects initialize with `fabricator-ui init --platform swiftui` or
  `--platform compose`; subsequent `add`, `view`, `diff`, `info` and `doctor` read
  `fabricator.json`. See [CLI.md](CLI.md#native-language-projects).
- SwiftUI requires Xcode and XcodeGen on macOS. Compose uses a JDK, Gradle and
  the Android SDK for Android builds. Launchers report missing prerequisites
  and never install them. Pass an explicit device or use a Fabricator-named
  simulator; another project's booted simulator is not a default target.
- Tauri mobile bundles a Vite build of the existing React components and real
  examples. Its iOS UI uses WKWebView. It does not use the React Native tree or
  render SwiftUI controls. The bundled demo works without a Next server; remote
  sample media still needs a network connection.

| Demo                          | Launch                                              | Check / build                                                |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| SwiftUI iPhone / iPad         | `bun run example:mobile-swiftui`, `:ipad`           | `example:mobile-swiftui:check`, `:build`                     |
| SwiftUI macOS                 | `bun run example:desktop-swiftui`                   | `example:desktop-swiftui:check`, `:build`                    |
| Kotlin Android phone / tablet | `bun run example:mobile-kotlin`, `:tablet`          | `example:mobile-kotlin:check`, `:build`                      |
| Kotlin desktop                | `bun run example:desktop-kotlin`                    | `example:desktop-kotlin:check`, `:build`                     |
| Tauri iPhone / iPad / Android | `bun run example:mobile-tauri`, `:ipad`, `:android` | `example:mobile-tauri:check`, `:build:ios`, `:build:android` |
| Tauri frontend                | `bun run example:mobile-tauri:web`                  | `bun run --cwd apps/tauri-mobile check:browser`              |

`bun scripts/check-native-consumers.ts --renderer swiftui --build` resolves every
published item, installs each distinct source closure into a fresh standalone
package and compiles it. The Compose equivalent installs source; `--build` needs
the configured native tools. This check is separate from running the galleries.
Run it after registry generation completes, so a run uses one set of payloads.
SwiftUI foundations own the popup host and menu primitives shared by forms,
navigation and overlays; shell items also depend on the breadcrumb module.

SwiftUI Calendar supports single, multiple and range bindings, variable/fixed
week counts, caption dropdowns, week numbers, disabled dates and inclusive
whole-day bounds. Its pure selection rules follow the installed React DayPicker
source. Day glyphs use the shared density size; iOS hit slots prefer 44 points,
shrink under width constraints and retain horizontal overflow at larger text
sizes. Multi-month groups stack when necessary. Arrow/Home/End/Page navigation
uses calendar arithmetic across DST. Date Picker supports optional dates, shared
field/popup surfaces and selection dismissal. Its `.month` and `.year`
granularities use twelve-cell, three-column grids, whole-period bounds and
first-day values. Arrows move one cell or a row of three; Page Up/Down moves
twelve periods. Pages enter on the shared move timing, with enlarged native
targets and measured text widths. Grid sizing measures the same Core Text tabular
digits as the rendered labels. Labels stay on one line; constrained popups retain
horizontal scrolling. Set `isEditable: true` for typed input and `dateFormat`
for a date-fns pattern. Return and blur commit through the canonical React parser;
invalid text stays visible, optional dates clear and required dates retain their
last valid value. Blank optional fields clear without an error. The calendar
button commits, opens the parsed period and restores text focus on dismissal;
Option+Down also opens it. Text parsing supports Gregorian/ISO calendars and the
installed date-fns locales, with English relative phrases at each granularity.
Unsupported calendar/locale configurations fail explicitly. This optional module
adds 1,071,562 engine bytes and 3,446 notice bytes before packaging, using the
existing JavaScriptCore boundary. It adds no web client JavaScript or dependency.
Day Date Pickers accept `hasTime`, `hasSeconds`, `hourCycle`, minute `step` and
`timeLabel`. Choosing a day keeps the draft clock and the panel open; changing
the clock commits immediately once a day exists. Return from the wheel closes
the panel. Editable fields accept a trailing time after a comma or "at", retain
the selected clock when only a date is typed and preserve invalid time text.
Clock changes synchronize at minute/second precision. Composite range fields
remain gaps.

Standalone `FabricatorTimeWheel` uses the shared active band, 16-point tabular
labels, foreground semibold selection, edge fade and canonical drum tilt. It
accepts `hourCycle`, `hasSeconds`, minute `step` and clock-only `allowedRange`
bounds using `FabricatorTimeOfDay`. The existing Date binding keeps its calendar
day; Calendar resolves skipped DST times forward. Columns snap to their center
row, support taps/dragging, Up/Down, Page Up/Down and Home/End, and expose native
adjustable accessibility actions. Reduce Motion and scoped motion-off remove
tilt and programmatic movement. Dynamic Type grows row height and measured
column widths. The renderer and pure model have their own optional registry
owner, with no JavaScript engine or new dependency. `height` fits a calendar's
column and `autoFocus` moves keyboard editing to Hours when a field opens it.
Scroll offsets commit only after user interaction. Layout and programmatic
centering cannot replace a typed clock. Drag events identify user interaction,
with a scoped AppKit wheel monitor for macOS trackpads and mouse wheels.
Initial centering waits for a nonzero viewport and
rejects pending work superseded by newer input or layout. Minimum-runtime
execution remains unqualified.

`FabricatorTimeInput` uses the shared Input Group frame and clock glyph with
tabular editable text, focus/invalid/disabled states and the Fabricator wheel.
The existing required Date initializer is retained; optional Date bindings can
clear. Configure `hourCycle`, `hasSeconds`, `step`, clock `allowedRange`,
`calendar` and a `referenceDate` for empty values. Return and blur commit compact
times, AM/PM, seconds, noon and midnight. Invalid drafts stay visible; optional
values clear while required values retain their last valid clock. Typing bounds
compare whole minutes, while the wheel clamps seconds, following React's model.
Clicking the field or clock opens the wheel; Up/Down commits and focuses Hours.
On iOS this uses the existing popup adapter's nonmodal hosted presentation and a
passthrough input region, preserving text focus and the keyboard. Return/Escape
close the wheel and dismissal restores field editing. Popup placement respects
the keyboard viewport. macOS focus behavior remains unqualified. Time Input owns
its pure parser and field state, depending on the standalone wheel; Date Picker
uses that module for clock parsing. No JavaScript resource or dependency is added.

`bun run example:mobile-swiftui:check:ui --device <UDID>` runs XCUITest against
an explicitly selected iOS Simulator. It launches every generated catalog route
and exercises native field editing, project feedback, Select sizing/search reset
and repeated dialog dismissal. Selection-control regressions exercise mixed,
selected and disabled states and exclusive radio choices. It does not certify
every variant, assistive technology or performance budget.

SwiftUI `FabricatorRoot` accepts `motionSpeed`, `motionScale` and
`isMotionEnabled`; Reduce Motion disables movement throughout the subtree and
its overlays. `instant` retains the web's brief fades while stopping continuous
animation. Popup/dialog/sheet transitions use their shared enter/exit curves;
springs interpolate the same sampled curve as the web. Native surfaces use the
exact numbered shadow tokens, with the App Shell's separate card recipe retained.
Inter's variable `wght` axis takes the web's 450/550 medium/semibold tokens;
Core Text supplies optical sizing without extra font assets. SwiftUI's scaled
metrics preserve Dynamic Type, including a region's size inside iOS overlays.
Text and control heights grow together at accessibility sizes. The explorer's
`--large-text` flag exercises this path without changing simulator preferences.
The ongoing screenshot comparison is tracked in
[`plans/swiftui-visual-parity.md`](plans/swiftui-visual-parity.md).
Checkboxes draw the same short-leg-first path as React; radio groups move one
persistent dot and switches stretch/squash their thumbs. These controls accept
`isInvalid` and honor SwiftUI's disabled environment. Integrated labels use the
shared medium weight. On iOS, row spacing preserves separate 44-point hit areas;
the control artwork retains the web's density dimensions.
The read-only Table uses shared Grid columns measured through the Core Text
adapter, so large text overflows horizontally instead of compressing cells.
`footer`, `columnWidths` and `emphasizedColumns` cover the invoice preview's
total, preferred identifier width and medium-weight identifiers. Hover/viewport
state lives below measurement, avoiding repeated text measurement while hovering.
Data Table uses the same card surface, semibold type-icon headers, muted secondary
cells, primary identifiers, status dots and typed values as React. Columns accept
`isPrimary`, `optionLabels`, `optionImageURLs`, `fractionDigits` and `isDateRelative`;
the table accepts `searchPlaceholder` and a shared `referenceDate`. Numeric/date
calculations retain their type while counts stay numeric. The date parser accepts
JavaScript ISO timestamps with fractional seconds. Row tint is shared across pinned
and scrolling slices, unused width keeps the row rules, and iOS row/header targets
stay at least 44 points. Queries run above pointer/cell/viewport state. Pagination
builds only the visible page controls rather than one layout entry per page.
Column widths, resize minimums, alignment and first sort direction come from
React's typed defaults in the generated contract. Numeric/date headers start
descending; other types start ascending, then reverse and clear on repeated taps.
Explicit widths remain in table state, bounded by the type's minimum.
Sort headers resolve their own active descriptor; unsorted icons do not inherit
another column's direction. Type/arrow scale and opacity use the shared move
timing, with no platform-default label dimming on press.
The launcher extracts React's 10,000 seeded accounts and all 12 typed value columns
into an ignored, demo-only resource (3,341,711 bytes before packaging). The native
demo pages local data; React's remote windowing, full settings/selection surfaces,
in-cell editor geometry and all keyboard paths remain qualification gaps.
Empty uses the numbered surface-4 media tile, 14-point semibold title and
13-point relaxed description, with the shared density spacing.
File Tree uses the canonical filename resolver and licensed file artwork, exported
in light/dark at 48 pixels for a 16-point glyph. Its optional module adds about
510 KiB of PNGs plus metadata and the license, with no web JavaScript cost or new
dependency. Selection, hover, indentation, guides and chevrons follow the web
recipes. iOS rows preserve 44-point touch targets; macOS uses the shared density
height. Explicit `children: []` declares an empty folder. Nodes accept `isDisabled`
and `isMuted`; the tree accepts `onOpen` and an optional `maximumHeight`.
Single selection, keyboard navigation, typeahead and file opening are implemented.
Multiple/range selection, deletion, context callbacks and dragging remain gaps.

Markdown and Syntax Highlight use the same pure parser, document tree and syntax
tokenizer as React, bundled locally behind the existing JavaScriptCore adapter.
Markdown's `size` is `sm`, `default` or `lg`, with 14/16/18-point document text
independent of interface density. It renders marked text, nested lists, readonly
tasks, quotes, GFM tables, images and raw unsupported source. Syntax Highlight
accepts an optional `language`, infers it from `filename`, and supports line
numbers, highlighted/inserted/deleted lines, wrapping and `maximumHeight`.
Its native Copy action writes the original source and resets feedback after two
seconds. Uncapped code passes vertical scrolling to its parent; capped code uses
the shared edge-fade geometry. Token styling lives outside scrolling state.
The optional document payload adds 571,688 engine bytes, 18,233 notice bytes,
306 typography bytes and 354,604 Geist Mono font bytes before packaging, plus the
OFL notice. It adds no web JavaScript or package dependency. App launchers sync
the React document fixtures through TypeScript's parser into an ignored JSON
resource shared by the native demo and its clipboard regression test.
Inline code's exact chip padding/corners, custom Markdown renderers/kits, custom
syntax grammar registration, full selection behavior and assistive-technology
speech still need qualification.

SwiftUI Editor uses the same `FabricatorDocumentSize` role and generated React
notes fixture. Its optional `minimumHeight` defaults to six document lines,
including Dynamic Type; `maximumHeight` caps the document viewport. The minimum
wins when larger text grows past that cap, as in CSS. Uncapped content grows to
fit. Initial state stays unselected until native focus reports a caret. AppKit
reports that caret from first-responder changes before typing begins. UIKit
receives the exact Inter weight/italic and Geist Mono fonts
through a font resolver at the existing TextKit boundary. Document text follows
Dynamic Type while remaining independent of interface density; code keeps its
own density role. Changing text size restyles the live text without changing its
contents or selection. Toolbar groups, active fills, dividers and the word-count
footer follow React. The native keyboard accessory uses spacious controls,
switches commands for a caret or selection, and can dismiss the keyboard.
Read-only task/block actions cannot edit the model; code copying remains
available. UIKit code headers host actual SwiftUI Copy buttons with Fabricator
artwork, press feedback and accessibility labels. Successful copying shows the
success-colored check for two seconds; repeated copies restart feedback. Copy
does not focus the document or change selection. UIKit task controls expose
checked/disabled states, use document-em geometry, press feedback and the
Markdown check pop. Their expanded hit areas stop before editable text. Task
activation selects the task, focuses its caret and participates in canonical
undo/redo. Both Apple adapters flush pending content/selection before requesting
focus and distinguish state objects that share revision numbers. Checked-task
strikes keep the muted color; links retain their own color. Canonical code
projection preserves token emphasis/comment slant, and code-link tokens are
underlined without interactive URL attributes. The shared SVG parser reads
compact arc flags without flattening artwork.
An initial UIKit code/raw block reserves its chrome in the text-container inset;
its header stays visible and switching to ordinary text restores normal spacing.

The iOS XcodeGen test scheme includes `FabricatorSwiftUI-UnitTests` for actual
UIKit font/layout/selection checks, alongside the existing UI test target. After
building the example, run that target with `xcodebuild test -project
apps/swiftui/FabricatorSwiftUI.xcodeproj -scheme FabricatorSwiftUI-iOS
-destination 'platform=iOS Simulator,id=<UDID>'
-only-testing:FabricatorSwiftUI-UnitTests CODE_SIGNING_ALLOWED=NO`.
Editor also owns the optional Geist Mono fonts/license, shared with document/code
consumers without duplicate installation; those files total 358,991 bytes.
Editor bubble/link surfaces, exact inline/underline geometry, rich table cells,
AppKit task/code decorations, macOS interaction, VoiceOver and fresh React
screenshot qualification remain open.

## Web

- Three bases (see [COMPONENTS.md](../COMPONENTS.md#bases)); React Aria has no `Menubar` or `NavigationMenu`.
- The CLI sets up Next.js, Vite, React Router, TanStack Start, Astro and Laravel, on React 19 and Tailwind 4. Installation guides: `apps/web/content/docs/installation/`.

## Desktop

- The desktop example (`apps/desktop`) wraps the site's `/desktop` route (`app/(view)/desktop/`) in Electron (`electron/`) or Tauri (`src-tauri/`). Run `bun run example:desktop-electron` or `bun run example:desktop-tauri` (needs Rust; the first build takes minutes).
- The CLI scaffolds desktop apps from `packages/cli/templates/desktop-{electron,tauri}`. An App Shell with `desktop=<electron|tauri>` finds its window at runtime through the `desktop-window` item.
- CDP clicks skip the native hit test, so a window control is proven only by auditing its `app-region` rects.
- The desktop example and `apps/mobile` share the component explorer's sidebar (`apps/web/lib/component-explorer.ts`) and shell options.

## React Native

The native tree (`apps/web/registry/native/`) holds the React Native version of every published item under the same name. Projects install it from `/r/fabricator/native/{name}.json`. **Porting rules, the style-map subset that works, motion, fluid hover, overlays and checks are in [`registry/native/README.md`](../apps/web/registry/native/README.md); read it before writing native source.** The plan is [`plans/react-native.md`](plans/react-native.md).

- **Platform parity (contract 9):** same exports, `variant` and `size` values, declared props, `data-slot`s and placeholder names as web. Base UI's API is the one to match. Native may add, never rename. `bun run native:parity` (in `apps/web`) compares them; CI runs it `--strict`.
- **Sizes:** phones use the spacious scale (44pt controls); tablets use 40pt controls with phone text. `FabricatorRoot` picks them from the window width; Split View under 768pt counts as a phone.
- `apps/mobile` is a private example with its own install (React Native pins its own React). It runs every demo from the compiled registry through `metro.config.js`, and its shell is the library's `AppShell`. Nothing in the library imports it.

### Theme

`registry/fabricator/native-theme.ts` resolves a look to what React Native can draw (no OKLCH, CSS variables or `calc()`), from the same modules as the website's stylesheet. Never write a colour or size by hand in `apps/mobile`.

- `getNativeCssVariables` gives every token under the website's names; `toNativeStylesheet` writes them into the installed `fabricator.css`, and `applyLook` hands them to Uniwind at runtime through `getNativeRuntimeVariables`.
- Its tests pin values measured in a browser and read `app-shell.css` and `globals.css`, so a token or radius change fails there until `native-theme.ts` follows.
- `registry/fabricator/look-presets.ts` holds the named looks both settings UIs offer. Modules native installs import (`foundation-tokens.ts`, not `foundations.ts`) stay free of React, the DOM and the website's CSS.

### Gotchas

- Inter through `--font-sans`; React Native picks a weight's cut from the family, so `font-medium` and `font-semibold` draw the static 500 and 600.
- Uniwind can't hold `cubic-bezier()` in a variable: `--motion-speed` names the speed and `lib/motion.ts` reads curves from `motion.ts`. It splits shadow lists on commas, so shadow colours are hex. It mangles a runtime `-0.5px`, hence `getNativeRuntimeVariables`.
- Reanimated's `Keyframe` left surfaces invisible; `useSurfaceAnimation` uses custom worklets.
- Sounds share the web recipes (`shared/lib/sound-recipes.ts`); `lib/sound-synth.ts` renders them to files and `expo-audio` plays them. Seeking a finished player and playing in the same tick drops the play, so `lib/sounds.ts` rewinds on finish. Every sound has a matching haptic.
- Expo's Metro reads `tsconfig` paths at runtime; `apps/mobile` turns that off because its aliases differ between types (source) and bundling (compiled).

### Commands

| Task                                         | Command                                                                                   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| iPhone                                       | `bun run example:mobile-reactnative`                                                      |
| iPad, Android                                | `bun run example:mobile-reactnative:ipad`, `bun run example:mobile-reactnative:android`   |
| Every demo on an iPhone and iPad, for errors | `bun run example:mobile-reactnative:check` (`--device`, `--scope components`, `--strict`) |
| Compile items without writing                | `bun run registry:native --check <names>` (in `apps/web`)                                 |
| Types                                        | `bun run typecheck` (in `apps/mobile`)                                                    |
| Docs pages from source and `differences.ts`  | `bun run native:docs` (in `apps/web`)                                                     |

## Fabricator Icons

Every Lucide icon under its Lucide name with identical geometry, plus Fabricator's Custom icons, brand marks, duotone, animated and Charmed file icons. Moving from `lucide-react` is an import change.

| Package                             | For                               | Sets                                                                            |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `@fabricator-ui/icons`              | React (web, desktop)              | outline, brands, duotone, animated (Motion), files, dynamic, catalog            |
| `@fabricator-ui/icons-react-native` | React Native (`react-native-svg`) | outline, brands, duotone, files                                                 |
| `@fabricator-ui/icons-static`       | Anything                          | SVG files, sprites, JSON nodes, a PNG exporter for tray and menu icons          |
| `packages/icons-core` (private)     | Sources, checks, generators       | Lucide, lucide-animated and Charmed vendored; Custom originals; brand allowlist |

- Adding or importing icons: [`packages/icons-core/CONTRIBUTING.md`](../packages/icons-core/CONTRIBUTING.md). Plans: [`plans/icon-pack.md`](plans/icon-pack.md), [`plans/icon-pack-expansion.md`](plans/icon-pack-expansion.md).
- Vendored sources (`sources/lucide/`, `sources/animated/`, imported brands) are written only by `icons:sync`, `icons:animated` and `icons:brands`. `src/generated/`, `dist/` and the static outputs are gitignored.
- Registry source uses `IconPlaceholder` on web and real imports from `icons-react-native` in the native tree. How the site renders icons: [WEBSITE.md](WEBSITE.md#icons).
- `bun run icons:check` (part of `check`) validates every source; `bun run icons:sheet <names…>` makes the review PNG a new icon's PR attaches; `bun run icons:audit` checks every animated icon in Chrome after an animated or Lucide sync.

## editor-native

`packages/editor-native` is the Expo module the native `editor` item draws its document with: one TextKit 2 `UITextView`, iOS 16.4 and later. Android isn't built yet. The editor's engine is the shared TypeScript in `registry/fabricator/shared/lib/editor-*.ts` and `markdown-*.ts`. It ships with the icon packages (`release:icons`). Plan: [`plans/editor.md`](plans/editor.md).

## Done when

- [ ] A web component change has its native item, or a dated `parity-exceptions.json` entry, and `bun run native:parity` passes.
- [ ] `add <item>` works in a fresh Expo project using nothing from `apps/mobile`.
- [ ] `bun run example:mobile-reactnative:check` passes, and the demo was checked on the iOS Simulator and Android Emulator, light and dark, with VoiceOver and TalkBack.
- [ ] `bun run native:docs` was rerun after a native item changed.
- [ ] Icon changes pass `bun run icons:check` and `bun run test`, with a review sheet on the PR for new drawings.
