# Contributing

Thanks for helping build Fabricator UI. The rules every change follows (human or agent) are in [`AGENTS.md`](AGENTS.md), with the details per area in [`docs/`](docs/); this page covers the mechanics.

## Setup

Requires [Bun](https://bun.sh) 1.4 or later and Node.js 20.18.1 or later.

```bash
bun install
bun install --cwd apps/mobile   # once: the web tests read the Expo example's tsconfig
bun run registry:build          # once on a fresh clone; generated output is gitignored
bun run dev                     # website + registry on http://localhost:4000
```

## Common tasks

| Task                                                           | Command                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Full registry build (run before committing registry changes)   | `bun run registry:build`                                                                                       |
| Fast targeted builds while iterating                           | `cd apps/web && bun run registry:build --style base-fabricator` (also `--registry`, `--examples`, `--indexes`) |
| Lint, types, format                                            | `bun run check`                                                                                                |
| Unit tests                                                     | `bun run test`                                                                                                 |
| Compare registry output with upstream                          | `bun run test:parity` (`--styles all` for every combination)                                                   |
| CLI end-to-end tests (dev server running, `bun run cli:build`) | `bun run test:e2e`                                                                                             |
| Run the local CLI against a project                            | `FABRICATOR_REGISTRY_URL=http://localhost:4000 bun run cli add button -c ~/my-app`                             |
| Website example                                                | `bun run example:web`                                                                                          |
| Desktop examples                                               | `bun run example:desktop-electron`, `bun run example:desktop-tauri`                                            |
| React Native example on the iOS Simulator                      | `bun run example:mobile-reactnative`                                                                           |
| React Native example on iPad or Android                        | `bun run example:mobile-reactnative:ipad`, `bun run example:mobile-reactnative:android`                        |

Example commands use `example:<platform>-<framework>[:device|check]`. The existing
`desktop`, `desktop:tauri` and `mobile:*` commands remain aliases. Native-language
and Tauri mobile commands, prerequisites and verification are in
[`docs/PLATFORMS.md`](docs/PLATFORMS.md#swiftui-kotlin-compose-and-tauri-mobile).
Their full qualification checklist is
[`docs/plans/native-platforms.md`](docs/plans/native-platforms.md).

Each Vitest config puts its filesystem module cache under that package's own
`node_modules`. Separate Turbo test processes must not clear a shared cache when
the root lockfile changes.

## Where to start

| You're changing                  | Read                                                   |
| -------------------------------- | ------------------------------------------------------ |
| A component, example or block    | [`COMPONENTS.md`](COMPONENTS.md)                       |
| A new component's group          | [`docs/COMPONENT-GROUPS.md`](docs/COMPONENT-GROUPS.md) |
| A look, token, motion or density | [`docs/STYLES.md`](docs/STYLES.md)                     |
| React Native, desktop or icons   | [`docs/PLATFORMS.md`](docs/PLATFORMS.md)               |
| Registry items or the build      | [`docs/REGISTRY.md`](docs/REGISTRY.md)                 |
| The CLI or the Get started page  | [`docs/CLI.md`](docs/CLI.md)                           |
| The website                      | [`docs/WEBSITE.md`](docs/WEBSITE.md)                   |
| A screen or demo's design        | [`DESIGN.md`](DESIGN.md)                               |

## Commits and releases

- Conventional Commits with a scope: `feat(registry): add stepper`, `fix(cli): …`, `chore(upstream): sync shadcn-ui/ui@<sha>`.
- Every package shares one version. Don't change versions or `CHANGELOG.md` in a feature pull request; the maintainer cuts releases with `/release` ([`docs/MAINTAINING.md`](docs/MAINTAINING.md)).
- Pull requests describe what changed, which bases and styles were touched, and include screenshots for visual changes.
- Upload screenshots, recordings and visual review sheets to GitHub attachments (`gh pr comment <pr> --attach <file>`) and use their URLs in Markdown. Record the URL and original file's SHA-256 in [`docs/screenshot-attachments.json`](docs/screenshot-attachments.json). Keep session captures local and ignored; verify anonymous downloads before removing any tracked capture or changing its consumers. Product artwork, icons and diagrams remain source assets.
