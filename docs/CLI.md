# CLI and project setup

The `fabricator-ui` CLI (`packages/cli`), the shared setup model (`packages/setup`) and the site endpoints that feed them: `/init`, `/init/app-shell` and the `/create` page. Plan: [`plans/get-started-and-cli.md`](plans/get-started-and-cli.md).

## The CLI

- It wraps `shadcn`: resolves the pinned package, runs it as a child with `process.execPath`, forwards arguments, stdio and exit codes, and adds Fabricator defaults (init URL, `@fabricator` resolution, `doctor`).
- **React registry logic stays in shadcn.** Resolution, file writing and transforms for web and React Native stay there.
- **`create` and `init`'s setup flags run a plan.** `planSetup` in `packages/setup` lists the steps and `src/setup/steps.ts` does them. Each step checks whether its work is already there, so rerunning a failed command resumes it. Child output goes to a log file; `--verbose` streams it. A new choice goes in `packages/setup` first.
- **Root-file edits** (`src/mount/`) know one exact shape each and return `null` for anything else, so the CLI prints the snippet instead of guessing at someone's code.
- **Monorepos** follow `src/setup/workspace-config.ts` and `src/utils/workspace.ts`; `add` keeps an existing monorepo in step.
- **Bundle:** `dependencies` stay external; `@fabricator-ui/setup` is bundled. `scripts/build.ts` copies `templates/`, `skills/fabricator` and the root `DESIGN.md` into `dist/`.
- **Project docs.** New scaffolds get a root `README.md` with the project name, run commands and component setup, plus `DESIGN.md` and a concise Fabricator section in `AGENTS.md`. The CLI merges that section beside template guidance, such as Next.js's block. Selecting Claude Code adds a `CLAUDE.md` import. The skill and MCP server remain optional. `init` on an existing project and `agents add` preserve its root docs.
- **Scaffold formatting.** Biome and Vite+ format the generated project after its docs are written and before the first commit.
- **Agent skill.** `skills/fabricator/SKILL.md` holds the design process, the house rules and the routing. Design references sit beside it (`patterns.md`, `asking.md`, `components.md`, `states.md`, `app-shell.md`, `platforms.md`, `foundations.md`, `design-md.md`), the visual loop in `refine.md` (its judge reads `judge.md`, its page probe is `probe.js`), verified layout code in `recipes/`, API rules in `rules/`, and the CLI, MCP, registry and theming references in `setup/`. Keep it portable, with local files as the entry point, and its tables unpadded: it is read by the token. CLI examples request `fabricator-ui@latest` through the project's package runner. Render a recipe at 390 and 1440px in both themes before changing it. A new component gets a line in `components.md` (`apps/web/lib/skill-catalog.test.ts`), links are checked by `skill.test.ts`, and behaviour changes update `evals/evals.json`. The skill and `DESIGN.md` state the same rules; change both together. Keep `AGENTS.md` concise and `DESIGN.md` within one agent read (about 25,000 tokens).
- **Runtime:** Node ≥ 20.18.1, ESM, Node APIs only, so it runs the same under `npx`, `pnpm dlx`, `yarn dlx` and `bunx`.
- Bumping the pinned `shadcn` is its own change, verified by the e2e matrix.

## Tauri mobile

`create --mobile-runtime tauri` creates a Vite monorepo with the renderer in `apps/web` and a Tauri host in `apps/mobile`. It defaults to Vite, accepts `--no-web` and can run alongside either desktop host. It works with both source and package installs. `--mobile` keeps its Expo behavior.

`apps add mobile tauri` adds the host to an existing Fabricator React + Vite monorepo. It adds a Vite profile on port 1422 and builds into `apps/mobile/dist`. Run `init:mobile:ios` or `init:mobile:android` from the root after setting up the platform toolchain. Then run `dev:mobile:ios`, `dev:mobile:ipad` or `dev:mobile:android`. See [platforms](PLATFORMS.md#tauri-mobile) and the [implementation plan](plans/tauri-mobile.md).

The Get started selector is available in development. Set `FABRICATOR_TAURI_MOBILE_SETUP=1` for production after the matching CLI is published and its fresh-install checks pass.

## React package setup

`init --distribution package` installs `@fabricator-ui/react` into a Next.js App Router or Vite React app and wires its compiled CSS when the entry is recognizable. In an existing monorepo, pick a web workspace with `--cwd`. `create <name> --distribution package` scaffolds a Next.js or Vite renderer for web and desktop, an Expo app, or both. Electron and Tauri share `@fabricator-ui/react` from `apps/web`. Expo gets `@fabricator-ui/react-native`, a Uniwind stylesheet and the packaged `FabricatorRoot` in `apps/mobile`. Existing supported Expo apps can also opt in with `init --distribution package`. `--look` writes app-owned CSS variables. Package setup uses Base UI and Fabricator Icons.

Use component subpaths such as `@fabricator-ui/react/button` and load `@fabricator-ui/react/styles.css` once. The package manager owns upgrades. Copy-in remains the default, including App Shell, blocks and the wider registry catalog. A package-only project can set up copy-in explicitly with `init --distribution source`; an existing `components.json` continues to route `add`, `apply` and `upgrade` to the registry.

Get started exposes package setup in development. Enable it for a production build with `FABRICATOR_PACKAGE_SETUP=1` after the matching npm package and CLI pass their fresh-install checks. See the [distribution plan](plans/react-package-distribution.md) for the release checks.

## `/init`

`app/(app)/(create)/init/route.ts` returns the `registry:base` payload (`registry/fabricator-init.ts`).

- `config.registries` writes `@fabricator` into the project's `components.json`; `config.style` is always a valid upstream id (contract 2).
- Defaults to Fabricator Icons. `iconLibrary=<name>` or a shadcn preset code opts out (`usesFabricatorIcons`); `config.iconLibrary` stays a real shadcn library either way.
- Takes a look (`registry/fabricator/look.ts`): `surface`, the six colour roles as `<hue>_<chroma>`, `shape=pill`, `motion=<speed>`, `density=<compact|spacious>`, layered on the Fabricator palette.

## `/init/app-shell`

`app/(app)/(create)/init/app-shell/route.ts` returns a `registry:block` with an App Shell written from the option cards' choices (`app/(view)/app-shell/_lib/app-shell-source.ts`), using only the parts' shared API so one source fits every base.

- A new option or part gets a branch in `app-shell-source.ts` and `app-shell-source-native.ts`, and a place in the layout in `registry/fabricator/app-shell-options.ts` (everywhere, then Desktop, then Mobile); a test fails until it has one.
- `framework=<name>` adds `app-shell-root.tsx`, the router adapter (`app-shell-root-source.ts`), and picks the storage. `desktop=<electron|tauri>` uses the `desktop-window` item. `platform=native` serves the React Native version.
- A card inside a running shell passes `platform` and shows only what that shell can preview; `/create` passes none.
- The cards' command names `app-shell` as well as the URL, because `add` ensures the `@fabricator` registry only when a Fabricator name is present.
- `demos/react-native/src/shell-options-model.ts` uses the same option names, and a test reads its command back through the endpoint's parsers.

## `/create`

The Get started page (`app/(app)/(create)/create/`): project, look, App Shell and extras on the left, the result and the one install command on the right.

- Choices are URL state (`setupParsers` in `(create)/lib/setup.ts`, `playgroundParsers` for the shell); the look lives in the site settings.
- `toProjectSetup` turns them into a `@fabricator-ui/setup` setup: `toCliArgs` writes the command, `planSetup` the steps, `getAgentPrompt` the prompt for an AI agent to finish setup. A new manual step after the command goes in the prompt too.
- The shell preview is an iframe (`/create/preview`, `(create)/lib/shell-preview.ts`) drawn at the size the project leads with (`getPreviewSize`) and scaled into the column (`getPreviewLayout`).
- What the Shell step offers follows the project: `getHiddenShellOptions`, `getShellOptionNotes`.
- `packages/cli/src/setup/flags.test.ts` parses every written command with the real program, so the site and the flags can't drift.

## Done when

- [ ] `bun run test:e2e` passes when install behaviour, the CLI or `/init` changed. It needs `bun run dev` running and `bun run cli:build`; `--only <scenarios>` and `--keep` narrow and keep runs.
- [ ] The local CLI works against the local registry: `FABRICATOR_REGISTRY_URL=http://localhost:4000 bun run cli <command> -c <app>`.
- [ ] Generated Expo and desktop apps were checked by hand when their templates or setup changed.
