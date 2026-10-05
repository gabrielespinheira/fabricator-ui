---
name: fabricator
description: Manages Fabricator UI components and projects — adding, searching, fixing, debugging, styling, and composing UI, including chat interfaces. Provides project context, component docs, and usage examples. Applies when working with Fabricator UI, the fabricator-ui CLI, the @fabricator registry, Fabricator presets or --preset codes, or any project whose components.json lists @fabricator. Also triggers for "fabricator-ui init", "add from @fabricator", "apply a Fabricator preset", or "switch to --preset".
user-invocable: false
allowed-tools: Bash(npx fabricator-ui@latest *), Bash(pnpm dlx fabricator-ui@latest *), Bash(bunx --bun fabricator-ui@latest *), Bash(yarn dlx fabricator-ui@latest *)
---

# Fabricator UI

An open-code React component library. Components are added to the user's project as source code by the Fabricator CLI (`fabricator-ui`), from the `@fabricator` registry. Docs: [fabricator-ui.com](https://fabricator-ui.com).

> **IMPORTANT:** Run all CLI commands with the project's package runner: `npx fabricator-ui@latest`, `pnpm dlx fabricator-ui@latest`, `yarn dlx fabricator-ui@latest`, or `bunx --bun fabricator-ui@latest`. Pick it from the project's lockfile. Examples below use `npx fabricator-ui@latest`; substitute the right runner.

## Current Project Context

```json
!`npx fabricator-ui@latest info --json`
```

The JSON above contains the project info, the `components.json` config, and the installed components. Use `npx fabricator-ui@latest docs <component>` to get documentation and example URLs for any component.

## Principles

1. **Use existing components first.** Run `npx fabricator-ui@latest search` before writing custom UI.
2. **Compose, don't reinvent.** Settings page = Tabs + Card + form controls. Dashboard = Sidebar + Card + Chart + Table.
3. **Use built-in variants before custom styles.** `variant="outline"`, `size="sm"`, etc.
4. **Use semantic colors.** `bg-primary`, `text-muted-foreground`, never raw values like `bg-blue-500`.

## Critical Rules

These rules are **always enforced**. Each links to a file with Incorrect/Correct code pairs.

### Styling & Tailwind → [styling.md](./rules/styling.md)

- **`className` for layout, not styling.** Never override component colors or typography.
- **No `space-x-*` or `space-y-*`.** Use `flex` with `gap-*`. For vertical stacks, `flex flex-col gap-*`.
- **Use `size-*` when width and height are equal.** `size-10` not `w-10 h-10`.
- **Use `truncate` shorthand.** Not `overflow-hidden text-ellipsis whitespace-nowrap`.
- **No manual `dark:` color overrides.** Use semantic tokens (`bg-background`, `text-muted-foreground`).
- **Use `cn()` for conditional classes.** Don't write manual template literal ternaries.
- **No manual `z-index` on overlay components.** Dialog, Sheet, Popover, etc. handle their own stacking.

### Forms & Inputs → [forms.md](./rules/forms.md)

- **Forms use `FieldGroup` + `Field`.** Never use raw `div` with `space-y-*` or `grid gap-*` for form layout.
- **`InputGroup` uses `InputGroupInput`/`InputGroupTextarea`.** Never raw `Input`/`Textarea` inside `InputGroup`.
- **Buttons inside inputs use `InputGroup` + `InputGroupAddon`.**
- **Option sets (2–7 choices) use `ToggleGroup`.** Don't loop `Button` with manual active state.
- **`FieldSet` + `FieldLegend` for grouping related checkboxes/radios.** Don't use a `div` with a heading.
- **Field validation uses `data-invalid` + `aria-invalid`.** `data-invalid` on `Field`, `aria-invalid` on the control. For disabled: `data-disabled` on `Field`, `disabled` on the control.

### Component Structure → [composition.md](./rules/composition.md)

- **Items always inside their Group.** `SelectItem` → `SelectGroup`. `DropdownMenuItem` → `DropdownMenuGroup`. `CommandItem` → `CommandGroup`.
- **Custom triggers follow the base.** `asChild` (radix), `render` (base), or the trigger wraps the button and overlay (aria). Check `config.base` from project context. → [base-vs-radix.md](./rules/base-vs-radix.md)
- **Dialog, Sheet, and Drawer always need a Title.** `DialogTitle`, `SheetTitle`, `DrawerTitle` required for accessibility. Use `className="sr-only"` if visually hidden.
- **Use full Card composition.** `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter`. Don't dump everything in `CardContent`.
- **Button has no `isPending`/`isLoading`.** Compose with `Spinner` + `data-icon` + `disabled`.
- **`TabsTrigger` must be inside `TabsList`.** Never render triggers directly in `Tabs`.
- **`Avatar` always needs `AvatarFallback`.** For when the image fails to load.

### Use Components, Not Custom Markup → [composition.md](./rules/composition.md)

- **Use existing components before custom markup.** Check if a component exists before writing a styled `div`.
- **Callouts use `Alert`.** Don't build custom styled divs.
- **Empty states use `Empty`.** Don't build custom empty state markup.
- **Toast follows the project base.** Use `toast` from the `toast` component for
  Base UI projects. Use `toast()` from `sonner` for Radix and React Aria
  projects.
- **Use `Separator`** instead of `<hr>` or `<div className="border-t">`.
- **Use `Skeleton`** for loading placeholders. No custom `animate-pulse` divs.
- **Use `Badge`** instead of custom styled spans.

### Icons → [icons.md](./rules/icons.md)

- **Icons in `Button` use `data-icon`.** `data-icon="inline-start"` or `data-icon="inline-end"` on the icon.
- **No sizing classes on icons inside components.** Components handle icon sizing via CSS. No `size-4` or `w-4 h-4`.
- **Pass icons as objects, not string keys.** `icon={CheckIcon}`, not a string lookup.

### Chat & Messaging → [chat.md](./rules/chat.md)

- **Chat UI composes the chat primitives.** Conversations use `MessageScroller`, rows use `Message`, surfaces use `Bubble`. Never hand-rolled bubble `div`s or a raw scroll container.
- **`MessageScroller` owns scroll behavior.** Streaming follow, anchoring, and jump-to-latest (`MessageScrollerButton`) are built in. Don't write a `useStickToBottom`/`ResizeObserver` hook.
- **Attachments use `Attachment`; system notes and dividers use `Marker`.** Not `Item` cards or `Separator` + a label.

### CLI & Config → [cli.md](./cli.md)

- **Install through the Fabricator CLI.** `npx fabricator-ui@latest add <name>` resolves bare names to `@fabricator/<name>`. Use `--upstream` only when the user explicitly asks for the upstream item.
- **Never set a custom `style` id.** `components.json` `style` is always `<base>-<style>` (base `base|radix|aria`, style `vega|nova|maia|lyra|mira|luma|sera|rhea`). The Fabricator look comes from the `@fabricator` registry URL, never from `style`.
- **Never decode preset codes or build init URLs by hand.** Pass preset names, codes, or URLs straight to `init --preset` or `apply`.
- **Run `npx fabricator-ui@latest doctor` when something is off.** It checks `components.json`, the style id, the `@fabricator` registry, Tailwind v4, React 19, the `shadcn/tailwind.css` import, and `cn`, and prints a fix for each failure.

## Key Patterns

These are the most common patterns that differentiate correct Fabricator UI code. For edge cases, see the linked rule files above.

```tsx
// Form layout: FieldGroup + Field, not div + Label.
<FieldGroup>
  <Field>
    <FieldLabel htmlFor="email">Email</FieldLabel>
    <Input id="email" />
  </Field>
</FieldGroup>

// Validation: data-invalid on Field, aria-invalid on the control.
<Field data-invalid>
  <FieldLabel>Email</FieldLabel>
  <Input aria-invalid />
  <FieldDescription>Invalid email.</FieldDescription>
</Field>

// Icons in buttons: data-icon, no sizing classes.
<Button>
  <SearchIcon data-icon="inline-start" />
  Search
</Button>

// Spacing: gap-*, not space-y-*.
<div className="flex flex-col gap-4">  // correct
<div className="space-y-4">           // wrong

// Equal dimensions: size-*, not w-* h-*.
<Avatar className="size-10">   // correct
<Avatar className="w-10 h-10"> // wrong

// Status colors: Badge variants or semantic tokens, not raw colors.
<Badge variant="secondary">+20.1%</Badge>    // correct
<span className="text-emerald-600">+20.1%</span> // wrong
```

## Component Selection

| Need                       | Use                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Button/action              | `Button` with appropriate variant                                                                   |
| Form inputs                | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `InputOTP`, `Slider` |
| Toggle between 2–5 options | `ToggleGroup` + `ToggleGroupItem`                                                                   |
| Data display               | `Table`, `Card`, `Badge`, `Avatar`                                                                  |
| Navigation                 | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination`                                     |
| Overlays                   | `Dialog` (modal), `Sheet` (side panel), `Drawer` (bottom sheet), `AlertDialog` (confirmation)       |
| Feedback                   | `toast` (Base UI), `sonner` (Radix/Aria), `Alert`, `Progress`, `Skeleton`, `Spinner`                |
| Command palette            | `Command` inside `Dialog`                                                                           |
| Charts                     | `Chart` (wraps Recharts)                                                                            |
| Layout                     | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible`                          |
| Empty states               | `Empty`                                                                                             |
| Menus                      | `DropdownMenu`, `ContextMenu`, `Menubar`                                                            |
| Tooltips/info              | `Tooltip`, `HoverCard`, `Popover`                                                                   |
| Chat / conversation UI     | `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`                                      |

## Key Fields

The injected project context contains these key fields:

- **`config.aliases`** → use the actual alias prefix for imports (e.g. `@/`, `~/`), never hardcode.
- **`project.rsc`** → when `true`, components using `useState`, `useEffect`, event handlers, or browser APIs need `"use client"` at the top of the file. Always reference this field when advising on the directive.
- **`project.tailwindVersion`** → Fabricator UI targets `"v4"` (`@theme inline` blocks). If it is `"v3"`, run `doctor` and tell the user.
- **`project.tailwindCss`** → the global CSS file where custom CSS variables are defined. Always edit this file, never create a new one.
- **`project.framework`** → routing and file conventions (e.g. Next.js App Router vs Vite SPA).
- **`config.style`** → `<base>-<style>`, e.g. `base-nova`. Never change it to a custom value.
- **`config.base`** → primitive library (`base`, `radix`, or `aria`). Affects component APIs and available props.
- **`config.iconLibrary`** → determines icon imports. Use `lucide-react` for `lucide`, `@tabler/icons-react` for `tabler`, etc. Never assume `lucide-react`.
- **`config.rtl`** → when `true`, use logical utilities (`ms-*`, `me-*`, `start-*`, `end-*`) instead of `ml-*`/`mr-*`/`left-*`/`right-*`.
- **`config.resolvedPaths`** → exact file-system destinations for components, utils, hooks, etc.
- **`config.registries`** → configured registries. `@fabricator` must be present; its URL tells you the mode (see [registry.md](./registry.md)).
- **`components`** → installed component names.

For non-Fabricator dependencies, use the package manager from the lockfile (`pnpm add date-fns` vs `npm install date-fns`). See [cli.md — `info`](./cli.md#info--project-information) for the full field reference.

## Component Docs, Examples, and Usage

Run `npx fabricator-ui@latest docs <component>` to get the URLs for a component's documentation, examples, and API reference for the project's base. Fetch these URLs to get the actual content.

```bash
npx fabricator-ui@latest docs button dialog select
```

Every docs page is also available as markdown by appending `.md` (e.g. `https://fabricator-ui.com/docs/components/base/button.md`). The full docs are at `https://fabricator-ui.com/llms-full.txt`.

**When creating, fixing, debugging, or using a component, always run `npx fabricator-ui@latest docs` and fetch the URLs first.** This ensures you're working with the correct API and usage patterns rather than guessing. This matters most for `aria` projects, whose APIs follow React Aria Components.

## Workflow

1. **Get project context** — already injected above. Run `npx fabricator-ui@latest info` again if you need to refresh.
2. **Check installed components first** — before running `add`, check the `components` list from project context or list the `config.resolvedPaths.ui` directory. Don't import components that haven't been added, and don't re-add ones already installed.
3. **Find components** — `npx fabricator-ui@latest search <query>` searches the `@fabricator` registry.
4. **Get docs and examples** — run `npx fabricator-ui@latest docs <component>` to get URLs, then fetch them. Use `npx fabricator-ui@latest view` to browse registry items you haven't installed. To preview changes to installed components, use `npx fabricator-ui@latest add <component> --diff`.
5. **Install or update** — `npx fabricator-ui@latest add`. When updating existing components, use `--dry-run` and `--diff` to preview changes first (see [Updating Components](#updating-components) below).
6. **Fix imports in third-party components** — After adding components from other registries (e.g. `@acme/...`), check the added non-UI files for hardcoded import paths like `@/components/ui/...`. These won't match the project's actual aliases. Use `config.aliases.ui` from `npx fabricator-ui@latest info` (e.g. `@workspace/ui/components`) and rewrite the imports accordingly. The CLI rewrites imports for its own UI files, but third-party registry components may use default paths that don't match the project.
7. **Review added components** — After adding a component or block from any registry, **always read the added files and verify they are correct**. Check for missing sub-components (e.g. `SelectItem` without `SelectGroup`), missing imports, incorrect composition, or violations of the [Critical Rules](#critical-rules). Also replace any icon imports with the project's `iconLibrary` from the project context (e.g. if the registry item uses `lucide-react` but the project uses `hugeicons`, swap the imports and icon names accordingly). Fix all issues before moving on.
8. **Registry must be explicit** — Bare names mean `@fabricator`. When the user asks for a block or component that `search` doesn't find in `@fabricator`, **do not guess another registry**. Ask which registry to use (`@acme`, `owner/repo`, a URL). Never pick a third-party registry on the user's behalf.
9. **Switching presets** — Ask the user first: **overwrite**, **partial**, **blend**, **merge**, or **skip**?
   - **Overwrite**: `npx fabricator-ui@latest apply <preset>`. Applies the theme and fonts, then reinstalls the installed components from `@fabricator`.
   - **Partial**: `npx fabricator-ui@latest apply <preset> --only theme,font`. Updates only the selected preset parts without reinstalling components. Supported values are `theme` and `font`; comma-separated combinations are allowed.
   - **Blend**: `npx fabricator-ui@latest apply <preset> --blend`. Keeps the current look for components and switches `@fabricator` to blend mode.
   - **Merge**: `npx fabricator-ui@latest init --preset <preset> --force --no-reinstall`, then run `npx fabricator-ui@latest info` to list installed components, then for each installed component use `--dry-run` and `--diff` to [smart merge](#updating-components) it individually.
   - **Skip**: `npx fabricator-ui@latest init --preset <preset> --force --no-reinstall`. Only updates config and CSS, leaves components as-is.
   - **Important**: Always run preset commands inside the user's project directory. `apply` only works in an existing project with a `components.json` file. The CLI preserves the current base (`base`, `radix`, or `aria`) from `components.json`. If you must use a scratch/temp directory (e.g. for `--dry-run` comparisons), pass `--base <current-base>` explicitly — preset codes do not encode the base.

## Updating Components

When the user asks to update a component from the registry while keeping their local changes, use `--dry-run` and `--diff` to intelligently merge. **NEVER fetch raw files from GitHub manually — always use the CLI.**

1. Run `npx fabricator-ui@latest add <component> --dry-run` to see all files that would be affected.
2. For each file, run `npx fabricator-ui@latest add <component> --diff <file>` to see what changed in the registry vs local. `npx fabricator-ui@latest diff <component>` gives the same comparison for the whole item.
3. Decide per file based on the diff:
   - No local changes → safe to overwrite.
   - Has local changes → read the local file, analyze the diff, and apply registry updates while preserving local modifications.
   - User says "just update everything" → use `--overwrite`, but confirm first.
4. **Never use `--overwrite` without the user's explicit approval.**

## Quick Reference

```bash
# Create a new project (in an empty directory).
npx fabricator-ui@latest init -t next --name my-app
npx fabricator-ui@latest init -t vite --name my-app --base radix
npx fabricator-ui@latest init -t next --name my-app --preset a2r6bw

# Create a monorepo project.
npx fabricator-ui@latest init -t next --name my-app --monorepo

# Initialize an existing project (prompts: add @fabricator only, or apply the Fabricator theme).
npx fabricator-ui@latest init
npx fabricator-ui@latest init --yes      # non-interactive: add @fabricator only, keep the current theme
npx fabricator-ui@latest init --dry-run  # print what would run

# Apply a preset to an existing project.
npx fabricator-ui@latest apply                 # the default `fabricator` preset
npx fabricator-ui@latest apply a2r6bw
npx fabricator-ui@latest apply a2r6bw --only theme
npx fabricator-ui@latest apply a2r6bw --only theme,font
npx fabricator-ui@latest apply fabricator --blend

# Add components.
npx fabricator-ui@latest add button card dialog      # → @fabricator/button, ...
npx fabricator-ui@latest add @acme/shimmer-button
npx fabricator-ui@latest add owner/repo/item
npx fabricator-ui@latest add --all

# Preview changes before adding/updating.
npx fabricator-ui@latest add button --dry-run
npx fabricator-ui@latest add button --diff button.tsx
npx fabricator-ui@latest add @acme/form --view button.tsx
npx fabricator-ui@latest diff button

# Search the @fabricator registry.
npx fabricator-ui@latest search sidebar
npx fabricator-ui@latest search -q "menu" -t ui
npx fabricator-ui@latest list                 # everything

# Get component docs and example URLs.
npx fabricator-ui@latest docs button dialog select

# View registry item details (for items not yet installed).
npx fabricator-ui@latest view button
npx fabricator-ui@latest view @acme/login-form

# Check the project setup.
npx fabricator-ui@latest doctor
```

**Named preset:** `fabricator` (default)
**Templates:** `next`, `vite`, `start`, `react-router`, `astro` (all support `--monorepo`) and `laravel` (not supported for monorepo)
**Bases:** `base` (Base UI, default), `radix`, `aria` (React Aria Components)
**Preset codes:** Version-prefixed base62 strings (e.g. `a2r6bw` or `b0`), from [fabricator-ui.com/create](https://fabricator-ui.com/create).

## Detailed References

- [rules/forms.md](./rules/forms.md) — FieldGroup, Field, InputGroup, ToggleGroup, FieldSet, validation states
- [rules/composition.md](./rules/composition.md) — Groups, overlays, Card, Tabs, Avatar, Alert, Empty, Toast, Separator, Skeleton, Badge, Button loading
- [rules/chat.md](./rules/chat.md) — MessageScroller, Message, Bubble, Attachment, Marker; streaming, anchoring, jump-to-latest
- [rules/icons.md](./rules/icons.md) — data-icon, icon sizing, passing icons as objects
- [rules/styling.md](./rules/styling.md) — Semantic colors, variants, className, spacing, size, truncate, dark mode, cn(), z-index
- [rules/base-vs-radix.md](./rules/base-vs-radix.md) — asChild vs render vs React Aria triggers, Select, ToggleGroup, Slider, Accordion
- [cli.md](./cli.md) — Commands, flags, presets, templates
- [registry.md](./registry.md) — The `@fabricator` registry, blend vs Fabricator mode, other namespaced registries, item addresses
- [customization.md](./customization.md) — Theming, CSS variables, extending components
- [mcp.md](./mcp.md) — The Fabricator MCP server

---

Adapted from the shadcn/ui skill, MIT.
