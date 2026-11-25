# SwiftUI visual parity

**Historical plan.** See [the preview retirement plan](retire-native-renderer-previews.md).

Goal: make the SwiftUI library match the React Fabricator design across the
catalog, with native code and interaction quality verified separately from source
coverage. Compare actual web and iOS captures, fix differences, then recapture.

## Review method

- Use the neutral default look, Inter, matching density and identical component
  content/state. Record any intentionally different host chrome or native input.
- Capture light and dark on iPhone and iPad. Compare component geometry in points
  against CSS pixels, including radius, text, icon stroke, fills, shadows and gaps.
- Exercise hover/focus where supported, pressed, disabled, invalid, selected,
  loading and open states. Review motion between endpoints, including exit,
  interruption, speed changes and Reduce Motion.
- Test behavior changes before implementation. Run the Swift package and iOS UI
  checks, clean consumer builds, root checks/tests and full registry generation.
- A route smoke test or a source file is not visual or behavioral qualification.

## Worklist

| Area                                            | State                                                             | Next evidence                                           |
| ----------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| Shared palette, Inter, icons, surface elevation | Partial existing implementation                                   | Matched light/dark component captures                   |
| Density, motion roles, Reduce Motion            | In review                                                         | Timing regressions and live transitions                 |
| Basics                                          | In review                                                         | Every variant/state, phone/tablet                       |
| Forms                                           | In review                                                         | Select popup height, search, empty/long lists, keyboard |
| Overlays                                        | In review                                                         | Popup/dialog/sheet entrance, exit and nested dismissal  |
| Structure and App Shell                         | Partial existing implementation                                   | Responsive geometry and navigation                      |
| Content and Chat                                | Partial: Table/Empty/File Tree/Markdown/Syntax Highlight reviewed | Inline-code chips, media and chat fixtures/interactions |
| Charts                                          | Unqualified                                                       | Same data, palette, reveal/morph and inspection         |
| Advanced tools                                  | Unqualified                                                       | Calendar, table, editor and media comparisons           |
| All 32 blocks                                   | Unqualified                                                       | Same content and responsive compositions                |
| Accessibility and consumer installation         | Partial existing checks                                           | VoiceOver, keyboard, focus return and clean consumers   |

## 2026-11-16 observations

- The initial iPad Select popup expanded to its 260-point maximum despite only
  five 36-point rows. See [swiftui-current-ipad.jpg](https://github.com/user-attachments/assets/beb2542f-5c9d-4dd0-86ef-b93b71cf2c91).
- Initial overlay presentation used UIKit's default crossfade, lost scoped motion
  settings in its new root and ignored the shared popup/dialog/sheet timings.
- The initial theme treated `instant` as motion-off, though the web keeps brief
  fades. Sheet timing resolved the generic entrance curve instead of the drawer
  curve. Skeleton animation did not check Reduce Motion.
- Fresh browser capture is pending: Relay reports `computer_use_paused` and
  existing tabs are taken over. A browser handback was requested; no alternate
  browser or headless process is being used to bypass it. Existing React
  captures under `native-platforms/react-reference/` remain reference evidence.
- Those archived React captures use a saved surface tint and blue primary.
  They can guide layout, but do not prove default neutral color parity.
- The initial font helper requested Apple's medium/semibold weights instead of
  the web's 450/550. The typography pass below corrects those axes.

## Changes and verification in this pass

- Fixed Select content height, trigger width, group label and search reset.
  Inspected updated iPad light and iPhone dark captures. Three XCUITest
  regressions passed on each device for sizing, search reset and repeated dialog
  dismissal. All three passed again on both devices after the ownership refactor.
- Shared motion roles now preserve instant fades, use the drawer curve for
  sheets, retain scoped speed/scaling/off inside overlays and honor Reduce
  Motion in the root and continuous loading/face animations. Five new native
  motion tests passed; the Swift suite totals 47 tests.
- Exported all eight numbered shadows. Menus/selects use surface 3,
  dialogs/toasts surface 5, and cards surface 2. Dark inset highlights render
  as inset fills rather than shifted full-border strokes. Tabs slide their
  active pill and switches use the move timing for their thumbs.
- Standalone builds caught missing popup/menu helpers in forms and navigation
  payloads, plus the App Shell's missing breadcrumb dependency. Moved shared
  helpers into foundations. All 142 published items resolved and all 14 distinct
  source closures compiled as standalone consumers after registry generation.
- Final root checks passed all 26 tasks; JavaScript tests passed all 4,166 tests.
  The full registry build passed in 135.65 seconds, followed by the final checks.
  iOS/iPadOS and macOS apps compile; the final Swift package passed 47 tests.
- Changelog and owning platform docs were updated. Generated manifests were
  rebuilt, `git diff --check` passed, and nothing is staged. No branch switch,
  worktree, dependency installation, commit or push was performed.
- Full web keyboard/axe checks and fresh web captures were not run because
  browser control remains paused. VoiceOver, physical-device performance,
  all-density/large-text coverage and the whole-catalog comparison remain open.

Current captures: [iPad Select, light](https://github.com/user-attachments/assets/59e3e734-4a48-4ba7-ab86-25ac5e083643),
[iPad dialog, light](https://github.com/user-attachments/assets/2241be99-1af0-4cd7-a0b4-f3f8c16476db),
[iPhone Select, dark](https://github.com/user-attachments/assets/93494ccc-aa87-481a-a780-455a66b7d596).
Additional captures: [iPad dialog, dark](https://github.com/user-attachments/assets/aa4ac9bd-706c-47f9-a63c-1eae999c1ce2),
[iPhone tabs, dark](https://github.com/user-attachments/assets/98dd1027-1dee-4a3b-9e03-0ee9634d2b58),
[selected tab](https://github.com/user-attachments/assets/96abe8b0-39cf-4f0f-bfd0-0903959e51c0).
Native dialog motion: [recording](https://github.com/user-attachments/assets/f08c4f4b-e4a8-42cd-a6bd-3af613a7d9e2)
and [inspected transition frames](https://github.com/user-attachments/assets/b6b5d658-413a-4524-a7bd-9063a1ff089f).
These show the native entrance/exit, not a completed comparison with web motion.
UI summaries: [iPad](native-platforms/swiftui-ipad-visual-regressions.json),
[iPhone](native-platforms/swiftui-iphone-visual-regressions.json).
Consumer summary: [14 successful source closures](native-platforms/swiftui-consumer-visual-summary.json).

## Typography and control pass

- Generated the medium/semibold weights from the canonical web palette and
  added one Core Text adapter. Native tests inspect the actual Inter family,
  weight axes, optical sizing and point sizes. No font assets or dependencies
  were added.
- Kept Dynamic Type through SwiftUI scaled metrics. Controls grow with text;
  scoped sizes carry into iOS popup hosts. The explorer's `--large-text` flag
  exercises accessibility size 3 without changing device preferences. All three
  default density heights remain 28/36/44 points.
- Corrected placeholder contrast, disabled button opacity, leading icon padding,
  link color and button feedback timing against the React recipes. Checkbox
  geometry and field/footer gaps now follow density.
- Added the CSS half-leading treatment to card headers, field labels and dialog
  text. The Card fixture now has the React header/action columns, form grouping
  and footer spacing. Its default capture is approximately 352 points tall,
  compared with approximately 384 before; the archived React card is about 356.
- Avatar fallbacks are opaque and use fixed-size artwork. The regression caught
  a separate initials text node; rendering initials in Canvas leaves one named
  image in the accessibility tree. Full VoiceOver interaction remains untested.
- Final checks: all 26 root tasks, 4,167 JavaScript tests, 50 Swift tests, four
  iPhone UI cases and four iPad UI cases passed. iOS/macOS apps compile. The full
  registry build passed in 115.15 seconds, and all 142 published items resolved
  with all 14 standalone source closures building. `git diff --check` passed;
  nothing is staged.

[Card comparison](https://github.com/user-attachments/assets/d8b59699-058e-4ad1-9ada-255096fd09d3) shows the archived
React reference beside native before/after captures at the same component width.
The reference uses saved color settings, so this is structure/spacing evidence,
not a completed color comparison. Original native captures:
[before](https://github.com/user-attachments/assets/5bc4e5a6-2424-425f-83ea-a1e783e3339d),
[after](https://github.com/user-attachments/assets/454c35a4-1e2a-4edc-ab61-c1c9147dfc63).
Other inspected captures: [large Select](https://github.com/user-attachments/assets/cbb39fc7-abdb-4dfd-91f0-59424bea266a),
[large popup](https://github.com/user-attachments/assets/03c8bb2d-5f5a-445a-b487-fd433cd4a714),
[large avatar artwork](https://github.com/user-attachments/assets/ecc8c6af-7267-4e99-8360-eef0b3263300),
[updated dark dialog](https://github.com/user-attachments/assets/e9c29de4-b6eb-49ab-b669-d3b8f735872e).
Final UI summaries: [iPhone](native-platforms/swiftui-iphone-type-regressions.json),
[iPad](native-platforms/swiftui-ipad-type-regressions.json).
[Consumer results](native-platforms/swiftui-typography-consumer-summary.json).

Fresh neutral web captures, complete density/large-text/Bold Text coverage,
keyboard/VoiceOver qualification and advanced-component comparisons remain open.
Browser control is still taken over; the pending handback request is unchanged.

This review is ongoing. Remaining advanced behavior is also listed in the
SwiftUI renderer's `parity-exceptions.json`.

## Selection controls

The React recipes in `registry/styles/fabricator/{checkbox,radio-group,switch}.css`
and their source overrides define this pass. Fresh browser capture is still
paused, so these changes have native screenshot/recording evidence and source
comparison, rather than a fresh web motion comparison.

- Checkbox marks now use the web's short-leg-first path, move-duration stroke
  drawing, feedback entrance/exit, scale and blur. Both paths remain mounted;
  a revision check prevents an old exit from clearing a newly checked mark.
- Radio groups move one persistent dot. The first recording exposed a shrinking
  dot from SwiftUI's matched-geometry insertion transition. Replaced that with
  measured circle anchors and a persistent overlay, then recorded again. The
  dot now travels at full size on move timing with the entrance curve.
- Switch thumbs retain their 2-point inset and density travel, stretch on hover
  and squash on press. Track colors use feedback timing and the knob uses move.
- All three show hover, invalid, focused and 50% disabled states. Labels use the
  canonical medium weight. On iOS, adjacent row centers are at least 44 points
  apart at default density, while control artwork keeps the web dimensions.
- UI regressions first failed on missing selected traits. A second regression
  caught SwiftUI replacing the mixed checkbox's value with its Boolean value;
  the public checkbox now applies the mixed value outside the Toggle wrapper.
  Three selection regressions passed after those fixes.

Inspected captures: [checkbox before](https://github.com/user-attachments/assets/7a210966-bda0-45bf-a4d2-17c0991eb508),
[checkbox after](https://github.com/user-attachments/assets/66e18431-b82d-4e21-86c0-4db2fa14b224),
[large dark checkbox](https://github.com/user-attachments/assets/579da751-7e51-447a-8d3d-62ad3b4dcddf),
[light radio](https://github.com/user-attachments/assets/a534e153-7e02-4ef0-bba6-8df775a56d76),
[dark radio](https://github.com/user-attachments/assets/af5059a5-997a-4efd-be7f-d65331b88b4c),
[light switch](https://github.com/user-attachments/assets/ed13d3ce-7772-42cb-8dcc-10598c2124b1),
[dark switch](https://github.com/user-attachments/assets/0367bbbb-d9b8-48a2-8ed5-644fc9977060),
[large dark switch](https://github.com/user-attachments/assets/68a3e4e6-8a5a-4afd-a5b9-82f652e28c45).
Native motion evidence: [checkbox video](https://github.com/user-attachments/assets/725293d8-90e5-4be4-8154-8e772173f663),
[30 fps checkbox frames](https://github.com/user-attachments/assets/011be332-3134-4780-b5e9-b08294f32542),
[radio video](https://github.com/user-attachments/assets/319a5009-9b7f-4a79-b703-6431176d1492),
[30 fps radio frames](https://github.com/user-attachments/assets/1481e821-26dc-4c47-8642-dcbda2cb7871),
[switch video](https://github.com/user-attachments/assets/0126bdf2-c72d-4c94-9810-18015863d8b8),
[30 fps switch frames](https://github.com/user-attachments/assets/7ce883c6-1661-43a4-93b2-30a4b9e87d89).
The switch recording includes a held press and release: its knob squashes,
travels and returns to a circle as the track color changes.

Full keyboard traversal, VoiceOver speech, rapid interruption, all density/text
combinations and current React frame comparisons remain unqualified.

Final validation for the selection source passed all 26 root check tasks,
4,167 JavaScript tests, 51 Swift tests and the iOS/macOS app builds. Seven UI
cases passed on each iPhone and iPad, covering the three controls plus avatar,
large popup text, field editing/feedback and repeated dialog dismissal. All 142
published items resolved and all 15 distinct standalone source closures built.
The final full registry build, including the qualification metadata, passed in
120.59 seconds. Encoded RGB samples from the sRGB screenshots match the canonical
page surfaces: 250/250/250 in light and 23/23/23 in dark. This verifies the native
surface samples, not full web color parity. `git diff --check` passed and nothing
is staged. No branch/worktree, dependency installation, commit or push occurred.
[iPhone results](native-platforms/swiftui-iphone-selection-regressions.json),
[iPad results](native-platforms/swiftui-ipad-selection-regressions.json),
[consumer results](native-platforms/swiftui-selection-consumer-summary.json).

## Table and Empty

- Table headers now use 13-point semibold foreground text; body cells use muted
  13-point text with the density's 12/8 horizontal/vertical padding. Dividers use
  60% border and the final body row has no trailing divider without a footer.
- SwiftUI Grid keeps columns aligned. The Core Text adapter measures the active
  font, including Dynamic Type, and the horizontal viewport preserves natural
  widths. Measurements sit outside pointer/viewport state. Added optional footer
  rows, preferred column widths and medium-weight identifier columns.
- The invoice preview now uses all seven React invoice rows, its 100-point
  identifier column, total and caption. The large-text overflow test failed on
  the previous compressed layout, then passed after the change. Full pointer
  glide, keyboard and VoiceOver qualification remain open.
- Empty now uses the 40-point surface-4 tile and shadow, 14-point semibold title,
  relaxed 13-point description and shared density spacing. Its project actions
  match the React fixture, including the muted link's trailing arrow. Inspected
  both narrow large-text wrapping and an actual Create Project feedback toast.

Inspected captures: [initial native table](https://github.com/user-attachments/assets/1d5b3be9-b7a9-4853-8ed6-ef7cab0b674f),
[iPad light table](https://github.com/user-attachments/assets/d8ea7c87-5007-4ffa-9a31-f32d969a9ca7),
[iPad dark table](https://github.com/user-attachments/assets/1aed051a-5695-4ce8-9827-a0d335104d20),
[phone light table](https://github.com/user-attachments/assets/0e669ab9-1cd4-498c-83fd-a0ed8b18ae5e),
[large table before scroll](https://github.com/user-attachments/assets/063f5116-6be8-4448-afb1-cf06ba5e8b45),
[large table after scroll](https://github.com/user-attachments/assets/80548aa5-32f9-4005-9fed-76780d37cb0c),
[large iPad table fitting its viewport](https://github.com/user-attachments/assets/abb0d954-e84e-466c-bf3f-111e272245ba),
[initial Empty](https://github.com/user-attachments/assets/70927e94-1f21-4265-a52f-869ec91125f8),
[updated Empty](https://github.com/user-attachments/assets/b9da73bf-259c-4efb-9b41-3a2d1f665f8e),
[large dark Empty](https://github.com/user-attachments/assets/5e36a650-a7d3-4844-8405-2f18893810f8),
[large action feedback](https://github.com/user-attachments/assets/7c2b445c-bbde-4aca-b1d3-66f974040665).
The initial captures use the old native fixtures; they document the original
renderer, rather than a same-data comparison. Current fixtures are prepared for
fresh React comparison, which is still waiting on browser handback.
The iPad run exposed an overly strict test expectation: the enlarged fixture
fits the wider viewport, so it should not require scrolling. The test now
checks phone overflow and wide-screen readability separately.

Final validation passed 26 root check tasks, 4,167 JavaScript tests, 51 Swift
tests, iOS/macOS app builds, and all 15 standalone source closures for 142 items.
Eight distinct UI cases passed on each device. The phone's table case passed
again after the adaptive test correction; the iPad's full corrected suite passed
all eight together. The full registry build passed in 121.80 seconds and its
component/font adapter/docs/qualification payloads match the authored sources.
The final compact link fixture was rebuilt and inspected, including its actual
feedback action. No dependency install, branch/worktree, commit or push occurred;
`git diff --check` passed and nothing is staged.

Results: [iPhone suite](native-platforms/swiftui-iphone-content-regressions.json),
[focused adaptive retest](native-platforms/swiftui-iphone-table-adaptive-regression.json),
[iPad suite](native-platforms/swiftui-ipad-content-regressions.json),
[standalone consumers](native-platforms/swiftui-content-consumer-summary.json).
Additional inspected action: [compact link feedback](https://github.com/user-attachments/assets/ffbec129-b7ed-43e2-9fb1-5a7c466ebf21).
Browser inventory still reports all 18 tabs taken over. Fresh web screenshots,
web keyboard/axe, native pointer/keyboard/VoiceOver and minimum-OS/physical-device
qualification were not run; broader catalog comparison remains open.

## File Tree

The native explorer now uses the same `src/app.tsx`, `styles.css` and
`package.json` fixture as React's single-selection example. The initial native
capture used the old fixture and generic outline glyphs; it is baseline evidence,
not a same-data screenshot comparison. No archived React File Tree capture exists,
and fresh browser control remains paused.

- Extracted File Tree from the content module. Its own payload owns the canonical
  filename/folder resolver, 249 file artworks in both themes, and the Charmed
  license. The existing PNG adapter renders 48-pixel assets for 16-point glyphs.
  PNGs total 522,304 bytes, plus 53,628 bytes of metadata and a 1,056-byte license.
  No dependency was installed and no web JavaScript was added. Disabling system
  font scans preserves every PNG byte while removing repeated host-font work.
- Replaced silent named-image lookup with one cached ImageIO decoder after the
  first screenshot showed blank artwork despite valid resource URLs. Tests check
  filename precedence, both artwork modes, dimensions and actual image decoding.
- Matched the shared indentation, guides, chevron/icon/name spacing, muted and
  disabled states, rounded selection surface and motion roles. iOS rows keep
  44-point touch targets; macOS uses the density height. Text remains dynamic.
- Nodes distinguish files from explicitly empty folders and inherit disabled
  state. Pure navigation tests cover visible parents/children, disabled skipping,
  clamping, typeahead and focus restoration. The tree adds `onOpen` and an optional
  `maximumHeight`; native source does not import the example app.
- The motion review exposed delayed activation from combined tap recognizers.
  Native Button activation keeps fast taps responsive while the key handler owns
  tree navigation. The final recording shows a persistent highlight moving among
  rows and the chevron rotating during collapse. It does not qualify pointer
  hover, every interruption case or motion against fresh React frames.
- XCUITest covers arrow/folder navigation and typeahead, double-tap opening, empty
  folders and disabled rows. Named Return/Enter/Home/End synthesis did not deliver
  the expected events in that harness. Relay input separately exercised Return
  opening and Home/End selection, with visible focus and callback feedback.

Inspected captures: [initial native tree](https://github.com/user-attachments/assets/1587c3bb-9cd8-40ac-86f5-29aba831709c),
[iPhone light](https://github.com/user-attachments/assets/2db40ce6-787b-4381-b65c-4e0d0bb69c65),
[iPad light](https://github.com/user-attachments/assets/bc1a2358-fbac-4b4f-a0de-b498545316c6),
[iPad dark](https://github.com/user-attachments/assets/d3df9630-43f2-4921-bed6-c7877c0eaa0a),
[large iPad light](https://github.com/user-attachments/assets/f4876c18-0fe3-4fc8-bc00-5b2545c23020),
[large iPad dark](https://github.com/user-attachments/assets/74970a27-0bf3-44e0-bfb7-dbd9d8fc4e09),
[large phone dark](https://github.com/user-attachments/assets/d8972ccc-ba12-4383-8440-918468671a58),
[Return callback and focus](https://github.com/user-attachments/assets/bf3c008a-3fa5-4f73-b609-890e2d175a30),
[Home](https://github.com/user-attachments/assets/5f9e2343-02a1-47eb-91fc-01b29582f93b),
[End](https://github.com/user-attachments/assets/0eac271a-81fa-48c2-8a3b-383cc565a8a1).
Native motion: [recording](https://github.com/user-attachments/assets/c831fd37-4586-4f62-a602-fe05813c43f7)
and [30 fps frames](https://github.com/user-attachments/assets/0e0d45a2-e4af-4f79-8fd8-172bd9809984), read
left to right, then top to bottom, starting at 0.95 seconds into the recording.

Multiple/range selection, deletion/undo, context callbacks and drag/drop remain
implementation gaps. Complete keyboard traversal, VoiceOver speech, minimum-OS
runtime and physical-device performance remain unqualified. Browser handback,
fresh neutral web captures, web keyboard/axe checks and the broader catalog
comparison are still required. See the renderer's dated parity exceptions.

Final File Tree validation passed all 26 root check tasks, 4,168 JavaScript tests,
60 Swift tests and both Apple host builds. Eleven UI cases passed on each iPhone
and iPad; the three File Tree cases were retested on each after restoring native
Button activation. The final full registry build passed in 124.28 seconds. All
142 published items resolved and all 16 distinct source closures compiled from
that final generated output. Generated file assets remain gitignored, manifests
were rebuilt, `git diff --check` passed and nothing is staged. No branch/worktree,
dependency installation, commit or push occurred.

Results: [iPhone suite](native-platforms/swiftui-iphone-file-tree-regressions.json),
[iPhone final tree retest](native-platforms/swiftui-iphone-file-tree-final-regressions.json),
[iPad suite](native-platforms/swiftui-ipad-file-tree-regressions.json),
[iPad final tree retest](native-platforms/swiftui-ipad-file-tree-final-regressions.json),
[final standalone consumers](native-platforms/swiftui-file-tree-consumer-summary.json).

| Definition of done                   | File Tree result                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root check and test                  | Passed: 26 tasks and 4,168 tests                                                                                                                    |
| Full registry generation and indexes | Passed; final native payload and manifest rebuilt, no generated output staged                                                                       |
| Contract and owning-area checks      | Passed for this SwiftUI change: canonical resources and isolated source consumers; complete behavior parity remains in the dated exceptions         |
| Running UI                           | iPhone/iPad light, dark, large text and native keyboard evidence inspected; fresh web, web axe, macOS window interaction and VoiceOver were not run |
| User-visible changelog               | Updated the SwiftUI preview section in unreleased.mdx                                                                                               |
| Owning convention docs               | Updated PLATFORMS.md, REGISTRY.md and the SwiftUI README                                                                                            |

The next content review starts with Markdown and Syntax Highlight: their current
native fixture differs from React, and Markdown currently uses density-scaled
interface text instead of the web's density-independent document type role.

## Markdown and Syntax Highlight

The initial native content used a separate line parser, regex token coloring,
13-point interface text and 12-point system monospace. Its Copy icon opened a
share sheet. The native previews now load the actual primary React fixtures,
extracted through TypeScript's parser at app generation time. Initial native
captures have different content and establish the old renderer, not a same-data
comparison. There is no archived React capture for these components; fresh web
control still reports all 18 tabs taken over.

- One optional JavaScriptCore adapter runs the canonical Markdown parser/tree
  and syntax tokenizer. The duplicate native parser/tokenizer was removed.
  Native DTOs preserve nested numbered lists, ordered starts, readonly tasks,
  marked GFM table cells/alignment, Unicode, links, fence metadata and raw source.
  Errors are typed and reported at the rendering boundary.
- Markdown takes the canonical `sm`, `default` and `lg` document roles: 14, 16
  and 18 points, independent of interface density. Headings, half-leading,
  paragraph/section gaps, quote bars, list indentation, readonly tasks and rich
  tables follow the React recipes. Dynamic Type remains active. The native
  inline-code background still lacks the exact rounded, padded chip.
- Code uses the real Geist Mono variable upright/italic family and weight axes,
  licensed under OFL and pinned to the recorded Google Fonts source. Its
  14-point type, token colors, italic comments, header, line numbers, highlighted
  rows and diff accents follow React. Language can be explicit, inferred from a
  filename or plain text. Code in the separate Editor renderer has not been
  migrated in this pass.
- Copy writes the complete original source, shows the green check with the
  shared feedback fade/scale, and resets after two seconds. Repeated clicks
  restart that interval. The UI regression pastes the copied value into the
  native multiline field and compares it to the actual React fixture.
- Wrapping retains the number gutter. Uncapped code leaves vertical scrolling
  to its parent; capped code scrolls within its viewport. Its edge mask uses the
  installed CSS geometry, `min(12%, 40px)` revealed over 96 pixels. Inspected
  middle/end captures show both fades, then the cleared bottom fade at the end.
  Attributed code preparation lives outside scroll/copy state.
- Syntax Highlight owns the optional adapter, typography, fonts, notices and
  tests; Markdown depends on it. The payload adds 949,218 bytes before packaging,
  approximately 927 KiB, with no new package dependency or web JavaScript. The
  engine is 571,688 bytes; upright/italic fonts total 354,604 bytes. Foundations
  do not eagerly load these optional resources.

Inspected captures: [old Markdown](https://github.com/user-attachments/assets/007a4cb7-146f-4a67-8a65-169aab84ffe7),
[old code](https://github.com/user-attachments/assets/be0178d0-cc7c-4d52-9327-4084f5ff5584),
[final iPad Markdown](https://github.com/user-attachments/assets/6b21dd82-a082-4b5e-97ab-161e366fc781),
[final phone code](https://github.com/user-attachments/assets/674e1eac-550f-4a3f-9386-6628034cbd5c),
[dark diff/wrap and capped code](https://github.com/user-attachments/assets/43b5d33e-f96c-41a5-b71a-6e2531b28888),
[middle scroll](https://github.com/user-attachments/assets/245adcee-a6f7-4eb6-a16f-0c2d3db73581),
[end scroll](https://github.com/user-attachments/assets/9c783e08-5c13-42c6-93c4-85b7a1e1d5f5),
[three document sizes in compact density](https://github.com/user-attachments/assets/38c7d397-8f42-4446-b5e0-5c466d6be30c),
[large dark Markdown](https://github.com/user-attachments/assets/a7c79599-a589-4594-b24b-359ebfdf99d9),
[large dark table](https://github.com/user-attachments/assets/32bc4ddb-ff7b-4458-ba28-b3e64878e5f6),
[large dark code](https://github.com/user-attachments/assets/4bb1df8a-2d25-4d5e-9d31-8d5d71ff1ec4).
Copy motion: [recording](https://github.com/user-attachments/assets/2fdab2b1-f82c-4739-b103-a65ab027a747),
[check entrance frames](https://github.com/user-attachments/assets/4058ab45-b62c-41a9-a515-149c1055f787)
and [reset frames](https://github.com/user-attachments/assets/e1458427-5def-4134-abe1-99308b8ed98c).

Six new Swift tests exercise the real local engine and font resources. All 66
Swift tests and both Apple host builds pass. Fourteen UI regressions pass on
each iPhone and iPad, including canonical rich content, the complete clipboard
roundtrip/reset and wrapped/capped code scrolling. An explicit accessibility
container fixed a test exposing the code identifier attaching to its title
instead of the scroll region. Readable code children remain available.

Root checks pass all 26 tasks. The first root test run had one unrelated
five-second BotFace morph timeout while checks and consumer builds also ran;
all six tests in that file passed alone in 1.95 seconds. After consumer builds
finished, the full root suite passed all 4,168 JavaScript tests. All 142 published
items resolved and all 18 distinct source closures compiled from the final
generated registry. The full registry build passed in 137.50 seconds. Generated
resources remain gitignored, manifests were rebuilt, `git diff --check` passed
and nothing is staged. No branch/worktree, dependency installation, commit or
push occurred.

Exact inline-code chips, custom Markdown renderers/kits, custom syntax grammars,
composable code headers and complete text-selection behavior remain gaps.
VoiceOver speech, media loading/failure states, minimum-OS runtime, macOS window
interaction and physical-device performance are unqualified. Fresh web captures,
web keyboard/axe and the broader catalog review remain open. This is a verified
native improvement against canonical source, not completed screenshot parity.

UI results: [iPhone](native-platforms/swiftui-iphone-document-regressions.json)
and [iPad](native-platforms/swiftui-ipad-document-regressions.json).
Consumer results: [18 clean builds](native-platforms/swiftui-document-consumer-summary.json).

| Definition of done                   | Markdown/Syntax Highlight result                                                                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root check and test                  | Passed: 26 tasks and 4,168 tests after the isolated timeout and full rerun                                                                                                          |
| Full registry generation and indexes | Passed; final payloads and manifest rebuilt, generated resources ignored and nothing staged                                                                                         |
| Contract and owning-area checks      | Passed for this SwiftUI change: canonical engines/fonts, typed adapter and isolated consumers; remaining behavior/API gaps are dated in the exceptions                              |
| Running UI                           | iPhone/iPad light, dark, large text, clipboard, wrapping, scrolling and feedback frames inspected; fresh web, web keyboard/axe, macOS window interaction and VoiceOver were not run |
| User-visible changelog               | Updated the SwiftUI preview section in unreleased.mdx                                                                                                                               |
| Owning convention docs               | Updated PLATFORMS.md, REGISTRY.md, the font provenance and SwiftUI README                                                                                                           |

The next advanced content review is Editor. Its native fixture differs from the
React notes example, and its UIKit/AppKit code fonts and document spacing still
need comparison. The exact inline-code chip also remains on this worklist.

## Editor and compact SVG paths

The initial native Editor used a different document, no document inset, a
small block-type/menu toolbar, a 10-point word/character footer and system code
fonts. The new primary preview loads the actual React notes fixture, including
all heading levels, marks, nested lists, tasks, quote, TSX code, rule and table.
Its document viewport is capped at 512 points and its width at 672, as in React.
The old native capture is baseline evidence with different content. Fresh React
captures remain unavailable while all 18 browser tabs are taken over.

- Added `size` using the shared document-size role and an optional
  `maximumHeight`. Document type is independent of interface density and scales
  with Dynamic Type. Uncapped UIKit/AppKit content sizes naturally. The existing
  public `minimumHeight` default remains 280; the primary fixture explicitly uses
  six default body lines. Short-document default geometry remains on the worklist.
- UIKit supplies actual Inter variable axes and real italic cuts, plus Geist
  Mono, through a font resolver at the shared TextKit boundary. The generator's
  string patch for named Apple weights was removed. UIKit rendering tests inspect
  family/axes, all three sizes/densities, code's own type role and text/selection
  preservation after live text-size changes. AppKit uses the same typography and
  font adapter; its window interaction and decorations remain unqualified.
- Matched the default React toolbar groups, default-size toggles, active fills,
  stroke weights, dividers, footer typography and focus ring. Document padding
  uses its own em. The word count uses Unicode letters/numbers and excludes
  punctuation, emoji-only words and object placeholders; the actual fixture has
  94 words in both renderers. The keyboard accessory uses spacious targets,
  caret/selection commands and a working dismissal button. It retains the scoped
  theme and avoids replacing its hosting root during ordinary selection changes.
- Canonical code projection preserves comment slant and strong/emphasized
  tokens, including styled plain tokens nested in a grammar node. UIKit and
  AppKit share one syntax color-role map. Code retains its density type/header
  sizes across document sizes. Read-only task/block actions preserve the model;
  code copying remains allowed through the clipboard boundary.
- Screenshot review caught blank Bold/indent symbols from old alias names.
  Controls now use canonical catalog names, and a regression verifies every
  configured command and its artwork. The Bold glyph then appeared as a dash:
  the SVG parser had consumed packed arc flags as an ordinary number. The fix
  reads each flag separately, per the
  [SVG path grammar](https://www.w3.org/TR/SVG2/paths.html#PathDataBNF).
  Geometry regressions compare packed/separated absolute and relative arcs,
  repeated arcs, signed/decimal coordinates and the real Bold artwork's bounds.
- Editor owns its optional Geist Mono resources too; installing it together with
  Syntax Highlight deduplicates those files. Fonts/license add 358,991 bytes,
  approximately 351 KiB. The canonical editor engine is 627,504 bytes and its
  dependency notices are 18,233 bytes. No dependency or web JavaScript was added.

Inspected captures: [old native Editor](https://github.com/user-attachments/assets/f2216d85-2cb8-420a-bc20-dedfaadf3a77),
[phone primary and corrected artwork](https://github.com/user-attachments/assets/ac406bbe-7e2b-4275-ba32-86458c8d10a4),
[dark iPad primary and small read-only document](https://github.com/user-attachments/assets/0daefa94-a64c-459e-8994-4c166f45b782),
[large read-only document in compact density](https://github.com/user-attachments/assets/e89d3859-4c19-410c-ab29-48c42cff6760),
[native Select All and keyboard accessory](https://github.com/user-attachments/assets/ac847781-2f23-4e12-a7fa-1ba3940ee698).
The Select All capture predates the final Bold path fix. Additional final
viewport, keyboard, motion and large-text evidence is recorded below.
The final [iPad code and table capture](https://github.com/user-attachments/assets/3d5310eb-4fa6-42d3-bab5-62bf1283159e)
shows the same canonical content at the end of its scrolling viewport.

The native edit/history regression now passes using UIKit's actual Select All
menu, toolbar Bold, Undo and Redo. XCUITest's synthesized Cmd+A did not deliver
the expected selection, while Relay input visibly selected the complete
document. The menu exposes `MenuItem`, rather than `Button`, in this runtime.
Replacing multiple blocks and typing subsequent characters form separate
canonical history groups; the test restores the complete original document and
then the complete edit through those native history actions. There is no
product workaround for the test harness.

The final keyboard capture exposed a hosting safe-area offset: the accessory
already had its UIKit position, while its SwiftUI content moved upward again.
Setting the hosting controller's supported `safeAreaRegions` to empty aligns
the 44-point controls and padding directly above the keyboard. Inspected
[aligned caret controls](https://github.com/user-attachments/assets/a7d6e2c4-3cc6-4dd8-9f9a-0ae9ac5b87f5),
[active Bold and selection](https://github.com/user-attachments/assets/fdd14cd9-eeae-4d36-9fd2-5c53fabf7fa3),
[large dark phone text](https://github.com/user-attachments/assets/3a322550-1e8c-4b8e-bcb7-cdb4ce60ef92),
the [final native press recording](https://github.com/user-attachments/assets/dac147dc-6d73-48d8-872f-8ecdc5c33014)
and [60 fps frames](https://github.com/user-attachments/assets/70d08edb-6c4d-49ee-8764-47b477d32454).
Frames begin at 0.9 seconds and read left to right, then top to bottom; empty
cells follow the end of the recording. The press scale, active fill and glyph
state were inspected, without claiming matching React motion frames.

All 71 Swift tests pass. Both iPhone and iPad pass 23 cases: four live UIKit
rendering tests and 19 UI regressions. This excludes the separate 141-route smoke
case; it does not establish full catalog behavior or visual parity. The iPad's
broad suite preceded the final accessory alignment fix; both Editor cases pass
again afterward on the final build. Root checks pass all 26 tasks and the final JavaScript suite
passes all 4,169 tests. The final full registry build passes in 131.74 seconds,
and all 142 items resolve with all 18 standalone source closures building.
The final macOS app build passes too. Generated resources remain gitignored,
manifests were rebuilt, `git diff --check` passes and nothing is staged. No
branch/worktree, dependency installation, commit or push occurred.

Results: [iPhone full suite](native-platforms/swiftui-iphone-editor-regressions.json),
[iPad full suite](native-platforms/swiftui-ipad-editor-regressions.json),
[iPad final Editor retest](native-platforms/swiftui-ipad-editor-accessory-final-regressions.json)
and [final clean consumers](native-platforms/swiftui-editor-consumer-summary.json).

| Definition of done                   | Editor/SVG result                                                                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root check and test                  | Passed: 26 tasks and 4,169 JavaScript tests                                                                                                                                                                                                                      |
| Full registry generation and indexes | Passed in 131.74 seconds; final payloads/manifests rebuilt, generated resources ignored and nothing staged                                                                                                                                                       |
| Contract and owning-area checks      | Passed for this change: canonical engine/fixtures, native font/model/path regressions and all 18 consumer closures; full behavioral/visual parity remains in the dated exceptions                                                                                |
| Running UI                           | Phone/tablet light, dark, large text, selection/editing/history, code/table scrolling, read-only sizes, keyboard and press frames inspected; fresh web, web keyboard/axe, macOS window interaction, VoiceOver and minimum-OS/physical-device checks were not run |
| User-visible changelog               | Updated the SwiftUI preview section in unreleased.mdx                                                                                                                                                                                                            |
| Owning convention docs               | Updated PLATFORMS.md, REGISTRY.md, both SwiftUI READMEs and the shared editor-native README                                                                                                                                                                      |

Code still wraps inside the one native text view. Floating slash/bubble/link
surface parity, code Copy feedback, task animation, rich marks inside drawn
table cells, block dragging and custom-kit extension UI remain incomplete.
In-document images still use an attachment box with editing in a sheet. Complete
keyboard/VoiceOver, every code token decoration, minimum-OS, physical-device
performance and fresh web screenshot/motion comparisons remain open.

Further source review found that the SwiftUI state initializer selects offset
zero before focus, while React's canonical state starts with no selection. The
initial H1 toolbar pill and short-document minimum geometry need a follow-up,
alongside the remaining floating surfaces, code feedback and token decorations.

## Editor selection, minimum height and Copy

- Regression tests first reproduced the forced initial selection and 280-point
  default minimum. Both initializers now preserve the canonical null selection;
  native focus supplies the caret. AppKit's first-responder boundary reports
  focus before typing, verified with a nonvisible native-window regression.
- `minimumHeight` is now optional. Its default is the React content recipe's
  six document lines: 134.4/158.4/183.6 points for sm/default/lg, independent of
  interface density and scaled by Dynamic Type. Explicit overrides stay intact.
  An automatic minimum growing past `maximumHeight` wins, as in CSS. Both native
  view adapters use the same height calculation. The gallery includes an empty
  short editor that exercises the actual default.
- UIKit code headers now host SwiftUI Copy buttons through UIHostingConfiguration.
  The TextKit core positions them with the visible code fragments while scrolling;
  it retains the existing drawn affordance/event contract for Expo. SwiftUI uses
  Fabricator icons, compact control styling and 44-point touch targets. Successful
  copying shows `success-text` and Check for two seconds; repeated clicks restart
  that task, while a source change clears feedback. Copy keeps document focus,
  selection and history intact and reports clipboard failure without success.
  No dependencies, fonts or web JavaScript were added.
- All 76 Swift tests pass, including multiline/Unicode clipboard boundaries,
  initial selection, six-line sizing across all densities, Dynamic Type and the
  AppKit responder regression. Each device passes eight focused cases: four
  UIKit rendering tests and four Editor UI tests. The clipboard test pastes the
  complete primary code fixture into another screen. It explicitly scopes the
  primary Editor because the iPad also exposes the read-only preview's Copy.
  The earlier broad suite and catalog smoke test were not repeated for these
  localized changes.
- Root validation passed all 26 check tasks and 4,169 JavaScript tests. Both Apple
  hosts build. The final full registry build passed in 111.85 seconds, including
  the AppKit focus follow-up; manifests and payloads were regenerated.

Inspected evidence: [unselected toolbar and short minimum, iPad light](https://github.com/user-attachments/assets/8e025d11-06fe-4732-9de0-65ff934b99b6),
[code Copy, iPad light](https://github.com/user-attachments/assets/d54a0396-1d5d-4114-b22d-8edae3e4a22a),
[successful Copy, iPad light](https://github.com/user-attachments/assets/b8200f17-6292-49ca-a6c6-2835a15ecbd9),
[code Copy, phone dark](https://github.com/user-attachments/assets/a93fe224-3ff7-4a89-a9ca-ca867a893603),
[successful Copy, phone dark](https://github.com/user-attachments/assets/00b855c9-919f-41f2-ac4f-134d48fbe49e),
and [six-line minimum at large text, iPad dark](https://github.com/user-attachments/assets/454dbfe0-d11c-4ed7-ad2a-012fb5bc4294).
The [4.15-second recording](https://github.com/user-attachments/assets/96773067-7935-4de8-9ac0-8c72ce913985)
and [8 fps contact sheet](https://github.com/user-attachments/assets/334b912d-a748-42de-8a01-52932f9c54ea)
show the native Copy/check/reset sequence, with empty cells at the sheet's end.
They verify native endpoints/timing; matching React motion
remains unqualified while browser control is paused.
Focused results: [iPhone](native-platforms/swiftui-iphone-editor-copy-regressions.json)
and [iPad](native-platforms/swiftui-ipad-editor-copy-regressions.json).
All 142 final published items resolve, and all 18 distinct source closures build
as [standalone consumers](native-platforms/swiftui-editor-copy-consumer-summary.json).

| Definition of done                   | Selection/sizing/Copy result                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root check and test                  | Passed: 26 tasks and 4,169 JavaScript tests                                                                                                                                                                  |
| Full registry generation and indexes | Passed in 111.85 seconds after the AppKit follow-up; manifests and payloads rebuilt, nothing staged                                                                                                          |
| Contract and owning-area checks      | Passed: 76 Swift tests, eight focused cases per device, both Apple host builds, 142 resolved items and all 18 consumer closures; remaining parity gaps stay documented                                       |
| Running UI                           | Native phone/tablet light, dark, large text, code scrolling and Copy/reset inspected; fresh web, web keyboard/axe, full keyboard/VoiceOver, minimum-OS, physical-device and macOS window checks were not run |
| User-visible changelog               | Updated the SwiftUI section of unreleased.mdx                                                                                                                                                                |
| Owning convention docs               | Updated PLATFORMS.md, REGISTRY.md, SwiftUI library and editor-native READMEs                                                                                                                                 |

Fresh React screenshots, web keyboard/axe checks, the remaining catalog, full
keyboard/VoiceOver, minimum-OS and physical-device performance remain open.
AppKit first-responder behavior is unit-tested; the macOS app window and its
code decorations have not been visually qualified. Editor floating surfaces,
task motion, rich table-cell marks, inline chips, token decorations, images,
dragging and custom-kit UI still need review and implementation.

## Editor tasks, code tokens and TextKit geometry

- Compared the task/check recipes and code-token styles in the canonical React
  Editor, Markdown and Syntax Highlight source. UIKit now hosts task controls
  through the existing decoration-control boundary alongside Copy. Task artwork
  uses document-em dimensions, the primary fill, 1.5-point outline, 90% press
  response and the Markdown check's scale/opacity transition. It uses the shared
  feedback/move/exit timings. Expanded hit areas stop before editable text.
  Checked/unchecked, selected and disabled semantics are exposed to accessibility.
  The compact read-only preview preserves its parent's motion and text scope.
- Task activation selects its task caret and uses canonical undo. Regression
  testing found that requesting focus before applying pending model selection
  rewound UIKit to its old caret. Both native adapters now flush pending content
  and selection before focus. A separate failing regression reproduced stale
  text/caret when replacing state objects with matching revisions; caches now
  include state identity, with a separate selection version at the UIKit boundary.
- Code-link tokens keep a noninteractive underline. Native attributed-string
  checks verify actual Geist Mono 550/italic cuts and absent URL attributes in
  both UIKit and AppKit. Checked tasks use full muted strike color, explicit
  strike marks use foreground at 50%, and task links retain their own color.
- Motion recordings exposed a problem that state/hit tests did not catch:
  a restyled task's control jumped to the viewport edge. The bridge now completes
  visible TextKit layout before positioning controls, requires available fragment
  measurements and keeps the hosted controls above the drawing surface. Repeated
  toggles now retain both their position and visible unchecked outline. The check
  animates independently of its box. Repeated activation, scrolled restyling and
  hit-area regressions supplement the visual evidence.
- The code-token preview exposed a second layout gap: an initial code panel
  started at y=-33.725 instead of the document's 12-point inset. TextKit omits
  initial paragraph spacing. The view now reserves the first code/raw block's
  chrome in its content inset, adjusts for native half-leading, and restores the
  ordinary inset when the block becomes text. The first-header regression passes.
- The gallery adds a code-token fixture and `--motion-off`, which controls the
  outer FabricatorRoot without changing device preferences. The recording verifies
  this component motion-off path; a live system Reduce Motion toggle was not
  exercised in this pass. No dependencies, fonts or web JavaScript were added.

Inspected final evidence:
[unchecked task and its caret, iPad light](https://github.com/user-attachments/assets/fe186316-8849-433f-9a24-a943f2beb7ab),
[code headers/tokens and disabled tasks, iPad light](https://github.com/user-attachments/assets/292b1cf2-4930-4d10-ab75-4f0a9646dcfb),
[code headers/tokens and disabled tasks, phone dark](https://github.com/user-attachments/assets/c324874a-ccf9-44a8-9863-ad33b1dfc482).
Native task motion: [entry recording](https://github.com/user-attachments/assets/612cd643-8900-48a2-a3b7-da15da9b84c5),
[entry frames](https://github.com/user-attachments/assets/04363a0f-db1b-46b5-a971-e859ef68e833),
[exit recording](https://github.com/user-attachments/assets/108d9a64-7a40-49ff-bf04-c958ec7c24bc),
[exit frames](https://github.com/user-attachments/assets/058579b7-f5e2-4d50-98a7-c139c77bd0de),
[motion-off recording](https://github.com/user-attachments/assets/0eb7f312-99b1-476e-86bb-77822030b66f)
and [motion-off frames](https://github.com/user-attachments/assets/6e74e6b4-2e63-4070-b59f-68920b3441a1).
The contact sheets sample 1.2-second windows at 60 fps. They show native press,
check and outline behavior; they are not a physical-device performance benchmark
or a completed comparison against React motion.

Final root checks pass 26 tasks and 4,169 JavaScript tests. The Swift package
passes 79 tests, both Apple hosts build, and the final full registry build passed
in 130.49 seconds. All 142 published items resolve and all 18 distinct source
closures build. Final iPhone and iPad confirmation each passes 15 cases: ten
actual UIKit rendering/coordination checks and five Editor UI cases. Results:
[iPhone](native-platforms/swiftui-iphone-editor-task-regressions.json),
[iPad](native-platforms/swiftui-ipad-editor-task-regressions.json) and
[standalone consumers](native-platforms/swiftui-editor-task-consumer-summary.json).

| Definition of done                   | Task/token/geometry result                                                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root check and test                  | Passed: 26 tasks and 4,169 JavaScript tests                                                                                                                                                                                                          |
| Full registry generation and indexes | Passed in 130.49 seconds after the first-header fix; manifests and payloads rebuilt, nothing staged                                                                                                                                                  |
| Contract and owning-area checks      | Passed: 79 Swift tests, 15 focused cases on each device, both Apple host builds, all 142 items resolved and 18 source closures compiled; remaining gaps stay dated in the renderer exceptions                                                        |
| Running UI                           | Native light/dark task/code previews, repeated toggles, caret position and entry/exit/motion-off frames inspected; fresh web/axe, full keyboard/VoiceOver, system-setting toggling, minimum-OS, physical-device and macOS window checks were not run |
| User-visible changelog               | Updated the SwiftUI section in unreleased.mdx                                                                                                                                                                                                        |
| Owning convention docs               | Updated DESIGN.md, PLATFORMS.md, REGISTRY.md, both SwiftUI READMEs and the shared editor-native README                                                                                                                                               |

Fresh React screenshots and web keyboard/axe checks remain paused by browser
takeover (18 of 18 tabs at the final inventory check). Full catalog review,
VoiceOver/complete keyboard paths, live system Reduce Motion, exact inline-code
chips/underline offsets, minimum-OS and physical-device performance remain open.
AppKit task/code decorations and window interaction remain unqualified. Editor
floating surfaces, rich table cells, images, dragging and custom-kit UI still
need implementation/review. Expo was not launched in this pass; its record API
and drawn control/event fallback remain in the shared core.

## Data Table fixtures, typed defaults and sort motion

- Replaced the four-row native fixture with React's exact seeded 10,000-account
  generator and all 12 value-column definitions. TypeScript's parser extracts
  only the canonical pure declarations; an isolated evaluation and Zod validation
  produce a 3,341,711-byte, demo-only JSON resource. Registry consumers receive
  no account data. No dependencies or web client code were added.
- Compared the React cell renderer, style map, pure model and installed table-core
  sorting implementation. Native uses the card surface/shadow, semibold type-icon
  headers, primary identifiers, muted secondary values, status dots, option labels
  and owner images. Tags retain every value, links retain their destination, and
  Boolean cells edit directly. Pinned and scrolling slices share selection tint;
  unused width carries the row rules. iOS headers/rows retain their touch height.
- The generated platform contract now exports React's per-type width, minimum,
  alignment and first sort direction. SwiftUI consumes those rules, including
  wider person/email cells and leading-aligned progress. Numeric/date headers
  begin descending; repeated taps reverse and clear. Explicit sizing remains in
  state and respects the type minimum. The native fallback is no longer 150 for
  every type, and resizing no longer substitutes an 80...480 range.
- Failing regressions reproduced ignored status-option ordering, different
  percent/progress/Boolean text, and missing typed calculations. Formatting now
  preserves precision, counts and currency/percent semantics. JavaScript's
  fractional ISO timestamps parse instead of appearing as raw text; relative
  dates use the canonical thresholds and shared reference date, while date
  calculations remain absolute.
- The large fixture exposed pagination entries that occupied space even when
  hidden. Pagination now constructs only its visible pages/gaps. Manual navigation
  to page 1,000 shows the lowest-value accounts and disables Next. Query work lives
  above local pointer, cell focus and viewport state.
- Device tests exposed cell identifiers lost through the container hierarchy and
  Boolean selected state lost through combined accessibility. Explicit containers
  preserve cell labels; editable Boolean cells retain the shared Toggle's own
  checked/selected semantics. Checkbox glyphs are centered. The focused tests cover
  search, filtered selection/deletion, pinned-column position, repeated Boolean
  activation, and typed sort direction/removal on both device sizes.
- Motion frames exposed a spurious incoming rotation inherited from another
  column's descending state. Headers now resolve their own descriptor. Native
  press dimming was removed to match React's plain sort button. The type icon
  fades/scales into an upright ascending arrow with shared move timing; the label
  stays steady. Motion-off switches directly. This flag tests FabricatorRoot,
  without changing the OS Reduce Motion preference.

Inspected native evidence:
[iPad light](https://github.com/user-attachments/assets/ae98c2da-622e-42c5-9ad8-38791235cca6),
[iPad dark](https://github.com/user-attachments/assets/fb17f1e2-ebda-4c29-ac34-1ab2da9e2efd),
[phone light](https://github.com/user-attachments/assets/6e2e3318-1ed4-40c7-a0e2-f67c82349299),
[phone dark](https://github.com/user-attachments/assets/ea04f64a-9cf5-4475-905f-ce67208e61b4),
[large text](https://github.com/user-attachments/assets/9734bdeb-ce71-4fdd-8478-33d3d78b5010),
[typed values/calculations](https://github.com/user-attachments/assets/c1823195-8f4e-40e1-aca1-26a8089dfe70),
[dark typed values](https://github.com/user-attachments/assets/0887dd4f-30a9-4831-bb7a-c1d2cf6ceebb),
[selected links/Boolean cells](https://github.com/user-attachments/assets/7eeaadd9-26ac-4b0b-9d83-4f12a7e2d3e9)
and [last page](https://github.com/user-attachments/assets/425a6ee6-6271-48c9-bdf8-b6cbf7baf19a).
The [initial native capture](https://github.com/user-attachments/assets/746aa962-cb88-4e4d-acba-2756c2afa9bb)
uses the old fixture and is not a pixel comparison of equal content.
Sort recordings: [normal](https://github.com/user-attachments/assets/b0a1b668-19f1-432c-b734-bb66e5228768),
[normal frames](https://github.com/user-attachments/assets/9e43d564-d9b8-4c5c-ac4e-bcb6590c5a76),
[motion off](https://github.com/user-attachments/assets/df939cb8-904b-4ec7-b4ef-62ec7f8aaa95) and
[motion-off frames](https://github.com/user-attachments/assets/aa59b1a3-1f3e-4415-8f59-5b5cebf9e7d4).
Contact sheets sample half-second native recording windows at 60 fps; simulator
recordings use variable frame timing. These are visual checks, not performance
benchmarks or a fresh React motion comparison.

| Definition of done                   | Data Table result                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root check and test                  | Passed: 26 tasks and 4,172 JavaScript tests                                                                                                                                                                                                          |
| Full registry generation and indexes | Passed in 135.99 seconds after typed defaults; native manifests/payloads and committed indexes rebuilt, nothing staged                                                                                                                               |
| Contract and owning-area checks      | Passed: 88 Swift tests, three UI cases on each device, both Apple builds, all 142 items resolved and 18 standalone source closures compiled                                                                                                          |
| Running UI                           | Inspected native phone/iPad light/dark, large text, typed values, selection, last page and normal/motion-off frames; fresh web/axe is blocked by takeover, and complete native keyboard/VoiceOver review remains required beyond these focused cases |
| User-visible changelog               | Updated the SwiftUI section in unreleased.mdx                                                                                                                                                                                                        |
| Owning convention docs               | Updated DESIGN.md, PLATFORMS.md, REGISTRY.md and both SwiftUI READMEs; dated renderer gaps remain explicit                                                                                                                                           |

Results: [iPhone](native-platforms/swiftui-iphone-data-table-regressions.json),
[iPad](native-platforms/swiftui-ipad-data-table-regressions.json) and
[standalone consumers](native-platforms/swiftui-data-table-consumer-summary.json).
macOS was compiled, not checked in a live window; minimum OS and physical-device
performance remain unqualified. Native uses local paging. Remote windowing,
complete settings/view variants, numbered rows, header-anchored panels, labeled
option choices in editors/filters, floating selection actions, pin-edge fades,
range paste and complete keyboard paths remain gaps. Fresh React captures remain
paused by takeover (18 of 18 tabs in the final inventory); the full-library
objective remains in progress.

## Calendar and Date Picker selection, layout and focus (2026-11-17)

Calendar now draws the shared square day tile, primary selection, active today
and range fills, two-letter weekday headings and centered month/year captions.
Caption selectors reuse Select, open near the selected option and measure enough
width for the selected check and enlarged text. The grid uses actual month weeks
unless `fixedWeeks` is requested. Multiple month groups fit horizontally or stack;
day glyphs retain their density size inside preferred 44-point iOS hit slots.
Slots can shrink to the glyph size under width constraints, and enlarged grids
retain horizontal overflow. Native layout dimensions therefore differ from web.

Pure selection rules were checked against the installed React DayPicker source,
including optional/required single dates, maximum-count reset in multiple mode,
range endpoints and night limits, disabled days and inclusive whole-day bounds.
Calendar arithmetic preserves local midnight across Lisbon's spring DST change.
The adaptation's copyright and MIT attribution are in the root NOTICE and synced
into the native payload. Five date formatters are reused within each calendar
instead of being constructed for every visible cell and accessibility label.

Date Picker now supports an empty value, placeholder, invalid/disabled fields and
bounds. It uses the shared field, calendar and popup surfaces and dismisses when
the selected day is chosen again. Explicit native editing focus and Return/Space
activation fix keyboard selection; focused days draw the shared one-point ring.
Relay Right/Return selected November 17, and two Left presses in the bounded
calendar moved from the 19th through the 18th to the 16th, skipping disabled 17.
The Sidebar 12 calendar now takes its natural height; May 2027's six rows fit
above the calendar groups without scaling or a fixed-height crop.

The main gallery fixtures use November 16, 2026 as a stable reference. The range
fixture spans January 12 through February 11. Native before/after captures compare
the previous implementation with this pass, not a fresh browser screenshot.

| Evidence                                  | Inspected files                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calendar before/after                     | [Native comparison](https://github.com/user-attachments/assets/eb5f7477-6903-4033-b633-1b809facc7d9)                                                                                                                                                                    |
| Phone light/dark                          | [Light](https://github.com/user-attachments/assets/83896854-9219-4d92-b60b-09daa6860564), [dark](https://github.com/user-attachments/assets/1b7fa9c9-6ce9-4fa3-a196-4b437388c89c)                                                                                                                       |
| Tablet light/dark                         | [Light](https://github.com/user-attachments/assets/800046d6-e4fa-4eaf-8515-ee652854c611), [dark](https://github.com/user-attachments/assets/b2c7ea01-dd57-4287-b4a2-f473ad86efae)                                                                                                                 |
| Larger text                               | [Phone calendar](https://github.com/user-attachments/assets/466adb13-b635-469a-92c5-f38b5874e04c), [phone picker](https://github.com/user-attachments/assets/806fbbdf-610e-4c0b-bab2-32f85cd395e8), [tablet year menu](https://github.com/user-attachments/assets/6c35fe5d-5bd3-4714-931f-88c4c128686c) |
| Keyboard focus and disabled-date skipping | [Picker focus](https://github.com/user-attachments/assets/9dab780d-2141-499a-a01b-2cbde4b1cc16), [calendar skip](https://github.com/user-attachments/assets/e5fe378a-42ea-4fcb-a15a-5639ca4e756a)                                                                                     |
| Six-week embedded layout                  | [Sidebar calendar](https://github.com/user-attachments/assets/2651f975-0e7a-49ae-b6e7-56f1f810ed97)                                                                                                                                                      |
| Popup motion                              | [Recording](https://github.com/user-attachments/assets/d0ea1032-3834-4f8f-aa47-3245fdacb0e3), [frames](https://github.com/user-attachments/assets/484dc9b4-89dc-4341-a81e-8c13692b719f)                                                                                                 |
| Motion off                                | [Recording](https://github.com/user-attachments/assets/e6d301c4-5de4-4db4-862d-5d6d2f4a255f), [frames](https://github.com/user-attachments/assets/4273a991-f242-4269-9920-87303e661777)                                                                                         |

Motion sheets sample the enabled recording at 0.45–1.05 seconds and the motion-off
recording at 5.3–5.9 seconds, each at 20 samples/second. Simulator recordings have
variable timestamps; these are visual transition evidence, not frame-rate or
latency measurements. Enabled motion shows the popup arriving through its shared
fade/transform; motion off shows the complete panel without that transition.

| Definition of done              | Result                                                                                                                                                                                                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root checks and tests           | Passed: 26 check tasks and 4,172 JavaScript tests. An initial Bot Face timeout passed on the full rerun.                                                                                                                                                                                                                        |
| Registry generation and indexes | Passed: full build in 530.02 seconds, including both renderer manifests. Published Calendar content equals authored source; nothing staged.                                                                                                                                                                                     |
| Contract and owning-area checks | Passed: 94 Swift tests, both Apple app builds, all 142 SwiftUI items resolved and 20 distinct standalone source packages compiled. Web/Expo/Android installation and upstream parity checks were not repeated for this SwiftUI-only pass.                                                                                       |
| Running UI                      | Inspected phone/tablet light/dark, enlarged text, native focus, disabled-date skipping, six-week embedding and popup motion/off. Seven UI cases pass on each device. Fresh web screenshots/axe remain held by takeover; full keyboard/VoiceOver, a live macOS window, minimum-OS and physical-device qualification remain open. |
| User-visible changelog          | Passed: Calendar and Date Picker changes described in unreleased.mdx.                                                                                                                                                                                                                                                           |
| Owning convention docs          | Passed: DESIGN.md, PLATFORMS.md, REGISTRY.md and both SwiftUI READMEs updated; renderer implementation gaps remain explicit.                                                                                                                                                                                                    |

Results: [iPhone](native-platforms/swiftui-iphone-calendar-regressions.json),
[iPad](native-platforms/swiftui-ipad-calendar-regressions.json) and
[standalone consumers](native-platforms/swiftui-calendar-consumer-summary.json).
Runtime checks use iOS/iPadOS 27 simulators; minimum deployment targets compile
but have not been exercised on their original runtimes. macOS was compiled.

Date Picker's editable text, custom formats, month/year granularity, time wheel
and composite range fields remain incomplete. Calendar custom day renderers,
modifiers, presets, alternate calendar systems and right-to-left navigation remain
gaps. Sidebar 12's existing fixed October 2024 title still differs from its
device-date calendar fixture; this pass qualifies its layout only. The final
browser inventory still has all 18 tabs taken over. Fresh React comparison and
the full-library objective remain in progress.

## Month/year pickers and readable grid sizing (2026-11-17)

`FabricatorDatePicker` now accepts `granularity: .day`, `.month` or `.year`.
Month and year modes use React's twelve cells in three columns, twelve-year page
boundaries, first-day values and inclusive whole-period bounds. A March 21–August
4 range therefore permits March through August; a December 2024–January 2026
range permits 2024 through 2026. Defaults show “Pick a month”/“Pick a year” and
format values as `MMM yyyy`/`yyyy`. Existing day bindings keep their behavior.

The grid uses muted resting labels, medium current-period text, active semibold
selection, shared surface geometry and directional move timing. Arrow keys move
one cell or a row of three, Page Up/Down moves twelve periods, and Return/Space
selects an enabled period. Relay Up/Return picked August and dismissed the month
panel. The year heading now changes immediately while the cells fade and slide.

Source comparison used the current local `date-picker.tsx`,
`shared/lib/date-picker-model.ts` and `styles/fabricator/date-picker.css`. Pure
Swift tests were written red before the period model. Screenshot review then
caught four-digit years wrapping at accessibility text size despite passing
selection tests. Grid measurement now uses the same Core Text tabular-number
feature as rendering, with one-line labels and horizontal scrolling under width
constraints. A new font-boundary test checks equal digit advances, and the UI
regression rejects wrapped cell/title heights. No dependency or web bundle was
added; Date Picker owns its grid/model/tests in the copy-in manifest.

| Evidence                   | Inspected files                                                                                                                                                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native sizing before/after | [Comparison](https://github.com/user-attachments/assets/dcb06297-dafb-4e26-9dc4-c8cbe9a26ec7)                                                                                                                                                                 |
| Month grid, normal text    | [Phone dark](https://github.com/user-attachments/assets/9b2b63af-606f-4ec8-bb15-a719baaedcac), [iPad light](https://github.com/user-attachments/assets/218bb01e-08a1-4427-b153-e064759d5949)                                                                                         |
| Year grid                  | [iPad normal](https://github.com/user-attachments/assets/ced75551-2335-4d47-9f46-37c62d4ccbcf), [phone large/dark](https://github.com/user-attachments/assets/369e3433-3f4a-4609-b81d-2847eb9e4d2c), [iPad large/light](https://github.com/user-attachments/assets/34b95290-77e8-499d-adf8-c9504460e177) |
| Keyboard selection         | [August selected](https://github.com/user-attachments/assets/8510332b-6b7a-427f-a487-f4e1df32e3df)                                                                                                                                                     |
| Page motion                | [Recording](https://github.com/user-attachments/assets/b09f7303-4876-480f-b7a5-4932728fcdf7), [frames](https://github.com/user-attachments/assets/a72ad773-8139-4652-a51e-3bf494ff44ed)                                                                                                   |
| Motion off                 | [Recording](https://github.com/user-attachments/assets/a22e0bd6-9537-45a8-b8b9-191ab0e12129), [frames](https://github.com/user-attachments/assets/2eefb1a8-04a4-480f-8821-19ee34e18884)                                                                                           |

Enabled frames sample 1.05–1.30 seconds at 20 samples/second; motion-off frames
sample 0.90–1.10 seconds. Simulator recordings have variable timestamps. These
show visual transitions and do not establish frame-rate or latency performance.
The sizing comparison is native before/after; it is not a fresh React capture.

| Definition of done              | Result                                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root checks and tests           | Passed: 26 check tasks and 4,172 JavaScript tests.                                                                                                                                                                                                           |
| Registry generation and indexes | Passed: final full build in 130.17 seconds; final grid, font adapter and font regression payloads match source. Nothing staged.                                                                                                                              |
| Contract and owning-area checks | Passed: 98 Swift tests, both Apple builds, four focused UI cases per device, 142 items resolved and all 20 standalone source packages compiled. React/Expo/Android installation and upstream parity were not repeated for this SwiftUI-only change.          |
| Running UI                      | Inspected native phone/tablet light/dark, accessibility text, keyboard selection and page motion/off. Fresh web screenshots/axe remain held by takeover; full keyboard/VoiceOver, live macOS, minimum-runtime and physical-device qualification remain open. |
| User-visible changelog          | Passed: month/year picking described in unreleased.mdx.                                                                                                                                                                                                      |
| Owning convention docs          | Passed: DESIGN.md, PLATFORMS.md, REGISTRY.md and both SwiftUI READMEs updated; the renderer gap no longer lists month/year granularity as missing.                                                                                                           |

Results: [iPhone](native-platforms/swiftui-iphone-date-grid-regressions.json),
[iPad](native-platforms/swiftui-ipad-date-grid-regressions.json),
[standalone consumers](native-platforms/swiftui-date-grid-consumer-summary.json).
Editable text, custom format parsing, time and composite range fields remain
incomplete. Full-library parity and fresh web comparison remain in progress.

## Editable Date Picker and canonical formats (2026-11-17)

`FabricatorDatePicker` now accepts `isEditable: true` and an optional
`dateFormat` using date-fns patterns. It runs React's existing `commitDateText`,
`parseDateText` and `formatDateValue` behind the shared JavaScriptCore boundary.
ISO input, English relative phrases, localized month names, custom patterns,
whole-period bounds and day/month/year normalization therefore share the source
rules. The bridge passes civil dates through UTC and reconstructs them with the
caller's Gregorian/ISO Calendar, preserving the caller's zone across DST.
Unsupported calendar/locale configurations fail explicitly.

Return and blur commit the draft. Unparseable text stays visible; out-of-bounds
text uses the display format. Optional bindings clear their value on invalid
input and allow blank values. Required bindings keep their last valid value and
mark invalid or blank drafts. External period changes replace the draft, while
an internal nil sync preserves invalid text. The first Return commits changed or
reformatted text before allowing a later Return to reach a parent submit handler.
The calendar action and Option+Down commit, open the parsed period and restore
text focus after dismissal.

Seven Swift fixtures cover input state, invalid/blank values, bounds, month/year
normalization, Portuguese custom formatting and Lisbon's 23-hour DST day. Three
JavaScript boundary fixtures cover malformed requests, locale mapping, impossible
civil dates, leap days and relative month rollover. Model tests were written red
before their implementation. Native UI regression then exposed focus restoration
before UIKit had dismissed its presentation. The popup host now calls back after
actual dismissal, and the original failing typing-after-selection case passes.

Visual review also caught the generic extra-small button's 12-point calendar
icon. The editable field now uses Input Group's 14-point glyph and symmetric
button inset through the existing shared ButtonStyle and InputFrame. No new
component style or package dependency was introduced. The optional Date Picker
closure owns 1,071,562 engine bytes and 3,446 notice bytes before packaging,
including all installed date-fns locales. Consumers without a Date Picker
dependency and web bundles exclude these resources. Release size, memory and
latency budgets remain unqualified.

Source comparison used the current local React Date Picker, pure date model and
Date Picker/Input Group CSS. All 18 Relay browser tabs remain taken over, so this
pass does not include fresh web screenshots or axe results. Native evidence was
opened and inspected through Relay on both devices. Existing popup/page motion
recipes are retained; this pass adds no new animation.

| Evidence                 | Inspected files                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Corrected editable field | [Phone dark](https://github.com/user-attachments/assets/d3c0679a-3d8b-4936-b8ba-5de1fe536aa0), [iPad large/light](https://github.com/user-attachments/assets/76de4c70-08c1-425a-9c98-8011b08d6672) |
| Invalid text retained    | [Phone invalid draft](https://github.com/user-attachments/assets/f74bc49d-9c00-4484-ba5d-95441a2da1aa)                                                                          |
| Custom display format    | [iPad custom date](https://github.com/user-attachments/assets/7fb975e3-9477-4ff2-b98f-6fe5fb0f3e3b)                                                                               |
| Relative month and grid  | [December selected](https://github.com/user-attachments/assets/340d0fa7-e494-407c-be54-740cc3f7a15e)                                                                         |
| Focus after Escape       | [March 2028 typed after dismissal](https://github.com/user-attachments/assets/d2cb996d-b5d5-4b3c-b4bf-930d76bfe337)                                                         |
| Option+Down              | [Phone calendar opened from the field](https://github.com/user-attachments/assets/873f3055-ce94-4e18-bfd0-1fe012d45659)                                                     |

The final registry build completed in 155.77 seconds. The published Date Picker,
engine adapter and foundations popup host match their final authored source.
All 142 registry items resolved into 20 standalone packages and all compiled.
Foundations still exclude the optional Date Picker engine. Nothing is staged or
committed.

| Definition of done              | Result                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root checks and tests           | Passed: 26 check tasks and 4,175 JavaScript tests after the final registry generation.                                                                                                                                                                                                               |
| Registry generation and indexes | Passed: full build in 155.77 seconds; final Date Picker/adapter/popup payloads match source, and generated manifests are rebuilt. Nothing is staged.                                                                                                                                                 |
| Contract and owning-area checks | Passed: 105 Swift tests, both Apple app builds, eight UI regressions per device, 142 items resolved and all 20 standalone source packages compiled. React/Expo/Android installation and upstream parity were not repeated for this SwiftUI-only change.                                              |
| Running UI                      | Inspected native phone/tablet light/dark, enlarged text, invalid/custom values, calendar/grid selection, Option+Down and typing after Escape. Fresh web screenshots/axe remain held by takeover. Full keyboard/VoiceOver, live macOS, minimum-runtime and physical-device qualification remain open. |
| User-visible changelog          | Passed: editable text, relative/localized parsing, custom formats and focus restoration described in unreleased.mdx.                                                                                                                                                                                 |
| Owning convention docs          | Passed: DESIGN.md, PLATFORMS.md, REGISTRY.md, both SwiftUI READMEs and the renderer gap record updated.                                                                                                                                                                                              |

Results: [iPhone](native-platforms/swiftui-iphone-date-input-regressions.json),
[iPad](native-platforms/swiftui-ipad-date-input-regressions.json),
[standalone consumers](native-platforms/swiftui-date-input-consumer-summary.json).
Runtime UI checks use iOS/iPadOS 27 simulators; minimum deployment targets compile
but their original runtimes have not been exercised. macOS was compiled. Time
picking and composite range fields remain implementation gaps. Full-library
parity and fresh React comparison remain in progress.

## Standalone Time Wheel, snapping and focus (2026-11-17)

`FabricatorTimeWheel` now draws the Fabricator wheel on iOS and macOS, replacing
its system-picker implementation. The Date binding remains compatible. New
options cover locale-derived or explicit 12/24-hour clocks, seconds, minute steps,
clock bounds using `FabricatorTimeOfDay`, a calendar and an accessibility label.
The pure model keeps meridiem, normalizes seconds, clamps clock values and
preserves the calendar day, including JavaScript-like forward DST resolution.
No package dependency or JavaScript resource was added.

The renderer uses the existing active color and radius, seven density-sized
rows, tabular 16-point Inter, semibold foreground selection, the canonical fade
stops and the 0.9-depth drum formula. Dynamic Type grows row height and measured
column widths. Width measurement sits above scroll state and measures only the
widest tabular pair or AM/PM. Reduce Motion and scoped motion-off flatten the drum
and stop automatic movement. Programmatic movement and color feedback use the
shared move/feedback roles. Columns expose adjustable actions, Up/Down,
Page Up/Down, Home/End and Tab/Shift+Tab within the wheel.

Six pure tests were written red before their models. Simulator inspection caught
an initial three-row offset. Stronger UI tests then caught a second defect that
value-only assertions had missed: tapping the center after a change picked a
different value. Explicit spacer rows, anchored programmatic centering and a
scroll target that preserves explicit anchors now keep the band and value
aligned. Settling observes actual scroll offsets after 120 ms of inactivity,
rather than treating each visible row-id change as a settled gesture. It does
not invalidate SwiftUI layout on every pixel, and pending work cancels on
teardown or disabling. The UI regression waits for the value to settle and then
taps the band to verify it stays unchanged. Keyboard review also caught Tab
staying in a column; explicit focus routing now moves between columns. Relay
Tab/Down changed 22:05 to 22:06 with both values centered.

A motion-off cold launch then exposed an initialization race: the first zero
scroll offset could replace the caller's time before initial centering. The
column now waits for its first geometry layout before centering and settling.
The no-input regression passed under warm XCTest before this fix, so that result
alone did not expose the defect. After the layout guard, cold Relay captures
retain 21:05 and 07:03:04, and all three UI cases pass on both devices.

The reference was the current local Time Wheel, time-input model and CSS. Apple
SDK references: [scroll position anchors](<https://developer.apple.com/documentation/swiftui/view/scrollposition(id:anchor:).md>)
and [scroll target updates](<https://developer.apple.com/documentation/swiftui/scrolltargetbehavior/updatetarget(_:context:).md>).
Fresh React screenshots remain unavailable while all 18 Relay tabs are taken
over. Time Input and Date Picker integration with this wheel remains open;
full-library parity is not complete.

| Evidence                       | Inspected files                                                                                                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light/dark geometry            | [iPad light](https://github.com/user-attachments/assets/63bcc806-fb97-41d9-80a7-225602f8f8d1), [phone dark](https://github.com/user-attachments/assets/b62fd14f-5a79-44a7-88d5-c7eaec9eb381)                                                                                                           |
| Enlarged text                  | [iPad light](https://github.com/user-attachments/assets/927d55b8-5636-45f7-854a-594141dcdccb), [phone dark with motion off](https://github.com/user-attachments/assets/8af1adc2-ed50-4237-a6c0-79a4f98a918f), [seconds](https://github.com/user-attachments/assets/9a9550cc-bdc4-45a5-ac21-eb25c9fcb255) |
| Keyboard focus and selection   | [Minutes focused at 22:06](https://github.com/user-attachments/assets/07752619-b7d9-4af3-be83-6d547f3b1a35)                                                                                                                                                                 |
| Cold motion-off initialization | [21:05 and 07:03:04 retained](https://github.com/user-attachments/assets/fdd1fbbf-2da1-407c-b131-32ea6aed2afb)                                                                                                                                                            |
| Disabled state                 | [23:45 at enlarged text](https://github.com/user-attachments/assets/5ee9d631-2d40-4f05-acd1-249190567913)                                                                                                                                                             |
| Animated selection             | [Recording](https://github.com/user-attachments/assets/c87ea488-9ceb-4830-b5b4-3c0448a6a3a0), [transition frames](https://github.com/user-attachments/assets/53aad0b0-40ed-477f-be52-af26d5d1cb43)                                                                                                      |
| Motion-off selection           | [Recording](https://github.com/user-attachments/assets/10b02859-1034-4bbe-b173-1a968c1b92f7), [transition frames](https://github.com/user-attachments/assets/acd837bf-8897-4c46-97c3-cf3441c36957)                                                                                              |

The inspected motion-enabled frames cover 1.00–1.25 seconds of the recording;
the motion-off frames cover 12.65–13.00 seconds. Both show 21:05 becoming 22:05.
The enabled sequence moves between rows, while motion-off changes directly with
flat labels. Simulator recordings have variable frame timing and do not qualify
frame rate or physical-device performance. Earlier static recordings are not
used as transition evidence.

The final registry build completed in 127.09 seconds. Published Time Wheel UI,
model and tests match authored source. All 142 items resolved into 21 distinct
standalone source packages and all compiled. Time Wheel's own closure contains
foundations and its three source/test files, with no JavaScript resources.
Nothing is staged or committed.

| Definition of done              | Result                                                                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root checks and tests           | Passed: 26 check tasks and 4,175 JavaScript tests after final registry generation.                                                                                                                                                                                                                                       |
| Registry generation and indexes | Passed: full build in 127.09 seconds, regenerated manifests and matching published Time Wheel source/model/tests. Nothing is staged.                                                                                                                                                                                     |
| Contract and owning-area checks | Passed: 111 Swift tests, iOS/iPadOS and macOS builds, three UI regressions per device, 142 resolved items and 21 compiled standalone source packages. React/Expo/Android installs, web registry captures and upstream parity were not repeated for this SwiftUI-only change. Shared style maps and tokens are unchanged. |
| Running UI                      | Inspected phone dark and tablet light at normal/enlarged text, native keyboard focus, selected rows, seconds, motion enabled/off and cold initialization. Fresh web screenshots and axe remain held by browser takeover. Full keyboard/VoiceOver, live macOS, minimum-runtime and physical-device checks remain open.    |
| User-visible changelog          | Passed: standalone Time Wheel appearance, clock/seconds/step/bounds options, keyboard and enlarged text described in unreleased.mdx.                                                                                                                                                                                     |
| Owning convention docs          | Passed: DESIGN.md, PLATFORMS.md, REGISTRY.md, both SwiftUI READMEs and the renderer gap record updated.                                                                                                                                                                                                                  |

Results: [iPhone](native-platforms/swiftui-iphone-time-wheel-regressions.json),
[iPad](native-platforms/swiftui-ipad-time-wheel-regressions.json),
[standalone consumers](native-platforms/swiftui-time-wheel-consumer-summary.json).
UI runtime evidence uses iOS/iPadOS 27 simulators. Time Input and Date Picker
still use their existing time selection and await integration. Custom wheel
height composition and whole-catalog React/native comparison remain open.

## Time Input and Date Picker clock integration (2026-11-17)

Time Input now uses the shared editable field frame, tabular text, clock artwork
and Fabricator wheel. Its required Date initializer remains available, and an
optional binding can clear. Clock, seconds, step, range and calendar options
follow the standalone wheel. The pure parser implements the current canonical
compact, colon/dot/h, AM/PM and named-time forms. Return and blur commit; invalid
drafts remain visible, optional values clear and required values keep their last
valid clock. Typed bounds retain React's minute precision, while wheel bounds
compare seconds. No JavaScript engine, package dependency or web bundle asset
was added for this module.

Date Picker's day mode now accepts a clock, seconds, minute steps and a time
label. The wheel fits the calendar's height, day changes keep the draft clock,
and clock changes commit without dismissing the panel. A clock selected before
an optional day remains a draft until a day is chosen. Editable dates accept a
time after the last qualifying comma or "at", keep the current clock for a
date-only edit and preserve invalid time text. Month/year modes remain periods.

The regression work also exposed a shared React defect: Date Picker compared
only the day before synchronizing or emitting a value, discarding same-day clock
changes. The pure comparison now accepts clock precision and all three React
bases pass their time/seconds settings. The failing clock comparison test passes.
React Native and Compose retain dated gaps for their missing date/time
composition. SwiftUI compares clock values at minute/second precision as well.

Five new pure clock/input fixtures and two date-time fixtures were written red
before implementation. The first UI test failed against the old button-only
field, then caught a real focus failure after the editable field was wired:
modal presentation stopped typed text reaching it. The existing iOS overlay
adapter now supports a nonmodal child for Time Input, with hit testing through
its anchor. Other overlays keep their existing presentation. Typed input and
wheel editing share the keyboard, and dismissal restores field editing.

A large-text test then caught the wheel behind the keyboard. The shared overlay
layer now respects keyboard safe areas, chooses the side with more space and
publishes available height. Wheels fit that viewport. Enlarged date/time panels
reuse the existing height-measured scroll container, stack when necessary and
keep both the calendar and clock reachable. The regression scrolls within the
popup until the full clock column is visible before tapping its next row.

The first combined iPad run passed nine of ten cases but caught a stale wheel
offset replacing typed text after commit. Layout and programmatic centering are
now read-only; only user scrolling can publish a settled row. The isolated
scroll-event modifier uses drag events and an AppKit wheel monitor for macOS
trackpads and mouse wheels. Actual viewport
size drives initial centering; pending layout tasks reject newer input and skip
centering when already aligned. Dismissal disables pending wheel work and ignores
late selection callbacks. A subsequent automation run waited for scroll
quiescence while the app was idle; process traces were inspected and those
runs were explicitly interrupted before rebuilding. They are not passing
results. Native phase observation was removed in favor of the same drag-event
path across deployment targets; the next run has explicit execution limits.

The reference is the current local React sources and shared CSS. Relay still
reports all 18 browser tabs taken over, so fresh React screenshots and axe
results remain unavailable. Full-library parity remains in progress.

### Short stability follow-up (2026-11-17)

Time Input's nonmodal portal now mounts beside the SwiftUI hosting view and
stays outside that controller's child hierarchy. The final iPad run passed both
typed-input and enlarged-text/seconds/bounds regressions with no runtime warnings.
Select sizing/outside dismissal and repeated Dialog dismissal also passed their
focused cases. Relay captures were inspected on iPhone light and iPad dark with
enlarged text; the iPhone capture includes the wheel and keyboard together.

The unfinished registry dependency list is formatted, and Time Input declares
Input explicitly. Root tests, 118 Swift tests, all 26 root check tasks, the full
registry build (174.68 seconds) and fresh Time Input/Date Picker standalone
consumer builds passed. SwiftUI payloads were refreshed after the final fix.
Web typechecking required a temporary `NODE_OPTIONS=--max-old-space-size=8192`;
the default 4 GB Node heap exhausted memory. No persistent heap setting changed.

Results: [iPad Time Input](native-platforms/swiftui-ipad-time-input-final-regressions.json)
and [standalone consumers](native-platforms/swiftui-time-input-consumer-summary.json).
Kotlin source inventory and TypeScript checks passed; native compilation remains
unrun without its JDK, Gradle and Android SDK. This pass did not repeat the full
gallery, fresh web/axe, VoiceOver, minimum-OS or performance qualification.
