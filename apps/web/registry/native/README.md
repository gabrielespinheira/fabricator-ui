# The native tree

React Native versions of every published Fabricator item, under the same names. `@fabricator/button` installs this tree's `ui/button.tsx` when a project's registry URL is `/r/fabricator/native/{name}.json`. It is not a base: bases are DOM primitive libraries. The plan is `docs/plans/react-native.md`.

`apps/mobile` is a private example of this library. Nothing here imports from it.

## Porting a component

Read, in order: `registry/fabricator/base/ui/<name>.tsx` (or `registry/fabricator/shared/ui/<name>.tsx`, or `registry/bases/base/ui/<name>.tsx`: the first that exists is the web source), `registry/styles/fabricator/<name>.css`, and `examples/base/<name>-*.tsx`. Then read `ui/card.tsx` (plain views), `ui/input.tsx` (a form control), `ui/checkbox.tsx` (a stateful control), `ui/dialog.tsx` (an overlay) and `ui/button.tsx` (variants and sizes).

**The web component's API is the contract.** Same named exports, same `variant` and `size` values, same props it declares, same `data-slot`, same placeholder names. Base UI's API is the one to match (`value`, `onValueChange`, `multiple`, `render`), not Radix's. `onClick` becomes `onPress`. Native may add; it never renames. `bun run native:parity` compares them. A real exception goes in `parity-exceptions.json` with a reason and date, and is rare.

## Writing the source

- Plain function components, `ref` as a regular prop, one `export { … }` block at the bottom. `className` merges last through `cn()`, imported from `cn`.
- Imports between registry files use `@/registry/native/ui/<name>` and `@/registry/native/lib/<name>`. Icons come from `@fabricator-ui/icons-react-native`, by value (`<CheckIcon />`), never `IconPlaceholder`.
- **Text:** React Native draws text only inside `Text` and has no inheritance. `Text` sets Inter and the website's 1.5 line height; a text field's rule adds `font-sans` itself.
  - Use `Text` from `ui/text`, never React Native's.
  - A part that holds arbitrary children renders `{renderTextChildren(children)}`, so `<Button>Save</Button>` works.
  - A part that sets text style for its children wraps them in `<TextStyle className="cn-x-text">`. That also colours icons inside it.
  - Text in a horizontal scroller takes `numberOfLines={1}` unless it's given a width. Yoga measures it at a tiny width first, and the row keeps the height of text wrapped a word at a time: a 216pt row came out over 700pt.
  - A part whose text colour follows its state adds `eases`: `<TextStyle eases className={…}>`. The colour then moves on the feedback timing, as the website's `transition-colors` does. Leave it off text that never changes: each eased `Text` is an animated view.
- **Parent state:** `group-*`, `has-*`, `in-data-*` and `peer-*` don't exist. Pass state through React context (see `CardContext`) and set a `data-*` prop on each part.
- **Composition:** `render` and `asChild` both work: `renderSlot` for a plain part (see `Button`), `resolveRender` for a primitive with `asChild` (see `DialogTrigger`).
- **Primitives:** `@rn-primitives/*` for overlays and anything with real behaviour (dialog, alert-dialog, dropdown-menu, context-menu, popover, hover-card, tooltip, select, menubar, navigation-menu, accordion, collapsible, tabs). Plain views for the rest. Hold state with `useControllableState` from `@rn-primitives/hooks`.
- **Pure logic** (filtering, positions, date grids) goes in `lib/*.ts` with no React Native imports and a colocated `*.test.ts`, written first. `apps/web`'s Vitest runs them.

## Placeholders and style maps

Rules go in `registry/styles/native/<name>.css`, under `/* MARK: <Component> */`, keeping the web file's reasoning in its comments.

- Same placeholder names as web. Add `-text` placeholders where a rule has text classes: `text-*` and `font-*` do nothing on a `View`, so `cn-button-variant-default` holds the fill and `cn-button-text-variant-default` the text colour.
- **Structure stays inline in source:** `flex-row`, `absolute`, `items-center`.
- **Placeholders compile only as string literals** in `className`, `cn(...)` or `cva(...)`. Not in a ternary or a variable. Put states behind `data-[x=y]:` in the rule. A placeholder used in both a `cva` and a `className` compiles only once, so give each use its own name.
- **What works:** Tailwind utilities, `active:`, `focus:` (inputs), `disabled:`, `dark:`, `ios:`, `android:`, `sm:` and up, `data-[prop=value]:` on the component's own prop, equality only.
- **What doesn't:** `hover:`, `group-*`, `has-*`, `in-*`, `peer-*`, `before:`, `after:`, `backdrop-*`, `grid`, `[&_svg]:`, `data-open:` (write `data-[state=open]:`), `shadow-*` from Tailwind's defaults (use `shadow-surface-N`), and `truncate` (set `numberOfLines`).
- Colours are the website's tokens: `bg-primary`, `bg-surface-3`, `bg-hover`, `bg-active`, `text-muted-foreground`, `text-destructive-text`, `bg-info-surface-2`. Hover states become `active:`.
- Sizes come from the density: `h-(--density-36)`, `px-(--density-16)`, `text-(length:--density-text-13)`, never fixed pixels for controls. A phone's base is spacious, 44pt controls and 15pt text, and a demo or a screen doesn't pin a control below it to fit. `size` goes through `useControlSize`, as `Button` does: at that base `sm` is a step down, 36pt and 13pt, and `lg` a step up, 52pt and 17pt; at a smaller density they pin compact and spacious, as on the website. A tablet has its own base, set once by `FabricatorRoot` from the window's width: 40pt controls with the phone's 15pt text and 18pt icons, `sm` 34pt and 14pt, `lg` 48pt and 16pt, `xs` 28pt and 13pt. Where a part's layout should differ on a tablet, write `md:` in its rule (768pt, where the App Shell changes layout too). A control's own `hitSlop` comes from `getTouchSlop(height)`, so it reaches 44pt whatever the density. `DensityScope` drops its wrapper when it has no density, which remounts what's inside: fine on a leaf, never around an app.

## Motion

By role, never milliseconds: `useMotion("move")` for your own `withTiming` calls, `useSurfaceAnimation("popup", { side, align })` for `entering`, `exiting` and the `origin` a popup grows from, `usePressScale()` for the press. They read the theme, follow Reduce Motion and go to zero when motion is off. Use the role's curve: `moveEasing` for what travels, `enterEasing` for what appears, `feedbackEasing` for colour and the press, `drawerEasing` for sheets.

An `active:` class snaps, and so does a `data-[state=on]:bg-*` fill. Where a pressed fill should ease, render `<PressWash press={press} className="cn-x-wash" />` as the Pressable's first child. Where a state's fill should ease (on, checked, selected), render `<StateFill isOn={isOn} className="cn-x-fill" />` there instead. `usePressScale({ isHeld })` keeps the wash on while a trigger's popup is open. A text field's frame goes through `useFieldFrame`.

## Fluid Hover

`lib/fluid-hover.tsx`. A finger takes the pointer's place: a press lights the row, another press before it fades glides there, and where `track` is set a drag moves the highlight and letting go activates the lit row.

- A list or a menu: `FluidHoverList`, or `FluidHoverScrollList` when it sits in a scroll view. Rows call `useFluidRow({ disabled, onActivate, ...handlers })` and spread `rowProps` on their Pressable. `onActivate` does what a press does, feedback and closing included.
- A strip with a selection: `useFluidHover({ selected, axis: "x", track: "drag" })`, with `FluidHoverProvider`, `FluidHoverArea` and `ref={fluid.attach}` on the container. See `ui/tabs.tsx`.
- `track`: `drag` for strips and lists that fit, `hold` for lists that scroll, `none` for what a long press already means something on. Rows in anything but `drag` wait 90ms to light, as iOS tables do, so starting a scroll doesn't flash the row it landed on.
- `previewsSelection`, on a strip whose highlight previews the next selection, as tabs': the selection dims while another row is lit, and the highlight hides over the selected row.
- Rows drop their own `active:bg-*`. A lit row's text turns foreground and its icon stroke 2, from `isLit`, through a `cva` variant on its text placeholder.

## Feedback

Controls call `useFeedback()` with the same names as the website's sounds: `feedback("tick")`, `feedback("note", { pitch: noteStep(index) })`. Content that renders only while open calls `useMountFeedback("popup")`, and a surface that stays mounted `useSurfaceFeedback("panel", open)`. Surfaces only sound within a second of a touch, which `FabricatorRoot` notes, so one that opens by itself stays quiet. They do nothing until the app mounts `<SoundEffects />`, and they work inside portals. Which control plays what is in `registry/fabricator/shared/components/sound-effects.tsx`.

## Overlays

- Portal through the primitive, and let `FabricatorRoot`'s host render it.
- Read `useDensity()` before the portal and wrap the content in `DensityScope`: portals leave the React tree.
- The outermost portalled view takes `aria-modal`, so screen readers skip the page.
- Android back and outside press come from the primitive; custom surfaces handle both.
- A root that renders nothing on the website takes no slot here either: `style={NO_LAYOUT}` (`lib/overlay-model`), so a closed dialog adds no gap to its parent.
- A menu near a screen edge goes through `getFittedSide`: the primitives only clamp, which lays it over its own trigger. On a tablet `getMenuMaxHeight` stops at 480pt and `getMenuMinWidth` at 360pt, so a stretched trigger doesn't make a stretched menu. A sheet on a top or bottom edge stops at `max-w-xl`, centred.

## Accessibility

`role`, `aria-checked`, `aria-disabled`, `aria-expanded` and friends on every part, from the matching WAI-ARIA pattern. A `Pressable` with no text takes `accessibilityLabel`. Small controls keep a 44pt target through `hitSlop`, from `getTouchSlop` (`lib/density-scale.ts`). React Native only hit-tests past a parent's edge if something overflows that parent and it doesn't clip, so a control inside a `ScrollView` or `overflow-hidden` reaches no further than that parent: size such a row itself (the Tab Strip's tabs take the row's height).

## Declaring the item

Add it to `items/content.ts`, `overlays.ts` or `navigation.ts`, with every package and registry item its source imports: `bun run native:parity` fails an item that imports what it doesn't install. `react` and `react-native` are implicit. Keep `@fabricator-ui/icons-react-native` in `dependencies` when it uses icons, and `@fabricator/text`, `@fabricator/motion`, `@fabricator/render` and `@fabricator/density` in `registryDependencies` when it uses them.

## The demo

`examples/native/<name>-example.tsx` exports `function <Name>Example` and uses `Example` and `ExampleWrapper` from `@/examples/native/example`. It shows every `variant` and `size` value and every state: disabled, invalid, controlled, open from state. Demo content uses the Fabricator identity (`gabs@fabricator.dev`, `Acme Inc`).

## Blocks

A block is one file, `blocks/<name>.tsx`, exporting `function <PascalName>` (`Login01`). It's a screen composed from the library's components, with no router: it takes callbacks for navigation. Read the web block in `registry/bases/base/blocks/<name>/` or `registry/fabricator/shared/blocks/<name>/`. Declare it in `items/blocks.ts` with type `registry:block` and its file type `registry:component`, and list every item it uses in `registryDependencies`. It keeps the web block's content and layout where a phone allows it. `bun run native:parity` lists blocks still missing.

## Checking

Run from `apps/web`:

- `bun run registry:native --check <name>,<name>`: compiles the items, and fails on a placeholder with no rule. Writes nothing, so it's safe alongside other work.
- `bun run native:parity`: the item should not appear as a gap.
- `bunx tsc --noEmit -p ../mobile`: types, with React Native's.
- `bunx --bun vitest run registry/native`: pure logic.

The full `bun run registry:native` rewrites `styles/native`; don't run it while others are working.
