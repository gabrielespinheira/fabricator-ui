# Maintaining

Upstream syncs, pinned tools, releases and deploys. Most of this is the maintainer's job; contributors need only the toolchain notes.

## Upstream sync

- Upstream code enters only through `bun run sync:upstream --ref <sha|tag>`. It writes pristine files to the `upstream/shadcn` vendor branch and records the SHA in `upstream.lock.json`. Merge that branch into `main`; resolve conflicts in the merge commit.
- Then run `bun run rebrand`, the full `bun run registry:build` and `bun run test:parity --styles all`. The parity check applies the same rebrand rules to upstream, so it confirms everything else matches exactly.
- Port upstream's changes into every override: `git diff <old>..<new> -- apps/web/registry/bases/<base>/ui/<component>.tsx`.
- Keep Fabricator changes in new files (style maps, tokens, exclusive items, site components); give upstream-derived files the smallest edit that works. That keeps the next merge small.
- A deliberate divergence (a bug fix) goes in `scripts/parity-exceptions.json` with its reason and date. Report it upstream and remove the entry when upstream ships the fix.

## Toolchain

- `bunfig.toml` sets `linker = "hoisted"`. Isolated installs make one copy of a package per peer set (`fumadocs-core` with Zod 3 and Zod 4), which breaks type identity and caused a Fumadocs stack overflow.
- Root `overrides` pin `prettier` 3.6.2 (the registry build formats generated source; another version breaks parity), `eslint-plugin-react-hooks` 7.0.1 and `mdast-util-to-markdown` 2.1.2 to upstream's versions. Bump them only with upstream, then rerun `test:parity`.
- `turbo.json` sets `"agentGuidance": false` so `AGENTS.md` stays the only agent guidance.
- Lucide, lucide-animated and Charmed are vendored at pinned refs (`icons:sync`, `icons:animated`, `icons:files`); after a Lucide sync, bump the parity dev dependencies in `packages/icons`.

## Releases

- One version for the whole repository, in lockstep: the root `package.json`, every workspace package (the CLI, icon packages, `editor-native`, private apps and packages), the Tauri and Cargo manifests and `bun.lock`. There are no changesets and no release bot.
- `/release` (or `/release X.Y.Z`) cuts it: a version commit that writes every version file and a `## [X.Y.Z]` section at the top of [`CHANGELOG.md`](../CHANGELOG.md), the only changelog, on a `release/v*` branch with its pull request. Feature PRs never touch versions or `CHANGELOG.md`.
- CI runs `bun run release:check`, which fails when a version file is out of step or a `release/v*` branch doesn't carry its version (`bun run test:scripts` tests it).

## Deploy

After the release PR merges, run `bun run deploy` from a clean, pushed `main` (`-- --preview` for a preview). It checks versions, publishes the icon packages and `editor-native` (`release:icons`), builds the site locally and uploads it prebuilt to Vercel, then publishes the CLI to npm, tags `fabricator-ui@X.Y.Z` and creates the GitHub release from the changelog section (`release:publish`, `scripts/publish.sh`, which skips a tag or release `/release` already made). It needs `npm login` and `gh auth login`. Releases are published from the maintainer's machine, so npm shows no provenance.
