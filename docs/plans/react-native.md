# React Native: plan

Status: built on `release/v0.5.0` (2026-11-04): 67 of 67 components and 32 of 32 blocks pass `native:parity --strict`. Android and screen readers are not verified; §16 lists them. §16 also records what the spike found and where the build departed from this plan. Decisions in §14 took their recommended answers.

Every published Fabricator item gets a React Native version: same item name, same install command, same exports, variants and tokens, on iOS and Android. A checker in CI enforces it, so the number stays true after release.

The deliverable is the library: components a React Native project installs with the CLI, the way a web project does today. `apps/mobile` is a private example that lives only in this repo. It is never published, installed or required by anything (§3, §10).

---

## 1. What "100%" can mean

100% identical props and behaviour is impossible, and promising it would make the claim false on day one. React Native has no DOM, cascade, hover, `:has()`, portals, CSS Grid or global key events. `onClick`, `render={<a />}`, `<div>` children and `hover:` classes have no native meaning.

So 100% is defined as four measurable things:

| Dimension | The bar                                                                                                                                                             | How it is enforced                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Coverage  | Every published item has a native item with the same name. No item is silently missing.                                                                             | Parity check: catalog comparison                       |
| API       | Same named exports, same `variant` and `size` values, same non-DOM props, same `data-slot` names. DOM events map one way (`onClick` to `onPress`).                  | Parity check: AST comparison                           |
| Look      | Same tokens and the same resolved colour, radius, spacing, type and timing for every look (surface, roles, radius, density, motion).                                | `native-theme.test.ts` extended, values from a browser |
| Behaviour | Same state model and the same outcome per component. Where a web input doesn't exist, a touch input takes its place, and the item's tier and docs page say so (§6). | Tests, Maestro flows, manual screen reader pass        |

Exceptions live in one reviewed file (`registry/native/parity-exceptions.json`, each with a reason and date), the same pattern as `scripts/parity-exceptions.json`. The compatibility page on the site is generated from it, so what's different is public.

In practice, the same install and nearly the same code:

```tsx
// Web
import { Button } from "@/components/ui/button"
;<Button variant="outline" size="sm" onClick={save}>
  Save
</Button>

// React Native
import { Button } from "@/components/ui/button"
;<Button variant="outline" size="sm" onPress={save}>
  Save
</Button>
```

**What this does not give you:** a screen written for web won't run on native unchanged. Component code isn't shared either; models and tokens are. Sharing screens would need a universal renderer, rejected in §3.

**The cost you are accepting:** a component now has four sources (Base UI, Radix, Aria, native), and the 567 unique `cn-*` placeholders in the Base tree and overlays each need a native rule or an exception. Upstream sync never brings native changes. Every web component change has a native line in its Definition of Done from now on.

---

## 2. Where things stand

**Already shared and working:**

- `lib/app-shell-model.ts` and `lib/sidebar-model.ts`: DOM-free, used by web and `apps/mobile`.
- `registry/fabricator/native-theme.ts`: resolves a look to hex, numbers and shadow strings, pinned to browser measurements. It only covers what the App Shell draws: `primary` of the six colour roles, and the sheet and move timings.
- `@fabricator-ui/icons-react-native`: built, not yet on npm.
- `look-presets.ts`, the `fabricator-ui://look?…` deep link and the settings screen.

**Missing:**

- Any installable native component. The only native UI is `apps/mobile`'s 3,143 lines of hand-written `StyleSheet` code, which no project can install.
- The theme as an item. `native-theme.ts` has no registry entry; only `apps/mobile` can reach it, through a Metro alias. A real project would get no native theme at all today.
- Android: nothing has run on it. `apps/mobile/app.json` has `"platforms": ["ios"]`, and this machine has no Android SDK, `adb` or emulator.
- Reanimated, gesture handler, keyboard handling: `apps/mobile` uses RN's `Animated` and `Modal`.
- Install path, docs, native tests, CI.

**Inventory to cover** (counted 2026-11-04, Base tree):

| Kind                  | Count | Notes                                                                                                                        |
| --------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| UI items              | 67    | 62 upstream files, minus `native-select` and `chart` (excluded), plus 7 Fabricator items                                     |
| Libs and hooks        | 9     | `utils`, `use-mobile`, `foundations`, `radius-pill`, `fluid-hover`, `sounds`, `sortable`, `app-shell-model`, `sidebar-model` |
| Blocks                | 32    | login ×5, signup ×5, sidebar ×16, app-shell ×5, `preview-03`                                                                 |
| Web examples          | 535   | Native covers variants and states per component, not one file per example (§9)                                               |
| Web-only style usages | 742   | In `styles/fabricator/*.css`: `group-` 303, `hover:` 143, `focus-visible:` 98, `in-data` 96, `has-data` 72, `peer-` 30       |

That last row is why the web style maps can't be reused as they are: most of those variants do nothing on native.

---

## 3. Architecture

### Decision: a fourth source tree, one registry, same names

```
apps/web/registry/native/
  _registry.ts          item declarations (meta.platform: "native")
  ui/<name>.tsx         same file names as the web items
  lib/                  primitives adapter, motion, feedback, sortable, sheet
  hooks/
  blocks/<name>/
  parity-exceptions.json
apps/web/registry/styles/native/<component>.css   style map, one file per component
apps/web/registry/styles/style-native.css         assembled, generated, committed
apps/web/public/r/native/<name>.json              output, gitignored
apps/web/examples/native/<name>-example.tsx       demos, shared by the app and the docs
apps/web/styles/native/ui/                        compiled components, gitignored
apps/mobile/                                      private example, repo only (§10)
```

Served at `/r/fabricator/native/{name}.json`. An Expo project's `components.json`:

```json
{
  "style": "radix-nova",
  "registries": {
    "@fabricator": "https://fabricator-ui.vercel.app/r/fabricator/native/{name}.json"
  }
}
```

The URL has no `{style}` segment and the `style` id stays a valid upstream one, so contract item 2 holds. `@fabricator/button` means the right thing on each platform, and dependencies keep the `@fabricator/` namespace.

It is not a base. Bases are DOM primitive libraries with mandatory parity across them; native has its own rule (§8).

The tree typechecks under `apps/mobile`'s `tsconfig`, which has React Native's types and its own React outside the bun workspace. It stays out of `apps/web/tsconfig.json` (DOM lib) and out of the website's Tailwind `@source` lines.

### Decision: the library doesn't know the example app exists

| Ships to users                                                              | Stays in this repo                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Registry items at `/r/fabricator/native/` (components, libs, theme, blocks) | `apps/mobile`: `private: true`, outside the bun workspace, no release |
| `@fabricator-ui/icons-react-native` on npm                                  | Its Metro aliases, screens, sample data and Maestro flows             |
| `fabricator-ui` CLI support (`init`, `add`, `doctor`)                       | `examples/native/` as source, shown in docs, like web's examples      |
| Docs pages for each item                                                    | Capture scripts and parity fixtures                                   |

Dependencies run one way: the app imports the library, never the reverse. Registry source can't import from `apps/mobile`, and no published item lists a file from it. Anything the library needs that lives there today moves into the registry: `native-theme.ts` becomes an installable item, and `src/shell/*` becomes `app-shell` and `sidebar` in Phase 4.

The test of the library is a fresh `create-expo-app` project using only what the CLI installs (§9). A component that works in `apps/mobile` but not there isn't done.

### Decision: same placeholders and same build

Native source uses `cn-button-variant-default` like web, compiled by the same `createStyleMap` and `transformStyle`. I ran this on a Pressable source with `ios:`, `active:` and `data-[pressed=true]:` rules and it produced correct output (§5). This gives the parity check a direct comparison: web placeholder set against native placeholder set.

### Decision: Uniwind free, pinned

| Option                 | Verdict                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Uniwind 1.13 (MIT)** | **Pick.** Tailwind v4 like the web tree, `className` kept (the override contract), data selectors, `ScopedVariables`, `updateCSSVariables`, OKLCH parsing, bare RN and Expo. Metro plugin, no Babel preset. Stable. |
| NativeWind v5          | Still RC (`5.0.0-rc.0`) with `4.x` stable on Tailwind 3. Uniwind's own benchmark puts it about 5× slower; vendor numbers, so a tiebreak at most.                                                                    |
| StyleSheet plus tokens | What `apps/mobile` does. No `className`, so consumers can't override the way the contract requires, and no Tailwind in the user's own screens.                                                                      |

Free-tier limits the design must accept, from Uniwind's docs:

- `group-*` has no runtime effect. Parent state reaches children through context or `data-*` props.
- `hover:`, `before:`, `after:`, `backdrop-*` don't exist. `grid-*` is in progress. Data selectors are equality only, on the component's own props.
- No `className` animation. Motion goes through Reanimated with tokens (§4).

Registry components must never require Uniwind Pro: it's paid and a user would have to buy it to install us.

### Decision: `rn-primitives` behind a thin layer, own gesture surfaces

| Option                                   | Verdict                                                                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`@rn-primitives/*` plus own gestures** | **Pick.** MIT, covers 27 primitives with a Radix-shaped API, and your rule is maintained library over hand-rolled. Sheets, drawers and the reveal are own code on Reanimated and gesture handler, since those are where the Fabricator feel lives. |
| Own primitives for everything            | Full control, months more work, and we'd own screen reader bugs on two platforms.                                                                                                                                                                  |
| `@expo/ui` (SwiftUI, Compose)            | Stable since SDK 56, excellent system controls. But it draws the system's look, so a Fabricator Select wouldn't look like Fabricator, and it excludes bare RN. Not the default; see §14.                                                           |

Known weakness: Reusables' docs say Dropdown Menu can't be controlled with `open` and `onOpenChange`, only through a ref. Superset needs those props, so our wrapper maps them to the ref. Phase 0 tests this, and any primitive that fails is replaced by own code for that item alone. The project is small (946 stars, last publish August 2026), and copy-in source limits the damage if it stalls.

React Native Reusables is the closest thing to "upstream" for this work: read its source before each component, as we do with shadcn. It covers about 30 of our 67 items and targets shadcn's look, so we don't vendor or sync it. Any file we do derive from it gets MIT attribution in `NOTICE.md`.

### Rejected: one universal source

React Native Web, React Strict DOM or Tamagui-style single trees would replace Base UI, Radix and Aria on web. That breaks the superset contract and the upstream parity check for every existing user. D14's evidence also stands: SharpOS and Relay share models across platforms, not components.

---

## 4. Mapping the design system

| Web                                  | Native                                                                                                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens as CSS variables              | `global.css` theme block for the default look. `getNativeCssVariables(mode, look)`, added to `native-theme.ts`, feeds `Uniwind.updateCSSVariables` for the full token contract. Same names and meanings.                                 |
| `color-mix()`, `calc()` hue recipes  | Resolved in JS from `color-roles.ts` and `surface-tint.ts`. Runtime modules stay free of React and the DOM, as they are today.                                                                                                           |
| `data-density`, `DensityProvider`    | Same export. Renders `ScopedVariables` with the `--density-*` set. `size="sm"` and `"lg"` pin compact and spacious on that control. Default density is **spacious** on phones, as `apps/mobile` found: 30pt rows are small for a finger. |
| Portalled parts read `useDensity()`  | Same rule. Portal content leaves the React tree, so each overlay re-wraps its scope.                                                                                                                                                     |
| `motion-*`, `duration-<role>`        | `useMotion("dialog")` returns Reanimated configs from `MOTION_SPEEDS`. `motion-usage.test.ts` extends to the native tree and fails on literal durations. `off` and Reduce Motion give zero.                                              |
| `hover:`                             | `active:` for touch. `onHoverIn` where iPad and Android pointers exist.                                                                                                                                                                  |
| `focus-visible:`                     | `focus:` on inputs. Rings for hardware keyboard focus only where RN reports it.                                                                                                                                                          |
| `has-data-*`, `in-data-*`, `group-*` | Context from the parent (`ItemContext` and similar), or a `data-*` prop set on each child.                                                                                                                                               |
| Text inherits from parent            | New `Text` item plus `TextClassContext`. `Button` and friends wrap string children in `Text`, so `<Button>Save</Button>` works as on web. Reusables makes you write the inner `Text`; we shouldn't.                                      |
| `truncate`, `line-clamp`             | `numberOfLines` set by the component.                                                                                                                                                                                                    |
| `backdrop-blur`                      | `expo-blur` in one adapter (2 usages).                                                                                                                                                                                                   |
| `scroll-fade`                        | Gradient overlay on the scroll edges.                                                                                                                                                                                                    |
| `shadow-surface-N`                   | RN `boxShadow`, strings already resolved by `native-theme.ts`. Android output needs checking.                                                                                                                                            |
| Fluid Hover                          | Same `useFluidHover` export. Highlight follows the finger across a list; the selection background slides. Pure geometry moves to a shared module with its existing tests.                                                                |
| `lib/sortable.tsx`                   | Same adapter shape on gesture handler and Reanimated (D15 still applies). The menu alternative stays.                                                                                                                                    |
| `<SoundEffects />` by DOM delegation | No DOM to delegate from, so `useFeedback("press")` is called by components. Sounds are rendered from `sounds.ts` to WAV at build time, played with `expo-audio`, alongside `expo-haptics`.                                               |
| `data-slot`                          | Kept on every part. RN ignores it and it maps to `testID` by default, so tests and the parity check can read it.                                                                                                                         |
| `IconPlaceholder`                    | Not used. Native imports `@fabricator-ui/icons-react-native` directly. The CLI's icon swap has no native target.                                                                                                                         |
| `render` (Base), `asChild` (Radix)   | `asChild`, as `rn-primitives` does.                                                                                                                                                                                                      |
| Routing                              | Same non-goal. `onSelect` and `isActive`. The library never imports a router. `<Link asChild>` with Expo Router is covered by the install test.                                                                                          |

**Native-only needs, everywhere:** 44pt and 48dp minimum touch targets (`hitSlop` on compact controls), safe areas, Android back dismisses overlays, keyboard avoidance, Dynamic Type and font scale, `accessibilityRole` and `accessibilityState` on every part.

---

## 5. What I verified, and what I didn't

Run today against the pinned `shadcn` 4.22.1 in a scratch Expo-shaped project, nothing installed, scratch files deleted:

| Finding                                                                                  | Result                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadcn info` recognises the project                                                     | Yes: `framework: "Expo"`, Tailwind v4, `global.css`.                                                                                                                                                                                                                                           |
| `add @fabricator/button --dry-run` with a style-less registry URL                        | Works. Resolves the namespaced dependency, rewrites imports to `@/components/ui/*`, lists npm dependencies.                                                                                                                                                                                    |
| `transformStyle` on RN source with `ios:`, `active:`, `data-[…]:` and `h-(--density-36)` | Correct output, in `cva` and in `className`.                                                                                                                                                                                                                                                   |
| **Theme through the item's `css` field**                                                 | **Broken.** `{"@layer theme": {":root": {"@variant light": …}}}` comes out as `@layer theme { :root {} @variant light {…} … }`, hoisting the variants out of `:root`. Uniwind's documented shape has them inside. So the theme ships as a CSS file item plus an `@import` (untested, Phase 0). |
| **Dependency versions**                                                                  | **Gap.** The CLI's bundle has no `expo install`, so `add` would fetch latest, and Reanimated 4.7 peers on RN 0.86 to 0.88. Our wrapper must run `expo install --fix` after `add` in Expo projects.                                                                                             |

Package versions below are from npm and from `expo/bundledNativeModules.json` in `apps/mobile`:

| Package                                   | SDK 58 version                          |
| ----------------------------------------- | --------------------------------------- |
| `react-native-reanimated`, `-worklets`    | 4.7.1, 0.13.0                           |
| `react-native-gesture-handler`            | ~3.3.0                                  |
| `react-native-keyboard-controller`        | 1.22.7                                  |
| `@shopify/flash-list`                     | 2.3.2                                   |
| `react-native-svg`                        | 15.16.0                                 |
| `expo-blur`, `expo-haptics`, `expo-audio` | ~58.0.5, ~58.0.7, ~58.0.11              |
| `uniwind` (not bundled)                   | 1.13.1, peers RN ≥ 0.81                 |
| `@rn-primitives/*` (not bundled)          | 1.5.x, peers `*`                        |
| `@gorhom/bottom-sheet` (not bundled)      | 5.2.14, npm entry last changed May 2026 |

**Not verified, and Phase 0 must answer:**

- Uniwind on RN 0.88 and Expo 58. Its peer range allows it, but its latest published benchmark used RN 0.86.
- `rn-primitives` on RN 0.88, and its VoiceOver and TalkBack behaviour.
- `h-(--density-36)` resolving through `ScopedVariables` at runtime.
- `cn` 0.5 on Hermes with Uniwind's `ios:` and `android:` variants.
- Whether `@gorhom/bottom-sheet` works with gesture handler 3.
- Testing Library under Vitest. `packages/icons-react-native` runs Vitest in Node only, so component rendering there is unproven.
- Maestro on Expo 58 (my comparison search returned nothing, so this pick rests on prior knowledge).
- Android at all. It needs Android Studio and an emulator on this machine first.
- Uniwind in a fresh `create-expo-app` project, which is where consumers start.
- Tailwind under Uniwind picking up classes from files outside `apps/mobile` (`apps/web/styles/native`, `apps/web/examples/native`). This one only affects the example app. Uniwind documents monorepo setups; I haven't tried this layout.

---

## 6. Component matrix

**S** same use. **A** same API, one web input swapped for a touch one. **R** same API, a DOM-only library replaced underneath. **N** kept so code compiles, does nothing, documented.

### Phase 1 (1)

| Item      | Tier | Native                              |
| --------- | ---- | ----------------------------------- |
| `density` | S    | `ScopedVariables`, default spacious |

Added for native only: `text`, `lib/portal`, `lib/native-theme`, `lib/motion`, `lib/feedback`.

### Phase 2: content and controls (33)

| Item                                                                                                                        | Tier | Native and differences                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| `alert`, `aspect-ratio`, `badge`, `card`, `empty`, `item`, `label`, `marker`, `message`, `separator`, `skeleton`, `spinner` | S    | Plain views. Skeleton pulses through Reanimated.                            |
| `avatar`, `attachment`, `bubble`                                                                                            | S    | `expo-image` candidate for avatars; RN `Image` unless Phase 2 shows a need. |
| `button`, `button-group`, `toggle`, `toggle-group`                                                                          | S    | `onPress`. `motion-press` becomes a scale on press.                         |
| `checkbox`, `radio-group`, `switch`, `progress`                                                                             | S    | Own-drawn, `rn-primitives` state.                                           |
| `slider`                                                                                                                    | S    | Gesture handler thumb, same value API.                                      |
| `accordion`, `collapsible`                                                                                                  | S    | Measured height through Reanimated.                                         |
| `input`, `textarea`, `input-group`, `field`                                                                                 | S    | `TextInput`, with its `onChangeText`.                                       |
| `input-otp`                                                                                                                 | R    | Hidden `TextInput` with `textContentType="oneTimeCode"`.                    |
| `kbd`                                                                                                                       | S    | Visual only.                                                                |
| `direction`                                                                                                                 | N    | Fabricator is LTR-only; passes children through.                            |

### Phase 3: overlays and pickers (17)

| Item                            | Tier | Native and differences                                                                        |
| ------------------------------- | ---- | --------------------------------------------------------------------------------------------- |
| `dialog`, `alert-dialog`        | S    | `rn-primitives`, screen reader modal, Android back.                                           |
| `sheet`, `drawer`               | R    | One sheet adapter, `vaul` replaced. Swipe to dismiss, keyboard-aware.                         |
| `popover`                       | S    | Measured anchor, flip and clamp as pure tested functions.                                     |
| `dropdown-menu`                 | S    | Controlled through the ref mapping (§3).                                                      |
| `select`                        | A    | Same parts. Opens as a sheet on phones, popover on tablets.                                   |
| `combobox`, `command`, `search` | R    | `cmdk` replaced with a filtered list in a sheet. Filter logic shared with web where possible. |
| `context-menu`                  | A    | Long press replaces right click.                                                              |
| `tooltip`                       | A    | Long press shows it; also exposed as the accessibility hint.                                  |
| `hover-card`                    | A    | Long press opens; tap still goes through.                                                     |
| `toast`, `sonner`               | R    | One native engine, both item names and APIs. Swipe to dismiss.                                |
| `calendar`                      | R    | `react-day-picker` replaced, `date-fns` kept. Same props where they aren't DOM.               |
| `questionnaire`                 | S    | Composed from the above.                                                                      |

### Phase 4: navigation, layout and shell (16)

| Item                              | Tier | Native and differences                                                                                                                                                       |
| --------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tabs`, `tab-strip`               | S    | Sliding selection; strip scrolls horizontally.                                                                                                                               |
| `sidebar`, `app-shell`, `app-nav` | A    | Promote `apps/mobile/src/shell/*`. Reveal, tab bar and panels from the shared model. Keyboard `shortcut` props are **N**: as far as I know RN core has no global key events. |
| `workspace-switcher`, `user-menu` | S    | Sheet on phones.                                                                                                                                                             |
| `breadcrumb`, `pagination`        | S    | Links become pressables; breadcrumb scrolls or folds.                                                                                                                        |
| `navigation-menu`, `menubar`      | A    | Desktop patterns. Phone: triggers in a horizontal row, each opening a sheet. Tablet: popover.                                                                                |
| `scroll-area`                     | S    | `ScrollView` plus fades. No custom scrollbar: touch keeps native scrolling, as on web.                                                                                       |
| `table`                           | S    | Views in a horizontal `ScrollView`, column widths measured.                                                                                                                  |
| `carousel`                        | R    | `embla` replaced with gesture handler and Reanimated.                                                                                                                        |
| `resizable`                       | R    | `react-resizable-panels` replaced. Drag handle; useful on tablets, works on phones.                                                                                          |
| `message-scroller`                | S    | Inverted list, FlashList if `FlatList` janks.                                                                                                                                |

### Libs and blocks

- **Phase 1:** `utils`, `foundations` (as the CSS file), `radius-pill`, `use-mobile` (window width).
- **Phase 3:** `sounds`, `fluid-hover`.
- **Phase 4:** `sortable`. `app-shell-model` and `sidebar-model` install as they are.
- **Phase 5, blocks, in order:** `app-shell-01..05`, `login-01..05`, `signup-01..05`, `preview-03`, `sidebar-01..16`. They're compositions, so cheap once the parts exist. The sidebar ones are the cut candidate (§14).

Out, because web excludes them too: `native-select`, `chart` and its blocks. When Chart returns to web, native follows in the same change.

---

## 7. Install path

```bash
npx fabricator-ui@latest init      # detects expo or react-native in package.json
npx fabricator-ui@latest add button
```

- **`init`** detects Expo, writes the `components.json` above, adds the theme file and `@import`, and sets up Metro, `global.css` and the portal host through a `registry:base` payload from `/init?platform=native`. `--platform web|native` overrides detection.
- **`add`** delegates to `shadcn`, then runs `expo install --fix`. This is the one new behaviour; registry logic stays in shadcn.
- **`doctor`** checks Uniwind's Metro plugin, the native registry URL, Reanimated setup, and an RN version in range.
- **`/create`** gets a Platform choice, with `buildSetupCommands` kept in step and unit-tested.

**Support policy:** current Expo SDK and the one before it, New Architecture only. Bare RN is untested at first: Uniwind allows it, but Expo-only pieces like `expo-haptics` need a look, so docs say Expo until `packages/tests` covers it.

---

## 8. Parity check

`scripts/check-native-parity.ts`, built first (TDD) and part of `bun run check`. It reads source with ts-morph, as the build does:

1. **Catalog.** Every published item has a native item or an exception.
2. **Exports.** Native exports ⊇ web exports.
3. **Variants.** `cva` keys and values match.
4. **Props.** Props a component declares itself match (`showCloseButton`, `side`). DOM-inherited ones are out of scope. The DOM-to-native rename map is a short list in the script.
5. **Slots.** `data-slot` sets match.
6. **Placeholders.** Web `cn-*` ⊆ native `cn-*`, and every native placeholder has a rule. The native map also has its own density and motion usage tests.
7. **Tokens.** Every name in the token contract and the foundations resolves in `getNativeCssVariables`, for both modes. The contrast check runs on the resolved hex.
8. **Demos.** Every published item has an `examples/native/<name>-example.tsx`, and every `variant` and `size` value appears in it. States have no reliable AST signal, so they stay a review item.
9. **Isolation.** Nothing in `registry/native/` or the published JSON references `apps/mobile`, and every import in an item resolves to a declared dependency, so an install can't depend on the repo.

It runs as a report through Phases 1 to 4 with a ratchet: done items can't regress. At Phase 5 it fails on any gap. It writes a JSON file the docs compatibility page reads.

---

## 9. Testing

- **Install, the test that decides:** `packages/tests` adds an Expo template from `create-expo-app`: `init`, `add` of every item, `tsc`, `expo export`, then launch on iOS and Android. It has no access to `apps/mobile` or the repo's source.
- **Pure logic:** Vitest, colocated. Anchor positioning, filtering, sheet snap points, date grids, feedback mapping, theme resolution.
- **Component behaviour:** `@testing-library/react-native`, test first. Vitest if Phase 0 shows it can host it. Otherwise `jest-expo` for `registry/native` alone, and that's a stated exception to your Vitest rule.
- **Style parity:** extends the `native-theme.test.ts` approach. A Playwright script measures height, padding, radius, font size and colour per variant from `/view/base-fabricator/<name>-example` into a committed fixture. A test compares Uniwind's resolved values to it, per look.
- **End to end:** Maestro flows, run against the example app because it already has every demo, on iOS Simulator and Android Emulator: open, interact, dismiss, Android back. One generated flow opens every demo and fails on a crash or a red box. The flows are repo tooling and don't ship.
- **Screen readers:** VoiceOver and TalkBack pass per component before it's marked done. It's manual; I can't automate it, and axe doesn't apply.
- **Visual review:** a side-by-side sheet of web and native screenshots per component, light and dark. Humans compare it; no pixel diff across two renderers.
- **Performance:** a screen with 2,000 styled rows in a release build, compared to the same screen in plain `StyleSheet`. Uniwind says data selector styles aren't cached, so this watches for that cost.
- **CI:** Linux runs parity, types, unit tests and `expo export`. Simulator runs happen on your machine before a release at first, matching how releases already ship; `ci.yml` is `ubuntu-latest` only today.

**Native examples:** one file per component, covering every variant and state, not 535 files (§10).

---

## 10. The example app (repo only)

`apps/mobile` shows the library working, the way the website's gallery does for web. It is for people working in this repo: `bun run mobile` and `bun run mobile:android` run it from source. No store listing, TestFlight or npm package.

**What it gains:**

- A **Components** list in the website's groups (`COMPONENT_GROUPS`), with search. Each opens the item's demo, with every variant and state live.
- A **Blocks** list, each full screen.
- Today's **Settings** and App Shell stay. Today's sample pages move into the `app-shell` demo.
- **Android:** `"platforms": ["ios", "android"]` and an Android package id.

**How it's wired:**

- **Demos** live in `apps/web/examples/native/<name>-example.tsx`, the same names as web's showcase examples. The app renders them and the docs show their source.
- **Components** come from the compiled output. Metro aliases `@/registry/native/ui/*` to `apps/web/styles/native/ui/*`, extending today's alias approach. Those are the same files `add` installs.
- **A generated index** (`examples/native/__index__.ts`) holds static imports, because Metro can't resolve dynamic paths.
- **Navigation stays as it is:** today's pathname state on the App Shell model. A router would be a rewrite that gives the library nothing, since Expo Router compatibility is tested in the fresh project (§9).

**When:** the app gets each demo in the phase that builds the item, and Phase 4 replaces its hand-written shell with registry items. It's example work on top of the library, so it never blocks an item from being installable, and its aliases never count as install coverage.

---

## 11. Docs and site

- `DocsBaseSwitcher` gains **React Native**. Pages at `content/docs/components/native/<name>.mdx` have the same seven sections, plus a "Differences from web" section generated from the exceptions and tier.
- **Previews are screenshots**, iOS and Android, light and dark, from `bun run registry:capture:native`, which drives the example app in the repo. Readers install the component; they don't need the app. No `react-native-web` on the site: it adds a renderer and a second Tailwind setup to a build that's already memory-sensitive, and it would show web rendering labelled as native.
- New pages: Native installation, Theming, Differences from web (generated compatibility table).
- Root `DESIGN.md` gets a Native section; `registry/fabricator/DESIGN.md` gets the native mapping from §4; `skills/fabricator/` learns the platform split; `llms.txt` and `.md` exports include native pages.
- Brand policy applies: `rn-primitives` and Uniwind are named where users install them and in `NOTICE.md`. Reusables only in `NOTICE.md` and if we derive from it.

---

## 12. Phases

Sizes are rough, for one engineer with agents, and Phase 0 will correct them.

### Phase 0: spike and go or no-go (days)

In a fresh `create-expo-app` project under `tmp/` (gitignored), the same starting point a consumer has. It changes nothing in `apps/mobile`, which has uncommitted work on `release/v0.5.0`. Needs your approval first, since it installs dependencies. Add Uniwind, Reanimated, gesture handler, `rn-primitives`. Build `Button`, `Dialog`, `DropdownMenu` and `Drawer` with an input. Answer every open item in §5, on iOS, and on Android once the emulator exists.

**Exit:** a short findings section appended here. **Stop and rethink if** Uniwind can't resolve density tokens at runtime or fails on RN 0.88: the fallback is StyleSheet with a `className`-free API, which costs much of the parity story, so you decide.

### Phase 1: foundations and pipeline (1 to 2 weeks)

`registry/native` tree and build target, `style-native.css` and coverage lint, full `getNativeCssVariables`, `native-theme` as an installable item (its runtime parts split from `foundations.ts`, which carries the website's CSS), theme CSS file, `Text`, portal, density, `useMotion`, `useFeedback`, `/r/fabricator/native`, `/init?platform=native`, CLI detection, `expo install --fix`, doctor, parity check in report mode. `Button` as the vertical slice.

**Exit:** in a fresh `create-expo-app`, `init` then `add button` renders the Fabricator button on both platforms, and every look changes it correctly. `packages/tests` covers this.

### Phase 2: content and controls (1 to 2 weeks)

The 33 items. **Exit:** each installs into the fresh project, parity clean, every variant and state in its demo, screen reader pass, style parity fixture green.

### Phase 3: overlays and pickers (2 to 3 weeks)

The 17 items. This is where the risk is: sheet plus keyboard, anchored overlays, focus return. **Exit:** each installs into the fresh project, Maestro flows green on both platforms, including overlays opened inside a native modal.

### Phase 4: navigation and shell (2 weeks)

The 16 items. `apps/mobile/src/shell` moves into the registry and is deleted there. **Exit:** each installs into the fresh project, and a fresh project can build a full App Shell from registry items alone.

### Phase 5: blocks, docs, release (1 to 2 weeks)

32 blocks, docs for 67 items, native pages on the site, parity check set to fail, changeset, changelog, `@fabricator-ui/icons-react-native` on npm (publishing asks you first). **Exit:** the Definition of Done below holds for every item, the generated compatibility page shows 67 of 67, and `add` of every item works in a fresh project on both platforms.

**Rough total: 8 to 12 weeks.**

### Definition of Done additions

- [ ] A web change to a component's API, variants or look updates native in the same change, or adds a dated exception.
- [ ] `add <item>` in a fresh Expo project typechecks and renders, with nothing from `apps/mobile`.
- [ ] Parity check passes.
- [ ] The item's demo covers every variant and state, and opens in `apps/mobile`.
- [ ] Checked on iOS Simulator and Android Emulator, light and dark, phone and tablet, VoiceOver and TalkBack.
- [ ] Style parity fixture updated if the look changed.

---

## 13. Proposed edits to settled documents

Applied only once you approve this plan.

**`PLAN.md` §1, non-goal at line 54:** remove the React Native bullet. Add a goal: "React Native versions of every published item, from a separate source tree, under the same names (D14)."

**`PLAN.md` D14**, replace with:

> **React Native gets its own source tree; models and tokens are shared** (added 2026-11-03, changed 2026-11-04; plan in `docs/plans/react-native.md`). Behaviour both platforms need ships as DOM-free `registry:lib` files. Every published item has a native version in `registry/native/`, outside the three bases, styled with Uniwind, on `rn-primitives` and Reanimated, served at `/r/fabricator/native/{name}.json`. Web and native keep the same item names, exports, variants, `data-slot`s and tokens, checked by `check-native-parity`. Components are never shared across platforms. `apps/mobile` is a private example in this repo; the library never depends on it.

**`AGENTS.md`:**

- Vocabulary: add **Native tree** and **Platform parity**.
- Contract: add item 9, "Platform parity: a web change to a component's API, variants or look lands in `registry/native/` in the same change, or adds a dated entry to `parity-exceptions.json`. Native registry source never imports from `apps/mobile`."
- Repository map, Commands (`mobile:android`), Definition of Done and "The theme on React Native" updated. `apps/mobile` is described as a private, repo-only example of every component and block. `examples/native/` joins the examples row.

---

## 14. Decisions

**1. Accept the §1 definition of 100%?**
Pick: yes. Same names, API, look and outcomes, with exceptions published.
Alternative: literal source compatibility, which needs a universal renderer and drops Base UI.

**2. Blocks in scope, including `sidebar-01..16`?**
Pick: yes, last in order, since they're cheap after Sidebar. They're also the first thing to cut: they mostly vary desktop layouts, and few matter on a phone.
Alternative: ship only `app-shell`, `login`, `signup`, and list the sidebar ones as exceptions.

**3. System controls as an option?**
Pick: Fabricator-drawn everywhere for 1.0, because you asked for "really similar", and consistency is what this library sells.
Alternative: a `presentation="native"` prop on Select and Context Menu through `@expo/ui`, added later on demand. Real tradeoff: iOS users do expect the system menu and date wheel.

**4. Sound and haptics defaults on native?**
Pick: haptics on, sound off. Interface sounds in a phone app are unusual and web's default doesn't translate.
Alternative: match web with both on.

**5. Android at launch, or iOS first?**
Pick: both from Phase 0. An Android gap found in Phase 3 costs far more than checking as we go, and "cross platform" is your stated goal. It needs Android Studio installed on this machine.
Alternative: iOS first, then a pass, which is faster to a first demo and leaves a debt that grows.

**6. Separate release from v0.5.0?**
Pick: yes. `release/v0.5.0` has uncommitted work, and this is a separate branch off `main` after it merges.
Alternative: none worth taking.

**Settled:** `apps/mobile` lives only in this repo as an example (Gabs, 2026-11-04). That removes the earlier questions about distributing it and about moving it to Expo Router.

---

## 15. Risks

| Risk                                                       | Response                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Native drifts from web as components change                | The parity check fails the change. Exceptions are dated and reviewed.                                         |
| Uniwind breaks or stalls                                   | Copy-in source and an exact pin. Same `className` API as NativeWind v5 if a move is needed.                   |
| `rn-primitives` stalls or a primitive fails                | Each is used through our source, so replacing one touches one item.                                           |
| Expo SDK releases break native dependencies                | Support window of two SDKs, the `packages/tests` Expo template on each bump, and `expo install --fix` on add. |
| Overlays render under native modal screens                 | Tested in Phase 3 exit. `FullWindowOverlay` on iOS if needed.                                                 |
| Native-only bugs slow every web change                     | Real and unavoidable; it's the §1 cost. Exceptions allow a web fix to ship first with a dated follow-up.      |
| The app works through its aliases while real installs fail | `packages/tests` installs every item into a fresh Expo project. The app never counts as install coverage.     |
| Density wrapper cost on large lists                        | The 2,000-row test in §9. Fall back to `data-size` rules on the control if the scope is measurable.           |

---

## 16. What the build found

**The spike passed on iOS.** Uniwind 1.13 runs on React Native 0.88 and Expo 58. `h-(--density-36)` resolves through `ScopedVariables` at runtime, `cn` merges `ios:` and `data-[…]:` classes on Hermes, `updateCSSVariables` changes the look live, and `@rn-primitives/*` works, including a controlled dropdown through its ref. Android wasn't run: this machine has no SDK or emulator. The fresh project does bundle for Android.

**Where the build departed from the plan:**

- **`radix-nova`, not `base-nova`, in a native `components.json`.** shadcn's CLI rewrites `asChild` to Base UI's `render` at install for `base-*` styles, and the native primitives only read `asChild`. Found by installing into a fresh project: dialog titles rendered empty. Native components still accept both `render` and `asChild` themselves.
- **Both `render` and `asChild`.** §4 said `asChild` alone. The web's primary base uses `render`, so matching it keeps code the same.
- **No `--motion-ease-*` tokens.** Uniwind's compiler can't hold a `cubic-bezier()` in a variable: it throws, or reads empty. `--motion-speed` names the speed instead, and `lib/motion.ts` reads the curves from `motion.ts`.
- **Shadow colours are hex.** Uniwind splits a shadow list on commas, so `rgba()` breaks it.
- **`useSurfaceAnimation` uses custom worklets.** Reanimated's `Keyframe` left surfaces invisible.
- **Token modules renamed at install.** shadcn rewrites imports by a file's last path segment, so `lib/fabricator/density.ts` collided with `ui/density.tsx`. They install as `density-scale` and `motion-speeds`.
- **Theme through `cssVars` is out, as §5 feared.** It ships as `fabricator.css` with an `@import`.
- **The CLI writes setup files itself.** `shadcn init` needs Tailwind already configured, so native `init` writes `components.json`, Metro config and stylesheet imports, then runs `shadcn add`.
- **Expo's `tsconfigPaths` is off in `apps/mobile`.** Metro reads `tsconfig` paths at runtime, and the app's aliases differ between types (source) and bundling (compiled).
- **`foundation-tokens.ts` split out of `foundations.ts`,** so the runtime look doesn't install the website's CSS. The website's generated stylesheet is byte-identical.
- **Sounds are haptics only.** Decision 4 kept sound off by default. Audio isn't ported at all: registry JSON can't carry binary assets, and the synth is Web Audio.
- **Expo Router stays out of the example,** per the settled note in §14.

**Bugs only the running app showed.** Types, parity and unit tests passed with each of these in place:

- **Every surface shadow vanished at startup.** Uniwind adds `px` to the numbers in a shadow as it resolves one, and turns a runtime `-0.5px` into `-0px.5px`, which React Native rejects along with the whole list. Hot reload restored the compiled values, which hid it. `getNativeRuntimeVariables` writes runtime shadows without units.
- **`backgroundColor: undefined` in a style array overrides the class,** so the sidebar sheet lost its fill under the status bar.
- **A percentage height on a dialog resolves against its own content,** so `max-h-[80%]` clipped Combobox to 80% of its rows.
- **`size-full` inside a dialog fills the window,** so CommandDialog covered the screen and ran under the status bar.
- **A horizontal `ScrollView` grows by default.** Navigation Menu stretched its parent until the list took `grow-0`.

**Not verified:**

- **Android never ran.** This machine has no SDK, `adb` or emulator, so `expo export` bundling it is all that was checked.
- **VoiceOver and TalkBack.** Roles and labels were read from the accessibility tree; no screen reader pass ran.
- **The software keyboard.** The simulator used a hardware keyboard, so keyboard avoidance is untested.
- **iPad.** The iPad simulator wouldn't open here. Wide layouts were checked on a landscape iPhone Pro Max, 932pt wide.
- **Maestro flows and the browser style fixture from §9** weren't written.
- **A real install.** `@fabricator-ui/icons-react-native` isn't on npm yet, so `add` only works against the local registry until it's published.

**Still open:**

- `apps/mobile/src/shell/` still draws its own shell rather than using the registry's App Shell.
- Tab-strip tabs reorder from their menu only: `lib/sortable.tsx` isn't wired in, and its 250ms long press competes with the tab's 500ms menu.
- `Gesture.Pan` and `runOnJS` are deprecated in the installed gesture handler and Reanimated.
- A `DropdownMenuPortal` passed directly into a phone `MenuSheet` renders nothing, because `DropdownMenuInsideContext` isn't exported.
