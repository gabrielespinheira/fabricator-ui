# Components

Writing a web component, example or block in the base trees (`apps/web/registry/bases/<base>/`, `apps/web/examples/<base>/`). The look is in [STYLES.md](STYLES.md), the native port in [PLATFORMS.md](PLATFORMS.md#react-native), item declarations in [REGISTRY.md](REGISTRY.md).

## Start from upstream

Read upstream's version before writing: `apps/v4/registry/bases/<base>/`, its rules in `registry/styles/style-nova.css`, its examples. Its structure, slots, variants and accessibility are the baseline we extend. Sparse-clone it at the pinned SHA outside the repo:

```bash
git clone --filter=blob:none --sparse https://github.com/shadcn-ui/ui.git <scratch>/shadcn
git -C <scratch>/shadcn sparse-checkout set apps/v4/registry apps/v4/examples packages/shadcn/src packages/registry/src skills
```

`bunx --bun shadcn@latest view @shadcn/<name>` shows what upstream ships.

## Bases

| Base    | Composition                               | Example                                                         |
| ------- | ----------------------------------------- | --------------------------------------------------------------- |
| `base`  | `render` prop, `useRender` / `mergeProps` | `<DialogPrimitive.Close render={<Button variant="ghost" />} />` |
| `radix` | `asChild` + `Slot.Root` from `radix-ui`   | `<DialogClose asChild><Button /></DialogClose>`                 |
| `aria`  | RAC render props and slots                | per the `react-aria-components` docs                            |

- Mirror every change to the same path in the other trees. Only imports, primitive APIs and part names differ (Radix `Overlay`/`Content`, Base UI `Backdrop`/`Popup`, RAC `ModalOverlay`/`Modal`); `data-slot`s and placeholders stay identical. A change scoped to one base says so in the commit body and PR. Report which bases you updated.
- **Fabricator-exclusive components:** Base UI first. Write Radix and Aria versions when their primitive differs; otherwise the item falls back to Base UI, recorded in its `meta` and on its docs page. A pure-HTML component keeps one identical source in every tree.
- Typechecking resolves `@/registry/bases/<base>/ui/<name>` to the upstream tree, so an overlay-only component, or overlay code using an override's additions, needs a path alias in `apps/web/tsconfig.json` (see the App Shell entries).

## Source

```tsx
"use client"

// only for state, effects, context, events or an interactive primitive
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-content"
      className={cn(
        "cn-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full",
        className
      )}
      {...props}
    />
  )
}

export { DialogContent }
```

- Plain function components, `ref` as a regular prop, one `export { … }` block at the bottom, `className` merged last through `cn()` (from the `cn` package; `lib/utils.ts` re-exports it).
- Props extend the primitive's: `DialogPrimitive.Popup.Props` (Base UI), `React.ComponentProps<typeof X>` (Radix), the RAC types (Aria), `React.ComponentProps<"div">` (HTML).
- `data-slot="<component>-<part>"` on every rendered part. Parents style children with `has-data-[slot=…]:` and `in-data-[slot=…]:`.
- Variants use `cva` with the axes `variant` and `size`, `defaultVariants` set, and placeholder values (`default: "cn-button-variant-default"`).
- Registry files import each other as `@/registry/bases/<base>/ui/<name>`; the build and CLI rewrite it.

## Placeholders

- **Inline in source:** what every style shares: display, flex and grid mechanics, positioning, `z-50` on popups, `outline-none`, `select-none`, disabled mechanics, `[&_svg]:pointer-events-none`, group names.
- **Placeholder** (`cn-<component>[-<part>][-variant-<v>|-size-<s>]`): anything a style could change: radius, colour, border, shadow, spacing, height, gap, type, focus ring, invalid state, timing.
- **Placeholders compile only as string literals** in a `className` attribute or a `cn(...)` argument. One in a ternary, an `&&` or a variable ships unreplaced. Put variant styles in the rule behind a `data-*` attribute (`data-[size=sm]:density-compact`) and check the compiled file: `grep -no '"[^"]*cn-[a-z][^"]*"' styles/<style>/ui/<name>.tsx`.
- Upstream-derived placeholders need a rule in every style map; Fabricator-only ones in the Fabricator map only. The build's coverage lint enforces it.
- State variants come from `shadcn/tailwind.css` (`data-open:`, `data-checked:`, `data-disabled:`, …), which match Radix and Base UI alike.
- Install-time markers stay literal for the CLI: `cn-menu-target`, `cn-menu-translucent`, `cn-font-heading`, `cn-rtl-flip`, `cn-logical-sides`.

## Icons

- In registry source: `<IconPlaceholder lucide="…" tabler="…" hugeicons="…" phosphor="…" remixicon="…" />`, all five filled. The CLI swaps in the project's library.
- Components size their icons with `[&_svg:not([class*='size-'])]:size-4`; icon slots in controls take `data-icon="inline-start" | "inline-end"`.
- Pass icons as components (`icon={CheckIcon}`).

## Composing (examples, blocks, site)

- Colour from semantic tokens (`bg-primary`, `text-muted-foreground`); one class covers light and dark.
- A variant first, then tokens, then new CSS variables. `className` on library components is for layout.
- Gaps through flex and grid; `size-10` for equal sides; `truncate` for one-line overflow; `cn()` for conditional classes.
- Items sit in their group (`SelectGroup`, `CommandGroup`, …). Dialog, Sheet and Drawer always have a Title (`sr-only` if hidden). Cards use Header, Title, Description, Content and Footer. Use `Alert`, `Empty`, `Skeleton`, `Separator`, `Badge` and `Avatar` + `AvatarFallback` for their roles.
- Loading buttons: `Spinner` + `data-icon` + `disabled`. Loading text: `shimmer`. Scroll edges: `scroll-fade`.
- Toasts: `toast` on Base UI, Sonner on Radix and Aria.
- Overlays manage their own stacking.

## Accessibility

- Keyboard and ARIA come from the primitive; keep them intact. A custom interactive component implements its WAI-ARIA Authoring Practices pattern in full.
- `focus-visible:` ring placeholders on every interactive element; `aria-invalid:` styling on every form control; forms use `Field`/`FieldGroup` with `data-invalid`.
- Motion honours `prefers-reduced-motion` through the motion tokens or `motion-safe:`/`motion-reduce:`.
- Left-to-right only: no RTL docs, demos or checks. Prefer logical utilities (`ms-*`, `start-*`, `text-start`) and keep upstream's `cn-rtl-flip` markers.

## Dependencies

- Reuse upstream's: `radix-ui`, `@base-ui/react`, `react-aria-components`, `cmdk`, `vaul`, `sonner`, `react-day-picker` + `date-fns`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `motion`.
- A new runtime dependency needs a written reason in the PR: size, maintenance, licence, React 19 support. Pin only where upstream pins.
- Base primitives belong on the base's `index`/`style` item.
- Drag and drop goes through `lib/sortable.tsx`; each component keeps keyboard reordering and a menu alternative.

## Done when

- [ ] Every base tree has the change, and the native item follows ([PLATFORMS.md](PLATFORMS.md#react-native)).
- [ ] Examples cover every variant and state; new ones are named `<component>-example` or `<component>-<intent>` and indexed with `registry:build --examples`.
- [ ] Each base has a docs page in `apps/web/content/docs/` with Preview, Installation (CLI + Manual), Usage, Composition, Examples, API reference and Accessibility.
- [ ] A new component has a group and a homepage catalog card ([COMPONENT-GROUPS.md](COMPONENT-GROUPS.md#adding-a-component)).
- [ ] A changed API, variant or look is reflected in the root [`DESIGN.md`](../DESIGN.md).
- [ ] `shadcn add --dry-run` succeeds against the local registry for each base.
- [ ] `bun run test:parity` passes when upstream-derived source, a style map or the build script changed.
