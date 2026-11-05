# Get Started and CLI: plan

Status: built (2026-11-04), for v0.5.0 on `release/v0.5.0`. Not committed. §11 lists where the build differs from this plan and what wasn't checked. It extends D2, D14 and D16; `PLAN.md` has the changes.

Every setup on `/create` becomes one command, whatever the framework, apps and assistants. The page is rebuilt around that command, and the CLI gains the orchestration that makes it possible: scaffolding Expo and desktop apps, mounting what it installs, and configuring several AI assistants at once.

```bash
# A new project, every default
npx fabricator-ui@latest create my-app --yes

# A new monorepo: web, mobile and desktop, one look, two assistants
npx fabricator-ui@latest create my-app -t next --mobile --desktop tauri \
  --agents claude,codex --look "primary=260_0.2,shape=pill" --yes

# An existing project
npx fabricator-ui@latest init --shell --sounds --agents claude,codex --yes
```

---

## 1. Where things stand

Steps the page shows today, from running `buildSetupCommands`:

| Setup                                          | Steps | Manual edits |
| ---------------------------------------------- | ----- | ------------ |
| Next.js, defaults                              | 4     | 0            |
| Next.js, sounds on (the default you asked for) | 6     | 1            |
| Laravel, sounds on                             | 7     | 1            |
| Monorepo, every component, sounds, Claude Code | 9     | 1            |
| Expo, sounds, Claude Code                      | 9     | 2            |

Each extra assistant would add two more. The table also undercounts: the App Shell step hides a third kind of manual edit in its description ("Wrap your routes in it and pass it the pathname").

**So turning sounds on by default without CLI work makes every project worse.** The default and the mount have to ship in a known order (§7).

What else the code shows:

- **Installs repeat.** Each `fabricator-ui add` spawns `shadcn add`, which runs its own package install. `shadcn add --help` (4.22.1) lists no flag to skip it. A new project also clones `shadcn-ui/ui` (`git clone --depth 1 --filter=blob:none --sparse`) on every scaffold, from `main`, unpinned.
- **Monorepos don't build today.** Found in Phase 0. `add -c apps/web` writes libs and hooks to `apps/web`, while the components in `packages/ui` import them from `@workspace/ui`, so `dropdown-menu`, `tabs`, `command`, `context-menu`, `sidebar` and `app-shell` all fail with "Module not found". There's no monorepo scenario in the e2e suite, which is how this got through. §3.5 has the fix.
- **Site and CLI duplicate logic.** `setup.ts` says its `buildInitUrl` "mirrors the CLI's own", and `AGENTS.md` asks people to keep them in step by hand.
- **`add` fails at a monorepo root.** It requires `components.json` in the current folder, so the page appends `-c apps/web` to every command.
- **`init --yes` drops a look.** In a project with `components.json`, `--yes` picks "registry only", whatever `-p` says.
- **`mcp init` takes one client, and for Codex it only prints TOML.** Trusted projects can now hold MCP servers in `.codex/config.toml` ([openai/codex, issue 13056](https://github.com/openai/codex/issues/13056), closed 2026-08-05), so the CLI can write it.
- **`npx skills` needs Node 22.20+**, while the CLI declares `>=20.18.1`, and it collects telemetry unless disabled. `PLAN.md` §7.3 says ours has none.
- **The rail is inconsistent.** Look and Shell keep controls in the left rail; Project, Extras and Install put them in the right column, with nothing to look at.

### Logos

Every assistant shows its provider's logo, from Fabricator Icons (decided 2026-11-04, §8.1):

| Assistant      | Mark       | State                                                                                                                                                                                                                                           |
| -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code    | `claude`   | Already shipped.                                                                                                                                                                                                                                |
| Codex          | `openai`   | Added. D16 held it, and Gabs released the hold. It's the older knot from SharpOS's set: the current Blossom logo is behind an "I agree to the usage terms" checkbox on [OpenAI's page](https://openai.com/brand/).                              |
| Cursor         | `cursor`   | Added, from Simple Icons 16.36.0. [cursor.com/brand](https://cursor.com/brand) publishes a kit and states no restriction.                                                                                                                       |
| OpenCode       | `opencode` | Added, from Simple Icons 16.36.0. [opencode.ai/brand](https://opencode.ai/brand) publishes SVGs and states no terms.                                                                                                                            |
| GitHub Copilot | `github`   | Already shipped. [GitHub's terms](https://github.com/logos) allow a permitted logo to show an integration, and say Copilot has had no standalone logo since 2025. The card is relabelled from "VS Code (Copilot)". The VS Code mark stays held. |

Brands went from 140 shipped and 12 held to 143 and 11. Checked on `/icons`, and `icons:check` and the icon tests pass.

---

## 2. The page

### 2.1 Layout

Controls live in the left rail on every step. The right side always shows the result of those choices. The command sits under both, live, on every step.

```
┌ Rail ──────────────────┐ ┌ Result ─────────────────────────────┐
│ Get started            │ │ Project  file tree of what's created│
│ Project Look Shell     │ │ Look     the real App Shell         │
│ Extras Install         │ │ Shell    the real App Shell         │
│                        │ │ Extras   tree and what gets added   │
│ Choices for this step  │ │ Install  command, plan, next steps  │
│ Back            Next   │ │                                     │
└────────────────────────┘ └─────────────────────────────────────┘
┌ $ npx fabricator-ui@latest create my-app --mobile …  bun ▾  Copy┐
└─────────────────────────────────────────────────────────────────┘
```

- **Command dock:** sticky at the bottom, with the package manager switch and Copy. "Every step has a default, skip ahead" becomes literally true: you can copy at any moment. On phones it is one line that scrolls with `scroll-fade`, and Copy stays in reach.
- **Rail width:** grows from `lg:w-80` to about `lg:w-96`, so cards fit. Framework cards get a compact form inside it.
- **Preview:** the iframe stays mounted across steps, as today, so returning doesn't reload it.

### 2.2 Step order

`Project → Look → Shell → Extras → Install`. `step` defaults to `project`. Old links with `step=look` keep working.

### 2.3 Project step

1. **Where are you starting?** Three cards: _A new project_, _A new monorepo_, _An existing project_. The Monorepo switch goes away.
2. **New project or monorepo:** project name, framework, primitives.
3. **Monorepo only, Apps:**
   - Web: always on, shows the framework. Desktop needs a frontend to wrap, and a mobile-only monorepo is just _A new project_ with Expo.
   - Mobile: a card with the Expo logo, "React Native and Expo, in apps/mobile".
   - Desktop: a card with a None / Electron / Tauri choice, logos from Fabricator Icons, "A window around apps/web".
4. **Existing project:** primitives, plus today's note that the CLI detects the framework.

`normalizeSetup` removes impossible states, so the UI and the command can't disagree: Expo and Laravel leave the framework list in a monorepo (Expo is the Mobile card, and shadcn has no Laravel monorepo template), and Mobile and Desktop clear when you leave monorepo.

The right side shows the tree, updated with each choice:

```
my-app/
├─ apps/
│  ├─ web/       Next.js, Base UI
│  ├─ mobile/    Expo SDK 58, React Native
│  └─ desktop/   Tauri window around apps/web
└─ packages/
   └─ ui/        web components
```

### 2.4 Look

Same controls and iframe as today.

### 2.5 The App Shell step

One set of options, chosen once, generates the shell for every app in the project. What the step offers follows the project.

| Project               | Preview                                                                                         | Offers                                                          | Installs                                           |
| --------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Web only              | Browser, Phone width                                                                            | Sidebar, Main, Right panel                                      | `app-shell-layout.tsx` in the web app              |
| Monorepo with Desktop | Browser, macOS, Windows, Phone width                                                            | The above, plus Titlebar tabs and a Window section              | The same file, finding its window at runtime       |
| Monorepo with Mobile  | Browser, Phone                                                                                  | The same as web only                                            | The web file, plus a native `app-shell-layout.tsx` |
| Monorepo with both    | Browser, macOS, Windows, Phone                                                                  | Everything                                                      | Both files                                         |
| Expo only             | Phone                                                                                           | Everything Mobile honours                                       | The native file                                    |
| Existing project      | Follows what the CLI will detect: Browser and Phone width, since the page can't see the project | Web only's set. The CLI writes the native file if it finds Expo | Decided by the CLI                                 |

Each option, by where it takes effect. An option shows when any app in the project honours it, and says so when some don't ("Web and desktop only"):

| Option                                                                                                                  | Web            | Desktop                      | Mobile                 |
| ----------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------- | ---------------------- |
| Style, Collapse, Workspaces, Account, Reorder, Customize, Tabs: Page, Content width, Breadcrumb, Actions, Status, Panel | Yes            | Yes                          | Yes                    |
| Peek                                                                                                                    | Yes            | Yes                          | No: it needs a pointer |
| Sidebar on phones, Panel on phones, Tab bar                                                                             | At phone width | No: `minWidth` keeps it wide | Yes                    |
| Tabs: Titlebar                                                                                                          | No             | Yes                          | No                     |
| Glass                                                                                                                   | No             | macOS only, today            | No                     |
| Runs in, Fullscreen                                                                                                     | Preview only   | Preview only                 | No                     |

**How it's built.** `getShellOptionSupport(setup)` is pure and tested, and returns the hidden set for the `hidden` prop `AppShellOptionFields` already has, which `/desktop` uses today. `/app-shell` keeps every option. `normalizeSetup` clears what no longer applies: leaving Desktop resets `window`, `fullscreen` and `tabs=titlebar`. `Reset` counts only what the step shows.

**Defaults that follow the project.** Turning Mobile on, or picking Expo, sets `bottomNav` once, because the native shell's default is a tab bar. Turning it back off leaves the person's choice alone.

**Preview.** The size switch sits above the iframe, as URL state, offering only what the project has. The iframe gets the desktop runtime, so it draws what that runtime really does: Tauri keeps its own title bar on Windows and can't move the macOS lights after launch, so its titlebar row stays tall (`getDesktopWindow` already encodes this). Phone is the web shell at phone width, on the same model and options as the native one; the page says so, because it isn't React Native rendering.

#### Connecting the shell to the install

Reading the code end to end found these. The first two are live bugs, checked by generating the source:

| Today                                                                                                                                                                    | Fix                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"Runs in: macOS" reaches plain web projects.** The Shell step shows it for every project, and `window=macos` writes fixed macOS controls and drops the sidebar toggle. | Hidden unless Desktop is on, and a preview choice on `/create`: `toCliArgs` never sends `window` or `fullscreen`. `/app-shell` keeps it for people with their own desktop app.                                                                         |
| **"Tab bar on phones" installs an empty bar.** The generated nav has no `mobile: "tab"` items, and `getMobileTabItems` returns nothing. The preview's data has them.     | The generator marks Home, Inbox and Projects. A test asserts tab items whenever `bottomNav` is on.                                                                                                                                                     |
| **A desktop project needs both platforms.** `window` is fixed at install, so one file can't serve macOS, Windows and a browser.                                          | `/init/app-shell?desktop=<runtime>` writes the runtime version, on the `desktop-window` item (§3.5): the toggle shows only outside a window, and storage is local.                                                                                     |
| **Shell choices don't reach the window.** Tauri's lights can't move, and glass needs the window created transparent.                                                     | `scaffold-desktop` takes `tabs` and `glass`: light position and transparency in `tauri.conf.json` and `electron/main.mjs`, from the same `getTrafficLights`.                                                                                           |
| **`Expo projects skip the shell`, and the copy is out of date.** `registry/native` now has `app-shell`, `app-nav`, `sidebar`, `workspace-switcher` and `user-menu`.      | A new `app-shell-source-native.ts` behind `/init/app-shell?platform=native`, like `/init`. It reuses the options and nav data; its views are `View` and `Text`, it imports `@fabricator-ui/icons-react-native`, and it navigates through `onNavigate`. |
| **`add app-shell <url>` in an Expo project writes web code.** `add` forwards the URL as given.                                                                           | `add` adds `platform=native` when `isReactNativeProject` says so. That also makes `--app web,mobile` work with one URL.                                                                                                                                |
| **The nav's links lead nowhere.** `/inbox`, `/projects`, `/team` and `/settings` don't exist in a new project.                                                           | `create` writes a placeholder page for each, per framework, so the first run works. It skips any that exist. Vite has no router, so its pages stay client state.                                                                                       |
| **Every link reloads the page.** `renderLink` defaults to `<a>`.                                                                                                         | The per-framework adapter (§3.4) passes the router's link along with `pathname`.                                                                                                                                                                       |
| **Storage ignores the framework.** The docs say apps without a server need `createLocalStorage()`, and the generator only knows about windows.                           | `framework` picks it: local for Vite and Astro, cookies elsewhere. Next's adapter reads the cookie on the server, as the docs show, so the sidebar doesn't jump.                                                                                       |
| **"Add to my project" off leaves everything live.** The options keep working on a shell that won't install.                                                              | The options disable, the preview stays for judging the look, and the command drops the shell.                                                                                                                                                          |
| **The preview differs from the install.** Its panel starts closed and the generated one open, and its dashboard isn't installed.                                         | The generated panel starts closed too. A caption says the dashboard is sample content and the project starts with an empty Home.                                                                                                                       |
| **Adding an app later.** `apps add desktop` meets a layout the person may have edited.                                                                                   | A mount transform adds the hook and `window={shellWindow}` when the `AppShell` tag matches. Otherwise it prints the snippet.                                                                                                                           |

### 2.6 Extras

- **Sounds:** on by default. `setupParsers.sound` defaults to `true`. Expo's description stays honest: haptics.
- **AI assistants:** checkbox cards with real logos, any number selected. A new `CheckCard` sits beside `ChoiceCard` in `step-parts.tsx`; the "None" card goes, since nothing checked means none.
- **Skill and MCP:** the two switches apply to every checked assistant. The MCP row can use the `model-context-protocol` mark, which already ships.

### 2.7 Install

Rail: `SetupSummary` with its Edit links. Right side:

1. The one command, large, with Copy and Share this setup.
2. **What this does:** the plan from `planSetup`, one line per step, so nobody runs a command blind.
3. **Before you run it:** only what the choices need: Rust for Tauri, Xcode or Android Studio for Expo, the Laravel installer.
4. **Then:** `cd my-app`, one dev command per app, and today's links.

The numbered list of commands and the "Copy all commands" button go away. `create --dry-run` prints the same steps for anyone who wants them.

### 2.8 URL state

Old share links keep working through `parseSetupParams`:

| Old                | New                                                    |
| ------------------ | ------------------------------------------------------ |
| `monorepo=true`    | `project=monorepo`                                     |
| `assistant=claude` | `assistants=claude`                                    |
| `assistant=none`   | dropped                                                |
| no `sound` param   | now means on: the requested default wins for old links |
| no `step` param    | `project`                                              |

New params: `project` gains `monorepo`, plus `mobile`, `desktop` and `assistants` (`parseAsArrayOf`).

---

## 3. The CLI

### 3.1 Commands

| Command                                                  | What it does                                                                                         | State    |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- |
| `create [name]`                                          | New project or monorepo. Asks on a TTY for what flags leave open; never asks with `--yes` or no TTY. | New      |
| `init`                                                   | Existing project. Changes only what its flags name, so `init --yes` keeps today's meaning.           | Extended |
| `add <items>`                                            | Works from a monorepo root: one app is used, several ask, `--app web,mobile` or `--app all` picks.   | Extended |
| `apps add mobile` / `apps add desktop <electron\|tauri>` | Adds an app to an existing monorepo, with the same steps `create` uses.                              | New      |
| `agents add <claude\|cursor\|vscode\|codex\|opencode…>`  | Writes skill and MCP config for several assistants at once.                                          | New      |
| `mcp init --client claude,codex`                         | Takes a list, and writes Codex's config.                                                             | Extended |
| `doctor`                                                 | Checks each app, the toolchains the project needs, one React per app, and agent config.              | Extended |
| `upgrade`                                                | Already planned in `PLAN.md` §7.2. Last phase.                                                       | Later    |

`init -t <framework>` still works and hands over to `create`, so existing docs and scripts don't break.

`create` flags, written by the site only when they differ from the default:

| Flag                            | Default      |                                                                   |
| ------------------------------- | ------------ | ----------------------------------------------------------------- |
| `-t, --template <framework>`    | `next`       | next, vite, start, react-router, astro, laravel, expo             |
| `-b, --base <base>`             | `base`       | base, radix, aria                                                 |
| `--monorepo`                    | off          | implied by the next two                                           |
| `--mobile`                      | off          | adds `apps/mobile`                                                |
| `--desktop <runtime>`           | off          | adds `apps/desktop`: electron or tauri                            |
| `--look <k=v,…>`                | default look | the `/init` look params: `primary=260_0.2`                        |
| `--shell [k=v,…]`, `--no-shell` | on           | the App Shell's options                                           |
| `--icons <library>`             | `fabricator` | an `iconLibrary` opts out                                         |
| `--sounds`, `--no-sounds`       | on           | installs and mounts them; haptics on Expo                         |
| `--all`                         | off          | every component                                                   |
| `--agents <a,b>`                | none         | with `--no-skill` and `--no-mcp` to narrow                        |
| `-y, --yes`                     |              | defaults for anything unset                                       |
| `--dry-run`, `--json`           |              | print the plan, write nothing; machine-readable output for agents |

Look and shell stay readable `k=v` strings, as `PLAN.md` §5.4 settled for presets. The CLI forwards them to `/init` and `/init/app-shell`, which already validate them, so a new look option needs no CLI release.

### 3.2 Architecture

One pure module turns a `Setup` into steps. The site shows them, the CLI runs them, and neither keeps its own copy.

```
packages/setup/src/          private, pure, zod; imported by the site, bundled into the CLI
  setup.ts                   schema, defaults, normalizeSetup, old link params
  cli-args.ts                toCliArgs: what the dock prints
  plan.ts                    planSetup: Step[], getNextSteps, getPrerequisites
  tree.ts                    getProjectTree
packages/cli/src/
  commands/create.ts, agents.ts, apps.ts
  runner/run-plan.ts         runs steps, logs, resumes
  steps/                     scaffold-web, scaffold-expo, scaffold-desktop,
                             install-items, mount-wrappers, configure-agents
  mount/                     one pure transform per framework
  utils/workspace.ts         finds the apps in a monorepo
  utils/expo.ts              adapter, next to utils/shadcn.ts; takes runExpoFix from init-native.ts
packages/cli/templates/      desktop-electron, desktop-tauri (the CLI's dist ships them)
```

- A test parses `toCliArgs(setup)` with the real commander program for every combination and expects the same `Setup` back. That replaces "keep it in step" in `AGENTS.md`.
- `scripts/build.ts` uses `--packages=external`, which would leave `@fabricator-ui/setup` as an import that doesn't exist on npm. It switches to `--external` for each entry in `dependencies`. The e2e suite packs the tarball, so this is covered.
- `lib/setup.ts` shrinks to the nuqs parsers and the site's typed look and shell. `buildAppShellCommand` and `buildSettingsCommands` in `app-shell/_lib/install.ts` move onto `toCliArgs`.

New dependencies, all CLI-only, none reaching a page bundle:

| Package                | Why                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@clack/prompts` 1.8.1 | Multi-select, grouped questions and task lines. `PLAN.md` §7.1 already allows it. Replaces `prompts`, behind the wrappers in `commands/shared.ts`. |
| `ts-morph`             | The mounts. Shadcn already depends on it (`^26`), so it adds no download. Match its range.                                                         |
| `zod`                  | Validates flags. Already planned in §7.1.                                                                                                          |

### 3.3 Speed

Today a default project with sounds runs three CLI commands and four shadcn processes (init, the starter button, the App Shell, sounds). One `shadcn init <url> <every item>` does the whole job: S1 confirmed it resolves `@fabricator` items on first run, installs Fabricator's button, and `next build` passes.

| Default Next.js project, sounds and App Shell | bun       | npm | Package-manager installs |
| --------------------------------------------- | --------- | --- | ------------------------ |
| Today: three commands                         | 10 to 15s | 47s | 3                        |
| One run                                       | 7 to 8s   | 34s | 2                        |

These were measured on a heavily loaded machine, so treat them as relative. The rest:

- **Cloning isn't the bottleneck.** The template clone took 2s, so no template cache is needed.
- **Run each tool once.** `expo install --fix` runs once per plan, not after each `add`. A monorepo installs at the root once before its apps are configured.
- **Skip subprocesses where none is needed.** Skill and MCP files are written directly (§3.6).

### 3.4 Mounting

The CLI does the manual edits, and it never guesses.

Each transform is pure: `(source, options) => string | null`. `null` means the file doesn't match a shape it knows, so it leaves the file alone and prints the snippet. The same code runs for new and existing projects, so a template change degrades to today's behaviour instead of a broken file.

| Framework      | Root file                                                      | Sounds                                       | App Shell                        |
| -------------- | -------------------------------------------------------------- | -------------------------------------------- | -------------------------------- |
| Next.js        | `app/layout.tsx`                                               | Yes                                          | Yes, `usePathname`               |
| Vite           | `src/main.tsx`                                                 | Yes                                          | Yes                              |
| TanStack Start | `src/routes/__root.tsx`                                        | Yes                                          | Yes                              |
| React Router   | `app/root.tsx`                                                 | Yes                                          | Yes, `useLocation`               |
| Astro          | `src/layouts/main.astro`                                       | Yes, text insert, `client:load`              | Snippet in v1                    |
| Laravel        | `resources/js/app.tsx`                                         | Yes                                          | Snippet in v1                    |
| Expo           | `src/app/_layout.tsx` (SDK 58 default), then `app/_layout.tsx` | Haptics, `FabricatorRoot`, stylesheet import | Yes, Expo Router's `usePathname` |

The Next.js, Vite, Start and React Router files exist in upstream's templates today; Astro and Laravel get checked when their transforms are written. The pathname glue is a small adapter per framework, which `/init/app-shell` writes when it gets a `framework` param; its source stays base-independent.

### 3.5 Generated monorepo

```
my-app/
  apps/web/       shadcn's monorepo template for the framework
  apps/mobile/    create-expo-app, native registry, its own components.json
  apps/desktop/   copied from packages/cli/templates
  packages/ui/    web components
```

Components are never shared across platforms (D14). Web and mobile match because both get the same look params.

**Plan order:** scaffold the template, add `apps/mobile` with `create-expo-app --template default@sdk-58` (Expo's documented monorepo path, with the SDK pinned to what the native registry is tested on), copy `apps/desktop`, patch the root, install once, configure each app, mount, write agent config.

**The recipe.** Proven from scratch in Phase 0, under npm, bun and pnpm: a Next monorepo with the App Shell and sounds, Expo with the native shell, Electron and Tauri. `next build`, the static export, `expo export --platform ios`, `expo-doctor` (20 of 20), mobile `tsc` (0 errors), the Electron binary and `cargo check` all pass. Getting there took these, and each one failed without its fix:

| For            | The CLI does                                                                                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every monorepo | Sets `lib` and `hooks` in `apps/web/components.json` to `@workspace/ui/…` **before the first `add`**, so they land beside the components that import them.                                                                                      |
| Every monorepo | Adds an export to `packages/ui/package.json` for each `.tsx` lib (`fluid-hover`, `sortable`): the template's `./lib/*` pattern only matches `.ts`.                                                                                              |
| Every monorepo | Adds `@fabricator-ui/icons` to `apps/web`: shadcn puts it only in `packages/ui`, and the layout file lives in the app.                                                                                                                          |
| The registry   | Fix `lib/sounds.ts`: `partials[0]` fails the monorepo template's strict `noUncheckedIndexedAccess`. With sounds on by default, that would fail every monorepo build. **A registry bug, not a CLI step.**                                        |
| npm and bun    | Root `overrides` **before the first install**: `react` and `react-dom` at Expo's pin, `@babel/core` at `^7`, `react-native-worklets` at the mobile pin. The template's ESLint package pulls Babel 8, which breaks Metro's Babel 7.              |
| bun            | `bunfig.toml` with `linker = "hoisted"`. Its isolated default leaves `expo-doctor` reporting duplicate native modules.                                                                                                                          |
| pnpm           | Nothing: isolated installs pass with each app keeping its own React. Always `--no-frozen-lockfile`, since CI environments default to frozen.                                                                                                    |
| Expo           | Deletes the template's demo files. Its `src/components/ui/collapsible.tsx` sits exactly where Fabricator's `collapsible` installs, and it imports files that are gone. Adds `src/css.d.ts`, which TypeScript 6 needs for the stylesheet import. |

**Not run:** opening a real Electron or Tauri window, the generated app on a simulator, and yarn, which isn't installed here. Phase 4 covers all three before the cards ship.

**Root scripts:** `dev` starts web only. `dev:mobile` and `dev:desktop` start the rest. A plain `turbo dev` must not launch Expo and a window.

**First commit:** shadcn's post-init commits right after scaffolding, so everything later would be uncommitted. If the CLI created the repo, it finishes by amending that commit.

**React and React Native.** The Next template pins `react` 19.3.1; Expo SDK 58 pins 19.3.0 and React Native 0.88. Expo's docs say duplicate React Native versions in a monorepo are unsupported and duplicate React in one app causes runtime errors. This repo keeps `apps/mobile` out of its workspace for the same reason. Phase 0 settled it: §8.3.

**Desktop** is a thin window around `apps/web`, taken from `apps/desktop`:

- **Dev:** loads the web dev server, using the wait-for-port logic in `apps/desktop/scripts/dev.ts`. The dev URL comes from a per-framework port map.
- **Production:** a static build of the web app. [Tauri has no server-based mode](https://tauri.app/start/frontend/nextjs/). Electron follows the same rule so both runtimes behave alike. It serves the folder through a custom protocol, because `file://` breaks Next's absolute `/_next` paths. A project that needs a server can point the window at its deployed URL by hand: Tauri's `frontendDist` accepts one. The CLI doesn't set that up.
- **Runtime detection:** a project's web app runs in a browser and in a window, so the shell has to find out at runtime. `readDesktopRuntime` and `useDesktopWindow` move from `app/(view)/desktop/_lib` into a new registry item, `desktop-window`, in `registry/fabricator/shared/`. `app-shell-source.ts` uses it when `desktop` is set, and `/desktop` moves onto it, so there is one implementation. Two things change on the way: it must be safe to render on the server, because `next build` prerenders it, and it can't import `next-themes`, because Vite's template has its own theme provider, so it takes the theme as an argument. It is web-only, so it needs a dated entry in `registry/native/parity-exceptions.json` (contract item 9).
- **Missing Rust:** `create` still succeeds, and the summary and `doctor` say what's needed. The CLI never installs a toolchain.

| Framework      | Desktop in v1 | Static output                                                                                                                                                                      |
| -------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite           | Yes           | `apps/web/dist`                                                                                                                                                                    |
| Next.js        | Yes           | `apps/web/out`: `output: "export"` only when `FABRICATOR_DESKTOP=1`, so the web deploy keeps its server. Routes that need a server don't work in the window, and the page says so. |
| Astro          | Yes           | `apps/web/dist`                                                                                                                                                                    |
| React Router   | Yes           | `apps/web/build/client`, with `ssr: false`                                                                                                                                         |
| TanStack Start | Yes           | `apps/web/dist/client`, with SPA mode on. The entry is `_shell.html`, not `index.html`                                                                                             |

All five built statically with the App Shell in Phase 0. Whether each one loads correctly from a window's custom protocol is checked in Phase 4; a framework that doesn't gets its card disabled, with the reason visible.

### 3.6 AI assistants

- **Skill:** the CLI stops shelling out to `npx skills`. A new `/init/agents?assistants=claude,codex` route, like `/init/app-shell`, returns the skill's files as a `registry:item`. Targets follow the [skills CLI's table](https://github.com/vercel-labs/skills/blob/main/docs/agents.md): `.claude/skills/fabricator/` for Claude Code, `.agents/skills/fabricator/` for Codex, Cursor, OpenCode and Copilot. That removes the Node 22.20 gate and the third-party telemetry. Skills.sh stays for people outside the CLI. S3 confirms shadcn accepts dot-folder targets; if not, the CLI writes the same payload itself.
- **MCP:** `mcp init` takes a list. Codex gets a project-level `.codex/config.toml`, with an idempotent append and one line saying Codex reads it once you trust the project.
- **Monorepos:** the config goes at the repo root, where the assistant runs, and the server command gains `-c apps/web`. Shadcn's MCP server reads `components.json` from its working folder, and the root has none.

### 3.7 Output, failure and safety

- **One line per step**, with its duration. Child output goes to a log file, and a failure prints its last lines and the path. `--verbose` streams everything, as today.
- **Re-running resumes.** Each step checks whether its work exists before doing it, so a failed `create` is fixed by running the same command again. No state file.
- **Existing projects stay safe.** `--look` now means "apply the theme" instead of being dropped. Applying reinstalls components, so a dirty git tree stops it unless you pass `--force`; a TTY asks first.
- **Exit codes:** a failed step is non-zero. A mount that printed a snippet is a warning, and exits 0.

---

## 4. Phases

Each phase ships alone. Phase 4 is the largest by far.

**Phase 0: spikes, no product code. Done (2026-11-04).**

| Spike                                                        | Result                                                                                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: one shadcn run for everything                            | Works, and `next build` passes (§3.3).                                                                                                        |
| S2: Next, Expo, Uniwind, Electron and Tauri in one workspace | Works under npm, bun and pnpm with the recipe in §3.5. It also found that monorepos don't build today. Windows and simulators weren't opened. |
| S3: `registry:file` targeting dot folders                    | Works: `shadcn add` wrote `.claude/skills/…` and `.agents/skills/…`.                                                                          |
| S4: static builds of Astro, React Router, TanStack Start     | All three build with the App Shell, after the monorepo fixes (§3.5).                                                                          |

**Phase 1: the page, visible wins.**

- Step order, three starting points, multi-select assistants with logos, URL migration.
- Assistant cards import the marks in §1, from `@fabricator-ui/icons/brands`.
- Add `tanstack` and `react-router` the same way, if their terms allow, and delete `framework-icons.tsx`.
- Fix the two live shell bugs: hide the Window section and Titlebar tabs unless Desktop is on, and give the generated nav its tab items.
- Fix monorepos, since the page offers them today: the three monorepo steps in §3.5, in `init --monorepo`, with a new e2e scenario. Fix `lib/sounds.ts` in the registry, for every base.
- `getShellOptionSupport` and `normalizeSetup` for the shell, and the options disabling when the shell is off.
- Commands stay as a list for now. Sounds stay **off** until Phase 3, so the default doesn't add two steps in the meantime.

**Phase 2: one command.** `packages/setup`, `create`, runner, merged installs, `--dry-run`, `--json`, `agents add`, `/init/agents`, Codex config. On the page: dock, plan, tree, new Install step.

**Phase 3: mounts.** Transforms per framework, then **sounds on by default**, on the page and in `create`. `/init/app-shell` takes `framework`: router adapter, `renderLink` and storage. `create` writes the placeholder pages, so the nav works on first run. The default project is now one command and zero edits.

**Phase 4: monorepo apps.** Mobile and Desktop steps, templates that take `tabs` and `glass`, `desktop-window`, `/init/app-shell?desktop=` and `?platform=native`, `apps add`, `add --app`, root patches. On the page: Apps section, the size switch with the runtime passed to the preview, the Expo shell, prerequisites.

**Phase 5: the rest of "more powerful".** `doctor` per app and toolchain, then `upgrade`, then `doctor --fix` if `upgrade` shows it's worth having.

---

## 5. Verification

TDD throughout, colocated `x.test.ts`, boundaries mocked (spawn, network).

| Layer                | Covers                                                                                                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/setup`     | `normalizeSetup`, old links, plan per scenario, tree                                                                                                                                                                                                            |
| `packages/cli`       | Args round trip; each mount with recognised, already-mounted and unknown fixtures; agent writers merging existing config; resume after failure; workspace finder                                                                                                |
| `apps/web`           | `setup.test.ts` rewritten first; `/init/agents`; `/init/app-shell` with `framework`, `desktop` and `platform=native`; `getShellOptionSupport` for every project shape; tab items whenever `bottomNav` is on; `window` never reaching the command from `/create` |
| `packages/tests` e2e | New scenarios below, against real templates                                                                                                                                                                                                                     |
| By eye               | `/create` in Relay's browser, light and dark, keyboard only, mobile and desktop widths, axe                                                                                                                                                                     |

New e2e scenarios:

- `create-next-defaults`: one command; asserts `SoundEffects` and the shell are mounted, `tsc` and `build` pass, and the install count holds.
- `create-vite-all`, and `create-laravel` when the installer exists.
- `create-expo`: the native shell mounted, `tsc` and `expo export --platform ios` pass, its nav items resolve to routes.
- Every `create-*`: each nav link resolves to a page that exists.
- `init-existing-agents`: Claude Code and Codex config both written, existing entries kept.
- `monorepo-web`, the regression test for today's bug: `add dropdown-menu sidebar app-shell sounds`, then `next build`.
- `monorepo-mobile` on npm, bun and pnpm: `expo export --platform ios`, `expo-doctor`, mobile `tsc`.
- `monorepo-electron`, `monorepo-tauri`: web static build, window boot; `cargo check` where Rust exists; the Tauri config's light position matches `tabs`.

Testing 5 frameworks × 4 package managers × app combinations isn't affordable. Yarn gets one monorepo scenario, added before Mobile ships.

By hand, per `AGENTS.md`: a generated Expo app on the iOS Simulator and Android Emulator, and generated desktop apps. CDP clicks skip the native hit test, so window controls need an app-region audit to count as working.

---

## 6. Risks

| Risk                                                                                               | Mitigation                                                                                                                                            |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| The monorepo recipe drifts: Expo, the template's ESLint package or Babel changes what it needs.    | `expo-doctor` and `expo export` run in the e2e suite, per package manager. If it stops being maintainable, Mobile ships outside the workspace (§8.3). |
| Mounts damage user code.                                                                           | Exact shapes only, otherwise the snippet. Fixtures cover the unknown case.                                                                            |
| Shadcn templates change on `main` under a pinned CLI.                                              | Exists today. A scheduled e2e run catches it; mounts degrade to snippets.                                                                             |
| Site and CLI ship apart: the page shows flags npm doesn't have yet. `deploy` ships the site first. | Keep the window short, and check the order on the first release that adds flags. The new CLI needs the new routes, so site-first stays right.         |
| Static export surprises Next.js users who pick Desktop.                                            | The Desktop card says so before they choose. The env gate keeps the web deploy unchanged.                                                             |
| A trademark owner objects to a mark.                                                               | Terms recorded per brand in the allowlist. `held` removes it.                                                                                         |

---

## 7. Order that matters

1. Sounds default **after** mounts (Phase 3), or every project gains two steps.
2. Dock **after** `create` (Phase 2): a dock showing nine commands is worse than today.
3. Mobile and Desktop cards **after** Phase 4: don't offer what the CLI can't build.

---

## 8. Decisions

### Decided by Gabs (2026-11-04)

**8.1 Logos.** Codex shows OpenAI's logo, and every other assistant its provider's, from Fabricator Icons. This overrides D16's hold on `openai`. OpenAI's terms didn't change: they still make its permission non-transferable and say not to use the logo without permission. `BRANDS.md` and the Brands docs page say so. Adding `held` back to the entry removes it.

To move to Blossom, whoever accepts OpenAI's terms downloads the file into `sources/brands/kits/`, and the entry's `mono` points at it, as Motion's does.

**8.2 Branch.** All of this ships as v0.5.0 on `release/v0.5.0`, which has uncommitted work of its own. So commit that work before Phase 1 starts, or the two can't be told apart in the diff.

### Defaults, accepted

**8.3 React in a generated monorepo.** Changed by the spikes. pnpm needs nothing: each app keeps its own React. npm and bun use overrides at Expo's pin, which is Expo's documented fix; web lags a patch behind there. Both pass `expo-doctor`.

- Overrides everywhere: simpler to explain, but holds pnpm projects back for no reason.
- Mobile outside the workspace, as this repo does: safest, but `apps/mobile` loses shared installs and turbo. It stays the fallback if the recipe stops holding.

**8.4 Readable flags over a setup code.** `PLAN.md` §5.4 already chose readable, and people can see what they're about to run.

- A base64 `--setup` code: a shorter command that hides what runs.
- A hosted short code: needs storage and abuse handling for little gain.

**8.5 Desktop frameworks in v1.** All five, changed by the spikes: each one built statically. A card is disabled only if its framework fails to load in a real window in Phase 4.

- Next.js and Vite only: was the earlier pick, and the spikes removed the reason for it.

**8.6 `packages/setup` as a new private package.** The site and CLI both need it and can't import from each other.

- Export it from `fabricator-ui/setup`: makes it public API on npm.
- Server returns the plan to the CLI: a server telling a CLI what to run is a security smell.

**8.7 Desktop templates inside the CLI package.** They need binary icons and a `package.json`, which registry JSON handles badly, and they version with the CLI.

- Registry items: fits D1 better, but needs a `components.json` that doesn't exist yet in that folder.

---

## 9. Docs and contract changes

- **`PLAN.md`, first:** D2 widens from wrapper to orchestrator; registry logic stays in shadcn. A new D17 records one `Setup`, one plan and one command. A new D18 records the generated monorepo's layout and React rule. §7.2 gets the new commands.
- **`AGENTS.md`:** the `/create` and `/init/app-shell` bullets, CLI section, commands table, and repo map (`packages/setup`, `packages/cli/templates`).
- **Docs:** `content/docs/(root)/cli.mdx`, `skills.mdx`, `installation/*.mdx`, a changelog entry, `packages/cli/README.md` and `skills/fabricator/cli.md`.
- **D16:** records the exception in §8.1. Done, with `docs/plans/icon-pack.md`, the Brands page, the READMEs, the changelog and the pending changeset.
- **Contract:** style ids, namespaced dependencies and tokens don't change. `desktop-window` needs its parity exception. Page and CLI copy follows the brand policy: "the CLI", no shadcn outside the allowed places.
- **Changesets:** `fabricator-ui`. The icon packages are covered by the pending `fabricator-icons` changeset, now saying 143 marks.

---

## 10. Not doing

- A monorepo without a web app.
- Sharing components between web and native (D14).
- Separate shell options per platform. One set keeps web and native alike, which is what parity asks for; a project can edit either file afterwards.
- Installing the preview's sample dashboard. It's 746 lines of demo content that nobody would keep.
- Installing Rust, Xcode or the Android SDK for people.
- A `fabricator.json` that remembers choices. `apps add mobile` takes `--look` for now; revisit with `upgrade`, which would be the first real reason for it.
- Fabricator-owned project templates or a template cache. The clone took 2s in Phase 0.

---

## Sources

- Expo monorepos: https://docs.expo.dev/guides/monorepos/
- Tauri with Next.js: https://tauri.app/start/frontend/nextjs/
- Skills CLI: https://github.com/vercel-labs/skills (`docs/commands.md`, `docs/agents.md`)
- Codex config: https://learn.chatgpt.com/docs/config-file/config-reference and https://github.com/openai/codex/issues/13056
- Logo terms: https://openai.com/brand/, https://cursor.com/brand, https://github.com/logos, https://opencode.ai/brand
- In this repo: `node_modules/shadcn/dist/index.js` (template scaffold, 4.22.1), `sources/brands/allowlist.json`, `docs/plans/icon-pack.md`

## 11. Where the build differs

- **No `ts-morph`.** The root-file edits are strict text transforms that return `null` for any other shape. That's what the plan wanted from them, without a dependency.
- **No `/init/agents`.** The skill ships inside the CLI and is written directly. No server route, no network, and it works offline. S3 proved the registry could do it; this is simpler.
- **Electron has no packager.** `dev` and `start` work; Tauri also has `tauri build`. Packaging Electron needs a decision on Forge or electron-builder.
- **`tanstack` and `react-router` marks weren't added.** `framework-icons.tsx` stays for frameworks; assistants and desktop runtimes use Fabricator Icons.
- **Yarn isn't tested.** It isn't installed here. `withPins` writes its `resolutions` field, but no scenario runs it.
- **Laravel isn't tested.** The installer isn't on this machine, so `create -t laravel` and its sound mount are unit-tested only.
- **Tauri's private API follows the glass option.** The Cargo feature and `macOSPrivateApi` have to agree or the app won't build, and the App Store rejects the API, so a window without glass leaves both out. The plan didn't mention it.
- **The interactive prompts have no scenario.** `create` with no flags was driven once through a real terminal (monorepo, Radix, Electron, two assistants) and checked by hand. A scenario would need a pty library.
- **A library contrast bug is worked around on the page.** `FieldDescription` on a checked `FieldLabel` is 3.86:1 in light mode (`bg-active`). `/create` fixes it with `CardHint`. The fix belongs in the Fabricator style and the native tree, and isn't part of this work.
- **Native sounds arrived during the build.** Another change gave the native `sounds` item the website's sounds as well as haptics, so where this plan says "haptics" on Expo, the page now says both. That item also needs `expo-asset`: `expo-audio` declares it as a peer, and pnpm's strict `node_modules` doesn't hoist it.
- **What ran, and what only built.** A generated monorepo's web app, Electron window and iOS app were run. The App Shell mounts in all three, the window finds its runtime with no control under a drag region, and the iOS sidebar and navigation work. Tauri got `cargo check`, and Android got nothing beyond `expo-doctor`. The glass hasn't been seen, and the sounds on iOS haven't been listened to.
- **Generated Expo apps are named after the project.** The template calls the app after its folder and leaves the store ids to a prompt on the first native build, so `scaffold-mobile` sets `name`, `ios.bundleIdentifier` and `android.package`. Found by running one.
- **The Install step has a prompt for AI agents.** Added after the plan. `getAgentPrompt` in `packages/setup` writes the same command, then what a person would do next: fix failures, check with `doctor` and a build, add a theme toggle, and replace the sample navigation. It won't install prerequisites without asking.
