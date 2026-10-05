# Fabricator UI website

The Next.js app behind [fabricator-ui.com](https://fabricator-ui.com). It holds the documentation, the block and chart galleries, the `/create` preset designer, and the `@fabricator` registry served under `/r`.

## Development

From the repository root:

```bash
bun install
bun run registry:build   # once on a fresh clone
bun run dev              # http://localhost:4000
```

Set `NEXT_PUBLIC_APP_URL` (see `.env.example`) to the origin the site runs on. Absolute URLs (metadata, registry links, `/create` commands) are built from it.

## Layout

- `content/docs/**`: MDX documentation (Fumadocs).
- `registry/**`: component, block and style sources, compiled by `scripts/build-registry.mts`.
- `examples/**`: demos rendered in the docs.
- `app/**`: routes, including `/init` (the `registry:base` payload used by `fabricator-ui init`).

## Credits

Fabricator UI is built on [shadcn/ui](https://github.com/shadcn-ui/ui) by shadcn, used under the MIT license. Much of this app started as a copy of the ui.shadcn.com site at upstream commit `295a1f11`.
