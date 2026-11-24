# Native platforms: SwiftUI, Kotlin Compose and Tauri mobile

Status: implementation in progress, 2026-11-15. The checklist below remains the
qualification bar. Source ownership and a browsable catalog do not establish
complete behavior or performance parity.

Implementation evidence so far:

- Shared contract generation derives 109 component/guide families and 32 blocks,
  both semantic themes, three densities, four motion speeds, 32 sound recipes and
  2,127 outline icons and 145 brand icons from current source. The additional
  family is native Sounds. All 22 spinner variants consume canonical motion
  samples; skeletons use the canonical opacity pulse.
- Native-only CLI installation, opaque Swift/Kotlin and binary copies, dependency
  ordering/cycles, dry runs, conflict preservation, info/view/diff and toolchain
  diagnostics have behavior tests. `fabricator.json` keeps native projects
  independent of React/Tailwind configuration.
- SwiftUI builds on the installed Xcode toolchain and runs on owned iPhone/iPad
  simulators. Native input and project feedback were exercised through Relay;
  captures are in `native-platforms/`. Clean chart consumers compile independently
  of the gallery. The editor adapter reuses canonical transactions and Markdown
  through local JavaScriptCore, while UIKit/AppKit render the interface.
- Compose source, Android/JVM hosts, generated assets and standalone consumer
  manifests are authored. Compilation is pending the required JDK/Gradle/SDK
  installation approval; source coverage is not a compile result.
- Tauri's bundled frontend builds, and the Rust host compiles/tests offline on
  macOS. iOS/Android host builds remain unverified. Relay captures are being
  reviewed alongside runtime and accessibility checks.
- Root workspaces and the lockfile include all three new examples. The repository
  JavaScript suite passes 4,144 tests. All 141 SwiftUI catalog routes passed an
  iPhone XCTest smoke run; 42 native model/engine tests and 14 clean consumer
  source closures compile/pass. The final iPad touch regression also passes.
  Kotlin and mobile Tauri compilation, assistive-technology audits and
  release-device performance remain open.

Full native editor, calendar, table and animation behavior remains subject to
the component-specific gates below. Implementation gaps cannot be reclassified
as inherent platform mappings to pass them.

Current build/test results and simulator captures are in
[`native-platforms/verification.md`](native-platforms/verification.md).

## 1. Outcome and scope

Make Fabricator UI usable from SwiftUI, Kotlin Compose, React Native and React
without losing its visual identity, component coverage or copy-in ownership.
The website's Fabricator style is the visual reference. Native implementations
keep the same component concepts, variants, states and composition intent, with
idiomatic language APIs and platform input/accessibility behavior.

"Concise" means a small, predictable public API, composed components, consistent
visual hierarchy and shared design decisions. It does not mean removing states,
accessibility, advanced components or platform behavior to simplify a port.

| Renderer / runtime  | Supported targets in this plan                                | Delivery                                          |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| React web           | Existing web frameworks and all three bases                   | Existing registry and CLI                         |
| React Native / Expo | Existing iOS, iPadOS and Android support                      | Existing native registry and CLI                  |
| React / Electron    | macOS, Windows, Linux                                         | Existing desktop template                         |
| React / Tauri       | macOS, Windows, Linux, plus iOS/iPadOS and Android            | Existing web components, new mobile host/template |
| SwiftUI             | iOS, iPadOS, macOS                                            | New Swift source registry and setup adapter       |
| Kotlin Compose      | Android phones/tablets and desktop JVM on macOS/Windows/Linux | One Compose source tree with platform adapters    |

Use Jetpack Compose artifacts for Android and Compose Multiplatform for desktop.
Kotlin's iOS and web renderers, watchOS, tvOS and visionOS are outside this initial
support promise. SwiftUI covers Apple targets; React covers the browser.
React Native and Electron remain supported.

Compose desktop includes a JVM/runtime footprint. Native-language support does
not establish a particular startup, memory or energy result; qualify each host
against the release-build budgets below.

Tauri mobile is a host for the **web** renderer. `/r/fabricator/native/` continues
to mean React Native. SwiftUI and Compose are additional renderers, not web
bases or `components.json` style ids. No Rust UI renderer is introduced.

Completion means every current component and block has a working implementation
or a narrowly documented platform mapping, with verified demos and consumer
installation. A ten-component preview is a milestone, not completion of this
plan. A full-support release has no unresolved implementation gaps.

## 2. Starting point and inventory

Inventory measured from authored source on 2026-11-15, including existing
uncommitted component work. Recompute it at the first implementation milestone;
new items enter scope automatically.

| Source                                                                                  | What it supplies                               |
| --------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `apps/web/registry/bases/{base,radix,aria}/registry.ts`                                 | Base registry declarations                     |
| `apps/web/registry/fabricator/registry.ts`                                              | Fabricator additions, overrides and exclusions |
| `apps/web/registry/native/_registry.ts`                                                 | Current React Native declarations              |
| `apps/web/lib/component-groups.ts`                                                      | Eight groups and stable component slugs        |
| `apps/web/lib/component-explorer.ts`                                                    | Explorer navigation, group ids and defaults    |
| `apps/web/registry/fabricator/app-shell-options.ts`                                     | App Shell choices and applicability            |
| `foundation-tokens.ts`, `look.ts`, `density.ts`, `motion.ts` in the Fabricator registry | Canonical look inputs and design values        |
| `apps/web/registry/fabricator/native-theme.ts`                                          | Existing conversion to native literal values   |
| `packages/icons-core/src/runtime/types.ts`                                              | Icon geometry, layers and brand art            |
| `demos/electron`, `demos/tauri/desktop`, `demos/react-native`                           | Existing reference explorers                   |

Apply the registry build's exclusion and addition rules before counting. The
current Base-derived result has **101 `registry:ui` declarations, 32 blocks,
four `registry:component` declarations, 13 libraries, two hooks, one theme and
52 font declarations**. Examples, style records and internal helper files are
separate. The component declarations include `app-nav`, `workspace-switcher`,
`user-menu` and the demo wrapper `example`.

There are **112 distinct declared `registry:ui` file paths**. Inventory exports
and parts inside these files as well as top-level item names. A component count
alone misses chart plots, table cells, calendar parts and shell parts.

The React Native registry has 105 UI declarations, including `text`,
`fabricator-root` and `time-wheel`. Native declarations and web item types do not
have a one-to-one count. The web `form` compatibility item lacks a group, and the
current native registry has no direct `form` or `data-table` owner. Explorer
routing still treats Data Table as a tutorial composition. Resolve these existing
coverage discrepancies explicitly in phase 0; do not use the older plan's
67-component count or assume current parity proves the full catalog is covered.

### Catalog to implement

Each row is an implementation worklist for SwiftUI and Compose and a verification
worklist for React Native and Tauri. Sources above remain authoritative as the
catalog changes.

| Group                      | Current component families                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Basics                     | `aspect-ratio`, `avatar`, `badge`, `button`, `checkbox`, `density`, `input`, `kbd`, `label`, `radio-group`, `rating`, `scroll-area`, `separator`, `skeleton`, `slider`, `spinner`, `switch`, `textarea`, `theme-toggle`, `toggle`    |
| Forms                      | `button-group`, `calendar`, `color-picker`, `combobox`, `date-picker`, `field`, `file-upload`, `input-group`, `input-otp`, `multi-select`, `number-field`, `search`, `select`, `time-input`, `toggle-group`                          |
| Overlays                   | `alert-dialog`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `hover-card`, `menubar`, `popover`, `sheet`, `tooltip`                                                                                               |
| Structure                  | `accordion`, `app-shell`, `breadcrumb`, `card`, `carousel`, `collapsible`, `direction`, `item`, `navigation-menu`, `pagination`, `preview-rail`, `resizable`, `sidebar`, `tab-strip`, `tabs`                                         |
| Content                    | `alert`, `empty`, `markdown`, `progress`, `sonner`, `table`, `toast`                                                                                                                                                                 |
| Charts                     | `area-chart`, `bar-chart`, `bump-chart`, `candlestick-chart`, `composition-chart`, `donut-chart`, `funnel-chart`, `heat-calendar`, `line-chart`, `pie-chart`, `radar-chart`, `radial-chart`, `sankey-chart`, `status-bar`, `treemap` |
| Chat                       | `attachment`, `bot-face`, `bubble`, `chat-input`, `marker`, `message`, `message-scroller`, `model-picker`, `questionnaire`                                                                                                           |
| Advanced                   | `audio-player`, `data-table`, `editor`, `event-calendar`, `file-tree`, `image-compare`, `syntax-highlight`, `video-player`                                                                                                           |
| Additional public surfaces | `app-nav`, `workspace-switcher`, `user-menu`, `text`, `fabricator-root`, `time-wheel`, the `typography` guide and the `form` compatibility mapping                                                                                   |

Cover these owned helper modules: `chart-kit`, `chart-bar-plot`, `chart-line-plot`,
`chart-pie-plot`, `data-table-cells`, `event-calendar-agenda`,
`event-calendar-engine` and `event-calendar-event`. A helper follows its owner;
it is not a second public component merely because it occupies a file.

Cover every block: `login-01` through `login-05`, `signup-01` through `signup-05`,
`sidebar-01` through `sidebar-16`, `app-shell-01` through `app-shell-05`, and
`preview-03`. Preserve their content, composition and responsive intent.
Documentation-only examples get equivalent variant/state coverage; they do not
need an arbitrary one-file-per-web-example translation.

## 3. Design and API contract

| Dimension   | Required result                                                                                                            | Evidence                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Coverage    | Every item, exported part, helper dependency and block accounted for on each supported renderer/OS                         | Generated catalog and strict coverage report       |
| Appearance  | Same resolved semantic colors, font choices, optical weight, shape, spacing, hierarchy, icon geometry and motion character | Token fixtures, measurements and reviewed captures |
| API         | Same item slug, variant/size meanings, states, composition and event outcomes                                              | Typed public mapping plus consumer compile tests   |
| Interaction | Native text editing, input, focus, back/dismissal and accessible semantics                                                 | Behavior tests and device checks                   |
| Ownership   | Installed source builds without the website or example app                                                                 | Fresh-project installation/build                   |
| Cost        | Install only requested components and their dependency closure                                                             | Source graph, bundle/size reports                  |

Preserve all existing web/React Native exports, props, slot names, install URLs
and valid style ids. Scope the existing React parity contract to those renderers;
add a semantic native contract without weakening their checks.

Use explicit native symbol mappings, such as item `button` to
`FabricatorButton`, to avoid collisions with framework controls. Map parts as
well as root components. Swift uses bindings, view builders and environment;
Compose uses values/callbacks, slots and composition locals. DOM attributes,
React hooks, `render`, `asChild` and Tailwind classes have native API mappings
rather than copied syntax. Keep each native public API small and typed.

`form` maps validation, field registration, error and submission outcomes to
native state/bindings. Its React Hook Form integration remains a React-specific
adapter. `sonner` keeps its install name and maps to native toast behavior.
`text` and `fabricator-root` have native equivalents; browser typography remains
a guide. Preserve the current LTR support policy.

### Matching appearance while keeping native behavior

- Style semantic framework controls before building custom interaction engines.
  SwiftUI `ButtonStyle` and `ToggleStyle`, and Compose UI/Foundation APIs, provide
  the starting points. Custom drawing still supplies full input and accessibility.
- Render Fabricator-owned surfaces, controls, fields, tabs, navigation and charts
  with Fabricator tokens. Platform-default colors or spacing cannot silently
  override the chosen look.
- Keep system file pickers, permission prompts, share sheets and OS menu surfaces
  under system control. Record those boundaries in the component API and demos.
- Use the same font assets and compare optical weight and line metrics. Web's
  current variable weights and React Native's static cuts need explicit mapping;
  copying a numeric weight is insufficient.
- Resolve CSS px/rem into logical pt/dp and scalable text units. Native text sizes
  follow accessibility settings. Maintain layout reflow and platform touch targets
  independently of a compact visual control's bounds.
- Specify borders, inset highlights, elevation, corner curves and opacity layers
  numerically. Review blur/material differences on actual devices. Any reduced
  effect is an explicit target capability, with a designed token-based surface.
- Map the existing motion roles, sampled spring curves, speeds, press scale,
  travel and reduced-motion behavior. Native spring constants alone are not a
  portable timing contract. Compare animations over time, including interruption.
- Adapt hover to focus/press on touch devices. Preserve pointer behavior on iPad
  and desktop. Swipe, predictive Back, text selection and keyboard behavior follow
  platform conventions.

Visual similarity is measured at matched logical sizes. Use exact numerical
checks for resolved colors and geometry; use per-renderer image baselines and
reviewed tolerances for text rasterization and shadows. A single permissive
cross-OS screenshot threshold cannot establish parity.

## 4. Architecture and source ownership

Extend the existing registry/build/setup approach. No TSX-to-native transpiler,
universal renderer, mandatory Rust engine or second manually maintained palette.

```text
Canonical look inputs, tokens, motion, icon geometry and component contracts
  -> resolved theme / behavior / example fixtures
     -> existing CSS + React components -> web / Electron / Tauri desktop/mobile
     -> existing React Native output   -> Expo
     -> generated Swift definitions    -> authored SwiftUI components
     -> generated Kotlin definitions   -> authored Compose components
```

| Proposed path                                                                      | Ownership                                                            |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web/registry/fabricator/resolved-theme.ts`                                   | Typed resolved design values extracted from current theme logic      |
| `apps/web/registry/fabricator/platform-contracts.ts`                               | Component capability/API/state mappings, validated with Zod          |
| `apps/web/registry/fabricator/platform-examples/`                                  | Shared fixture data, routes, scenarios and reference measurements    |
| `apps/web/registry/swiftui/{ui,models,platform,tests}/`                            | Authored Swift components, pure models and platform adapters         |
| `apps/web/registry/compose/{ui,models,platform,tests}/`                            | Authored common Compose components/models and Android/JVM adapters   |
| `apps/web/generated/platforms/{swiftui,compose}/`                                  | Generated native consumer sources/manifests; gitignored              |
| `apps/web/public/r/{swiftui,compose}/`                                             | Generated registry payloads; gitignored except catalog indexes       |
| `demos/swiftui/`                                                                   | Private iOS/iPadOS/macOS example targets                             |
| `demos/compose/`                                                                   | Private Android and desktop example targets using one common gallery |
| `demos/tauri/`                                                                     | Private React/Tauri mobile gallery and native projects               |
| Existing `apps/web`, `demos/electron`, `demos/tauri/desktop`, `demos/react-native` | Existing reference apps kept in place                                |

New folders are proposed names, not existing implementations. Update the owning
docs' authored/generated tables when creating them. Library source never imports
from any example app. Demos consume generated/installable output and exercise
the same dependency graph as consumers.

Extract portable data from current explorer and App Shell models when adding
the third consumer. Generate JSON/Swift/Kotlin fixtures from their source of
truth; preserve stable slugs and group navigation ids. Each gallery renders with
its platform's public Fabricator components. Avoid parallel handwritten catalogs
or copying the website's private Next.js components into native libraries.

### Theme and assets

Extract a complete resolved theme from the current token/look/density/motion
modules. `getNativeTheme` currently covers a subset of tokens and timings; it is
a starting point, not the complete export schema. Preserve existing outputs
while resolving all semantic roles, surfaces, state overlays, chart/syntax colors,
shadows, shapes, font scales and motion roles.

Export native literals and assets at build/install time. Swift/Kotlin applications
do not need JavaScript to draw or resolve their theme. Support runtime theme,
surface/color-role, radius, density, motion and icon settings at parity with the
existing galleries. Port the necessary pure look calculations and verify them
against shared fixtures; bundle all named looks only when the consumer uses them.

Generate Swift paths and Compose vectors from icons-core geometry. Check every
supported path primitive, strokes, optical scale, duotone and brand gradients.
Map animated icon recipes to native animation. Copy requested icons by name and
include license/attribution metadata. Register the supported font assets and
weight mappings; track unsupported font options explicitly until implemented.

### Domain models and native services

Keep component state/domain code pure, with shared input/output fixtures and
typed events. Port the existing models into Swift/Kotlin where TypeScript cannot
execute. Date/time fixtures include time zones, DST, range edges and locale
formatting assumptions. Chart fixtures include scales, paths and hit testing.
Do not place parsing, recurrence or table algorithms inside rendering code.

One adapter per SDK/service: file selection, clipboard, audio/video, haptics,
notifications, storage, windowing and drag/drop. Components consume capabilities
and typed results rather than call SDKs directly. Native text entry keeps its
platform IME, selection and autofill path.

Expose applicable native-service examples alongside the component gallery:
desktop menus/tray/shortcuts, file pickers, clipboard, links, notifications and
mobile haptics/biometrics. Show permission and unavailable-hardware states. Keep
local notifications and remote push as separate adapters and verification cases.
App Shell or a component must not require these optional services to initialize.

WidgetKit widgets and Live Activities are separate native extension recipes,
with shared Fabricator tokens/icons and the subset of views those APIs support.
They are not hosts for the full component gallery. Include a shared-state widget
recipe and its signing/App Group setup in Apple docs after the core native
library is verified; full OS-extension API coverage is a separate workstream.

## 5. Registry, installation and project setup

Native languages must be first-class consumer paths, including projects without
Node packages, React, Tailwind or `components.json`. The Bun CLI is a developer
tool; it must not become a native application's runtime requirement.

1. Test the pinned registry installer's `registry:file` support with opaque Swift
   and Kotlin files, exact targets, dependencies, overwrite/diff and clean projects.
   Include a project without React configuration. Verify bytes after installation.
2. Reuse the existing installer wherever it can preserve those files and graph
   semantics. Swift/Gradle setup is an adapter in the existing setup plan, not
   scattered edits in individual commands.
3. Record the known gap: current CLI setup and registry bootstrapping assume a
   JavaScript framework. If the upstream flow requires React/Tailwind or transforms
   native files, implement a narrowly scoped native-file install adapter using
   the same catalog, dependency graph, conflict reporting and dry-run contract.
   Document that exception to `docs/CLI.md` in the adapter change. Existing web/RN
   resolution and transforms remain delegated to the current installer.
4. Native-only projects use a schema-versioned `fabricator.json` with renderer,
   target platforms, module/package name, source roots, look and installed items.
   React projects keep `components.json` and valid existing style ids.
5. Keep public slugs and namespaced dependency names. Serve proposed
   `/r/fabricator/swiftui/{name}.json` and `/r/fabricator/compose/{name}.json` as
   aliases to the generated native payloads. Preserve `/native/` for React Native.
6. Generate minimal Swift package/Xcode inclusion and Gradle source/dependency
   configuration. Native component source remains copy-in by default. Installed
   items build independently of a monorepo checkout and of example app files.
7. Extend `info`, `doctor`, `add`, `view`, `diff`, `apply` and setup prompts for
   each renderer. Scope diagnostics to its toolchain. Make changes reviewable
   through `--dry-run` and preserve user-edited source during updates.
8. Extend `packages/setup` first with a validated list of app targets, separating
   renderer, runtime and OS. Normalize existing mobile/desktop flags into it and
   retain their behavior. Then update CLI flags, `/init/app-shell`, `/create`,
   command serialization and agent prompts together.

Proposed selectors are `--renderer swiftui|compose|react|react-native` with a
target/runtime choice where needed. Final combinations must round-trip through
the actual CLI parser tests. A React/Tauri mobile project selects web components
and mobile services, not the Expo/native registry.

Every install phase ends with fresh SwiftUI and Compose consumers, with only a
Button first and a complex component later, compiled through their real native
toolchains. Include installation, update and conflict scenarios and local registry
URLs. Required toolchain/dependency installations follow the user's permission
rules; this plan authorizes no installations or releases itself.

## 6. Example apps and commands

### Commands available in this change

| Command                             | Existing implementation         |
| ----------------------------------- | ------------------------------- |
| `bun run dev`                       | Website and registry dev server |
| `bun run demo electron`             | `demos/electron`                |
| `bun run demo tauri:desktop`        | `demos/tauri/desktop`           |
| `bun run demo react-native:ios`     | iPhone Simulator/dev build      |
| `bun run demo react-native:ipad`    | iPad Simulator/dev build        |
| `bun run demo react-native:android` | Android emulator/device build   |
| `bun run demo react-native:check`   | Existing mobile screen checker  |

The commands live in `demos/package.json`. Existing React Native install-before-run behavior
is preserved. Dependencies are not installed by validation of this plan.

### Commands that land with the new runnable apps

| Command family                           | Default and required variants                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `tauri:*`                                | `desktop`, `ios`, `ipad`, `android`, `check`, `build:ios`, `build:android`                         |
| `swiftui:*`                              | `ios`, `ipad`, `macos`, `check:ios`, `check:macos`, `check:ui`, `build:ios`, `build:macos`         |
| `compose:*`                              | `android`, `tablet`, `desktop`, `check:android`, `check:desktop`, `build:android`, `build:desktop` |
| Existing desktop Electron/Tauri commands | Add `:check` and `:build` using the same production fixture frontend                               |

Use thin Bun launchers over installed `xcodebuild`/simulator, Gradle or Tauri
tooling. Device selectors and argument forwarding must work. Missing prerequisites
produce a specific actionable error, not an implicit installation or a fallback
to a different app. App processes and their dev servers stop cleanly on exit.
Add `demos/package.json` scripts only when their target exists and launches; no placeholder
commands that report success without starting an example.

Keep the current app paths to avoid a migration unrelated to native support.
SwiftUI uses one shared gallery module with iOS/macOS hosts. Kotlin uses common
Compose gallery code with Android/JVM hosts. Each host supplies only platform
window/lifecycle capabilities. Add native apps to root orchestration deliberately;
generic web `build` must not require Xcode or an Android emulator on Linux.

### Required contents of every gallery

- Overview, all eight component groups, search, stable component links, and
  variant/state controls from generated catalog data.
- App Shell as the actual gallery frame: sidebar, mobile navigation, tabs,
  workspace/account controls, panels and settings. Gallery chrome uses installable
  components rather than an app-private imitation of them.
- App Shell playground covering the same applicable options as the existing
  examples, with target-aware install/copy-source commands and documented native
  mappings. Disabled options explain a real platform limitation.
- All public component parts, sizes, variants, disabled/loading/invalid/empty
  states, controlled state, long labels and overflow. No fake row substituting
  a static image for an interactive implementation.
- All 32 block compositions, with phone/tablet/desktop layouts where applicable.
- Theme/light/dark/system, look presets and custom colors, density, radius,
  motion/reduced motion, font and icon settings. Selection persists across runs.
- Icons explorer, native feedback settings, installation/API examples in the
  host language, and clear capability status during implementation.
- A native-services page exercising available adapters, with permissions and
  lifecycle behavior separated from the core component scenarios.
- Shared deterministic scenarios for screenshots, interaction tests and timing.
  Fixtures include large data sets and malformed/empty input as applicable.

## 7. App Shell parity

Implement App Shell early enough that the galleries exercise it throughout the
port. Use the existing `app-shell-model`, `sidebar-model`, explorer defaults and
`app-shell-options.ts` as the semantic reference; port pure state transitions
and generate equivalent fixtures for native tests.

| Surface      | Required behavior                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Phone        | Safe-area header, bottom navigation, off-canvas/reveal sidebar, keyboard-aware content, panel as a supported sheet/page               |
| Tablet       | Resize-aware docked/collapsible sidebar, tabs, inline or overlay panels, touch/pointer/keyboard input                                 |
| Desktop      | Resizable window, sidebar, tabs, panels, commands, focus traversal and system menu/window adapters                                    |
| Every target | Stable navigation ids, nested disclosure, selection/history, workspace/account state, overflow, persisted settings and reduced motion |

Cover all current applicable shell option values, not just defaults. Platform
window controls and glass effects live behind adapters. SwiftUI macOS uses real
window/menu integration; Compose desktop supplies its own desktop adapter;
Tauri mobile must not inherit desktop titlebar/drag-region behavior.

Tauri's mobile frontend must run from bundled production assets without a Next.js
server. Extract reusable React explorer rendering/composition from the existing
example where needed, retaining Next.js and native-service adapters at boundaries.
A standalone mobile frontend can use the repo's existing Vite setup patterns;
it must not depend on server-only imports, filesystem routes or localhost at run
time. Test safe-area/keyboard insets, web history/back, touch scrolling, uploads,
downloads, external links, foreground/resume and process recreation on devices.

## 8. Component-specific porting work

| Family                     | Required native implementation and parity cases                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controls and fields        | All variants; IME/composition; selection/autofill; validation; focus; disabled/read-only; number/time bounds; accessible roles and labels            |
| Pickers                    | Filtering, multi-selection, chip removal, keyboard/scroll interactions, date/time zones, min/max/ranges and phone presentation                       |
| Overlays and menus         | Placement/collision, nesting, stacking, titles, initial/restored focus, outside press, escape/Back, scrim, scroll/keyboard avoidance                 |
| Structure and navigation   | Responsive breakpoints, overflow, resize/drag and keyboard alternatives, disclosure state, selected tab and persisted layouts                        |
| Toast and feedback         | Queue, dismissal/action, duration/pause, announcements, optional sound/haptic policy and background boundaries                                       |
| Markdown / syntax          | Shared document fixtures, links/code/tables, copy actions, selection, language loading, font metrics and large-document behavior                     |
| Chat                       | Streaming follow/anchoring, jump-to-latest, draft/attachments, multiline IME, stop/send states, model selection and questionnaire branches           |
| BotFace and animated icons | Shapes, expressions, session states, eye morphs, gaze, interpolation and reduced motion; same model fixtures as current source                       |
| Charts                     | Every chart above; series palette, scale/ticks, axes/legend, tooltip/keyboard inspector, hit testing, empty states, animation, accessible data table |
| Data Table                 | Sorting/filtering, editing/validation, selection, pinned/resizable columns, row virtualization, loader/paging/infinite scroll and calculations       |
| Event Calendar             | Day/days/week/month/agenda, recurrence/DST, range loading, event edits, selection, drag/resize with keyboard/menu alternatives and phone layouts     |
| Editor                     | Document/transaction schema, composition, commands, selections, undo/redo, clipboard, links, tables and Markdown round trips                         |
| File Tree / upload         | Nested lazy loading, expansion/selection, rename/search, keyboard actions, file access scopes and drag/drop alternatives                             |
| Media / image tools        | Native playback and lifecycle, seek/rate/volume, subtitles/fullscreen/PiP where supported, comparison gestures and accessible controls               |

All chart types and advanced tools are committed scope. Milestone staging must
not turn them into permanent exceptions. Native Data Table cannot be marked
complete by pointing users to the basic Table component.

Audit libraries per SDK adapter before choosing a replacement. Existing React
SDKs such as FullCalendar and TanStack React adapters do not execute in SwiftUI
or Compose. Prefer maintained platform libraries behind adapters; document exact
versions, license and size/runtime costs. Shared fixture outcomes are the domain
contract when implementation algorithms differ.

The current `packages/editor-native` contains an Expo-linked TextKit view and
TypeScript document engine; it is not a drop-in SwiftUI library. Extract reusable
Apple drawing/editing code into a framework-independent layer while preserving
the Expo bridge. Provide an Android and desktop editing implementation through
their own adapters. Include document round-trip fixtures across all renderers.

## 9. Delivery sequence

Each phase is a reviewable change with its owning docs, tests and screenshots.
Write failing behavior tests before implementation; styling/docs use visual and
structural review. Complete the phase gate before claiming its target supported.

### Phase 0: establish the baseline and toolchain

- [x] Add runnable aliases for the existing examples and document the naming scheme.
- [x] Record the current authored inventory and discrepancies in this plan.
- [ ] Generate a machine-readable union of all bases, additions, native-only
      items, exports/parts, helpers, fonts and blocks with ownership/dependency edges.
- [ ] Resolve `form` ownership and Data Table's current native/tutorial mismatch.
- [ ] Record current screenshots and release performance on representative
      reference screens, with existing verification gaps visible.
- [ ] Compile temporary minimal SwiftUI, Android Compose, Compose desktop and
      Tauri mobile spikes with installed toolchains; confirm package/build constraints.
- [ ] Pin compatible stable compiler/SDK/dependency versions. Proposed new-target
      minimums are iOS/iPadOS 17, macOS 14 and Android API 26; confirm them against
      required components during this phase. Preserve existing targets' support.

**Done when:** the inventory is reproducible, each target produces a release
artifact, minimum OS/toolchain versions are recorded, and unresolved decisions
have an owner and concrete follow-up rather than an assumed implementation.

### Phase 1: define contracts and shared design output

- [ ] Add validated component/API/capability mappings and shared state fixtures.
- [x] Extract complete resolved theme data without changing web/RN output.
- [x] Generate native tokens, font registrations and requested icon assets.
- [ ] Implement native theme, density, motion, feedback and capability roots.
- [ ] Document source/generated ownership and exact visual comparison rules.

**Done when:** the same fixture look resolves across languages, all token roles
are covered, icon geometry passes tests, and existing registry/parity tests pass.

### Phase 2: prove installation and create the example hosts

- [x] Execute the opaque-file installer spike and implement the result described
      in section 5, with a documented native configuration schema.
- [x] Create SwiftUI iOS/macOS, Compose Android/desktop and Tauri mobile hosts.
- [ ] Test and implement a minimal themed native Button to prove consumer
      installation; complete its full variant/state coverage in phase 3.
- [ ] Install generated components into each host through the consumer path.
- [ ] Add their working `bun run demo` launch/build/check commands from section 6.
- [x] Generate catalog routes and groups for every gallery. Tauri also consumes
      all current web scenarios; native scenario qualification remains separate.

**Done when:** clean consumers build a themed Button through the CLI; all new
launchers start their actual targets; startup commands forward device arguments
and shut down cleanly; the planned catalog is visible without claiming unfinished
components are implemented.

### Phase 3: verify an end-to-end visual and interaction slice

- [ ] Complete Button and implement Input, Checkbox, Switch, Card, Badge, Avatar,
      Tabs, Dialog and Sheet in SwiftUI and Compose, with shared tests and scenarios.
- [ ] Add Field/Label and the App Shell parts needed for a real settings/form
      screen, including theme and navigation state.
- [ ] Run the same screen on web, RN, native targets and Tauri mobile.
- [ ] Compare light/dark, densities, text sizes, reduced motion, keyboard and
      touch/pointer interactions; profile release builds on physical devices.

**Done when:** installation, editing/validation, overlays and theme changes work;
the slice meets recorded visual and performance criteria on every target. This
is the architecture checkpoint before multiplying it across the catalog.

### Phase 4: complete Basics and root infrastructure

- [ ] Finish every Basics item in section 2 plus Text/FabricatorRoot/typography.
- [ ] Cover every variant, size and state; match touch targets without changing
      the intended compact visual geometry.
- [ ] Complete icon, font and theme settings in the examples.

**Done when:** strict coverage, native consumer builds and variant captures pass
for the entire Basics group, including its owned helpers.

### Phase 5: complete Forms and Overlays

- [ ] Implement all Forms and Overlays items, TimeWheel and the form adapter.
- [ ] Verify nested surfaces, data entry, selection, ranges, keyboard/Back and
      focus restoration, including platform-specific phone presentations.
- [ ] Complete native clipboard, file selection and feedback adapters used here.

**Done when:** every group item has a working demo and behavior tests, all public
parts are mapped, and screen-reader/input checks pass on minimum and current OS.

### Phase 6: complete Structure and App Shell

- [ ] Finish the Structure worklist, shell components and all applicable options.
- [ ] Replace any temporary gallery framing with the full public App Shell.
- [ ] Add native desktop menus/window integration, navigation persistence and
      responsive phone/tablet/desktop behavior.
- [ ] Port all five App Shell and sixteen Sidebar blocks.

**Done when:** every gallery is a working App Shell showcase, shell scenarios
match generated option fixtures, and window resize/process-recreation tests pass.

### Phase 7: complete Content and Chat

- [ ] Complete the Content and Chat worklists, including streaming, attachments,
      model pickers, branching forms, Markdown, syntax and BotFace states.
- [ ] Verify large/streamed content, selection/copy, loading/error/empty states,
      announcements and automatic scroll behavior.

**Done when:** equivalent scenarios produce the same state/event results across
renderers and release builds keep input responsive during streaming and parsing.

### Phase 8: complete Charts

- [ ] Port chart models and every chart type plus shared plotting infrastructure.
- [ ] Match data transforms, palettes, legends, inspection, animation and hit tests.
- [ ] Add accessible tables and pointer/touch/keyboard inspection paths.

**Done when:** all fifteen chart families pass numeric fixtures and native
interaction tests, and captures/animation reviews meet the visual contract.

### Phase 9: complete Advanced tools

- [ ] Deliver real Data Table, Event Calendar, Editor, File Tree, syntax, media
      and image comparison implementations through the adapters in section 8.
- [ ] Run large-data, document round-trip, recurrence/DST, drag/drop and media
      lifecycle cases. Implement native alternatives for keyboard/menu actions.
- [ ] Verify cancellation, external loading and typed errors at I/O boundaries.

**Done when:** all eight advanced families meet their documented behavior and
performance contracts. An empty shell, static preview or basic-component alias
does not satisfy this gate.

### Phase 10: finish blocks, docs and creation flows

- [ ] Finish login/signup/preview blocks and verify all 32 compositions.
- [ ] Complete CLI setup commands, `/create`, App Shell generation, info/doctor,
      docs installation/manual/API sections and generated support matrices.
- [ ] Add SwiftUI/Compose guides and examples without changing existing URLs.
- [ ] Update `AGENTS.md`, platform/component/registry/CLI docs, README and skill
      references when the conventions become implemented support.

**Done when:** every target can be created and extended from the documented
commands, every catalog entry is reachable in its group, and generated docs
describe the implementation and its platform differences accurately.

### Phase 11: qualify complete platform support

- [ ] Run the complete CI, native build, installation, accessibility, visual and
      performance matrix below; resolve all implementation gaps.
- [ ] Verify published payloads and example release artifacts from a clean checkout.
- [ ] Add the user-visible unreleased changelog entry with verified target support.
- [ ] Attach comparison captures and remaining inherent platform mappings to the PR.

**Done when:** every in-scope item/block is implemented and verified on each
promised renderer/OS, required checks pass, and the support matrix contains no
unresolved build, input, installation or performance gaps. Version changes and
publishing happen only through a separately requested release.

## 10. Verification and CI

Extend existing Vitest/registry checks; add Swift/XCTest or Swift Testing and
Compose/JUnit/instrumentation tests where native behavior needs them. Use shared
fixtures with native assertions. Mock only I/O/time boundaries, not the control
whose behavior is being tested.

| Lane          | Required checks                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Every change  | Contract schemas, catalog ownership, generated-file freshness, affected unit tests, format/type checks                                |
| Web/RN        | Existing `bun run check`, `bun run test`, full registry build for registry edits, strict native parity, upstream parity when affected |
| SwiftUI       | Clean package/consumer builds, iOS/iPad simulator and macOS UI scenarios, min/current deployment targets                              |
| Compose       | Android unit/instrumentation and phone/tablet scenarios; desktop tests/builds on macOS, Windows and Linux                             |
| Tauri         | Desktop release tests per OS; mobile release builds, bundled asset smoke tests and device scenarios                                   |
| Visual        | Light/dark, reference looks, every density and variant/state, default/large text, reduced motion and reference widths                 |
| Accessibility | VoiceOver, TalkBack, supported desktop screen readers, keyboard-only, focus restoration, labels/actions and contrast                  |
| Consumer      | Fresh install and update/diff tests, dependency closure, asset/module configuration and no example-app imports                        |
| Performance   | Release startup/resume, interaction latency, frame-time tails, memory, CPU/energy and large-data scenarios                            |

Keep root registry generation pure Bun so all source formats can be emitted on
ordinary CI. Native compilation runs in explicit platform lanes; a required lane
cannot silently pass by skipping its toolchain. Cache build inputs deliberately;
simulator state, screenshot review and device verification remain observable.

Set budgets from phase 0 measurements. As initial interaction targets, keep
feedback within the next available frame and continuous animations within the
display's frame budget (about 16.7 ms at 60 Hz, 8.3 ms at 120 Hz). Track tail
latency and stalls, not average FPS alone. An agreed regression budget per
scenario, hardware and renderer is required before calling a phase passed.
Compare all WebView/helper processes for memory; simulator results do not prove
device battery use or sustained high-refresh performance.

Open changed web screens through Relay browser and inspect captures; inspect
native simulator captures through Relay sim where supported and the configured
Android/desktop tooling elsewhere. Record physical-device checks and any hardware
or accessibility checks unavailable to the implementer. Snapshots do not replace
gesture, keyboard, lifecycle or assistive-technology verification.

### Coverage ledger

Generate a row for every item/part/block and renderer/OS with these fields:
`implementation`, `api`, `visual`, `behavior`, `accessibility`, `consumerInstall`,
`performance`, source owner, evidence paths and any platform mapping. Use
`planned`, `implemented`, `verified` and `platform-mapping` states. A source file
or a passing compile alone cannot produce `verified`.

Exceptions include item/part, renderer, OS, exact difference, date, rationale,
owner and follow-up. Structural JS-only mappings can be permanent when their
native behavior is verified. Missing features remain incomplete scope. Generate
the public compatibility pages and gallery status from this ledger.

## 11. Maintenance and completion checklist

- [ ] Every new web component/change updates the SwiftUI, Compose and RN mapping,
      or records an explicit pending gap before a full-support release.
- [ ] All three web bases continue to land changes together; native additions do
      not modify upstream parity or invent new web style ids.
- [ ] Native variants and part mappings remain supersets of the established
      component contract; platform-specific additions are optional.
- [ ] Examples and gallery fixtures ship with their owning component change.
- [ ] Source, generated output and asset attribution follow their owning docs.
- [ ] Dependency versions are exact-pinned where this repo owns them, maintained,
      compatible with target toolchains and accompanied by size/runtime cost evidence.
- [ ] No example imports leak into installed library source or runtime dependencies.
- [ ] Docs commands actually launch/build the stated target and preserve aliases.
- [ ] New library behavior is tested before implementation and verified in UI.
- [ ] Existing and new required checks pass; every unperformed check is reported.

The main ongoing cost is maintaining two additional native implementations and
their OS adapters. Share design decisions, fixtures and generated assets; keep
rendering and SDK integration explicit so a platform port stays understandable.

## 12. Sources and related work

Repository rules: [`../../AGENTS.md`](../../AGENTS.md),
[`../PLATFORMS.md`](../PLATFORMS.md), [`../COMPONENTS.md`](../COMPONENTS.md),
[`../COMPONENT-GROUPS.md`](../COMPONENT-GROUPS.md),
[`../REGISTRY.md`](../REGISTRY.md), [`../CLI.md`](../CLI.md),
[`../STYLES.md`](../STYLES.md), [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md).
Existing feature plans: [React Native](react-native.md), [App Shell](app-shell.md),
[Charts](charts.md), [Data Table](data-table.md), [Editor](editor.md),
[Event Calendar](event-calendar.md), [Icons](icon-pack-expansion.md).

Primary framework references checked on 2026-11-15; recheck exact APIs and stable
versions at the implementation phase that uses them:

- [SwiftUI ButtonStyle](https://developer.apple.com/documentation/swiftui/buttonstyle)
  and [ToggleStyle](https://developer.apple.com/documentation/swiftui/togglestyle).
- [Compose custom design systems](https://developer.android.com/develop/ui/compose/designsystems/custom)
  and [accessibility defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults).
- [Compose Multiplatform and Jetpack Compose](https://kotlinlang.org/docs/multiplatform/compose-multiplatform-and-jetpack-compose.html)
  and [supported platform stability](https://kotlinlang.org/docs/multiplatform/supported-platforms.html).
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/),
  [frontend configuration](https://v2.tauri.app/start/frontend/) and
  [mobile plugins](https://v2.tauri.app/develop/plugins/develop-mobile/).
- [Registry file payloads](https://ui.shadcn.com/docs/registry/registry-item-json).

The prior source-based feasibility and runtime performance assessments are saved
under `relay/artifacts/`. They establish integration paths, not measured native
parity or a reason to promise Tauri faster UI than React Native.
