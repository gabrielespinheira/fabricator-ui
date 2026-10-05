# Contributing

Thanks for helping build Fabricator UI. The rules every change follows (human or agent) are in [`AGENTS.md`](AGENTS.md); this page covers the mechanics.

## Setup

```bash
bun install
bun run registry:build   # once on a fresh clone; generated output is gitignored
bun run dev              # website + registry on http://localhost:4000
```

## Common tasks

| Task | Command |
| --- | --- |
| Full registry build (run before committing registry changes) | `bun run registry:build` |
| Fast targeted builds while iterating | `cd apps/web && bun run registry:build --style base-nova` (also `--registry`, `--examples`, `--indexes`) |
| Lint, types, format | `bun run check` |
| Unit tests | `bun run test` |
| Compare registry output with ui.shadcn.com | `bun run test:parity` (`--styles all` for every combination) |
| CLI end-to-end tests (needs the dev server running) | `bun run test:e2e` |
| Run the local CLI against a project | `FABRICATOR_REGISTRY_URL=http://localhost:4000 bun run cli add button -c ~/my-app` |
| Import a newer upstream | `bun run sync:upstream --ref <sha\|tag>`, then `git merge upstream/shadcn` and `bun run rebrand` |

## Components

Component source lives in `apps/web/registry/bases/{base,radix,aria}`. A change to one base is mirrored to the others in the same change. Visual styling goes through `cn-*` placeholder classes resolved by the style maps in `apps/web/registry/styles`. The Fabricator design language is `style-fabricator.css`. See [`apps/web/registry/README.md`](apps/web/registry/README.md) for the build pipeline.

Docs demos live in `apps/web/examples/{base,radix,aria}` and docs pages in `apps/web/content/docs`.

## Commits and releases

- Conventional Commits with a scope: `feat(registry): add stepper`, `fix(cli): …`, `chore(upstream): sync shadcn-ui/ui@<sha>`.
- Changes to the published `fabricator-ui` package need a changeset: `bunx changeset`.
- Pull requests describe what changed, which bases and styles were touched, and include screenshots for visual changes.
