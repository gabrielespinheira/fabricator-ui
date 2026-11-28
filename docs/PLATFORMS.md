# Platforms

Fabricator UI shares component names, design tokens, icon geometry and behavior
intent across renderers. React web and React Native keep their API parity
contract.

| Platform                       | Components                                        | Icons                                               | Demo                            |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| Web                            | Base UI, Radix or React Aria base trees           | `@fabricator-ui/icons`                              | `demos/react`                   |
| Desktop                        | The web components in an Electron or Tauri window | `@fabricator-ui/icons` (+ PNGs from `icons-static`) | `demos/electron`, `demos/tauri` |
| iOS, iPadOS, Android           | The native tree, on Expo and Uniwind              | `@fabricator-ui/icons-react-native`                 | `demos/react-native`            |
| iOS, iPadOS, Android via Tauri | Existing React web components in a WebView        | `@fabricator-ui/icons`                              | `demos/tauri`                   |
| No framework                   | (none)                                            | `@fabricator-ui/icons-static`                       | (none)                          |

What a platform lacks is recorded, never silent: `registry/native/parity-exceptions.json` for native gaps (published on the React Native compatibility page by `native:docs`), the item's `meta` for a base fallback.

## Tauri mobile

The CLI scaffolds the Tauri mobile host with `create --mobile-runtime tauri`
or adds it to an existing React + Vite monorepo with `apps add mobile tauri`.
The host uses the web registry or React package from `apps/web`. It has its
own app identifier, native configuration and asset build. See the
[CLI setup and commands](CLI.md#tauri-mobile).

Tauri mobile bundles the React explorer's production frontend and runs it in a
system WebView. Both demos use the generated explorer catalog from the full
registry build. The app can open with the Next server stopped. Remote sample
media still needs a network connection.

Run `bun run demo react:check:browser` to check the pages shared by both demos.
The device, check, and build commands are in the [demo README](../demos/README.md#commands).

## Web

- Three bases (see [COMPONENTS.md](../COMPONENTS.md#bases)); React Aria has no `NavigationMenu`.
- The CLI sets up Next.js, Vite, React Router, TanStack Start, Astro and Laravel, on React 19 and Tailwind 4. Installation guides: `apps/web/content/docs/installation/`.

## Desktop

- The desktop demos wrap the site's `/desktop` route (`app/(view)/desktop/`) in Electron (`demos/electron`) or Tauri (`demos/tauri/desktop`). Run `bun run demo electron` or `bun run demo tauri:desktop` (needs Rust; the first build takes minutes).
- The CLI scaffolds desktop apps from `packages/cli/templates/desktop-{electron,tauri}`. An App Shell with `desktop=<electron|tauri>` finds its window at runtime through the `desktop-window` item.
- On macOS, Electron and Tauri overlay native window controls on the App Shell. Tauri uses `titleBarStyle: "Overlay"` and `hiddenTitle: true` for the main window. Its configured traffic-light inset is `{ x: 16, y: 32 }` to place the buttons at `{ x: 16, y: 23 }` on the tested macOS release. The `core:window:allow-set-theme` permission lets the window material follow the page theme. Tauri uses the same traffic-light position in both tab layouts, so the dedicated titlebar is 20px taller than Electron's.
- CDP clicks skip the native hit test, so a window control is proven only by auditing its `app-region` rects.
- The desktop demos and `demos/react-native` share the component explorer's sidebar (`apps/web/lib/component-explorer.ts`) and shell options.

## React Native

The native tree (`apps/web/registry/native/`) holds the React Native version of every published item under the same name. Projects install it from `/r/fabricator/native/{name}.json`. **Porting rules, the style-map subset that works, motion, fluid hover, overlays and checks are in [`registry/native/README.md`](../apps/web/registry/native/README.md); read it before writing native source.** The plan is [`plans/react-native.md`](plans/react-native.md).

- **Platform parity (contract 9):** same exports, `variant` and `size` values, declared props, `data-slot`s and placeholder names as web. Base UI's API is the one to match. Native may add, never rename. `bun run native:parity` (in `apps/web`) compares them; CI runs it `--strict`.
- **Sizes:** phones use the spacious scale (44pt controls); tablets use 40pt controls with phone text. `FabricatorRoot` picks them from the window width; Split View under 768pt counts as a phone.
- `demos/react-native` is a private demo with its own install (React Native pins its own React). It runs every demo from the compiled registry through `metro.config.js`, and its shell is the library's `AppShell`. Nothing in the library imports it.

### Theme

`registry/fabricator/native-theme.ts` resolves a look to what React Native can draw (no OKLCH, CSS variables or `calc()`), from the same modules as the website's stylesheet. Never write a colour or size by hand in `demos/react-native`.

- `getNativeCssVariables` gives every token under the website's names; `toNativeStylesheet` writes them into the installed `fabricator.css`, and `applyLook` hands them to Uniwind at runtime through `getNativeRuntimeVariables`.
- Its tests pin values measured in a browser and read `app-shell.css` and `globals.css`, so a token or radius change fails there until `native-theme.ts` follows.
- Corners: native has no `calc()`, so `getNativeRadii` (`radius.ts`) resolves every radius role (`--radius-control`, `--radius-nested`, …) to points for the look's shape and density, and the native style maps use the same `rounded-(--radius-*)` classes as the web plus `corner-curve`. That utility writes `border-curve: var(--corner-curve)`: `continuous` (Apple's squircle) for Squircle, `circular` otherwise. Android ignores it and draws round corners, Squircle's fallback.
- `registry/fabricator/look-presets.ts` holds the named looks both settings UIs offer. Modules native installs import (`foundation-tokens.ts`, not `foundations.ts`) stay free of React, the DOM and the website's CSS.

### Gotchas

- Inter through `--font-sans`; React Native picks a weight's cut from the family, so `font-medium` and `font-semibold` draw the static 500 and 600.
- Uniwind can't hold `cubic-bezier()` in a variable: `--motion-speed` names the speed and `lib/motion.ts` reads curves from `motion.ts`. It splits shadow lists on commas, so shadow colours are hex. It mangles a runtime `-0.5px`, hence `getNativeRuntimeVariables`.
- Reanimated's `Keyframe` left surfaces invisible; `useSurfaceAnimation` uses custom worklets.
- Sounds share the web recipes (`shared/lib/sound-recipes.ts`); `lib/sound-synth.ts` renders them to files and `expo-audio` plays them. Seeking a finished player and playing in the same tick drops the play, so `lib/sounds.ts` rewinds on finish. Every sound has a matching haptic.
- The Android command needs Android Studio's SDK, JDK 17 and an emulator from its Device Manager. It fills in an unset `ANDROID_HOME` or `JAVA_HOME`, starts the emulator, and Gradle downloads the missing SDK packages on the first build.
- Expo's Metro reads `tsconfig` paths at runtime; `demos/react-native` turns that off because its aliases differ between types (source) and bundling (compiled).

### Commands

| Task                                         | Command                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| iPhone                                       | `bun run demo react-native:ios`                                                  |
| iPad, Android                                | `bun run demo react-native:ipad`, `bun run demo react-native:android`            |
| Every demo on an iPhone and iPad, for errors | `bun run demo react-native:check` (`--device`, `--scope components`, `--strict`) |
| Compile items without writing                | `bun run registry:native --check <names>` (in `apps/web`)                        |
| Types (local; CI uses the CLI's Expo test)   | `bun run typecheck` (in `demos/react-native`)                                    |
| Docs pages from source and `differences.ts`  | `bun run native:docs` (in `apps/web`)                                            |

## Fabricator Icons

Fabricator maintains the UI icon catalog, including original additions and names and aliases carried over from its frozen import. Every UI icon shares the 24 × 24 optical grid across Outline, Fill, Duotone and web animation. Outline and Duotone use a 1.75-unit resting stroke, sized for the 14, 16 and 18 px density tokens. Brand marks and Charmed file icons have their own sets.

| Package                             | For                               | Sets                                                                                        |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `@fabricator-ui/icons`              | React (web, desktop)              | outline, fill, duotone, animated (Motion), brands, files, dynamic, catalog                  |
| `@fabricator-ui/icons-react-native` | React Native (`react-native-svg`) | outline, fill, duotone, brands, files, animated sidebar toggle                              |
| `@fabricator-ui/icons-static`       | Anything                          | Outline, Fill and Duotone SVGs, sprites, JSON nodes, a PNG exporter for tray and menu icons |
| `packages/icons-core` (private)     | Sources, checks, generators       | Fabricator catalog and drawings, attribution, file icons and brand allowlist                |

- Adding or importing icons: [`packages/icons-core/CONTRIBUTING.md`](../packages/icons-core/CONTRIBUTING.md). Plans: [`plans/icon-pack.md`](plans/icon-pack.md), [`plans/icon-pack-expansion.md`](plans/icon-pack-expansion.md).
- Edit UI artwork in `sources/outline/` and `sources/rounded/`. Category labels live in `sources/categories.json`. The frozen import in `sources/lucide/` provides the compatibility baseline and attribution. `src/generated/`, `dist/` and the static outputs are gitignored.
- Registry source uses `IconPlaceholder` on web and real imports from `icons-react-native` in the native tree. How the site renders icons: [WEBSITE.md](WEBSITE.md#icons).
- Sidebar and App Shell use the packaged `SidebarToggleIcon` on both platforms. The web subpath is `@fabricator-ui/icons/animated/sidebar-toggle`. React Native uses `@fabricator-ui/icons-react-native/animated` and the Reanimated UI thread.
- `bun run icons:check` (part of `check`) validates sources. Use `bun run icons:sheet <names…>` for a review PNG and `bun run icons:audit` to check animations in Chrome after drawing or motion changes.

## editor-native

`packages/editor-native` is the Expo module the native `editor` item draws its document with: one TextKit 2 `UITextView`, iOS 16.4 and later. Android isn't built yet. The editor's engine is the shared TypeScript in `registry/fabricator/shared/lib/editor-*.ts` and `markdown-*.ts`. It ships with the icon packages (`release:icons`). Plan: [`plans/editor.md`](plans/editor.md).

## Done when

- [ ] A web component change has its native item, or a dated `parity-exceptions.json` entry, and `bun run native:parity` passes.
- [ ] `add <item>` works in a fresh Expo project using nothing from `demos/react-native`.
- [ ] `bun run demo react-native:check` passes, and the demo was checked on the iOS Simulator and Android Emulator, light and dark, with VoiceOver and TalkBack.
- [ ] `bun run native:docs` was rerun after a native item changed.
- [ ] Icon changes pass `bun run icons:check` and `bun run test`, with a review sheet on the PR for new drawings.
