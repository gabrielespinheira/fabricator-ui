# The native tree

React Native versions of every published Fabricator item, under the same names. `@fabricator/button` installs this tree's `ui/button.tsx` when a project's registry URL is `/r/fabricator/native/{name}.json`. It is not a base: bases are DOM primitive libraries. The plan is `docs/plans/react-native.md`.

`apps/mobile` is a private example of this library. Nothing here imports from it.

## Porting a component

Read, in order: `registry/fabricator/base/ui/<name>.tsx` (or `registry/fabricator/shared/ui/<name>.tsx`, or `registry/bases/base/ui/<name>.tsx`: the first that exists is the web source), `registry/styles/fabricator/<name>.css`, and `examples/base/<name>-*.tsx`. Then read `ui/card.tsx` (plain views), `ui/input.tsx` (a form control), `ui/checkbox.tsx` (a stateful control), `ui/dialog.tsx` (an overlay) and `ui/button.tsx` (variants and sizes).

**The web component's API is the contract.** Same named exports, same `variant` and `size` values, same props it declares, same `data-slot`, same placeholder names. Base UI's API is the one to match (`value`, `onValueChange`, `multiple`, `render`), not Radix's. `onClick` becomes `onPress`. Native may add; it never renames. `bun run native:parity` compares them. A real exception goes in `parity-exceptions.json` with a reason and date, and is rare.

## Writing the source

- Plain function components, `ref` as a regular prop, one `export { … }` block at the bottom. `className` merges last through `cn()`, imported from `cn`.
- Imports between registry files use `@/registry/native/ui/<name>` and `@/registry/native/lib/<name>`. Icons come from `@fabricator-ui/icons-react-native`, by value (`<CheckIcon />`), never `IconPlaceholder`.
- **Text:** React Native draws text only inside `Text` and has no inheritance.
  - Use `Text` from `ui/text`, never React Native's.
  - A part that holds arbitrary children renders `{renderTextChildren(children)}`, so `<Button>Save</Button>` works.
  - A part that sets text style for its children wraps them in `<TextStyle className="cn-x-text">`. That also colours icons inside it.
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
- Sizes come from the density: `h-(--density-36)`, `px-(--density-16)`, `text-(length:--density-text-13)`, never fixed pixels for controls. `size="sm"` pins compact and `size="lg"` spacious through `DensityScope`, as `Button` does.

## Motion

By role, never milliseconds: `useMotion("move")` for your own `withTiming` calls, `useSurfaceAnimation("popup")` for `entering` and `exiting`, `usePressScale()` for the press. They read the theme, follow Reduce Motion and go to zero when motion is off. Sheets use `drawerEasing`.

## Overlays

- Portal through the primitive, and let `FabricatorRoot`'s host render it.
- Read `useDensity()` before the portal and wrap the content in `DensityScope`: portals leave the React tree.
- The outermost portalled view takes `aria-modal`, so screen readers skip the page.
- Android back and outside press come from the primitive; custom surfaces handle both.

## Accessibility

`role`, `aria-checked`, `aria-disabled`, `aria-expanded` and friends on every part, from the matching WAI-ARIA pattern. A `Pressable` with no text takes `accessibilityLabel`. Small controls keep a 44pt target through `hitSlop`.

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
