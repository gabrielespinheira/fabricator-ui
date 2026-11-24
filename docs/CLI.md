# CLI and project setup

The `fabricator-ui` CLI (`packages/cli`), the shared setup model (`packages/setup`) and the site endpoints that feed them: `/init`, `/init/app-shell` and the `/create` page. Plan: [`plans/get-started-and-cli.md`](plans/get-started-and-cli.md).

## The CLI

- It wraps `shadcn`: resolves the pinned package, runs it as a child with `process.execPath`, forwards arguments, stdio and exit codes, and adds Fabricator defaults (init URL, `@fabricator` resolution, `doctor`).
- **React registry logic stays in shadcn.** Resolution, file writing and transforms for web and React Native stay there. Native Swift/Kotlin files use the scoped adapter below, for the gap recorded in [`plans/native-platforms.md`](plans/native-platforms.md).
- **`create` and `init`'s setup flags run a plan.** `planSetup` in `packages/setup` lists the steps and `src/setup/steps.ts` does them. Each step checks whether its work is already there, so rerunning a failed command resumes it. Child output goes to a log file; `--verbose` streams it. A new choice goes in `packages/setup` first.
- **Root-file edits** (`src/mount/`) know one exact shape each and return `null` for anything else, so the CLI prints the snippet instead of guessing at someone's code.
- **Monorepos** follow `src/setup/workspace-config.ts` and `src/utils/workspace.ts`; `add` keeps an existing monorepo in step.
- **Bundle:** `dependencies` stay external; `@fabricator-ui/setup` is bundled. `scripts/build.ts` copies `templates/`, `skills/fabricator` and the root `DESIGN.md` into `dist/`.
- **Project docs.** New scaffolds get a root `README.md` with the project name, run commands and component setup, plus `DESIGN.md` and a concise Fabricator section in `AGENTS.md`. The CLI merges that section beside template guidance, such as Next.js's block. Selecting Claude Code adds a `CLAUDE.md` import. The skill and MCP server remain optional. `init` on an existing project and `agents add` preserve its root docs.
- **Scaffold formatting.** Biome and Vite+ format the generated project after its docs are written and before the first commit.
- **Agent skill.** `skills/fabricator/SKILL.md` holds the design process, the house rules and the routing. Design references sit beside it (`patterns.md`, `asking.md`, `components.md`, `states.md`, `app-shell.md`, `platforms.md`, `foundations.md`, `design-md.md`), the visual loop in `refine.md` (its judge reads `judge.md`, its page probe is `probe.js`), verified layout code in `recipes/`, API rules in `rules/`, and the CLI, MCP, registry and theming references in `setup/`. Keep it portable, with local files as the entry point, and its tables unpadded: it is read by the token. CLI examples request `fabricator-ui@latest` through the project's package runner. Render a recipe at 390 and 1440px in both themes before changing it. A new component gets a line in `components.md` (`apps/web/lib/skill-catalog.test.ts`), links are checked by `skill.test.ts`, and behaviour changes update `evals/evals.json`. The skill and `DESIGN.md` state the same rules; change both together. Keep `AGENTS.md` concise and `DESIGN.md` within one agent read (about 25,000 tokens).
- **Runtime:** Node ≥ 20.18.1, ESM, Node APIs only, so it runs the same under `npx`, `pnpm dlx`, `yarn dlx` and `bunx`.
- Bumping the pinned `shadcn` is its own change, verified by the e2e matrix.

## React package setup

`init --distribution package` installs `@fabricator-ui/react` into a Next.js App Router or Vite React app and wires its compiled CSS when the entry is recognizable. In an existing monorepo, pick a web workspace with `--cwd`. `create <name> --distribution package` scaffolds a web-only Next.js or Vite monorepo using the same package. `--look` writes app-owned CSS variables. Package setup uses Base UI and Fabricator Icons.

Use component subpaths such as `@fabricator-ui/react/button` and load `@fabricator-ui/react/styles.css` once. The package manager owns upgrades. Copy-in remains the default, including App Shell, blocks and native projects. A package-only project can set up copy-in explicitly with `init --distribution source`; an existing `components.json` continues to route `add`, `apply` and `upgrade` to the registry.

Get started exposes package setup in development. Enable it for a production build with `FABRICATOR_PACKAGE_SETUP=1` after the matching npm package and CLI pass their fresh-install checks. See the [distribution plan](plans/react-package-distribution.md) for the release checks.

## Native language projects

`fabricator-ui init --platform swiftui` and `--platform compose` create a
schema-versioned `fabricator.json` and install the renderer's foundations.
Pass component names after `init`, use `init --all`, or use `add <names>` /
`add --all` afterward. `--shell` and `--sounds` add their native modules.
These projects need neither `components.json` nor a JavaScript runtime in the
application. The default module is `FabricatorUI` or `dev.fabricator.ui`.

`src/utils/native-files.ts` validates native payloads and dependency graphs,
preserves opaque Swift/Kotlin bytes and binary font assets, checks target paths,
and plans conflicts before any writes. `--dry-run`, `--view`, `--diff`, `view`,
`diff`, `info` and toolchain-specific `doctor` work from `fabricator.json`.
Source updates require `--overwrite` when an existing file differs. `apply`
refreshes the Fabricator foundations with the same conflict checks; runtime
theme and density choices belong to the renderer's theme API.
The native module's `sourceRoot` controls its destination. Per-item `--path`
overrides and React setup flags such as `--look`, `--spinner`, custom presets,
templates and assistant setup fail explicitly rather than being ignored.

These adapters shipped as a preview in 0.9.0. To try local registry changes,
run `bun run dev` and use
`FABRICATOR_REGISTRY_URL=http://localhost:4000 bun run cli init --platform swiftui`
(or `compose`) with `--cwd` pointing to the consumer package.

Why this adapter exists: the pinned shadcn 4.22.1 installs opaque `registry:file`
Swift source in a project without React, but its universal-item shortcut excludes
`--dry-run`, `--diff` and `--view`. Those paths enter JavaScript project setup.
Its text payload also has no binary-font encoding contract. The native adapter
handles those native-only operations; React projects keep the existing installer.

Native payloads carry `schemaVersion`, `renderer`, `name`, namespaced
`registryDependencies`, and files with exact `target`, `content` and `encoding`.
They are generated by `registry:platforms`, separately from the shadcn schema.
Native manifests own source files under `registry/{swiftui,compose}`; generated
payloads cannot import from repository example apps.

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
