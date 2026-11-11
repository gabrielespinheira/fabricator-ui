# AGENTS.md

Fabricator UI is an open-source React component library for web, React Native and desktop. People install it as copy-in source through the shadcn CLI. It has its own design system and stays fully compatible with shadcn/ui. This repo holds the registry, the `fabricator-ui` CLI, Fabricator Icons and the website (fabricator-ui.vercel.app) that documents and serves the registry. These rules bind every agent and contributor. `CLAUDE.md` imports this file. When a convention changes, update the doc that owns it in the same change.

## Read before you work

| When you                                                       | Read                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| Design a screen, demo, block or site page                      | [`DESIGN.md`](DESIGN.md)                               |
| Write or change a component, example or block                  | [`docs/COMPONENTS.md`](docs/COMPONENTS.md)             |
| Add a component, or place one in the docs sidebar and gallery  | [`docs/COMPONENT-GROUPS.md`](docs/COMPONENT-GROUPS.md) |
| Change a look, token, motion, density or colour                | [`docs/STYLES.md`](docs/STYLES.md)                     |
| Touch React Native, desktop, icons or `editor-native`          | [`docs/PLATFORMS.md`](docs/PLATFORMS.md)               |
| Declare an item, run the registry build, touch generated files | [`docs/REGISTRY.md`](docs/REGISTRY.md)                 |
| Touch the CLI, `/init`, `/create` or project setup             | [`docs/CLI.md`](docs/CLI.md)                           |
| Work on the website outside the registry                       | [`docs/WEBSITE.md`](docs/WEBSITE.md)                   |
| Sync upstream, bump a pinned tool, release or deploy           | [`docs/MAINTAINING.md`](docs/MAINTAINING.md)           |
| Set up the repo, run checks, open a pull request               | [`CONTRIBUTING.md`](CONTRIBUTING.md)                   |
| Need the public pitch or the user-facing CLI                   | [`README.md`](README.md)                               |
| Need what shipped in a version                                 | [`CHANGELOG.md`](CHANGELOG.md)                         |
| Plan or resume a large feature                                 | [`docs/plans/`](docs/plans/), one file per feature     |

Scripts live in the root `package.json`. On a fresh clone: `bun install`, `bun install --cwd apps/mobile`, `bun run registry:build`, then `bun run dev` (port 4000).

## Layout

| Path                     | What                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `apps/web`               | The website and the registry it serves (`registry/`, `examples/`, `content/docs/`)    |
| `apps/desktop`           | Electron and Tauri example around the site's `/desktop` route                         |
| `apps/mobile`            | Private Expo example; its own install, outside the bun workspace                      |
| `packages/cli`           | The `fabricator-ui` CLI                                                               |
| `packages/setup`         | Private, pure: one project setup, its command, plan and agent prompt                  |
| `packages/icons*`        | Fabricator Icons: `icons-core` sources, `icons`, `icons-react-native`, `icons-static` |
| `packages/editor-native` | The Expo module the native `editor` draws with                                        |
| `packages/tests`         | CLI end-to-end tests against real templates                                           |
| `skills/fabricator`      | Agent skill for projects that use the library                                         |
| `tmp/`                   | Personal experiments, gitignored, outside the product                                 |

## Vocabulary

- **Upstream:** `shadcn-ui/ui` at the SHA in `upstream.lock.json`.
- **Base:** the primitive library a web component is built on: `base` (Base UI, primary), `radix`, `aria` (React Aria Components). Each has its own source tree.
- **Style:** a visual language compiled in at build time. Only `fabricator` ships. The 8 upstream styles (`nova`, `vega`, …) compile for the parity check alone. Full id: `<base>-<style>`.
- **Placeholder:** a `cn-*` class in source (`cn-button-variant-outline`) that the build replaces with the Tailwind classes in a **style map** (`registry/styles/…`).
- **Superset:** a replacement keeps every upstream name, prop, variant, export and `data-slot`, and only adds.
- **Native tree:** `apps/web/registry/native/`, the React Native version of every item under the same names. Not a base.
- **Parity:** across bases (same behaviour and look), with upstream (byte-identical output in upstream styles), across platforms (native matches web's API).

## The contract

A change that breaks one of these is a bug, even if everything builds. Code comments cite them by number.

1. **Superset.** Replacements keep the upstream item name, target path, exports, props, variant names and `data-slot`s. Additions are optional.
2. **Valid shadcn style ids only.** A `components.json` we write has `"style": "<base>-<upstream style>"`. The Fabricator look comes from the `/r/fabricator/` registry URL. A custom id would 404 every bare name.
3. **Namespaced dependencies.** `registryDependencies` name our items `@fabricator/<name>`. A bare name installs upstream's item, on purpose only.
4. **Token contract.** Every shadcn CSS variable keeps its name and meaning (`background`, `primary`, `border`, `ring`, `radius`, `chart-*`, `sidebar-*`, `font-*`, …). Fabricator tokens get new names and ship in the `cssVars` of the items that use them.
5. **Base parity.** A change in one base tree lands in all of them in the same change.
6. **Generated output is rebuilt, never hand-edited.** [`docs/REGISTRY.md`](docs/REGISTRY.md) lists what is generated.
7. **Bun is the toolchain.** `bun install`, `bun run`, `bunx --bun`, one `bun.lock`. Only `scripts/publish.sh` uses `npm publish`.
8. **Attribution.** Upstream-derived files stay MIT, with shadcn's copyright in `LICENSE.md` and `NOTICE.md`.
9. **Platform parity.** A web change to a component's API, variants or look lands in the native tree in the same change, or adds a dated entry to `registry/native/parity-exceptions.json`. Native registry source never imports from `apps/mobile`.

## Brand

Write "Fabricator UI", "the CLI" (`npx fabricator-ui@latest …`), "the registry" and "styles". The shadcn name appears only in attribution (`LICENSE.md`, `NOTICE.md`, READMEs, the docs' Acknowledgements, the first changelog entry), compatibility notes (docs introduction, Registry page, one line on the CLI page and CLI README), technical identifiers (`shadcn/tailwind.css`, `@shadcn/react`, `shadcn migrate`) and internal docs and code. Demo content uses the identity in `scripts/rebrand.ts`; CI runs `bun run rebrand --check`.

## Definition of done

Report each applicable line as passed, or name what wasn't run and why.

- [ ] `bun run check` and `bun run test` pass.
- [ ] Authored registry changes are followed by a full `bun run registry:build`; committed indexes are updated and no gitignored output is staged.
- [ ] The contract holds, and the area doc's own checks pass (each doc ends with a **Done when** list).
- [ ] UI was checked in the running site: light and dark, keyboard only, phone and desktop widths, axe clean on touched pages.
- [ ] User-visible registry changes have an entry in `apps/web/content/docs/changelog/`. Versions and `CHANGELOG.md` change only in a `/release` commit.
- [ ] Docs that own a changed convention are updated.

## Git

- Conventional Commits with a scope: `feat(registry): add stepper`. Types: `feat`, `fix`, `refactor`, `docs`, `build`, `test`, `ci`, `chore`. Scopes: `registry`, `styles`, `tokens`, `native`, `icons`, `web`, `docs`, `cli`, `setup`, `desktop`, `mobile`, `tests`, `release`, `upstream`, `deps`.
- One logical change per commit; a component with its examples and docs is one change.
- Topic branches reach `main` through a pull request with green CI. The PR says what changed and why, the bases and styles touched, screenshots for visual changes, and the definition of done.
