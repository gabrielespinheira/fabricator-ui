# fabricator-ui

The command-line tool for [Fabricator UI](https://fabricator-ui.com), an open-source React component library. Components are copied into your project as source code, so you own them.

## Usage

Run it with the package manager you already use:

```bash
npx fabricator-ui@latest init
pnpm dlx fabricator-ui@latest init
yarn dlx fabricator-ui@latest init
bunx --bun fabricator-ui@latest init
```

Requires Node.js 20.18.1 or later (or Bun). Projects need React 19 and Tailwind CSS v4.

## Commands

### `init`

Set up a new or existing project.

```bash
# New Next.js app with the Fabricator look
npx fabricator-ui@latest init -t next

# Existing app
npx fabricator-ui@latest init
```

`init` configures your theme and adds the `@fabricator` registry to `components.json`. With `--template`, it creates the project in `<cwd>/<name>` (default name `<template>-app`, or `apps/web` for monorepos) with a starter button.

If the directory already has a `components.json`, you are asked whether to:

1. **Add the `@fabricator` registry only** and keep your current theme. Components are compiled for your current style (blend mode). `--yes` picks this option.
2. **Apply the Fabricator theme** and reinstall your components.

| Option                                                        | Description                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `-t, --template <template>`                                   | Create a new project: `next`, `start`, `vite`, `react-router`, `laravel`, `astro` |
| `-b, --base <base>`                                           | Component library: `base` (Base UI, default), `radix` or `aria`                   |
| `-p, --preset <preset>`                                       | Preset name (default `fabricator`), preset code, or a full init URL               |
| `--blend`                                                     | Keep your current look: install Fabricator components in your current style       |
| `--monorepo`, `--no-monorepo`                                 | Scaffold a monorepo, or skip the prompt                                           |
| `--rtl`, `--no-rtl`                                           | Enable or disable RTL support                                                     |
| `--pointer`                                                   | Use a pointer cursor for buttons                                                  |
| `--css-variables`, `--no-css-variables`                       | Theme with CSS variables (default) or not                                         |
| `-n, --name <name>`                                           | Name of the new project                                                           |
| `-y, --yes`, `-f, --force`, `-s, --silent`, `-c, --cwd <cwd>` | Skip prompts, overwrite config, mute output, set the working directory            |
| `--dry-run`                                                   | Print the underlying commands instead of running them                             |

### `add`

```bash
npx fabricator-ui@latest add button dialog
```

Bare names resolve to the Fabricator registry (`button` becomes `@fabricator/button`). Namespaced items (`@acme/card`), GitHub addresses (`owner/repo/item`), URLs and local `.json` files pass through unchanged. If `components.json` has no `@fabricator` registry, it is added first.

- `--all` installs every Fabricator UI component.
- `--upstream` installs bare names from the upstream registry instead.
- `-y`, `-o/--overwrite`, `-p/--path`, `-s`, `-c`, `--dry-run`, `--diff [path]` and `--view [path]` work as you'd expect. Read-only runs (`--dry-run`, `--diff`, `--view`) leave `components.json` unchanged.

### `apply [preset]`

Apply a Fabricator preset to an existing project. Use `--only theme,font` to apply parts of it.

### `search [query]` (alias `list`), `view <items…>`, `docs <components…>`

Browse the Fabricator registry:

```bash
npx fabricator-ui@latest search date
npx fabricator-ui@latest view button
npx fabricator-ui@latest docs dialog
```

### `diff <item>`

Compare your copy of an item with the registry version.

### `doctor`

Checks that your project is ready for Fabricator UI and prints a fix for each problem: `components.json` is valid, `style` is a valid style id, the `@fabricator` registry is configured, Tailwind CSS v4, React 19, your CSS imports `shadcn/tailwind.css`, and `cn` is installed. Exits with code 1 when a check fails.

### `mcp`

`mcp` runs the Fabricator MCP server over stdio, so AI assistants can browse, search and install `@fabricator` items. `mcp init --client <claude|cursor|vscode|codex|opencode>` adds a `fabricator` server to your editor's MCP configuration and makes sure `@fabricator` is configured.

### `info`

Prints information about your project.

## Options

| Option / variable         | Description                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| `--verbose`               | Print the underlying commands as they run                                                         |
| `FABRICATOR_REGISTRY_URL` | Registry host to use instead of `https://fabricator-ui.com` (for example `http://localhost:4000`) |

## How it works

The CLI is built on the official shadcn CLI, pinned to a tested version. It builds the Fabricator init URL and registry addresses, and delegates resolution and installation. Your `components.json` stays compatible with the shadcn toolchain; see [Registry](https://fabricator-ui.com/docs/registry) for using it directly.

## Acknowledgements

Fabricator UI is built on [shadcn/ui](https://github.com/shadcn-ui/ui), released under the MIT license.

## License

MIT
