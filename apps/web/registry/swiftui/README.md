# Fabricator UI for SwiftUI

Reusable native SwiftUI sources for iOS 17+, iPadOS 17+ and macOS 14+. Components use the generated Fabricator color, radius, density, motion, icon, font and sound contracts. They render with SwiftUI, Swift Charts, UIKit and AppKit.

The manifest covers all 109 component families and guides plus 32 distinct block variants. Presence does not certify complete behavior parity. See `parity-exceptions.json` for remaining implementation gaps and verification status.

```swift
import FabricatorUI
import SwiftUI

struct ContentView: View {
    @State private var name = ""

    var body: some View {
        FabricatorRoot(density: .spacious) {
            FabricatorCard("New project") {
                FabricatorField("Project name") {
                    FabricatorInput("Project name", text: $name)
                }
                FabricatorButton("Create project", icon: "plus") {
                    createProject(name: name)
                }
            }
            .padding(16)
        }
    }
}
```

SwiftPM consumers can depend on this directory as a local package. Copy-in consumers use the native registry and receive only their requested family modules, dependencies and resources. `manifest.json` is generated from the shared catalog by the example's `scripts/build-manifest.ts`.

Run `swift test --package-path apps/web/registry/swiftui` from the repository root. The real demo is `apps/swiftui`; its launcher uses installed Xcode and XcodeGen, with no dependency downloads. Device and macOS release performance and VoiceOver parity still require qualification.

Set `motionSpeed: .smooth`, `.default`, `.snappy` or `.instant` on `FabricatorRoot`; `motionScale` retimes transitions and `isMotionEnabled: false` stops them. System Reduce Motion also stops motion, including in overlays and loading indicators. Density and motion settings carry into popups, dialogs and sheets.

Inter uses the web's exact variable weights and optical sizing through Core Text. Dynamic Type scales text and control heights, and scoped text sizes carry into iOS popups. The optional document/code module includes Geist Mono for the web's code typography.

`FabricatorTable` measures columns with the active font and scrolls horizontally when they exceed the viewport. Its optional `footer` takes a `FabricatorTableRow`; `columnWidths` sets preferred widths by column id, while `emphasizedColumns` gives identifier columns medium weight. Text can enlarge a preferred width rather than truncate. Cells include their column title in the accessibility label. The table and Empty previews use the React examples' invoice data and project actions.

`FabricatorCalendarView` accepts bindings to `Date`, `Date?`, `Set<Date>` or `FabricatorDateRange?`. Optional selections can clear; required dates stay selected. Configure `captionLayout`, `numberOfMonths`, `showsWeekNumbers`, `fixedWeeks`, `disabledDates` and whole-day `allowedRange` bounds. Multiple/range modes expose their minimum and maximum limits. Arrow keys, Home/End and Page Up/Down move focus; Shift with Page Up/Down moves a year. `referenceDate` controls today and the default caption year window. Day glyphs use the shared 32-point density size; iOS hit slots prefer 44 points, shrink to the glyph size when constrained and scroll horizontally when enlarged text needs more width. Month groups stack when necessary. `FabricatorDatePicker` accepts `Date` or `Date?`, supports empty/invalid/disabled fields and bounds, and closes its shared popup on selection. Set `granularity: .month` or `.year` for a three-column grid of twelve periods. Month values start on the first day; year values start on January 1. Bounds include their whole month/year. Arrows move a cell or a row of three, Page Up/Down moves twelve periods, and Return/Space selects. Page entry uses the shared move timing, with active selection and muted/current cell states. Set `isEditable: true` to type dates and `dateFormat: "dd/MM/yyyy"` for a date-fns pattern. Return or blur commits using React's canonical parser. Relative phrases such as `tomorrow`, `next month` and `next year` use `referenceDate`. Invalid text stays visible; `Date?` clears its value while `Date` keeps its last valid value. Empty optional fields clear without an error. The calendar button and Option+Down commit and open the parsed period; closing restores text focus. Text parsing supports Gregorian/ISO calendars and the installed date-fns locales, with English relative phrases. Unsupported calendars/locales fail explicitly. The optional Date Picker module includes 1,071,562 JavaScript engine bytes and 3,446 notice bytes before packaging, behind the shared JavaScriptCore adapter; unrelated modules and web bundles do not grow. Set `hasTime: true` for day-and-time selection, with `hasSeconds`, `hourCycle`, `step` and `timeLabel`. The panel keeps the selected clock when changing days and remains open while choosing time. Editable fields accept a time after a comma or "at". Same-day time changes synchronize at the configured precision. Composite range fields remain gaps.

`FabricatorTimeWheel(selection: $date)` keeps its Date binding and draws a Fabricator wheel on both Apple platforms. Configure `hourCycle: .twelve` or `.twentyFour`, `hasSeconds`, minute `step`, clock-only `allowedRange` bounds and `calendar`. Bounds use `FabricatorTimeOfDay(hours:minutes:seconds:)`; changing the clock keeps the selected calendar day and resolves skipped DST times forward. Columns snap to the shared band, support taps/dragging and Up/Down, Page Up/Down, Home/End keys, and expose adjustable accessibility actions. Seven rows use tabular 16-point text, edge fading and drum tilt, with shared move/feedback timing. Reduce Motion removes tilt and automatic movement. Dynamic Type grows rows and measured column widths. This optional module adds no JavaScript resource or package dependency. `height` fits the calendar column and `autoFocus` enters keyboard editing at Hours. Popup wheels fit the available keyboard viewport.

`FabricatorTimeInput` keeps its required Date initializer and also accepts optional Date bindings. It uses the shared field frame, 16-point clock icon, tabular text and the Fabricator wheel. Set `hourCycle`, `hasSeconds`, `step`, clock `allowedRange`, `calendar` and `referenceDate`. Return/blur commits compact times, AM/PM, seconds, noon or midnight; invalid text stays visible. Optional values clear while required values retain their last valid clock. Up/Down commits and focuses the wheel. iOS uses the existing popup adapter with a nonmodal hosted surface and an editable anchor region, retaining the keyboard and restoring field focus on dismissal. Keyboard-aware placement and bounded scrolling keep enlarged date-time panels reachable. macOS focus, full VoiceOver, minimum-runtime and physical-device behavior remain unqualified. This optional module adds no JavaScript resources or package dependencies.

`FabricatorDataTable` uses typed columns for cells, filtering, sorting, editing and calculations. Type widths, minimums, alignment and first sort direction come from the generated React rules; headers reverse and clear their sort on repeated taps. Set `isPrimary` for the record identifier, `optionLabels`/`optionImageURLs` for cell presentation, `fractionDigits` for numeric precision and `isDateRelative` for relative dates. Pass a table `referenceDate` to share one clock with filters and date cells, and `searchPlaceholder` to name the search. Status badges include their dot, all tags remain horizontally scrollable, editable Boolean cells toggle directly and link/email cells open their destination. Date calculations stay absolute; count calculations stay numeric. Pinned and scrolling rows share selection/hover tint. iOS headers and rows retain at least 44-point touch targets. The demo uses React's seeded accounts with local paging; remote windowing, complete settings/selection surfaces and spreadsheet keyboard behavior remain incomplete.

`FabricatorFileTree` uses the canonical colored file artwork and filename mappings. Pass `children: []` to `FabricatorFileNode` for an empty folder; omitting children declares a file. Nodes accept `isDisabled` and `isMuted`. The tree accepts `onOpen` for Return/double-click and an optional `maximumHeight` for internal scrolling. Arrow keys, Home/End, Space, Escape, sibling expansion and typeahead operate on enabled rows. iOS rows retain 44-point touch targets while macOS follows density height. Multiple/range selection, deletion, drag/drop and context callbacks are not implemented. The optional File Tree payload contains about 510 KiB of generated PNGs plus metadata and the Charmed license; foundations exclude them.

Inter is licensed under the SIL Open Font License in `resources/LICENSE.txt`. Fabricator Icons retain their repository attribution. The sound adapter synthesizes the canonical Fabricator recipes locally and stays opt-in.

`FabricatorMarkdown` renders the canonical document tree with `size: .sm`, `.default` or `.lg`. Document type remains 14/16/18 points across interface densities. Nested lists, readonly tasks, rich GFM tables, quotes, fenced code, images and visible raw source use native views. Exact inline-code chip padding/corners, custom components/kits and complete selection/VoiceOver behavior remain unqualified.

`FabricatorSyntaxHighlight` accepts optional `language` and `filename`; omitted language is inferred from the filename, or plain text when no grammar resolves. Use `showLineNumbers`, `startLine`, `highlightLines`, `insertedLines`, `deletedLines`, `wrap` and `maximumHeight` for the corresponding React behavior. Copy writes the original source and shows feedback for two seconds. `FabricatorClipboard.copy` returns a success Boolean that callers may ignore. The optional document engine, typography, Geist Mono resources and notices add about 927 KiB before packaging; foundations exclude them. See `resources/GeistMono-OFL.txt` for the font license.

`FabricatorEditor` accepts the same document `size`, optional `minimumHeight`/`maximumHeight` and `isReadOnly`. The automatic minimum is six document lines, independent of interface density and following Dynamic Type. An explicit minimum overrides that rule; the minimum wins when larger text grows past the cap. State starts unselected until native focus. UIKit uses exact Inter axes/italic and Geist Mono fonts, retains selection when restyled, and provides native keyboard formatting/dismissal. The toolbar and word-count footer follow the React groups and tokens.

Code keeps its own density type size, strong/emphasized tokens, italic comments and noninteractive link underlines. UIKit code headers use accessible Copy buttons with two-second success feedback. UIKit task controls expose checked/disabled states, document-em geometry, press/check motion and hit areas that stop before editable text. Activating a task selects its caret, focuses the document and participates in canonical undo. Both adapters flush pending model content and selection before focus and distinguish replacement state objects with matching revisions. Read-only task/block edits are ignored while code copying remains available.

Editor includes the same optional Geist Mono files as Syntax Highlight, totaling 358,991 bytes; installing both deduplicates those files. Code wrapping, block-editing sheets, incomplete floating surfaces, exact inline/underline geometry, rich table cells, AppKit task/code decorations and assistive-technology/macOS interaction still require qualification.

The document renderer, editor and recurring calendar bundle the repository's canonical pure domain engines and execute them with Apple's built-in JavaScriptCore through one isolated SDK adapter. Their views use native text and SwiftUI controls. The registry includes all bundled dependency licenses in the corresponding item resources. Foundations do not depend on these optional engines.
