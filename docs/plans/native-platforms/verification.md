# Native platform verification

Implementation run: 2026-11-15. These are development previews, with source
coverage separated from complete behavior, accessibility and performance parity.
The [implementation plan](../native-platforms.md) remains the qualification bar.

## Delivered

- Generated catalog: 109 component/guide families and 32 blocks. Both native
  registries have source owners and explicit dependency closures for every entry.
- SwiftUI: reusable copy-in/SwiftPM source, iPhone/iPad/macOS galleries, all 32
  block compositions, shared fonts/icons/tokens/loading/sound assets, native
  input, tables/charts/calendar and a canonical editor engine behind JavaScriptCore.
- Compose: reusable Android/JVM source and galleries, native platform adapters,
  42 authored behavior tests and an explicit gap ledger.
- Tauri: bundled Vite frontend with the actual web components, App Shell,
  622 scenarios, 32 blocks and a Rust host. Desktop examples remain available.
- Native CLI installation, updates/diffs/dry runs, conflict protection,
  diagnostics, root demo aliases, workspace lockfile and native CI lanes.

## Evidence

This table records the initial implementation run. Later SwiftUI visual passes
and their current validation counts are recorded below.

| Check | Result |
| --- | --- |
| Root JavaScript tests | Passed 4,144 tests |
| Root checks | All 26 lint, type and format tasks passed |
| Full registry build | Passed; web, React Native, SwiftUI and Compose output rebuilt |
| Native CLI | 275 tests passed; bundle built |
| CLI end-to-end template matrix | Not run: creates and installs consumer dependencies; installation approval pending |
| React Native strict parity | Passed: 110/112 component families, two existing dated Data Table exceptions; 32/32 blocks |
| Existing Expo application UI | Not rerun; the shared recurrence fix is covered by behavior tests |
| Swift source consumers | All 142 items resolved; all 14 distinct source closures compiled as clean macOS consumers, including editor/calendar/Sankey |
| Swift model/engine tests | All 42 passed: 12 model, five editor, three recurrence, 11 Sankey, seven chart and four auth tests |
| Swift Apple hosts | iOS Simulator and macOS debug builds passed; iPhone/iPad apps opened through Relay |
| macOS native UI | Built; window interaction and screenshot review not run |
| Swift UI interaction | iPad XCUITest passed field editing, project feedback and forced-center Combobox selection after a reproduced failure; native rich-text editing and document counters observed through Relay |
| Swift all-route UI test | Passed every generated catalog route on iPhone, plus native field editing and feedback: two XCTest cases, 141 route activities |
| Compose source checks | Strict TypeScript, generation and 141 gallery routes passed; 144 items installed across 22 distinct source closures |
| Compose compilation/tests/UI | Not run: missing JDK, Gradle and Android SDK; installation approval pending |
| Tauri frontend | Production build, four behavior tests, local asset checks and strict TypeScript passed |
| Tauri browser | 765 checks, no render failures; phone/desktop, light/dark axe audits passed on button gallery/chrome |
| Tauri Rust macOS host | Offline compile/check and two tests passed |
| Tauri iOS/Android hosts | Not built/launched: native prerequisites/targets unavailable; installation approval pending |
| Native CI workflow | Authored; remote Actions lanes not run |
| Accessibility | Native labels/actions inspected; VoiceOver/TalkBack/desktop screen-reader qualification not run |
| Release performance | Physical-device launch/frame-time/memory/energy budgets not measured |

Observed targets: Xcode 27.2, Swift 6.4.2, iOS 27 iPhone and iPad simulators.
Minimum deployment versions in source do not establish minimum-OS runtime coverage.
No native Kotlin or mobile Tauri result is inferred from browser or source checks.

## Captures

All captures are actual simulator output produced through Relay and inspected
locally. They are representative screens rather than an exhaustive visual baseline.

- [iPhone overview, light](https://github.com/user-attachments/assets/061a2280-7855-4ef8-afc8-439e1ac26f5f)
- [iPad overview, dark](https://github.com/user-attachments/assets/56e32210-1af6-4208-9530-34138e9e523f)
- [iPad forms, light](https://github.com/user-attachments/assets/b1e6f9e8-6517-453f-a377-93227defe346)
- [iPad charts, dark](https://github.com/user-attachments/assets/74029a85-3a80-4f88-bf65-a3b5e1c9e78f)
- [iPad App Shell, light](https://github.com/user-attachments/assets/6396434e-e1b3-4052-9920-94fd6412b63e)
- [iPad editor, light](https://github.com/user-attachments/assets/b70f0a36-fa8e-4a07-9070-0457f1d88f4a)
- [iPad Sankey, dark](https://github.com/user-attachments/assets/0a11b3c9-1261-470c-babb-a317bb9409a1)
- [iPad calendar, light](https://github.com/user-attachments/assets/ba875baa-f1c9-4816-8353-dd16d4be085f)

Machine-readable XCTest summaries: [catalog routes](swiftui-ui-test-summary.json)
and [final interaction regression](swiftui-final-interaction-summary.json).

## Remaining qualification

The authoritative item-level differences are
[`swiftui/parity-exceptions.json`](../../../apps/web/registry/swiftui/parity-exceptions.json)
and [`compose/parity-exceptions.json`](../../../apps/web/registry/compose/parity-exceptions.json).
Tauri's [verification record](../../../apps/tauri-mobile/verification.md) separates
its browser, Rust desktop and unverified mobile results. Advanced option coverage,
native window integration, Markdown/highlighting, animation details and complete
assistive-technology behavior still need work. The CLI's native init/add adapter
is implemented; `/create` and complete native application scaffolding are not.
This run does not complete the plan's full-support release gate.

The Tauri frontend is about 20.2 MB before packaging. Its entry JavaScript is
349 KB gzip and CSS 110 KB gzip. Native resources include about 1.5 MB of contract
and icon data, 1.7 MB of Inter fonts, an optional 7.5 MB BotFace resource and an
optional 613 KB editor engine before application compression. These are artifact
sizes, not runtime performance measurements.

An optional recurrence engine adds about 424 KiB. A debug macOS benchmark of
100 editor paragraphs measured 37.85 ms initialization and 20 bridge/transaction/
projection calls at a 1.21 ms median and 2.68 ms maximum. This excludes native
layout/rendering and does not establish a release-device interaction budget.

## SwiftUI visual review, 2026-11-16

The ongoing [SwiftUI comparison ledger](../swiftui-visual-parity.md) records
Select sizing/search fixes, numbered surface shadows, shared overlay motion,
Reduce Motion, sliding tabs and switch thumb timing. It includes new light/dark
iOS captures and inspected dialog motion frames. All 26 root checks, 4,166 JS
tests, 47 Swift tests, six iPhone/iPad UI regression cases, the full registry
build and 14 standalone consumer source closures passed. Shared popup/menu
ownership and the shell's breadcrumb dependency were corrected after clean
consumer builds exposed missing files.

Fresh React captures await browser handback: Relay reports computer use paused.
Archived React captures use a saved tinted look and cannot qualify neutral color
parity. Typography, advanced components, complete keyboard/VoiceOver behavior,
large text and physical-device performance remain open.

The subsequent typography pass uses Inter's exact 450/550 axes with optical
sizing and preserves Dynamic Type in controls and iOS overlays. It corrects
placeholder contrast, button geometry, Card grouping/line heights and avatar
accessibility. Final checks pass 26 root tasks, 4,167 JavaScript tests, 50 Swift
tests, four UI cases on each iPhone/iPad and all 14 standalone source closures.
The [Card comparison](https://github.com/user-attachments/assets/d8b59699-058e-4ad1-9ada-255096fd09d3) keeps the archived web look
explicitly separate from the native before/after evidence. Fresh web captures
and the remaining full-catalog qualification still require work.

The selection-control pass adds drawn checkbox marks, one persistent radio dot,
switch press/hover geometry, invalid/disabled/focus rendering and selected/mixed
accessibility values. Captured light/dark phone/tablet states and large text;
inspected checkbox, radio and switch motion recordings frame by frame. Final
validation passes 26 root check tasks, 4,167 JavaScript tests, 51 Swift tests,
seven UI cases on each iPhone/iPad and all 15 standalone source closures for 142
items. The public checkbox's mixed value is applied outside SwiftUI's Toggle
wrapper after a regression exposed its Boolean override. Keyboard/VoiceOver,
rapid interruption and fresh React comparisons remain unqualified. Evidence is
linked from the [comparison ledger](../swiftui-visual-parity.md#selection-controls).

The Table/Empty pass corrects table typography, dividers, spacing, footer/caption
and natural column sizing with horizontal overflow. Its invoice fixture now
matches the React data. Empty uses the shared raised tile, type sizes and project
actions. Large-text captures and a real Create Project feedback toast were
inspected; the adaptive table regression checks phone scrolling and wide iPad
readability separately. Eight UI cases passed on each device, including a
focused phone retest after correcting that tablet expectation. All 26 root
tasks, 4,167 JavaScript tests, 51 Swift tests and all 15 standalone source closures passed; the
full registry build passed in 121.80 seconds. Remaining fresh web, pointer,
keyboard and VoiceOver qualification is explicit in the renderer's exceptions
and [Table/Empty ledger](../swiftui-visual-parity.md#table-and-empty).


The File Tree pass replaces generic glyphs with the canonical light/dark file
artwork and filename mappings, matches indentation and selection/chevron motion,
and distinguishes empty folders and inherited disabled states. Native Button
activation fixes delayed row taps. Arrow/typeahead, double-tap and state UI cases
pass on iPhone and iPad, while Relay input separately verifies Return/Home/End.
The final source passes 26 root tasks, 4,168 JavaScript tests, 60 Swift tests,
both Apple host builds and 16 standalone source closures for 142 items. Eleven
UI cases passed per device, followed by a focused three-case retest per device
after the final Button change. The final full registry build passed in 124.28
seconds. Optional file artwork adds 522,304 PNG bytes plus resolver metadata and
the Charmed license, with no new dependency or web JavaScript. Native light/dark,
large-text and motion evidence is in the [File Tree ledger](../swiftui-visual-parity.md#file-tree).
Full web comparison, multiple/range selection, delete/undo, context callbacks,
drag/drop, VoiceOver and physical-device qualification remain open.

The Markdown/Syntax Highlight pass replaces the duplicate native parser and
regex coloring with the canonical pure parser/tree/tokenizer behind the local
JavaScriptCore adapter. It adds density-independent 14/16/18-point document
roles, rich lists/tasks/tables, real Geist Mono upright/italic code, shared token
styling, full-source Copy with two-second feedback, wrapping and capped scrolling
with shared edge fades. The app and clipboard test load the primary React
fixtures through a generated resource. Optional document resources total
949,218 bytes before packaging, about 927 KiB; foundations exclude them and no
dependency or web JavaScript was added.

Final validation passes 26 root tasks, 4,168 JavaScript tests, 66 Swift tests,
both Apple host builds, 14 UI cases on each iPhone/iPad and all 18 standalone
source closures for 142 published items. The full registry build passed in
137.50 seconds. The first root suite hit an unrelated five-second BotFace
timeout under concurrent build load; that file passed alone and the entire
root suite passed after consumer compilation finished. Nothing was changed to
hide or extend that test's timeout. Native light/dark, large-text, compact
document sizes, scrolling and Copy motion frames were inspected. Evidence and
the definition of done are in the
[Markdown/Syntax Highlight ledger](../swiftui-visual-parity.md#markdown-and-syntax-highlight).
Exact inline-code chips, custom renderer/kit/grammar APIs, full selection,
VoiceOver/media/minimum-OS qualification and fresh web comparisons remain open.

The Editor pass uses the canonical React notes fixture, document sizes and
typography, the default toolbar groups and Unicode word-count footer. UIKit
receives exact Inter axes/italic and Geist Mono through a font resolver at the
shared TextKit boundary; live text-size changes retain text and selection. Code
keeps its own density role, token emphasis and comment slant. A native keyboard
accessory switches commands for a caret or selection and dismisses correctly.
Read-only task/block actions preserve the document while allowing code copying.
Screenshot review found both obsolete icon names and compact SVG arc flags
flattening Bold; canonical names and path-geometry regressions address them.
The final keyboard capture also exposed a hosting safe-area offset, corrected
through the hosting controller's supported safe-area configuration.

All 71 Swift tests, 26 root check tasks and 4,169 JavaScript tests pass. Both
iPhone and iPad pass 23 cases, including four live UIKit rendering checks and
19 UI regressions; the separate full-catalog route smoke case was excluded.
The broad iPad suite preceded the final keyboard alignment change; its focused
accessory retest is recorded in the comparison ledger. All 142 published items
resolve and all 18 distinct standalone source closures compile from the final
registry output. The final full registry build passed in 131.74 seconds.
Native phone/tablet light/dark, large text, code/table scrolling, compact
read-only document sizes and actual press-state motion were inspected. Fonts
and the license add 358,991 optional bytes, deduplicated with Syntax Highlight.
No dependency was installed and no web JavaScript was added.

The [Editor ledger](../swiftui-visual-parity.md#editor-and-compact-svg-paths)
links the evidence and precise remaining gaps. Initial selection/default minimum
geometry, floating surfaces, code Copy feedback, task motion, rich table-cell
marks, custom-kit UI, complete keyboard/VoiceOver, minimum-OS/physical-device and
fresh React screenshot/motion qualification remain open. macOS builds and model
tests pass; native macOS window interaction was not checked.

### Editor selection, sizing and Copy follow-up

The initial caret now waits for native focus, and the default minimum follows
six document lines across size, density and Dynamic Type. Both platform view
adapters share the height rule. UIKit code headers host accessible SwiftUI Copy
controls with Fabricator icons, compact styling, 44-point targets and two-second
success feedback. They copy the complete source without changing document focus,
selection or history. Expo's existing drawn affordance and event API stay intact.
AppKit reports initial caret/focus from its first-responder boundary before typing.

All 76 Swift tests pass. Each simulator passes eight focused cases: four UIKit
rendering tests and four Editor UI tests, including a full clipboard round trip
through another screen. The broader gallery suite/catalog smoke case was not
repeated for this localized follow-up. Root validation passes 26 check tasks and
4,169 JavaScript tests. Both Apple hosts build. The final full registry build
passed in 111.85 seconds after the AppKit focus fix.
All 142 published items resolve and all 18 distinct source closures compile
from those final payloads; the consumer report is linked in the follow-up ledger.

The [follow-up ledger](../swiftui-visual-parity.md#editor-selection-minimum-height-and-copy)
links the inspected light/dark screenshots, large-text sizing, native Copy/check/reset
recording and both focused test summaries. Fresh React captures and web
keyboard/axe checks remain paused by browser takeover. Full catalog, keyboard,
VoiceOver, minimum-OS, physical-device and macOS window/decorations qualification
remain open. The new AppKit responder test uses a nonvisible native window.

### Editor tasks, tokens and geometry follow-up

UIKit task controls now share the native decoration-control boundary with Copy.
They use the document's em geometry, expose checked/disabled state, retain their
position through repeated toggles, and use the shared press/check/exit timings.
Hit areas stop before editable text. Activating a task focuses its canonical
caret and uses document undo. Both Apple adapters flush pending content/selection
before focus and refresh replacement state objects that share revisions.
Code-link tokens retain a visual underline without interactive URL attributes;
strong/italic code fonts and checked-task strike/link colors follow React's source.

Motion capture found unresolved fragment geometry moving controls to the viewport
edge after restyling. The bridge now completes visible TextKit layout before
positioning overlays and keeps them above its drawing surface. A separate first-code
regression measured a panel at y=-33.725; reserving its chrome in the initial
text-container inset keeps the complete header visible, and changing block kind
restores the ordinary inset.

Final checks pass 79 Swift tests, 15 focused cases per simulator (ten UIKit checks
and five Editor UI cases), 26 root check tasks and 4,169 JavaScript tests. Both
Apple hosts build. The final registry build passed in 130.49 seconds; all 142
published items resolve and all 18 standalone source closures compile.
The [task/token ledger](../swiftui-visual-parity.md#editor-tasks-code-tokens-and-textkit-geometry)
links the final summaries, light/dark previews and inspected task entry/exit and
motion-off recordings/frames. The motion-off flag controls FabricatorRoot and
does not change the OS accessibility preference. Fresh web comparison remains
paused by takeover. Full catalog, complete keyboard/VoiceOver, minimum-OS,
physical-device and macOS window/decorations qualification remain open.

## SwiftUI Data Table visual and behavior pass

On 2026-11-16, the native table was checked against the canonical React source
with its exact seeded accounts and 12 value-column definitions. Typed width,
minimum, alignment and first sort direction now come from the generated shared
contract. Status dots/tones, option presentation, links, Boolean controls, typed
calculations, fractional ISO dates, relative dates, large pagination and sort
motion were corrected. Native light/dark, phone/iPad, large text, selected rows,
numeric/date values, the last page and normal/motion-off frames were inspected.

- Root checks: 26 tasks passed; JavaScript tests: 4,172 passed.
- Swift package: 88 tests passed; iOS and macOS apps compiled.
- iPhone and iPad: three UI cases passed on each, including numeric sort cycles,
  Boolean checked/selected semantics, pinned scrolling and filtered deletion.
- Full registry build: passed in 135.99 seconds. All 142 published SwiftUI items
  resolved; all 18 distinct source closures compiled as standalone packages.
- No new dependencies, account data in library payloads, staging or commits.

Evidence, definition-of-done results and remaining gaps are in the
[Data Table ledger](../swiftui-visual-parity.md#data-table-fixtures-typed-defaults-and-sort-motion),
[iPhone report](swiftui-iphone-data-table-regressions.json),
[iPad report](swiftui-ipad-data-table-regressions.json) and
[consumer report](swiftui-data-table-consumer-summary.json).
Fresh React/axe and full keyboard/VoiceOver, system-setting Reduce Motion,
minimum-OS, physical-device and macOS window checks remain open. The native
preview pages local data; advanced settings/view surfaces, remote windowing and
spreadsheet input still have explicit renderer gaps. Full catalog parity is not
certified.
