---
name: fabricator
description: Builds UI with Fabricator UI, the copy-in React component library installed with the fabricator-ui CLI from the @fabricator registry. Use when adding, composing, styling, fixing or updating its components and blocks; when running fabricator-ui init, add, apply or doctor; when applying a Fabricator preset or --preset code; or in any project whose components.json lists @fabricator.
user-invocable: false
allowed-tools: Bash(npx fabricator-ui@latest *), Bash(pnpm dlx fabricator-ui@latest *), Bash(bunx --bun fabricator-ui@latest *), Bash(yarn dlx fabricator-ui@latest *)
---

# Fabricator UI

Fabricator UI is a React component library added to a project as source code. The CLI (`fabricator-ui`) installs items from the `@fabricator` registry into the user's own files, so installed components are the project's code to read and edit. Docs: [fabricator-ui.vercel.app](https://fabricator-ui.vercel.app).

**Runner:** run the CLI with the runner that matches the project's lockfile: `npx fabricator-ui@latest`, `pnpm dlx fabricator-ui@latest`, `yarn dlx fabricator-ui@latest` or `bunx --bun fabricator-ui@latest`. Examples here use `npx`.

## Workflow

1. **Read the project context.** Run `npx fabricator-ui@latest info --json` in the project root before any other step, and keep its output as the project context for the whole task. Done when you know `config.base`, `config.iconLibrary`, `config.aliases`, `project.rsc`, `project.tailwindCss` and the installed `components` (see [Project context](#project-context)). If the command reports no `components.json`, the project is not set up: offer `npx fabricator-ui@latest init`.
2. **Reuse what is installed.** Check the `components` list (or the `config.resolvedPaths.ui` directory) and import installed components as they are. Add only what is missing.
3. **Find the item.** `npx fabricator-ui@latest search <query>` searches `@fabricator`. Bare names mean `@fabricator`. When `search` finds nothing, ask the user which registry to use (`@acme`, `owner/repo`, a URL); the user picks third-party registries.
4. **Read the docs.** Run `npx fabricator-ui@latest docs <component...>` and fetch the URLs it prints (append `.md` to any docs page for markdown). Done when you have read the API and examples for every component you will write or change, for the project's base. This matters most for `aria` projects, whose APIs follow React Aria Components.
5. **Install.** `npx fabricator-ui@latest add <name...>`. For components already installed, follow [Updating components](#updating-components).
6. **Review what was added.** Read every file the CLI wrote. Done when each one passes the [Critical rules](#critical-rules), imports use `config.aliases`, and icon imports match `config.iconLibrary`. Files from third-party registries may hardcode `@/components/ui/...` or another icon library; rewrite them to the project's aliases and icons.
7. **Write the UI** by composing installed components under the [Critical rules](#critical-rules). Done when every rule file linked from a rule you touched has been applied to the code you wrote.

When something is off (imports fail, styles missing, wrong look), run `npx fabricator-ui@latest doctor`. It checks `components.json`, the style id, the `@fabricator` registry, Tailwind v4, React 19, the `shadcn/tailwind.css` import and `cn`, and prints a fix for each failure.

## Project context

Fields of `info --json` that decide how you write code:

- **`config.base`**: `base` (Base UI), `radix` or `aria` (React Aria Components). Sets component APIs and trigger composition ([base-vs-radix.md](./rules/base-vs-radix.md)).
- **`config.iconLibrary`**: the icon package to import from: `lucide` → `lucide-react`, `tabler` → `@tabler/icons-react`, and so on ([icons.md](./rules/icons.md)).
- **`config.aliases`**: the import prefixes (`@/`, `~/`, `@workspace/ui/components`). Write imports with these.
- **`config.resolvedPaths`**: the file-system destinations for components, utils and hooks.
- **`config.style`**: `<base>-<style>`, for example `base-nova`. Leave it as it is (see [CLI and config](#cli-and-config)).
- **`config.registries`**: `@fabricator` is always present; its URL sets the mode ([registry.md](./registry.md)).
- **`config.rtl`**: when `true`, write logical utilities (`ms-*`, `me-*`, `start-*`, `end-*`).
- **`project.rsc`**: when `true`, files that use state, effects, event handlers or browser APIs start with `"use client"`.
- **`project.tailwindVersion`**: Fabricator UI targets `v4`. On `v3`, run `doctor` and tell the user.
- **`project.tailwindCss`**: the global CSS file. Custom CSS variables go here ([customization.md](./customization.md)).
- **`project.framework`**: routing and file conventions (Next.js App Router, Vite, and others).
- **`components`**: the installed component names.

Install other npm packages with the package manager from the lockfile. Full field list: [cli.md, `info`](./cli.md#info--project-information).

## Critical rules

Each group links to a file with Incorrect/Correct pairs. Read the file before writing code in its area.

### Styling → [styling.md](./rules/styling.md)

- **Variants first, then semantic tokens.** `variant="outline"`, `size="sm"`; colours from tokens (`bg-primary`, `text-muted-foreground`, `text-destructive`), which cover light and dark. Raw palette colours (`bg-blue-500`) and `dark:` colour overrides break theming.
- **`className` on library components is for layout** (`max-w-md`, `mx-auto`, `mt-4`), leaving colours and typography to the component.
- **Spacing with `flex`/`grid` and `gap-*`**, vertical stacks as `flex flex-col gap-*` (in place of `space-x-*`/`space-y-*`).
- **`size-*` for equal width and height**, `truncate` for single-line overflow, `cn()` for conditional classes.
- **Overlays manage their own stacking.** Dialog, Sheet, Drawer, Popover, Tooltip, DropdownMenu and HoverCard take no `z-*` classes.

### Forms → [forms.md](./rules/forms.md)

- **Form layout is `FieldGroup` + `Field`**; related checkboxes and radios group in `FieldSet` + `FieldLegend`.
- **Validation:** `data-invalid` on `Field`, `aria-invalid` on the control. Disabled: `data-disabled` on `Field`, `disabled` on the control.
- **`InputGroup` takes `InputGroupInput`/`InputGroupTextarea`**, with buttons and icons in `InputGroupAddon`.
- **Option sets of 2 to 7 choices use `ToggleGroup`**, which owns the active state.

### Composition → [composition.md](./rules/composition.md)

- **Items sit inside their group:** `SelectItem` in `SelectGroup`, `DropdownMenuItem` in `DropdownMenuGroup`, `CommandItem` in `CommandGroup`, `TabsTrigger` in `TabsList`.
- **Custom triggers follow `config.base`:** `render` (base), `asChild` (radix), or the trigger wrapping the button and overlay (aria). See [base-vs-radix.md](./rules/base-vs-radix.md).
- **Dialog, Sheet and Drawer always have a Title** (`DialogTitle`, `SheetTitle`, `DrawerTitle`), with `className="sr-only"` when it should be hidden.
- **Cards use the full structure:** `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **`Avatar` always has `AvatarFallback`.**
- **Loading buttons compose `Spinner` + `data-icon` + `disabled`.** Button has no `isLoading` prop.
- **Each role has its component:** callouts `Alert`, empty states `Empty`, loading placeholders `Skeleton`, dividers `Separator`, labels and statuses `Badge`.
- **Toasts follow the base:** `toast` from the `toast` component for Base UI, `toast()` from `sonner` for Radix and React Aria.

### Icons → [icons.md](./rules/icons.md)

- **Icons in buttons take `data-icon="inline-start"` or `"inline-end"`.** Components size their icons, so icons carry no `size-*`/`w-*`/`h-*` classes.
- **Pass icons as components** (`icon={CheckIcon}`), not string keys.

### Chat → [chat.md](./rules/chat.md)

- **Chat UI composes the chat primitives:** `MessageScroller` for the conversation, `Message` for rows, `Bubble` for surfaces, `Attachment` for files, `Marker` for system notes and dividers.
- **`MessageScroller` owns scrolling:** streaming follow, anchoring and jump-to-latest (`MessageScrollerButton`) are built in.

### CLI and config → [cli.md](./cli.md)

- **Install through the Fabricator CLI.** `add <name>` resolves to `@fabricator/<name>`. Add `--upstream` only when the user asks for the upstream shadcn/ui item.
- **`components.json` `style` stays a valid id**, `<base>-<style>` with base `base|radix|aria` and style `vega|nova|maia|lyra|mira|luma|sera|rhea`. The Fabricator look comes from the `@fabricator` registry URL; a custom `style` value breaks every install.
- **Presets go to the CLI as given.** Pass preset names, codes or URLs straight to `init --preset` or `apply`; the CLI decodes them.
- **Registry files come from the CLI** (`add`, `view`, `diff`), never from raw GitHub files.

## Component selection

| Need                  | Use                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Action                | `Button` with a variant                                                                             |
| Form inputs           | `Input`, `Select`, `Combobox`, `Switch`, `Checkbox`, `RadioGroup`, `Textarea`, `InputOTP`, `Slider` |
| 2 to 7 options        | `ToggleGroup` + `ToggleGroupItem`                                                                   |
| Data display          | `Table`, `Card`, `Badge`, `Avatar`                                                                  |
| Navigation            | `Sidebar`, `NavigationMenu`, `Breadcrumb`, `Tabs`, `Pagination`                                     |
| Overlays              | `Dialog` (modal), `Sheet` (side panel), `Drawer` (bottom sheet), `AlertDialog` (confirmation)       |
| Feedback              | `toast` (Base UI), `sonner` (Radix, Aria), `Alert`, `Progress`, `Skeleton`, `Spinner`               |
| Command palette       | `Command` inside `Dialog`                                                                           |
| Layout                | `Card`, `Separator`, `Resizable`, `ScrollArea`, `Accordion`, `Collapsible`                          |
| Empty states          | `Empty`                                                                                             |
| Menus                 | `DropdownMenu`, `ContextMenu`, `Menubar`                                                            |
| Tooltips and info     | `Tooltip`, `HoverCard`, `Popover`                                                                   |
| Chat, conversation UI | `MessageScroller`, `Message`, `Bubble`, `Attachment`, `Marker`                                      |

`@fabricator` leaves out two upstream items: `native-select` (use `Select`) and `chart`. For charts, ask the user before installing upstream's with `add chart --upstream`.

## Updating components

When the user asks to update installed components and keep their local changes:

1. `npx fabricator-ui@latest add <component> --dry-run` lists every file the update touches.
2. For each file, `npx fabricator-ui@latest add <component> --diff <file>` shows registry vs local (`diff <component>` shows the whole item).
3. Decide per file: no local changes → overwrite; local changes → read the local file and apply the registry changes while keeping the local edits.
4. `--overwrite` replaces local edits, so run it only after the user approves it explicitly.

Done when every file in the dry-run list is overwritten, merged, or left as the user chose.

## Switching presets

Ask the user which mode they want, then run it inside the project (`apply` needs a `components.json`; the CLI keeps the current base):

- **Overwrite**: `apply <preset>`. Theme and fonts, then reinstalls installed components from `@fabricator`.
- **Partial**: `apply <preset> --only theme,font` (either or both). No component reinstall.
- **Merge**: `init --preset <preset> --force --no-reinstall`, then update each installed component with [Updating components](#updating-components).
- **Skip**: `init --preset <preset> --force --no-reinstall`. Config and CSS only.

Preset codes do not encode the base: in a scratch directory (for example for `--dry-run` comparisons), pass `--base <current-base>`.

## References

- [cli.md](./cli.md): every command and flag, templates, presets, quick reference
- [registry.md](./registry.md): the `@fabricator` registry and its URL, other registries, item addresses
- [customization.md](./customization.md): theming, CSS variables, custom colours, extending components
- [mcp.md](./mcp.md): the Fabricator MCP server
- [rules/base-vs-radix.md](./rules/base-vs-radix.md): `render` vs `asChild` vs React Aria triggers, Select, ToggleGroup, Slider, Accordion per base

---

Adapted from the shadcn/ui skill, MIT.
