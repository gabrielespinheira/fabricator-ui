# Changelog

## [0.6.0](https://github.com/gabrielespinheira/fabricator-ui/compare/fabricator-ui%400.5.1...fabricator-ui%400.6.0) (2026-11-09)

### Highlights

Build chat interfaces with Chat Input, Model Picker and chat questionnaires. Add file explorers, uploads, code highlighting and video playback, with new date, time, month and color controls.

### Upgrade notes

- Components remain copy-in source: reinstall the items you want to update. Native availability and differences are documented per component; several new web controls are not yet available on native.
- Native Video Player requires expo-video and a rebuilt development client. Syntax Highlight uses refractor; Chat Input uses voice-glow.
- The CLI accepts `--spinner` for create and init. The starter set now includes Spinner, and setup links preserve the selection.

### Features

- Chat Input supports attachments, mentions, voice visuals, context meters and send, queue and stop states. Model Picker groups providers and reasoning options; Questionnaire can replace the composer and advance on a single selection.
- File Tree supports keyboard navigation, range selection, folder guides and open/delete callbacks. The Icons Files pack adds 249 Charmed file and folder icons, filename lookup and light/dark palettes across React, React Native and static outputs. Gemini and Grok brand marks join the icons.
- File Upload offers drag-and-drop validation, previews, progress and a compact field.
- Date Picker, Month Input and Time Input support typed values, ranges and form values; Date Picker can include a time wheel. Color Picker supports HEX, RGB, HSL, OKLCH, alpha, swatches and an eyedropper.
- Syntax Highlight provides shared web/native tokenization, line numbers, diffs and copy controls. Video Player adds captions, chapters, seeking, speed, picture in picture and fullscreen on web and native, with documented platform differences.
- Add subtle tabs, animated aspect ratios and 22 spinner patterns. Sidebar demos now demonstrate App Shell navigation.

### Bug Fixes

- Render Files icon blend styles safely in React and avoid server/client hydration mismatches in loading spinners.

- Preserve the selected spinner through initialization, setup commands, shared links and App Shell installs.
- Correct Input OTP default values, placeholders and native states; align input frames and grouped controls.
- Align navigation menu chevrons, preserve palette tokens in chat demos and distinguish the composer from its enclosing card.

## [0.5.1](https://github.com/gabrielespinheira/fabricator-ui/compare/fabricator-ui%400.5.0...fabricator-ui%400.5.1) (2026-11-06)

### Bug Fixes

- Tinted-surface installations now retain the background, card, popover and sidebar Tailwind utilities instead of failing with `Cannot apply unknown utility class bg-background`.

### Upgrade notes

- Deploy the updated registry before expecting new installations to receive the fix. Existing broken installations need their CSS repaired or their theme reapplied after deployment.
- Workspace and native version files are aligned to 0.5.1. The public CLI advances from 0.5.0; the icon packages advance from 0.1.0 without API changes.

### Tests

- Add 83 CSS regression cases covering all three bases, all 11 templates, neutral and tinted surfaces, custom colors, partial updates and repair of broken installations.
- Add a CLI end-to-end scenario that creates, extends and builds a tinted Next.js monorepo.

## [0.5.0](https://github.com/gabrielespinheira/fabricator-ui/compare/fabricator-ui%400.4.0...fabricator-ui%400.5.0) (2026-11-06)

### Features

- [#12](https://github.com/gabrielespinheira/fabricator-ui/pull/12) [`49b22a4`](https://github.com/gabrielespinheira/fabricator-ui/commit/49b22a4d9755a7cdbe82ca09b7df8407e4f4edf8) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Add `create`, one command for a project or a monorepo with mobile and desktop apps. It installs your look and components, wires the App Shell and sounds into your root layout and sets up your AI assistants. `init` takes the same flags for an existing project. Add `apps add`, `agents add` and `upgrade`, make `add` work at a monorepo's root with `--app`, let `mcp init --client` take a list and write Codex's project config, and have `doctor` check each app in a monorepo. Fix components with lib dependencies not building in a monorepo.

- [#12](https://github.com/gabrielespinheira/fabricator-ui/pull/12) [`8560c8f`](https://github.com/gabrielespinheira/fabricator-ui/commit/8560c8fcdb769531d4f609f6351dc60526505300) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Add React Native. In an Expo project, `init` sets up Uniwind, the theme and the `@fabricator` registry for React Native, and `add` installs the native version of each component under the same name, then matches its packages to your Expo SDK. `init --platform` overrides the detection, and `doctor` checks a React Native project's setup.

- [#12](https://github.com/gabrielespinheira/fabricator-ui/pull/12) [`7a9a955`](https://github.com/gabrielespinheira/fabricator-ui/commit/7a9a955aa34f9697648974a425262651662bf385) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Give React Native tablets their own sizes. `FabricatorRoot` picks them from the window's width: 40pt controls with the phone's 15pt text and 18pt icons, `sm` at 34pt, `lg` at 48pt and `xs` at 28pt, with touch targets staying at 44pt. Split View narrower than 768pt uses the phone's sizes, and a density picked on purpose stays. On tablets the App Shell gets a 288pt sidebar, a 32pt page title and a sidebar toggle that stays in the header, and row actions wait for the current row or a trackpad's hover. A calendar keeps its size unless it's given `w-full`, and inputs give way in a row instead of overflowing it.

## [0.4.0](https://github.com/gabrielespinheira/fabricator-ui/compare/fabricator-ui%400.3.0...fabricator-ui%400.4.0) (2026-10-28)

### Features

- [#10](https://github.com/gabrielespinheira/fabricator-ui/pull/10) [`3e35d46`](https://github.com/gabrielespinheira/fabricator-ui/commit/3e35d460d7c95d40ccc1743dbdebde4dcc8e6a46) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Add colour roles to the registry. Primary, secondary, info, success, warning and destructive are each set by `--<role>-hue` and `--<role>-chroma`, and every component takes its colours from them. Breaking: the `error-*` and `destructive-light` tokens are removed; use `destructive-*` (the `error` variants of Alert and Badge stay, as another name for `destructive`).

### Bug Fixes

- [#10](https://github.com/gabrielespinheira/fabricator-ui/pull/10) [`47c102e`](https://github.com/gabrielespinheira/fabricator-ui/commit/47c102e2e6acdb32b104740aa72581c0c2c857d9) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Update the bundled `shadcn` to 4.22.1.

## [0.3.0](https://github.com/gabrielespinheira/fabricator-ui/compare/fabricator-ui%400.2.1...fabricator-ui%400.3.0) (2026-10-11)

### Features

- [#8](https://github.com/gabrielespinheira/fabricator-ui/pull/8) [`987fd70`](https://github.com/gabrielespinheira/fabricator-ui/commit/987fd701384ab48ef694a37a295412e247802c15) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Remove blend mode. `init` and `apply` no longer accept `--blend`, and "Add the @fabricator registry only" now writes the `/r/fabricator/{style}/{name}.json` URL. `doctor` warns when `components.json` still uses the old `/r/{style}/{name}.json` URL, which now redirects to the Fabricator style.

## [0.2.1](https://github.com/gabrielespinheira/fabricator-ui/releases/tag/fabricator-ui%400.2.1) (2026-10-11)

### Bug Fixes

- [#5](https://github.com/gabrielespinheira/fabricator-ui/pull/5) [`e53c245`](https://github.com/gabrielespinheira/fabricator-ui/commit/e53c2454a7aa2ab610a60013ac26b0cd52a771bc) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Use `https://fabricator-ui.vercel.app` as the default registry host.

## [0.2.0](https://www.npmjs.com/package/fabricator-ui) (2026-10-09)

### Features

- Ship the Fabricator design system. The registry the CLI installs from now serves `@fabricator/foundations` (surfaces, interaction tokens, motion tiers, scrollbars), `@fabricator/fluid-hover` and Fluid Hover overrides for the menus, select, combobox, command, tabs, sidebar, accordion and table in all three bases, `@fabricator/sounds`, `@fabricator/radius-pill`, a Search component, and redesigned checkbox and radio styles. Surfaces take a base colour through `--surface-hue` and `--surface-chroma`. Native Select and Chart are left out of Fabricator mode, and RTL support is removed. The CLI end-to-end matrix installs Fluid Hover, sounds and the pill radius for every base.
