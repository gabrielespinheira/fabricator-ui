# SwiftUI example

The Fabricator UI component explorer is a real native app for iOS 17+, iPadOS 17+ and macOS 14+. It uses the reusable SwiftUI registry package. Swift Charts renders charts, UIKit/AppKit render rich text, AVKit handles media, and Apple document/color/time pickers retain native input semantics.

Requires macOS, Xcode with an installed simulator runtime, Bun and XcodeGen. The scripts never install dependencies or download runtimes.

From the repository root:

```sh
bun run example:mobile-swiftui
bun run example:mobile-swiftui:ipad
bun run example:mobile-swiftui:build
bun run example:mobile-swiftui:check
bun run example:mobile-swiftui:check:ui --device <project-simulator-uuid>
bun run example:desktop-swiftui
bun run example:desktop-swiftui:build
bun run example:desktop-swiftui:check
```

The mobile launcher defaults to installed simulators whose names begin with `Fabricator ` or `Fabricator UI `. It never reuses another project's simulator automatically. Open a project simulator in Relay first, or select a device explicitly with `--device <name|UDID>`. `FABRICATOR_IOS_DEVICE` and `FABRICATOR_IPAD_DEVICE` set explicit defaults.

For a particular preview, append `--page <component-slug>` or `--page showcase-forms`, `showcase-charts`, `showcase-chat`, `app-shell` or `overview`. Append `--dark` for dark appearance, `--large-text` to exercise the accessibility text scale, or `--motion-off` to disable the outer FabricatorRoot's motion. These flags do not change device preferences; the system Reduce Motion setting is still honored. The component explorer also provides all catalog navigation, an appearance switch and a command menu (Command-K on macOS).

`scripts/sync-contract.ts` copies the generated shared platform contract, Bot Face contour samples and licensed Inter fonts. `scripts/build-manifest.ts` generates native registry ownership. Source presence is not a full-parity certification: the precise remaining gaps are in `../web/registry/swiftui/parity-exceptions.json`.

The launcher also extracts the canonical React Markdown, Syntax Highlight and
Editor fixtures into `.build/document-examples.json`. The Editor preview has a
512-point document viewport and a separate read-only size preview. The generated
iOS scheme includes `FabricatorSwiftUI-UnitTests` for live UIKit font/selection
checks; select it with `xcodebuild test -only-testing:FabricatorSwiftUI-UnitTests`
and the same project, scheme and explicit simulator destination as the UI tests.

The launcher extracts Data Table's canonical pure account generator and column
metadata into `.build/data-table-examples.json`. Its 10,000 rows exercise all 12
value types, labels, status tones, widths and calculations using the React demo's
fixed reference date. This 3,341,711-byte resource belongs only to the example app;
copy-in consumers receive no account data. The native demo uses local paging.

Calendar and Date Picker previews use a fixed November 16, 2026 reference date.
They exercise optional selection, inclusive date bounds, disabled dates, range
and multiple selection, caption menus and empty/invalid/disabled fields. The
month and year fields exercise partial-period bounds and twelve-year paging.
Editable fields cover relative phrases, custom date-fns patterns, bounds, clearing,
external updates and calendar focus restoration. The optional canonical Date
Picker engine includes all installed locales: 1,071,562 bytes plus 3,446 notice
bytes before packaging, with no web client JavaScript or new dependency. The
calendar's shared 32-point day glyphs sit in preferred 44-point iOS hit slots;
constrained layouts can shrink slots, while large text retains horizontal overflow.

The standalone Time Wheel demo uses fixed 12/24-hour clocks, seconds, 15-minute
steps, bounds and a disabled example. It draws the Fabricator band, tabular type,
edge fades and drum tilt instead of Apple's system picker. Check it with
`--page time-wheel`, including `--large-text` and `--motion-off`.

`--page time-input` covers editable clocks, optional values, seconds, time bounds
and a disabled field. Clicking or typing keeps the iOS wheel and keyboard
available together; Up/Down focuses Hours. The Date Picker page also includes
combined date/time and editable relative date/time examples. Its panel keeps the
clock when changing days, updates time without closing, and adapts to enlarged
text. Neither integration adds a JavaScript resource or package dependency.

The sample's uncompressed resources contain approximately 1.47 MiB of resolved design data and icon geometry, 1.71 MiB of Inter fonts, 7.52 MiB of sampled Bot Face contours, 613 KiB of canonical editor code and 424 KiB of canonical calendar code. Bot Face contours, editor code and recurrence code belong to their respective item dependencies. Copy-in foundations do not include JavaScriptCore domain adapters or these optional engines.

The editor and recurring calendar use Apple's built-in JavaScriptCore to execute locally bundled canonical pure engines behind one isolated SDK adapter. Text rendering, selection and input stay in TextKit 2 and NSTextView; calendar rendering stays in SwiftUI. They load no remote scripts. Native fixtures cover Markdown round-trip, block identity, undo/redo, GFM table paste, Unicode-safe input, actual Intl support, DST preservation and scoped recurring edits/deletion. The 100-paragraph editor fixture reports debug engine initialization and bridge/transaction/projection timings separately from native view layout. App size, memory, launch time and energy budgets have not been qualified on release builds.

On 2026-11-15, both arm64 simulator and macOS app builds passed, with 42 native fixture tests. One debug macOS/Apple Silicon run measured 37.85 ms to initialize the editor engine and 100-paragraph document; 20 subsequent Unicode edits took a median 1.21 ms and maximum 2.68 ms for the JSON bridge, transaction and returned projection. These figures exclude native view layout, drawing and device overhead and are reproducible through `swift test --filter EditorEngineTests`.
