# Registries and Item Addresses

Use this reference when the user wants to install from, configure, or reason
about the `@fabricator` registry or another namespaced registry.

## Contents

- Mental model
- The `@fabricator` registry
- Fabricator mode vs blend mode
- Other namespaced registries
- Address schemes
- Inspecting items before installing
- Troubleshooting

---

## Mental Model

A registry serves item JSON over HTTP. Each item carries its source files, npm
dependencies, registry dependencies, and install-time additions (CSS variables,
CSS, env vars). The CLI fetches the item and writes its files into the project
as source code; there is no runtime package to import.

Registry items are not limited to React components. They can distribute
components, blocks, hooks, utilities, design tokens, pages, and other project
files.

The CLI finds a namespace's URL in the `registries` field of `components.json`
and fills in the template: `{name}` with the item name and `{style}` with the
project's `style` field.

## The `@fabricator` Registry

Fabricator UI is served as the `@fabricator` registry from
`https://fabricator-ui.com/r`. `npx fabricator-ui@latest init` writes it to
`components.json`; `add`, `apply`, and `mcp init` add it if it is missing.

```json
{
  "$schema": "https://fabricator-ui.com/schema.json",
  "style": "base-nova",
  "registries": {
    "@fabricator": "https://fabricator-ui.com/r/fabricator/{style}/{name}.json"
  }
}
```

With this config, `npx fabricator-ui@latest add button` installs
`@fabricator/button` from
`https://fabricator-ui.com/r/fabricator/base-nova/button.json`.

Rules:

- **`style` is always `<base>-<style>`**, with base `base`, `radix`, or `aria`
  and style `vega`, `nova`, `maia`, `lyra`, `mira`, `luma`, `sera`, or `rhea`.
  Never write a custom style id such as `fabricator`: bare names and
  third-party items resolve with the same field and would 404.
- **The registry URL decides the look**, not `style` (see the next section).
- **Fabricator items depend on each other as `@fabricator/<name>`.** Installing
  one never pulls in an unrelated item by accident.
- Fabricator UI also works in existing shadcn/ui projects: add the `@fabricator`
  registry with `npx fabricator-ui@latest init` and keep everything else.

## Fabricator Mode vs Blend Mode

The registry is served in two modes. The URL in `components.json` picks one.

| Mode           | URL template                                                 | What the project gets                                                   |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Fabricator** | `https://fabricator-ui.com/r/fabricator/{style}/{name}.json` | Components compiled in the Fabricator design for the base in `style`.   |
| **Blend**      | `https://fabricator-ui.com/r/{style}/{name}.json`            | Components compiled in the project's current style (e.g. `nova`, `vega`). |

- **Fabricator mode** is the default for new projects (`init -t <template>`)
  and after `apply`.
- **Blend mode** is for existing projects that want to keep their look:
  `init --yes` (or picking "Add the @fabricator registry only"), `init --blend`,
  or `apply --blend`. Fabricator-only components then match the components the
  project already has.

When advising on styling, read `config.registries["@fabricator"]` from
`npx fabricator-ui@latest info --json` to know which mode the project uses. To
switch modes, use `apply` / `apply --blend` rather than editing the URL by hand.

## Other Namespaced Registries

Projects can list more registries next to `@fabricator`, including private
ones with auth headers:

```json
{
  "registries": {
    "@fabricator": "https://fabricator-ui.com/r/fabricator/{style}/{name}.json",
    "@acme": "https://registry.acme.com/{name}.json",
    "@internal": {
      "url": "https://internal.company.com/{name}.json",
      "headers": { "Authorization": "Bearer ${REGISTRY_TOKEN}" }
    }
  }
}
```

- Names must start with `@`.
- URLs must contain `{name}`; `{style}` is optional.
- `${VAR}` references are resolved from environment variables (e.g. `.env.local`).
  Never write tokens into `components.json`.

Install with the full address; the Fabricator CLI passes it through unchanged:

```bash
npx fabricator-ui@latest add @acme/login-form
```

After installing from another registry, check the added files for hardcoded
import paths and icon libraries that don't match the project (see the Workflow
in [SKILL.md](./SKILL.md#workflow)).

## Address Schemes

When reasoning about an item string passed to `add`, `view`, or `docs`,
classify it first.

| Address                             | Scheme    | Meaning                                                           |
| ----------------------------------- | --------- | ----------------------------------------------------------------- |
| `button`                            | bare      | `@fabricator/button` (the Fabricator CLI rewrites bare names).    |
| `button` with `--upstream`          | upstream  | The upstream registry item named `button`.                        |
| `@fabricator/button`                | namespace | Item `button` from `@fabricator`.                                 |
| `@acme/button`                      | namespace | Item `button` from configured registry `@acme`.                   |
| `@acme/ui/button`                   | namespace | Item `ui/button` from configured registry `@acme`.                |
| `https://example.com/r/button.json` | url       | Built registry item JSON at that URL.                             |
| `./button.json`                     | file      | Built registry item JSON on disk.                                 |
| `acme/ui/button`                    | github    | Item `button` from the public GitHub repo `acme/ui`.              |
| `acme/ui/forms/login#main`          | github    | Item `forms/login` from GitHub repo `acme/ui` at ref `main`.      |

For namespace and GitHub addresses, slashful item names are allowed and are
item names, not file paths. Addresses ending in `.json` keep file-address
precedence, so `acme/ui/data/schema.json` is treated as a file path, not a
GitHub item address. GitHub addresses work for public `github.com` repositories
that have a root `registry.json`.

## Inspecting Items Before Installing

```bash
npx fabricator-ui@latest search date            # search @fabricator
npx fabricator-ui@latest view button            # @fabricator item metadata and files
npx fabricator-ui@latest view @acme/login-form  # any namespaced item
npx fabricator-ui@latest view owner/repo/item   # public GitHub registry item
npx fabricator-ui@latest add @acme/login-form --dry-run
npx fabricator-ui@latest add @acme/login-form --view
```

`search` covers `@fabricator` only. To search other configured registries,
use the [MCP server](./mcp.md).

Always audit third-party registry code with `--view` or `--dry-run` before
installing when the user asks for a review.

## Troubleshooting

- **Item not found / 404** → run `npx fabricator-ui@latest doctor`. A custom
  `style` id or a missing `@fabricator` entry are the usual causes.
- **Private registry 401/403** → check that the `${VAR}` in `headers` is set in
  the environment.
- **Wrong look after install** → check whether `@fabricator` is in Fabricator
  or blend mode (URL contains `/r/fabricator/` or not).
- **Local registry host** → set `FABRICATOR_REGISTRY_URL` (e.g.
  `http://localhost:4000`) for the CLI run.
