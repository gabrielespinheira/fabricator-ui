# Platforms

Fabricator UI and Fabricator Icons are cross-platform: one design, one API and one set of names on the web, desktop and React Native. A component, a token or an icon means the same thing everywhere; only the renderer differs.

| Platform             | Components                                        | Icons                                               | Example app    |
| -------------------- | ------------------------------------------------- | --------------------------------------------------- | -------------- |
| Web                  | Base UI, Radix or React Aria base trees           | `@fabricator-ui/icons`                              | `apps/web`     |
| Desktop              | The web components in an Electron or Tauri window | `@fabricator-ui/icons` (+ PNGs from `icons-static`) | `apps/desktop` |
| iOS, iPadOS, Android | The native tree, on Expo and Uniwind              | `@fabricator-ui/icons-react-native`                 | `apps/mobile`  |
| No framework         | (none)                                            | `@fabricator-ui/icons-static`                       | (none)         |

What a platform lacks is recorded, never silent: `registry/native/parity-exceptions.json` for native gaps (published on the React Native compatibility page by `native:docs`), the item's `meta` for a base fallback.

## Web

- Three bases (see [COMPONENTS.md](COMPONENTS.md#bases)); React Aria has no `Menubar` or `NavigationMenu`.
- The CLI sets up Next.js, Vite, React Router, TanStack Start, Astro and Laravel, on React 19 and Tailwind 4. Installation guides: `apps/web/content/docs/installation/`.

## Desktop

- The desktop example (`apps/desktop`) wraps the site's `/desktop` route (`app/(view)/desktop/`) in Electron (`electron/`) or Tauri (`src-tauri/`). `bun run desktop` or `bun run desktop:tauri` (needs Rust; the first build takes minutes).
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

| Task                                         | Command                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| iPhone, iPad, Android                        | `bun run mobile`, `bun run mobile:ipad`, `bun run mobile:android`     |
| Every demo on an iPhone and iPad, for errors | `bun run mobile:check` (`--device`, `--scope components`, `--strict`) |
| Compile items without writing                | `bun run registry:native --check <names>` (in `apps/web`)             |
| Types                                        | `bun run typecheck` (in `apps/mobile`)                                |
| Docs pages from source and `differences.ts`  | `bun run native:docs` (in `apps/web`)                                 |

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
- [ ] `bun run mobile:check` passes, and the demo was checked on the iOS Simulator and Android Emulator, light and dark, with VoiceOver and TalkBack.
- [ ] `bun run native:docs` was rerun after a native item changed.
- [ ] Icon changes pass `bun run icons:check` and `bun run test`, with a review sheet on the PR for new drawings.
