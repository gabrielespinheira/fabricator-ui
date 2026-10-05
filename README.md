# Fabricator UI

An open-source React component library you copy into your project, with a design system of its own.

- **60+ components** across Base UI, Radix and React Aria, in eight styles, plus blocks, charts and themes.
- **Open code.** Components are installed as source with the `fabricator-ui` CLI, so you own them.
- **Drop-in compatible** with existing shadcn/ui projects through the `@fabricator` registry.
- **Next.js, Vite, React Router, TanStack Start, Astro and Laravel.** React 19 and Tailwind CSS v4.

Documentation: https://fabricator-ui.com

## Quick start

```bash
# New project
npx fabricator-ui@latest init

# Add components
npx fabricator-ui@latest add button
```

## Agent skill

[`skills/fabricator`](skills/fabricator) teaches coding agents to add, compose and style Fabricator UI components with the `fabricator-ui` CLI.
Install it by copying the folder into your project's `.claude/skills/` (or `~/.claude/skills/`, or your agent's skills directory).

## Repository

| Path | What |
| --- | --- |
| `apps/web` | The website (Next.js + Fumadocs) and the component registry it serves at `/r` |
| `apps/web/registry` | Component source per base (`bases/{base,radix,aria}`) and style maps (`styles/style-*.css`) |
| `packages/cli` | The `fabricator-ui` CLI |
| `packages/tests` | End-to-end install tests |
| `scripts` | Upstream sync and parity checks |

Contributors and coding agents: read [`AGENTS.md`](AGENTS.md) first. The architecture and roadmap are in [`PLAN.md`](PLAN.md).

## Development

Requires [Bun](https://bun.sh) ≥ 1.4 and Node.js ≥ 20.18.1.

```bash
bun install
bun run registry:build   # compile the registry (needed once on a fresh clone)
bun run dev              # http://localhost:4000
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full workflow.

## License

MIT. Built on [shadcn/ui](https://github.com/shadcn-ui/ui) (MIT). See [`NOTICE.md`](NOTICE.md).
