# CLI and project setup

The `fabricator-ui` CLI (`packages/cli`), the shared setup model (`packages/setup`) and the site endpoints that feed them: `/init`, `/init/app-shell` and the `/create` page. Plan: [`plans/get-started-and-cli.md`](plans/get-started-and-cli.md).

## The CLI

- It wraps `shadcn`: resolves the pinned package, runs it as a child with `process.execPath`, forwards arguments, stdio and exit codes, and adds Fabricator defaults (init URL, `@fabricator` resolution, `doctor`).
- **Registry logic stays in shadcn.** Resolution, file writing and transforms are never re-implemented here. A gap is raised as an issue or a plan before code.
- **`create` and `init`'s setup flags run a plan.** `planSetup` in `packages/setup` lists the steps and `src/setup/steps.ts` does them. Each step checks whether its work is already there, so rerunning a failed command resumes it. Child output goes to a log file; `--verbose` streams it. A new choice goes in `packages/setup` first.
- **Root-file edits** (`src/mount/`) know one exact shape each and return `null` for anything else, so the CLI prints the snippet instead of guessing at someone's code.
- **Monorepos** follow `src/setup/workspace-config.ts` and `src/utils/workspace.ts`; `add` keeps an existing monorepo in step.
- **Bundle:** `dependencies` stay external; `@fabricator-ui/setup` is bundled. `scripts/build.ts` copies `templates/` and `skills/fabricator` into `dist/`.
- **Runtime:** Node ≥ 20.18.1, ESM, Node APIs only, so it runs the same under `npx`, `pnpm dlx`, `yarn dlx` and `bunx`.
- Bumping the pinned `shadcn` is its own change, verified by the e2e matrix.

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
- `apps/mobile/src/shell-options-model.ts` uses the same option names, and a test reads its command back through the endpoint's parsers.

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
