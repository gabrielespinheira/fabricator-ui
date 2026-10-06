# AGENTS.md: Fabricator UI

Fabricator UI is an open-source React component library distributed as copy-in source through the shadcn CLI. It has its own design system and is fully compatible with shadcn/ui. This repository holds the component registry, the `fabricator-ui` CLI, and the Next.js website (fabricator-ui.com) that documents and serves the registry.

This file is the shared contract for every coding agent (Claude Code, Codex, others) and every human contributor. `CLAUDE.md` imports it; there is no other copy. When a convention changes, update this file in the same change.

**`PLAN.md`** holds the architecture, the decision log (D1–D13), and the phased roadmap. Read it before adding a package, changing registry URLs or `components.json` handling, touching the CLI, or starting a roadmap phase. The decisions there are settled; to change one, propose an edit to `PLAN.md` rather than working around it.

---

## Vocabulary

These words have exact meanings here. Use them in code review, commits and docs.

- **Upstream**: `shadcn-ui/ui`, pinned to the SHA in `upstream.lock.json` (until that file exists: `295a1f11`, 2026-10-02).
- **Base**: the primitive library a component is built on: `base` (Base UI, the primary target), `radix` (`radix-ui`), `aria` (`react-aria-components`). Each base has its own hand-written source tree.
- **Style**: a visual language compiled into components at build time. There are 8 upstream styles (`vega`, `nova`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`) and the Fabricator styles (`fabricator`, plus variants). The full id is `<base>-<style>`, for example `base-nova`.
- **Placeholder**: a semantic `cn-*` class in component source (`cn-button-variant-outline`). It holds no CSS. The build replaces it with Tailwind classes.
- **Style map**: `registry/styles/style-<style>.css`. It maps every placeholder to Tailwind utilities via `@apply`.
- **Parity**:
  - Across bases: the same component behaves and looks the same in every base.
  - With upstream: our compiled output for an upstream item is byte-identical to `ui.shadcn.com/r/styles/<base>-<style>/<name>.json`.
- **Superset**: a Fabricator component that replaces an upstream one keeps every name, prop, variant, export and `data-slot`. It only adds.
- **Blend mode**: the registry URL `/r/{style}/{name}.json`. Items are compiled with the user's own shadcn style.
- **Fabricator mode**: the registry URL `/r/fabricator/{style}/{name}.json`. Items are compiled with the Fabricator style for the user's base.

---

## The contract

These invariants are what make Fabricator a drop-in for shadcn projects. A change that breaks one is a bug, even if everything builds.

1. **Superset.** Replacements keep the upstream item name, target file path, export names, props, variant names and `data-slot` values. New props and variants are additive and optional.
2. **Valid shadcn style ids only.** Any `components.json` we write or generate has `"style": "<base>-<upstream style>"`. The Fabricator look comes from the Fabricator-mode registry URL, never from the `style` field. Bare names like `button` always resolve against ui.shadcn.com, so a custom style id would 404 for every user.
3. **Namespaced dependencies.** `registryDependencies` reference our own items as `@fabricator/<name>`. A bare name means "install upstream shadcn's item", and is written only when that is the intent.
4. **The token contract.** Every shadcn CSS variable keeps its name and meaning:
   - `background`, `foreground`
   - `card`, `popover`, `primary`, `secondary`, `muted`, `accent` (each with `-foreground`)
   - `destructive`, `border`, `input`, `ring`
   - `chart-1…5`, `sidebar-*`
   - `radius` (and the derived `--radius-*`), `font-sans`, `font-heading`, `font-mono`

   Fabricator tokens are added under new names (`--surface-*`, `--motion-*`, …) and shipped in the `cssVars` of the items that use them.

5. **Base parity.** A change to a component, example or block in one base tree lands in all base trees in the same change. See "Bases" below.
6. **Generated output is rebuilt, never hand-edited.** Edit the authored source and run the registry build. See "Registry" for which paths are generated.
7. **Bun is the toolchain.** Use `bun install`, `bun run <script>`, `bunx --bun <bin>`, and keep a single `bun.lock`. The one exception is the release job, which uploads with `npm publish --provenance`.
8. **Attribution.** Files derived from upstream stay under MIT, with shadcn's copyright kept in `LICENSE.md`/`NOTICE.md`. Site copy, logos and branding are Fabricator's own.

---

## Brand policy

Fabricator UI is its own product. It is built on shadcn/ui, and that name appears only where it is needed:

- **Attribution:** `LICENSE.md`, `NOTICE.md`, the Acknowledgements section of the docs introduction, the first changelog entry, and READMEs.
- **Compatibility:** one short section on the docs introduction, the Registry docs page (existing projects, the raw shadcn CLI), and one line on the CLI page and in the CLI README.
- **Technical identifiers users install or import:** the `shadcn` npm package (`shadcn/tailwind.css`), `@shadcn/react`, and the shadcn CLI where a command has no Fabricator equivalent (`migrate`).
- **Internal engineering docs and code:** `PLAN.md`, this file, upstream-sync tooling, import statements and code comments.

Everywhere else, write "Fabricator UI", "the CLI" (`npx fabricator-ui@latest …`), "the registry" and "styles". Demo content (avatars, handles, emails, sample links) uses the Fabricator identity defined in `scripts/rebrand.ts`; `bun run rebrand --check` runs in CI. Schemas point at `https://fabricator-ui.com/schema.json` and `/schema/registry-item.json`.

---

## Repository map

The full target tree is in `PLAN.md` §4. Which paths are authored and which are generated:

| Path                                                                                                 | What                                                                                                                                                    | Authored?                                                 |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/web/registry/bases/{base,radix,aria}/`                                                         | Component, block, hook and lib source plus `_registry.ts` item declarations                                                                             | ✅ authored                                               |
| `apps/web/registry/styles/style-*.css`                                                               | Style maps for the 8 upstream styles                                                                                                                    | ✅ authored                                               |
| `apps/web/registry/styles/fabricator/*.css`                                                          | Fabricator style map, one file per component                                                                                                            | ✅ authored                                               |
| `apps/web/registry/styles/style-fabricator.css`                                                      | Assembled Fabricator style map                                                                                                                          | ⚙️ generated, committed                                   |
| `apps/web/registry/fabricator/`                                                                      | Fabricator foundations (`foundations.ts`), design spec (`DESIGN.md`), extra items and overrides (`registry.ts`), overlay sources (`shared/`, `<base>/`) | ✅ authored                                               |
| `apps/web/app/fabricator.css`                                                                        | Foundations + palette stylesheet for the website                                                                                                        | ⚙️ generated, committed                                   |
| `apps/web/registry/{bases,styles,themes,fonts,config,presets}.ts`                                    | Registry metadata, themes, presets, `registry:base` builder                                                                                             | ✅ authored                                               |
| `apps/web/examples/{base,radix,aria}/*.tsx`                                                          | Docs demos (flat folders, no subdirectories)                                                                                                            | ✅ authored                                               |
| `apps/web/content/docs/**`                                                                           | MDX docs (Fumadocs)                                                                                                                                     | ✅ authored                                               |
| `apps/web/registry/**/__index__.tsx`, `__components__/`, `__blocks__.json`, `examples/__index__.tsx` | Runtime lookup indexes                                                                                                                                  | ⚙️ generated, committed                                   |
| `apps/web/styles/<base>-<style>/`                                                                    | Compiled components the docs import                                                                                                                     | ⚙️ generated, gitignored                                  |
| `apps/web/public/r/**`                                                                               | Installable registry JSON                                                                                                                               | ⚙️ generated, gitignored (except small committed indexes) |
| `packages/cli/`                                                                                      | `fabricator-ui` CLI (Node target, wraps `shadcn`)                                                                                                       | ✅ authored                                               |
| `packages/react/`                                                                                    | `@fabricator-ui/react` headless primitives (later phase)                                                                                                | ✅ authored                                               |
| `packages/tests/`                                                                                    | CLI end-to-end tests against real templates                                                                                                             | ✅ authored                                               |
| `skills/fabricator/`                                                                                 | Agent skill for consumers of the library                                                                                                                | ✅ authored                                               |
| `upstream.lock.json`, `scripts/sync-upstream.ts`                                                     | Upstream pin and import tooling                                                                                                                         | ✅ authored                                               |
| `tmp/`                                                                                               | Personal experiments (Three.js hero prototype); gitignored                                                                                              | outside the product                                       |

---

## Commands

The root `package.json` is the source of truth for scripts. Keep this table in step when scripts change.

| Task                                                                 | Command                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Install                                                              | `bun install`                                                                                 |
| Website dev server                                                   | `bun run dev` (`apps/web`; run `registry:build` once on a fresh clone)                        |
| Full registry build (canonical, formatted; run before committing)    | `bun run registry:build`                                                                      |
| Targeted registry builds (fast, unformatted; run in `apps/web`)      | `bun run registry:build --examples \| --indexes \| --style <id\|all> \| --registry <id\|all>` |
| Lint, typecheck, format check                                        | `bun run check`                                                                               |
| Unit tests                                                           | `bun run test`                                                                                |
| Upstream parity check (fetches ui.shadcn.com)                        | `bun run test:parity` (`--styles all` for every combination)                                  |
| CLI end-to-end (needs `bun run dev` running and `bun run cli:build`) | `bun run test:e2e` (`--only vite-base,existing-shadcn`, `--keep`)                             |
| Run the local CLI against the local registry                         | `FABRICATOR_REGISTRY_URL=http://localhost:4000 bun run cli <init\|add\|…> -c <path-to-app>`   |
| Build the CLI                                                        | `bun run cli:build`                                                                           |
| Import upstream                                                      | `bun run sync:upstream --ref <sha\|tag>`                                                      |
| Rebrand upstream demo content (after every sync)                     | `bun run rebrand` (`--check` to verify)                                                       |
| Recapture mobile preview screenshots (dev server running)            | `cd apps/web && bun run registry:capture --force && bun run pages:capture`                    |
| Add a release note                                                   | `bunx changeset`                                                                              |

### Toolchain notes

- `bunfig.toml` sets `linker = "hoisted"`. Isolated installs create one copy of a package per peer set (for example `fumadocs-core` with Zod 3 and with Zod 4), which breaks TypeScript type identity and caused a Fumadocs runtime stack overflow.
- Root `overrides` pin a few tools to upstream's resolved versions: `prettier` 3.6.2 (the registry build formats generated source; another version changes output and breaks parity), `eslint-plugin-react-hooks` 7.0.1, and `mdast-util-to-markdown` 2.1.2. Bump them only together with upstream, and rerun `test:parity`.
- Turborepo's auto-written agent guidance is disabled (`"agentGuidance": false` in `turbo.json`) so this file stays the single source.

---

## Working on components

### Look at upstream first

For any component, block or registry behaviour, read the upstream implementation before writing code. That means the matching file in `apps/v4/registry/bases/<base>/`, its rules in `registry/styles/style-nova.css`, and its examples. Upstream's choices about structure, slots, variants and accessibility are the baseline we extend.

To get the source, sparse-clone upstream at the pinned SHA into a scratch directory outside the repo:

```bash
git clone --filter=blob:none --sparse https://github.com/shadcn-ui/ui.git <scratch>/shadcn
git -C <scratch>/shadcn sparse-checkout set apps/v4/registry apps/v4/examples packages/shadcn/src packages/registry/src skills
```

To see what upstream actually ships, run `bunx --bun shadcn@latest view @shadcn/<name>` or `bunx --bun shadcn@latest docs <name>`.

### File conventions

```tsx
"use client" // only when the file uses state, effects, context, events or an interactive primitive

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog" // base-specific import
import { cn } from "cn"

function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Popup
      data-slot="dialog-content"
      className={cn("cn-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full", className)}
      {...props}
    />
  )
}

export { DialogContent }
```

- **Components:**
  - Plain function components, with `ref` as a regular prop (React 19).
  - One named `export { … }` block at the bottom of the file.
  - `className` is always merged last through `cn()`, so consumers can override it.
- **Prop types:** extend the primitive's own props:
  - `DialogPrimitive.Popup.Props` (Base UI)
  - `React.ComponentProps<typeof X>` (Radix)
  - the RAC prop types (Aria)
  - `React.ComponentProps<"div">` (plain HTML)
- **`data-slot="<component>-<part>"`** goes on every rendered part. Parents style children with `has-data-[slot=…]:` and `in-data-[slot=…]:`.
- **Variants** use `cva`, with the upstream axis names `variant` and `size`, and `defaultVariants` set. Variant values are placeholders: `default: "cn-button-variant-default"`.
- **`cn`** comes from the `cn` package, and `lib/utils.ts` is just `export { cn } from "cn"`.
- **Imports between registry files** use the alias form `@/registry/bases/<base>/ui/<name>`. The build and the CLI rewrite these.

### Placeholders and style maps

The split between inline classes and placeholders is what makes styles swappable and upstream merges cheap.

- **Inline in source:** structure and behaviour that every style shares. That means display, flex/grid mechanics, positioning, `z-50` on overlay popups, `outline-none`, `select-none`, disabled mechanics, `[&_svg]:pointer-events-none`, and group names (`group/button`).
- **Placeholder (`cn-<component>[-<part>][-variant-<v>|-size-<s>]`):** anything a style could change. That means radius, colour, border, shadow, spacing, height, gap, typography, focus ring, invalid state, and animation timing.
- **Style map coverage:** every placeholder used in source has a rule in **every** style map, both upstream and Fabricator. The build's coverage lint enforces this.
- **Rule order in style maps:** follow upstream, under a `/* MARK: <Component> */` heading.
- **State variants:** use the cross-base variants from `shadcn/tailwind.css` (`data-open:`, `data-closed:`, `data-checked:`, `data-selected:`, `data-disabled:`, …). These match Radix `data-state` and Base UI attributes alike.
- **Install-time markers** stay as literal classes for the CLI to resolve: `cn-menu-target`, `cn-menu-translucent`, `cn-font-heading`, `cn-rtl-flip`, `cn-logical-sides`.

### Icons

- Inside registry source, icons are `<IconPlaceholder lucide="…" tabler="…" hugeicons="…" phosphor="…" remixicon="…" />`, with all five libraries filled in. The CLI swaps in the user's `iconLibrary`.
- Components size their own icons with `[&_svg:not([class*='size-'])]:size-4`.
- Icon slots in buttons and similar controls use `data-icon="inline-start" | "inline-end"`.
- Icons are passed as component values (`icon={CheckIcon}`), not string keys.

### Composition per base

| Base    | Composition API                           | Example                                                         |
| ------- | ----------------------------------------- | --------------------------------------------------------------- |
| `radix` | `asChild` + `Slot.Root` from `radix-ui`   | `<DialogClose asChild><Button/></DialogClose>`                  |
| `base`  | `render` prop, `useRender` / `mergeProps` | `<DialogPrimitive.Close render={<Button variant="ghost" />} />` |
| `aria`  | RAC render props and slots                | per `react-aria-components` docs                                |

Part names follow each library (Radix `Overlay`/`Content`, Base UI `Backdrop`/`Popup`, RAC `ModalOverlay`/`Modal`). The `data-slot` and placeholder names stay identical across bases.

### Styling rules (consumer code, examples, blocks)

- **Semantic tokens for colour:** `bg-primary text-primary-foreground`, `text-muted-foreground`, `text-destructive`. Light and dark both come from the tokens, so one class covers both.
- **Variants first:** `variant="outline"`, then semantic tokens, then new CSS variables. `className` on library components is for layout (`max-w-md`, `mx-auto`, `mt-4`).
- **Spacing:** gaps through flex/grid (`flex flex-col gap-4`). Write `size-10` for equal width and height, and `truncate` for single-line overflow.
- **Conditional classes:** `cn()`.
- **Overlays:** Dialog, Sheet, Drawer, Popover, Tooltip, DropdownMenu and HoverCard manage their own stacking.
- **Loading text:** the `shimmer` utility. **Scroll edges:** the `scroll-fade` utilities.
- **Composition:**
  - Items go inside their group (`SelectGroup`, `DropdownMenuGroup`, `CommandGroup`, …).
  - Dialog, Sheet and Drawer always have a Title (use `sr-only` if it should be hidden).
  - Cards use the full Header/Title/Description/Content/Footer structure.
  - Use `Avatar` with `AvatarFallback`, and use `Alert`, `Empty`, `Skeleton`, `Separator` and `Badge` for their roles.
  - Loading buttons compose `Spinner` + `data-icon` + `disabled`.
- **Toasts follow the base:** `toast` for Base UI, Sonner for Radix and Aria.

### Accessibility and internationalisation

- Keyboard behaviour and ARIA wiring come from the primitive. Leave them intact.
- Custom (non-primitive) components implement the matching WAI-ARIA Authoring Practices pattern in full: roles, keyboard map, focus management.
- **Focus:** `focus-visible:` ring placeholders on every interactive element.
- **Invalid state:** `aria-invalid:` styling on every form control. Forms use `Field`/`FieldGroup` with `data-invalid`.
- **Motion:** honour `prefers-reduced-motion` through `motion-safe:` / `motion-reduce:` or the motion tokens.
- **Direction:** Fabricator UI is left-to-right only.
  - There are no RTL docs, demos or checks.
  - Prefer logical utilities (`ms-*`, `ps-*`, `start-*`, `text-start`) anyway.
  - Keep upstream's `cn-rtl-flip` markers in upstream-derived code (the CLI resolves them at install time).

### Dependencies

- Reuse what upstream uses: `radix-ui`, `@base-ui/react`, `react-aria-components`, `cmdk`, `vaul`, `sonner`, `recharts`, `react-day-picker` + `date-fns`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `motion`.
- A new runtime dependency for a registry item needs a written reason in the PR: size, maintenance, licence, React 19 support.
- Base primitives belong on the base's `index`/`style` item, not on each component item.
- Pin versions only where upstream pins (`recharts@3.8.0`, `react-day-picker@latest`).

---

## Bases

- An authored change in `registry/bases/<base>/` or `examples/<base>/` is mirrored to the same path in the other base trees in the same change. Only imports, primitive APIs and part names differ.
- When a change is intentionally scoped to one base, say so in the commit body and the PR.
- **Fabricator-exclusive components:**
  - Base UI first.
  - Radix and Aria versions are written when their primitive differs.
  - Otherwise the item falls back to the Base UI implementation, which is recorded in the item's `meta` and documented on its page.
  - Pure-HTML components (no primitive) keep one identical source across all base trees.
- **Reporting:** after editing base trees, list which bases were updated in your report.

---

## Registry

### Declaring items

Items are TypeScript objects in each folder's `_registry.ts`, typed `Registry["items"]` from `shadcn/schema`, and validated with zod at build time:

```ts
{
  name: "stepper",                          // kebab-case; same name as upstream when it replaces one
  type: "registry:ui",
  title: "Stepper",
  description: "A multi-step progress indicator with keyboard navigation.",
  dependencies: [],                         // npm deps beyond the base's index item
  registryDependencies: ["@fabricator/button", "@fabricator/separator"],
  files: [{ path: "ui/stepper.tsx", type: "registry:ui" }],
  categories: ["navigation"],
  meta: {
    fabricator: true,                       // true for items that do not exist upstream
    links: { docs: "https://fabricator-ui.com/docs/components/base/stepper",
             examples: "https://fabricator-ui.com/docs/components/base/stepper#examples" },
  },
}
```

- **Type** by role:

  | Role                 | Type                              |
  | -------------------- | --------------------------------- |
  | UI primitive         | `registry:ui`                     |
  | Composed component   | `registry:component`              |
  | Block                | `registry:block`                  |
  | Route file           | `registry:page`                   |
  | Hook                 | `registry:hook`                   |
  | Utility              | `registry:lib`                    |
  | Token set            | `registry:theme`                  |
  | Init payload         | `registry:base`                   |
  | Font                 | `registry:font`                   |
  | Config or agent file | `registry:file` / `registry:item` |

- **Targets:** `registry:page` and `registry:file` files need an explicit `target` (blocks use `app/<route>/page.tsx`). The CLI remaps it per framework.
- **Naming:**
  - Blocks: `<category>-<nn>` (`login-01`).
  - Examples: `<component>-example`, or `<component>-<intent>` (`button-loading`).
  - Exclusive component names are checked against upstream's catalog.
- **New tokens** ship in the item's `cssVars` (`theme`, `light`, `dark`), and new CSS (`@utility`, `@keyframes`) ships in `css`.

### Build and output

- **Pipeline:** placeholders + style map → `createStyleMap` / `transformStyle` from `shadcn/utils` → `shadcn build`.
- **Output paths:**
  - Blend mode: `public/r/<base>-<style>/<name>.json`
  - Fabricator mode: `public/r/fabricator/<base>-<style>/<name>.json`
  - Catalogs: `public/r/registry.json`, `index.json`, `config.json`
- **Rebuild:** after authored changes, run the full `bun run registry:build`. Targeted flags are for iteration only.
- **Examples:** editing an existing example needs no rebuild. Adding, removing or renaming one needs `--examples`.
- **`/init`** (`app/(app)/(create)/init/route.ts`) returns the `registry:base` payload. Its `config.registries` writes `@fabricator` into the user's `components.json`. Its `config.style` is always a valid upstream style id (contract item 2).

---

## Design system (Fabricator layer)

The Fabricator design language adapts Fluid Functionalism (MIT). **`apps/web/registry/fabricator/DESIGN.md` is the specification**: surfaces, interaction tokens, sizes, motion tiers, fluid hover, scrollbars, and the look of every component. Read it before changing any Fabricator style or override.

- **Tokens** live in `registry/fabricator/foundations.ts` (foundations: new token names only; palette: Fabricator values for the shadcn token names, applied by the `fabricator` preset).
- **Motion timings are tokens**, never milliseconds:
  - Use the tier utilities: `duration-fast` / `-moderate` / `-slow` (90 / 210 / 290ms), `duration-<tier>-exit` (70 / 160 / 220ms) and `delay-<tier>`.
  - They resolve to `calc(var(--motion-<tier>) * var(--motion-scale, 1))`, so `--motion-scale` speeds up, slows down or stops (0) every animation.
- **Look:** each component's placeholder rules are in `registry/styles/fabricator/<component>.css`. The build assembles them into `style-fabricator.css` and fails if any placeholder used by the components has no rule.
- **Behaviour** that CSS can't express (fluid hover, sliding selection) is added with **Fabricator overrides**: `registry/fabricator/<base>/ui/<component>.tsx` is a copy of the upstream source with additive, container-level changes; `registry/fabricator/shared/` holds files every base uses (`lib/fluid-hover.tsx`). Overrides compile into the Fabricator style only, so upstream styles keep their exact output. They keep the full upstream API (superset rule). Extra registry dependencies go in `fabricatorOverrides` in `registry/fabricator/registry.ts`.
- **Excluded items:** `FABRICATOR_EXCLUDED_ITEMS` in `registry/fabricator/registry.ts` lists upstream items the Fabricator library leaves out (Native Select: it only restyles a raw `<select>`; Select replaces it).
  - The build drops them from Fabricator mode and the site indexes, and rewrites dependencies to the replacement.
  - It also skips their demos in the Fabricator example copies.
  - Items that used one get an override, and docs demos an override in `registry/fabricator/site-examples/<base>/`.
  - Blend mode keeps every upstream item.
- **After an upstream sync**, review the upstream changes to every overridden file (`git diff <old>..<new> -- apps/web/registry/bases/<base>/ui/<component>.tsx`) and port them into the override.

- **Dimensions** (rationale in `PLAN.md` §6):
  - Colour, surfaces, motion, and square/rounded radius are **tokens**.
  - Density (default/compact) and pill radius are **styles**.
- **Colour:**
  - Values are OKLCH, defined for both `:root` and `.dark`.
  - Every foreground/background pair meets WCAG 2.2 AA (4.5:1 for text, 3:1 for UI and large text). The contrast check enforces this.
- **Blend mode:** exclusive components ship rules for all 8 upstream styles too, tuned to sit naturally next to each style's upstream components.

### Seeing style changes on the site

The website renders the Fabricator style, so it shows what `fabricator-ui add` installs.

- **Live CSS loop (no compile):** edit `registry/styles/fabricator/<component>.css`, run `bun run registry:build --examples` in `apps/web`, and open `/view/base-fabricator/<component>-example`. It renders the component's showcase from raw sources with the style map's CSS, and the dev server hot-reloads.
- **Compiled loop (overrides, docs pages):** `scripts/build-fabricator.sh [base|radix|aria|all]` in `apps/web` rebuilds `styles/*-fabricator` under a lock (safe with parallel workers). Run the full `bun run registry:build` before committing.
- **Stale Turbopack cache:** if the dev server can't resolve a newly generated file that exists on disk, stop it, delete `apps/web/.next/dev`, and restart.
- **Where it applies** (`lib/site-style.ts`):
  - Docs previews and code. Pages name upstream's default styles (`<base>-nova`, `<base>-rhea`), and `toSiteStyle()` maps them to `<base>-fabricator`. The build generates Fabricator copies of every demo in `examples/__styles__/` (gitignored).
  - The homepage cards, which import `@/styles/base-fabricator/*`.
  - The blocks gallery (`SITE_BLOCK_STYLE`), rendered from raw base sources inside a `.style-fabricator` scope (`app/style-registry.css`).
  - The `.md` exports and `llms-full.txt`.
- **Where it doesn't:** charts and `/create` keep upstream styles. Charts exist only in the legacy `new-york-v4` tree, and `/create` uses upstream preset codes.
- **Tailwind sources:** compiled styles live in gitignored `styles/<base>-<style>/`, which Tailwind doesn't detect on its own. Every style folder the site renders must have an `@source` line in `app/globals.css`, or classes used only by that style are never generated.
- **Mobile screenshots:** after visible style changes, recapture with `bun run registry:capture --force && bun run pages:capture` (dev server running).

---

## Website (`apps/web`)

- **Stack:** Next.js 16 App Router, React 19.2, Tailwind 4, Fumadocs, `rehype-pretty-code` + shiki, next-themes, jotai, nuqs.
- **Rendering:**
  - Docs, component and block pages are statically generated (`generateStaticParams`, `dynamic = "force-static"`).
  - Server Components by default. `"use client"` goes on the smallest interactive leaf.
- **Previews:**
  - Rendered through `ComponentPreview` / `ComponentSource` from the generated indexes.
  - Blocks render in the `/view/[style]/[name]` iframe.
  - Code shown to readers is rewritten to user-facing paths (`@/components/ui/*`).
- **CLI commands in docs:** written once as `npx shadcn@latest …`. The highlighter generates the npm/pnpm/yarn/bun tabs, and bun is the default tab.
- **Component doc pages:** each base has one, with these sections:
  1. Preview
  2. Installation (CLI + Manual)
  3. Usage
  4. Composition
  5. Examples
  6. API reference
  7. Accessibility
- **AI-facing outputs:** every docs page has a `.md` export, and `llms.txt` lists the docs. Both stay accurate as pages change.
- **Registry endpoints** under `/r/**` return `application/json` with permissive CORS and long CDN caching.
- **Site UI:** the website uses Fabricator components from the registry, so it is the library's flagship example.
- **Site chrome** follows the Fabricator design (DESIGN.md), and lives in new files so upstream merges of the website stay small:
  - `components/fabricator/`:
    - `site-header.tsx` / `site-footer.tsx`: the minimal top bar and footer for the homepage and the full-width pages.
    - `docs-shell-sidebar.tsx`, `docs-mobile-bar.tsx`, `docs-panel.tsx`: the docs shell (no top bar), with a left sidebar of search and nav groups, and a right panel for theme, primitive and contents.
    - `fluid-nav.tsx`: the site's link lists, which use the real Fluid Hover hook.
  - `app/fabricator-site.css`: site-only CSS such as docs typography. `app/fabricator.css` is generated; don't edit it.
  - The homepage (`app/(app)/(root)/`) is a gallery of every component.
    - Hand-built demos (`_components/demos-*.tsx`, importing `@/styles/base-fabricator/ui/*`) come first.
    - Every other component follows with its docs demo, listed in `_components/catalog.tsx` and lazy-loaded from `examples/__styles__/base-fabricator/` as its card nears the viewport.
    - When you add a component, add it to the catalog with a category and card height.
- **Docs pages** use the docs shell: `[data-slot=docs-shell]` hides the site header and footer.
- **Site settings** (`lib/site-settings.ts`, stored in localStorage):
  - The settings menu (`components/fabricator/site-settings.tsx`) is in the top bar, the docs sidebar and the docs panel, and holds theme, sound, icons, radius and motion.
  - `components/fabricator/site-settings-effects.tsx` applies them: it sets `data-radius` on `<html>` (Pill sets `--radius: 1.25rem` in `app/fabricator-site.css`) sets `data-motion` (Relaxed/Snappy/Off scale `--motion-scale` in `app/fabricator-site.css`), and mounts the registry's `<SoundEffects />`.
  - A script in `<head>` applies a stored Pill radius and motion speed before paint.
- **Site icons:** the Fabricator copies the site renders (`examples/__styles__/*-fabricator`, `styles/*-fabricator/ui`) import icons from `@/lib/site-icons`, not `lucide-react`, so previews follow the Icons setting.
  - `lib/site-icons*.ts(x)` is generated by `bun run icons:build` (also part of `bun run dev`) and committed.
  - The generator maps names through `registry/icons/site-mapping.json`, then `public/r/icons/index.json`.
  - Everything shown to readers maps the import back to `lucide-react` (`lib/site-icons-display.ts`). Registry JSON never contains site icons.
- **Sounds** (`registry/fabricator/shared/lib/sounds.ts` and `components/sound-effects.tsx`) are our own Web Audio synthesis.
  - `<SoundEffects />` resolves sounds from `data-slot`, ARIA roles and `data-sound`, so components need no changes.
  - Don't add audio files or third-party sound assets without a licence that allows redistribution under MIT.

---

## CLI (`packages/cli`)

- It is a thin wrapper. It resolves the pinned `shadcn` package, runs it as a child process with `process.execPath`, forwards arguments, stdio and exit codes, and adds Fabricator defaults (init URL, `@fabricator` resolution, `doctor`).
- **Registry logic stays in shadcn.** Resolution, file writing and transforms are not re-implemented here; any gap goes to `PLAN.md` first.
- **Runtime:** Node ≥ 20.18.1, ESM, `#!/usr/bin/env node`. The code uses Node APIs only, so it runs identically under `npx`, `pnpm dlx`, `yarn dlx` and `bunx`.
- **`shadcn` upgrades:** bumping the pinned version is its own change, verified by the e2e matrix.
- **Releases:** every user-facing change gets a changeset.

---

## Upstream sync

- Upstream code enters the repo only through `bun run sync:upstream`. It writes pristine files to the `upstream/shadcn` vendor branch and records the SHA in `upstream.lock.json`. That branch is merged into `main`, and conflicts are resolved in the merge commit.
- Fabricator changes live in **new files** wherever possible: Fabricator style maps, tokens, exclusive items, site components. Upstream-derived files take the smallest edit that works, which keeps future merges small.
- After merging a sync, run `bun run rebrand` (demo content), then the full registry build and `bun run test:parity --styles all`. The parity check applies the same rebrand rules to upstream before comparing, so it confirms that everything else matches upstream exactly.
- A deliberate divergence from upstream (a bug fix) is recorded in `scripts/parity-exceptions.json` with its reason and date. Report the bug upstream too, and remove the entry once upstream ships the fix.

---

## Definition of done

A change is done when every applicable line below is true. Report each one as passed, or name what was not run and why.

- [ ] `bun run check` (lint, types, format) and `bun run test` pass.
- [ ] Authored registry changes are followed by a full `bun run registry:build`. The committed indexes are updated, and no generated output is staged.
- [ ] The contract holds: superset, valid style ids, namespaced dependencies, token names, base parity.
- [ ] Every placeholder used has a rule in every style map (coverage lint passes).
- [ ] `bun run test:parity` passes for upstream items whenever upstream-derived source, style maps or the build script changed.
- [ ] For new or changed items, `shadcn add --dry-run` succeeds against the local registry for each base. `bun run test:e2e` passes when install behaviour, the CLI or `/init` changed.
- [ ] Components have examples covering each variant and state, plus a docs page per base with the API table and accessibility notes.
- [ ] The UI was checked in the running site, light and dark, keyboard only, at mobile and desktop widths. axe reports no violations on touched example pages.
- [ ] A changeset exists for changes to published packages. User-visible registry changes get a changelog entry in `content/docs/changelog/`.
- [ ] `AGENTS.md` / `PLAN.md` are updated if a convention or decision changed.

---

## Git and pull requests

- **Commits:** Conventional Commits with a scope, for example `feat(registry): add stepper`, `fix(web): …`, `chore(upstream): sync shadcn@<sha>`. Types: `feat`, `fix`, `refactor`, `docs`, `build`, `test`, `ci`, `chore`. Scopes: `registry`, `styles`, `tokens`, `web`, `docs`, `cli`, `react`, `tests`, `upstream`, `deps`.
- **Granularity:** one logical change per commit. A component plus its examples and docs is one change.
- **Default branch:** `main`. Work happens on topic branches and reaches `main` through a pull request with green CI.
- **PR description:**
  - what changed and why
  - bases touched
  - styles touched
  - screenshots or recordings for visual changes
  - Definition of done status
