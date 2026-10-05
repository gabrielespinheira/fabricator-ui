# Fabricator MCP Server

The Fabricator CLI includes an MCP server that lets AI assistants search, browse, view, and install items from `@fabricator` and any other registry configured in `components.json`.

---

## Setup

```bash
npx fabricator-ui@latest mcp                         # start the MCP server (stdio)
npx fabricator-ui@latest mcp init --client claude    # write config for your editor
```

`mcp init --client` accepts `claude`, `cursor`, `vscode`, `codex`, or `opencode` (it prompts when omitted). It also adds the `@fabricator` registry to `components.json` when missing. The server is registered under the key `fabricator`.

Editor config files:

| Editor      | `--client` | Config file                     |
| ----------- | ---------- | ------------------------------- |
| Claude Code | `claude`   | `.mcp.json`                     |
| Cursor      | `cursor`   | `.cursor/mcp.json`              |
| VS Code     | `vscode`   | `.vscode/mcp.json`              |
| OpenCode    | `opencode` | `opencode.json`                 |
| Codex       | `codex`    | `~/.codex/config.toml` (manual) |

Manual config (Claude Code / Cursor):

```json
{
  "mcpServers": {
    "fabricator": {
      "command": "npx",
      "args": ["fabricator-ui@latest", "mcp"]
    }
  }
}
```

VS Code uses `"servers"` instead of `"mcpServers"`. Codex:

```toml
[mcp_servers.fabricator]
command = "npx"
args = ["fabricator-ui@latest", "mcp"]
```

Restart the editor after changing the config. In Claude Code, `/mcp` shows whether the `fabricator` server is connected.

---

## Tools

> **Tip:** MCP tools handle registry operations (search, view, install). For project configuration (aliases, framework, Tailwind version), use `npx fabricator-ui@latest info` — there is no MCP equivalent.

Tool names are prefixed with the server key, e.g. `fabricator:search_items_in_registries`.

### `get_project_registries`

Returns registry names from `components.json`. Errors if no `components.json` exists.

**Input:** none

### `list_items_in_registries`

Lists all items from one or more registries. Registries can be configured
namespaces such as `@fabricator` or `@acme`, public GitHub sources such as
`owner/repo`, or registry catalog URLs. Omit `registries` to list from every
registry configured in `components.json`.

**Input:** `registries` (string[], optional — omit for all configured), `types` (string[], optional — e.g. `["ui", "block"]`), `limit` (number, optional, defaults to 100), `offset` (number, optional)

### `search_items_in_registries`

Fuzzy search across registries. Omit `registries` to search every registry
configured in `components.json` — e.g. "find me a hero" across all configured
registries. Unlike the `search` CLI command, this covers registries other than
`@fabricator`.

**Input:** `registries` (string[], optional — omit for all configured), `query` (string), `types` (string[], optional — e.g. `["ui", "block"]`), `limit` (number, optional, defaults to 100), `offset` (number, optional)

### `view_items_in_registries`

View item details including full file contents.

**Input:** `items` (string[]) — e.g.
`["@fabricator/button", "@fabricator/card", "owner/repo/item"]`

### `get_item_examples_from_registries`

Find usage examples and demos with source code. Omit `registries` to search
every registry configured in `components.json`.

**Input:** `registries` (string[], optional — omit for all configured), `query` (string) — e.g. `"accordion-example"`, `"button example"`

### `get_add_command_for_items`

Returns the CLI install command. Prefer running it with the Fabricator CLI:
`npx fabricator-ui@latest add @fabricator/<name>`.

**Input:** `items` (string[]) — e.g. `["@fabricator/button"]`

### `get_audit_checklist`

Returns a checklist for verifying components (imports, deps, lint, TypeScript).

**Input:** none

---

## Configuring Registries

The server reads `registries` from `components.json`. Make sure `@fabricator` is
there (`npx fabricator-ui@latest init` or `mcp init` adds it). Public GitHub
registries can be used directly as `owner/repo` sources without configuration.

```json
{
  "registries": {
    "@fabricator": "https://fabricator-ui.com/r/fabricator/{style}/{name}.json",
    "@acme": "https://acme.com/r/{name}.json",
    "@private": {
      "url": "https://private.com/r/{name}.json",
      "headers": { "Authorization": "Bearer ${MY_TOKEN}" }
    }
  }
}
```

- Names must start with `@`.
- URLs must contain `{name}`.
- `${VAR}` references are resolved from environment variables.

See [registry.md](./registry.md) for blend vs Fabricator mode.

---

## Troubleshooting

- **Not responding** → check the config and restart the client; confirm `npx fabricator-ui@latest --version` runs.
- **No tools or prompts** → clear the npx cache (`npx clear-npx-cache`) and re-enable the server.
- **Items not loading** → check registry URLs in `components.json`, env vars for private registries, and run `npx fabricator-ui@latest doctor`.
