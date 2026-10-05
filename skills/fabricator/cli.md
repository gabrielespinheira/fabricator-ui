# Fabricator CLI Reference

Configuration is read from `components.json`.

> **IMPORTANT:** Always run commands with the project's package runner: `npx fabricator-ui@latest`, `pnpm dlx fabricator-ui@latest`, `yarn dlx fabricator-ui@latest`, or `bunx --bun fabricator-ui@latest`. Pick it from the project's lockfile. Examples below use `npx fabricator-ui@latest`; substitute the right runner.

> **IMPORTANT:** Only use the flags documented below. Do not invent or guess flags — if a flag isn't listed here, it doesn't exist. The CLI auto-detects the package manager from the project's lockfile; there is no `--package-manager` flag. Run `npx fabricator-ui@latest <command> --help` when in doubt.

## Contents

- Commands: init, apply, add (dry-run, smart merge), search, view, docs, diff, info, doctor, mcp
- Global options and environment
- Templates: next, vite, start, react-router, astro, laravel
- Presets: named, code, URL
- Switching presets

---

## Commands

### `init` — Initialize or create a project

```bash
npx fabricator-ui@latest init [components...] [options]
```

Sets up Fabricator UI in an existing project, or creates a new project when `--template` is passed. Optionally installs components in the same step (bare names resolve to `@fabricator`). `create` is an alias for `init`.

| Flag                                    | Short | Description                                                                     | Default                    |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------- | -------------------------- |
| `--template <template>`                 | `-t`  | Create a new project: `next`, `start`, `vite`, `react-router`, `laravel`, `astro` | —                          |
| `--base <base>`                         | `-b`  | Component library: `base`, `radix`, or `aria`                                  | `base`, or the project's   |
| `--preset <preset>`                     | `-p`  | Preset name, preset code, or init URL                                           | `fabricator`               |
| `--monorepo` / `--no-monorepo`          |       | Scaffold a monorepo project / skip the monorepo prompt                          | prompt                     |
| `--rtl` / `--no-rtl`                    |       | Enable / disable RTL support                                                    | —                          |
| `--pointer`                             |       | Use a pointer cursor for buttons                                                | `false`                    |
| `--css-variables` / `--no-css-variables`|       | Theme with CSS variables / inline utility colors                                | CSS variables              |
| `--reinstall` / `--no-reinstall`        |       | Re-install / keep existing UI components                                        | —                          |
| `--blend`                               |       | Keep the current look: install Fabricator components in the current style       | `false`                    |
| `--yes`                                 | `-y`  | Skip confirmation prompts                                                       | `false`                    |
| `--force`                               | `-f`  | Force overwrite of an existing `components.json`                                | `false`                    |
| `--cwd <cwd>`                           | `-c`  | Working directory                                                               | current                    |
| `--name <name>`                         | `-n`  | Name for the new project                                                        | `<template>-app`           |
| `--silent`                              | `-s`  | Mute output                                                                     | `false`                    |
| `--dry-run`                             |       | Print the underlying commands instead of running them                           | `false`                    |

**Existing projects.** When `components.json` already exists (and neither `--force` nor `--template` is passed), `init` asks:

1. **Add the `@fabricator` registry only** and keep the current theme. Components are compiled for the current style (blend mode). `--yes` picks this option.
2. **Apply the Fabricator theme** and reinstall components. Ask the user to commit their work first.

**New projects.** With `--template`, the project is created in `<cwd>/<name>` (monorepos keep the app in `apps/web`), the `@fabricator` registry is configured, and the starter button is replaced with `@fabricator/button`.

### `apply` — Apply a preset to an existing project

```bash
npx fabricator-ui@latest apply [preset] [options]
```

Applies a preset (default `fabricator`) to an existing project: theme, fonts, and then reinstalls the installed components from `@fabricator`. Requires `components.json`.

| Flag              | Short | Description                                                  | Default          |
| ----------------- | ----- | ------------------------------------------------------------ | ---------------- |
| `--only <parts>`  |       | Apply only parts of the preset: `theme`, `font` (comma-separated); no component reinstall | —                |
| `--base <base>`   | `-b`  | Component library: `base`, `radix`, or `aria`               | the project's    |
| `--blend`         |       | Keep the current look for components (no reinstall)          | `false`          |
| `--yes`           | `-y`  | Skip confirmation prompt                                     | `false`          |
| `--cwd <cwd>`     | `-c`  | Working directory                                            | current          |
| `--silent`        | `-s`  | Mute output                                                  | `false`          |

`[preset]` is positional; there is no `--preset` flag on `apply`.

### `add` — Add components

> **IMPORTANT:** To compare local components against the registry or to preview changes, ALWAYS use `npx fabricator-ui@latest add <component> --dry-run`, `--diff`, or `--view`. NEVER fetch raw files from GitHub or other sources manually. The CLI handles registry resolution, file paths, and CSS diffing automatically.

```bash
npx fabricator-ui@latest add [components...] [options]
```

Bare names resolve to the `@fabricator` registry (`button` → `@fabricator/button`). Namespaced items (`@acme/card`), GitHub item addresses (`owner/repo/item`), URLs, and local `.json` files pass through unchanged. If `components.json` has no `@fabricator` registry, it is added first (read-only runs leave `components.json` unchanged). Without arguments, the CLI prompts for components.

| Flag            | Short | Description                                                                                                          | Default |
| --------------- | ----- | -------------------------------------------------------------------------------------------------------------------- | ------- |
| `--yes`         | `-y`  | Skip confirmation prompt                                                                                             | `false` |
| `--overwrite`   | `-o`  | Overwrite existing files                                                                                             | `false` |
| `--cwd <cwd>`   | `-c`  | Working directory                                                                                                    | current |
| `--all`         | `-a`  | Add all Fabricator UI components                                                                                     | `false` |
| `--path <path>` | `-p`  | Target path for the component                                                                                        | —       |
| `--silent`      | `-s`  | Mute output                                                                                                          | `false` |
| `--dry-run`     |       | Preview all changes without writing files                                                                            | `false` |
| `--diff [path]` |       | Show diffs. Without a path, shows the first 5 files. With a path, shows that file only (implies `--dry-run`)         | —       |
| `--view [path]` |       | Show file contents. Without a path, shows the first 5 files. With a path, shows that file only (implies `--dry-run`) | —       |
| `--upstream`    |       | Keep bare names as-is and install the upstream registry item instead of `@fabricator`                               | `false` |

#### Dry-Run Mode

Use `--dry-run` to preview what `add` would do without writing any files. `--diff` and `--view` both imply `--dry-run`.

```bash
# Preview all changes.
npx fabricator-ui@latest add button --dry-run

# Show diffs for all files (top 5).
npx fabricator-ui@latest add button --diff

# Show the diff for a specific file.
npx fabricator-ui@latest add button --diff button.tsx

# Show contents for all files (top 5).
npx fabricator-ui@latest add button --view

# Show the full content of a specific file.
npx fabricator-ui@latest add button --view button.tsx

# Works with URLs too.
npx fabricator-ui@latest add https://example.com/r/item.json --dry-run

# Works with public GitHub registries too.
npx fabricator-ui@latest add owner/repo/item --dry-run

# CSS diffs.
npx fabricator-ui@latest add button --diff globals.css
```

**When to use dry-run:**

- When the user asks "what files will this add?" or "what will this change?" — use `--dry-run`.
- Before overwriting existing components — use `--diff` to preview the changes first.
- When the user wants to inspect component source code without installing — use `--view`.
- When checking what CSS changes would be made to `globals.css` — use `--diff globals.css`.
- When the user asks to review or audit third-party registry code before installing — use `--view` to inspect the source.

> **`add --dry-run` vs `view`:** Prefer `npx fabricator-ui@latest add --dry-run/--diff/--view` over `npx fabricator-ui@latest view` when the user wants to preview changes to their project. `view` only shows raw registry metadata. `add --dry-run` shows exactly what would happen in the user's project: resolved file paths, diffs against existing files, and CSS updates. Use `view` only when the user wants to browse registry info without a project context.

#### Smart Merge from the Registry

See [Updating Components in SKILL.md](./SKILL.md#updating-components) for the full workflow.

### `search` — Search the @fabricator registry

```bash
npx fabricator-ui@latest search [query] [options]
```

Fuzzy search over `@fabricator` items. Also aliased as `npx fabricator-ui@latest list`. Without a query, lists all items. Works without a `components.json` too. To browse other registries, use `view @namespace/item`, `add @namespace/item --dry-run`, or the [MCP server](./mcp.md).

| Flag                | Short | Description                                                       | Default |
| ------------------- | ----- | ----------------------------------------------------------------- | ------- |
| `--query <query>`   | `-q`  | Search query (same as the positional `[query]`)                   | —       |
| `--type <type>`     | `-t`  | Filter by item type (e.g. `ui`, `block`, `hook`); comma-separated | —       |
| `--limit <number>`  | `-l`  | Max items to display                                              | —       |
| `--offset <number>` | `-o`  | Items to skip                                                     | `0`     |
| `--json`            |       | Output as JSON                                                    | `false` |
| `--cwd <cwd>`       | `-c`  | Working directory                                                 | current |

### `view` — View item details

```bash
npx fabricator-ui@latest view <items...> [options]
```

Displays item info including file contents. Bare names resolve to `@fabricator`. Examples:
`npx fabricator-ui@latest view button`,
`npx fabricator-ui@latest view @acme/login-form`,
`npx fabricator-ui@latest view owner/repo/item`.

| Flag          | Short | Description                                 | Default |
| ------------- | ----- | ------------------------------------------- | ------- |
| `--cwd <cwd>` | `-c`  | Working directory                           | current |
| `--upstream`  |       | View bare names from the upstream registry  | `false` |

### `docs` — Get component documentation URLs

```bash
npx fabricator-ui@latest docs <components...> [options]
```

Outputs the documentation, example, and API reference URLs for one or more components, for the project's base. Fetch the URLs to get the actual content. Docs pages are also available as markdown by appending `.md`, e.g. `https://fabricator-ui.com/docs/components/base/button.md`. The full docs are at `https://fabricator-ui.com/llms-full.txt`.

| Flag            | Short | Description                                   | Default       |
| --------------- | ----- | --------------------------------------------- | ------------- |
| `--base <base>` | `-b`  | The base to use: `base`, `radix`, or `aria`   | the project's |
| `--json`        |       | Output as JSON (`{ base, results: [{ component, base, links }] }`) | `false` |
| `--cwd <cwd>`   | `-c`  | Working directory                             | current       |
| `--upstream`    |       | Show the upstream docs instead                | `false`       |

Some components include an `api` link to the underlying library (e.g. `cmdk` for the command component).

### `diff` — Compare your copy with the registry

```bash
npx fabricator-ui@latest diff <item> [options]
```

Shows what changed between the registry version of an item and the project's copy. Equivalent to `add <item> --diff`. For a single file, use `add <item> --diff <file>`.

| Flag          | Short | Description       | Default |
| ------------- | ----- | ----------------- | ------- |
| `--cwd <cwd>` | `-c`  | Working directory | current |

### `info` — Project information

```bash
npx fabricator-ui@latest info [options]
```

Displays project info, `components.json` configuration, and installed components. Run this first to discover the project's framework, aliases, Tailwind version, and resolved paths.

| Flag          | Short | Description       | Default |
| ------------- | ----- | ----------------- | ------- |
| `--json`      |       | Output as JSON    | `false` |
| `--cwd <cwd>` | `-c`  | Working directory | current |

**`project` fields:**

| Field              | Type      | Meaning                                                    |
| ------------------ | --------- | ---------------------------------------------------------- |
| `framework`        | `string`  | Detected framework (e.g. `Next.js`, `Vite`)                |
| `frameworkVersion` | `string`  | Framework version (e.g. `16.3.3`)                          |
| `srcDirectory`     | `boolean` | Whether the project uses a `src/` directory                |
| `rsc`              | `boolean` | Whether React Server Components are enabled                |
| `typescript`       | `boolean` | Whether the project uses TypeScript                        |
| `tailwindVersion`  | `string`  | `"v3"` or `"v4"` (Fabricator UI requires v4)               |
| `tailwindCss`      | `string`  | Path to the global CSS file                                |
| `importAlias`      | `string`  | Import alias prefix (e.g. `@`, `~`)                        |

**`config` fields (from `components.json`):**

| Field                | Type      | Meaning                                                                                    |
| -------------------- | --------- | ------------------------------------------------------------------------------------------ |
| `style`              | `string`  | `<base>-<style>`, e.g. `base-nova`                                                         |
| `base`               | `string`  | Primitive library (`base`, `radix`, or `aria`) — determines component APIs and props       |
| `rsc`                | `boolean` | RSC flag from config                                                                       |
| `typescript`         | `boolean` | TypeScript flag                                                                            |
| `iconLibrary`        | `string`  | Icon library — determines icon import package (e.g. `lucide-react`, `@tabler/icons-react`) |
| `rtl`                | `boolean` | Whether RTL support is enabled                                                             |
| `aliases.components` | `string`  | Component import alias (e.g. `@/components`)                                               |
| `aliases.utils`      | `string`  | Utils import alias (e.g. `@/lib/utils`)                                                    |
| `aliases.ui`         | `string`  | UI component alias (e.g. `@/components/ui`)                                                |
| `aliases.lib`        | `string`  | Lib alias (e.g. `@/lib`)                                                                   |
| `aliases.hooks`      | `string`  | Hooks alias (e.g. `@/hooks`)                                                               |
| `resolvedPaths`      | `object`  | Absolute file-system paths for each alias, plus `tailwindCss`                              |
| `registries`         | `object`  | Configured registries, including `@fabricator`                                             |

**`components`:** array of installed component names.

### `doctor` — Check the project setup

```bash
npx fabricator-ui@latest doctor [options]
```

Checks that the project is ready for Fabricator UI and prints a fix for each problem: `components.json` is valid, `style` is a valid style id, the `@fabricator` registry is configured, Tailwind CSS v4, React 19, the global CSS imports `shadcn/tailwind.css`, and `cn` is installed. Exits with code 1 when a check fails.

| Flag          | Short | Description       | Default |
| ------------- | ----- | ----------------- | ------- |
| `--cwd <cwd>` | `-c`  | Working directory | current |

### `mcp` — MCP server

```bash
npx fabricator-ui@latest mcp                       # run the server over stdio
npx fabricator-ui@latest mcp init --client claude  # write editor config
```

`mcp init --client` accepts `claude`, `cursor`, `vscode`, `codex`, `opencode`. See [mcp.md](./mcp.md).

---

## Global Options and Environment

| Option / variable         | Description                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `--verbose`               | Print the underlying commands as they run                                                          |
| `--version`, `-v`         | Print the CLI version                                                                              |
| `FABRICATOR_REGISTRY_URL` | Registry host to use instead of `https://fabricator-ui.com` (e.g. `http://localhost:4000`)         |

---

## Templates

| Value          | Framework      | Monorepo support |
| -------------- | -------------- | ---------------- |
| `next`         | Next.js        | Yes              |
| `vite`         | Vite           | Yes              |
| `start`        | TanStack Start | Yes              |
| `react-router` | React Router   | Yes              |
| `astro`        | Astro          | Yes              |
| `laravel`      | Laravel        | No               |

Pass `--monorepo` with a template to scaffold a monorepo (the app lives in `apps/web`). When neither `--monorepo` nor `--no-monorepo` is passed, the CLI prompts interactively. Laravel does not support monorepo scaffolding.

---

## Presets

Three ways to specify a preset via `init --preset` or `apply [preset]`:

1. **Named:** `fabricator` (the default)
2. **Code:** `a2r6bw` (version-prefixed base62 string, e.g. `a2r6bw` or `b0`), from [fabricator-ui.com/create](https://fabricator-ui.com/create)
3. **URL:** `"https://fabricator-ui.com/init?base=radix&preset=fabricator&..."`

> **IMPORTANT:** Never try to decode, fetch, or resolve preset codes manually. Preset codes are opaque — pass them directly to `npx fabricator-ui@latest init --preset <code>` or `npx fabricator-ui@latest apply <code>` and let the CLI handle resolution.

## Switching Presets

Ask the user first: **overwrite**, **partial**, **blend**, **merge**, or **skip** existing components?

- **Overwrite / Re-install** → `npx fabricator-ui@latest apply <preset>`. Applies theme and fonts, then reinstalls installed components from `@fabricator`. Use when the user hasn't customized components.
- **Partial** → `npx fabricator-ui@latest apply <preset> --only theme,font`. No component reinstall.
- **Blend** → `npx fabricator-ui@latest apply <preset> --blend`. Keeps the current look for components.
- **Merge** → `npx fabricator-ui@latest init --preset <preset> --force --no-reinstall`, then run `npx fabricator-ui@latest info` to get the list of installed components and use the [smart merge workflow](./SKILL.md#updating-components) to update them one by one, preserving local changes. Use when the user has customized components.
- **Skip** → `npx fabricator-ui@latest init --preset <preset> --force --no-reinstall`. Only updates config and CSS variables, leaves existing components as-is.

Always run preset commands inside the user's project directory. `apply` only works in an existing project with a `components.json` file. The CLI preserves the current base (`base`, `radix`, or `aria`) from `components.json`. If you must use a scratch/temp directory (e.g. for `--dry-run` comparisons), pass `--base <current-base>` explicitly — preset codes do not encode the base.
