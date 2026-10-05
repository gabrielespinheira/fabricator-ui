# Fabricator UI — Master Plan

> A shadcn/ui-compatible, open-source React component library with its own design system, a CLI, and a documentation website, all in this repository.
>
> - Domain: `fabricator-ui.com`
> - npm CLI: `fabricator-ui` (name verified free on npm, 2026-10-05)
> - Registry namespace: `@fabricator` (not yet taken in the shadcn registry directory)
> - Upstream research baseline: `shadcn-ui/ui` @ `295a1f11` (2026-10-02), `shadcn` CLI **4.21.1**

---

## Status (2026-10-05)

| Phase | State |
|---|---|
| 0. Repo foundation | ✅ Bun workspaces + Turborepo, CI and release workflows, MIT + NOTICE, AGENTS.md, GitHub repo (gabrielespinheira/fabricator-ui, nothing pushed yet). Pending: first commit, Vercel project, domain, npm name reservation. |
| 1. Clone shadcn at parity | ✅ Full upstream registry (3 bases × 8 styles) builds; `test:parity --styles all` matches ui.shadcn.com for all 5,120 items (2 documented bug-fix exceptions). `/init` endpoint, blend and Fabricator registry modes, and the `fabricator` style (a copy of nova) are live. The `upstream/shadcn` vendor branch is created on the first `bun run sync:upstream`. |
| 2. Website MVP | ✅ Docs site (Next 16 + Fumadocs): all component pages, blocks, charts, create, `.md` routes, `llms.txt` and `llms-full.txt`; `next build` passes (647 pages). Brand policy applied (see AGENTS.md): demo content rebranded by `scripts/rebrand.ts`, Typeset builder removed, own schema URLs, mobile preview screenshots recaptured from this site (`registry:capture`, `pages:capture`). Pending: deploy, final logo/OG art. |
| 3. CLI | ✅ `packages/cli` (`fabricator-ui` 0.1.0, unpublished): init, add, apply, search/list, view, docs, diff, info, doctor, mcp (own `fabricator` MCP server config), `--verbose`. 63 unit tests; e2e suite passes for Vite × {Base UI, Radix, React Aria}, Next.js, and an existing shadcn project. |
| 4. Fabricator design system | 🟡 Tooling ready: the website (docs previews and code, homepage, blocks, Markdown exports) renders the Fabricator style, so edits to `apps/web/registry/styles/style-fabricator.css` show up after `registry:build --style all`. Next: the tokens and the style itself. |
| 5. Exclusive components | ⏳ Not started. |
| 6. Launch and ecosystem | 🟡 Agent skill in `skills/fabricator`. Pending: npm publish, Vercel deploy, registry directory PR. GitHub addresses (`owner/repo/item`) are not supported: registry sources contain style placeholders and are only installable after the build, so the registry is served from the site. |

---

## 0. TL;DR

1. **We do not fork the shadcn CLI. We become a shadcn registry.** The `shadcn` CLI (v4) already supports third-party registries through `@namespace/item`, custom `init` payloads (`registry:base`), presets, fonts, themes, RTL, icon-library swapping, and Radix/Base UI/React Aria bases. Every project that already uses shadcn can then run `bunx --bun shadcn add @fabricator/<item>` with no extra tooling.
2. **We ship a thin, branded `fabricator-ui` CLI** that wraps the official `shadcn` package. It handles Fabricator-specific defaults (init URL, registry config, bare names resolving to `@fabricator`) and delegates everything else. This gives users the "like shadcn" experience without maintaining a fork of the ~15k-line CLI.
3. **We vendor shadcn's real source model**: one hand-written source tree per base (`base`, `radix`, `aria`) using `cn-*` placeholder classes, plus one CSS "style map" per visual style. A build step compiles these into per-style JSON. Our design system becomes **a new style map (`style-fabricator.css`) plus tokens**. Upstream updates then stay mergeable.
4. **This repo is a Bun workspaces + Turborepo monorepo.** Bun is the only package manager and script runner in the repo; npm and pnpm are not used. `apps/web` is the Next.js 16 website, which is also the registry host (`/r/...`). `packages/cli` is the npm CLI. Later, `packages/react` holds headless primitives.
5. **Phase 1 is byte-for-byte parity with shadcn.** Our registry must serve every upstream component, example, and block, and match `ui.shadcn.com/r/styles/<style>/<name>.json`. After that we change the design.

---

## 1. Goals and non-goals

### Goals
- A **React-only** component library distributed as source code (copy-in), installable through a CLI.
- It works in **Next.js (App and Pages Router), Vite, React Router, TanStack Start, and Astro**, which are the same targets as shadcn. Laravel and Inertia work automatically because shadcn supports them.
- **Drop-in compatible with existing shadcn projects:**
  - same `components.json`
  - same CSS variable contract
  - same file locations, export names, props, and `data-slot` attributes
- Start from **all of the latest shadcn components**, examples, and blocks, then evolve them into the Fabricator design system.
- Add **Fabricator-exclusive components** that shadcn does not have.
- A first-class **website**: docs, live previews, code, block viewer, theme/preset creator, search, `llms.txt`, `.md` page exports, and MCP/agent-skill docs.
- Open source under MIT, with proper shadcn attribution.

### Non-goals (for now)
- Vue, Svelte, or React Native ports.
- Tailwind CSS v3 support. All of shadcn's current bases and styles are v4-only, and we follow that.
- A runtime npm component package such as `@fabricator-ui/components`. Distribution is copy-in. Headless logic can ship as npm later (see §5.8).
- Forking or replacing the `shadcn` CLI engine.

---

## 2. Research: how shadcn/ui works today (Oct 2026)

### 2.1 Upstream monorepo layout

```
shadcn-ui/ui
├─ apps/v4/                 # ui.shadcn.com — Next 16.3, React 19.2, Tailwind 4.3, Fumadocs 16
│  ├─ registry/             # SOURCE OF TRUTH for all registry items
│  │  ├─ bases/{base,radix,aria}/{ui,examples,blocks,lib,hooks,components,internal}/ + _registry.ts
│  │  ├─ styles/style-{vega,nova,maia,lyra,mira,luma,sera,rhea}.css   # style maps (~1.75k lines each)
│  │  ├─ new-york-v4/       # legacy Radix tree, classes written out (charts live here)
│  │  ├─ bases.ts styles.tsx themes.ts base-colors.ts fonts.ts config.ts directory.json
│  │  └─ __index__.tsx …    # generated lookups for the docs site
│  ├─ examples/{base,radix,aria}/*.tsx   # ~500 demos per base
│  ├─ content/docs/**        # MDX docs (Fumadocs)
│  ├─ scripts/build-registry.mts         # the registry compiler
│  └─ public/r/**            # generated JSON served to the CLI
├─ packages/shadcn           # the CLI (`shadcn` on npm, 4.21.1)
├─ packages/registry         # `@shadcn/registry` 0.1.0, the resolver/installer engine used by the CLI
├─ packages/react            # `@shadcn/react`, headless primitives (message-scroller, questionnaire)
├─ packages/helpers          # `@shadcn/helpers`, AI-chat mocks (not used by the CLI)
├─ templates/                # next-app, vite-app, start-app, react-router-app, astro-app (+ -monorepo)
└─ skills/                   # agent skills: shadcn, migrate-radix-to-base
```

### 2.2 The three axes: base × style × theme

| Axis | Values | How it is applied |
|---|---|---|
| **Base** (primitive library) | `base` (Base UI, **default since 2026-07**), `radix` (`radix-ui` unified pkg), `aria` (React Aria Components) | Separate hand-written source tree per base, kept in parity by convention. Same `cn-*` names and `data-slot`s; only primitives, imports, and part names differ. |
| **Style** (visual language) | `vega` (classic), `nova` (compact, **default**), `maia` (soft/rounded), `lyra` (boxy, mono), `mira` (dense), `luma` (soft elevation), `sera` (editorial), `rhea` (compact luma) | **Build-time.** Source uses semantic placeholder classes (`cn-button`, `cn-button-variant-default`). `style-<x>.css` maps each placeholder to Tailwind classes. `createStyleMap()` and `transformStyle()` (exported from `shadcn/utils`) inline them with `twMerge`. Output: `public/r/styles/<base>-<style>/<item>.json`. |
| **Theme** (tokens) | 7 base colors (neutral, stone, zinc, mauve, olive, mist, taupe) + 17 accent themes + chart colors + radius (`default/none/small/medium/large`) + menu color/accent + 26 fonts + 5 icon libraries | CSS variables (OKLCH) written into the user's CSS by the CLI. These are encoded into **preset codes** (base62, bit-packed). |

`components.json` stores `"style": "<base>-<style>"`, for example `base-nova`. The base is parsed from the prefix.

### 2.3 Component source conventions (must be preserved)
- Plain function components. No `forwardRef` (React 19).
- `data-slot="<component>-<part>"` on every part. Styles use `has-data-[slot=…]` and `in-data-[slot=…]`.
- `cva` for variants. `cn` is imported from the **`cn` npm package** (replaced clsx + tailwind-merge in 2026-09). `lib/utils.ts` is just `export { cn } from "cn"`.
- `"use client"` only on interactive files.
- Composition: `asChild` + `Slot` (Radix) and `render={<X/>}` + `useRender`/`mergeProps` (Base UI). The CLI can transform `asChild` into `render` for `base-*` styles.
- Icons are written as `<IconPlaceholder lucide="…" tabler="…" hugeicons="…" phosphor="…" remixicon="…"/>`, and the CLI swaps in the configured library.
- Install-time marker classes: `cn-menu-target`, `cn-menu-translucent`, `cn-font-heading`, `cn-rtl-flip`, `cn-logical-sides`.
- Shared CSS: `@import "shadcn/tailwind.css"`. It provides accordion keyframes, cross-base variants (`data-open`, `data-closed`, `data-checked`, …), `no-scrollbar`, and `scroll-fade`.
- Focus ring: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`. Invalid state: `aria-invalid:border-destructive aria-invalid:ring-destructive/20`.

### 2.4 Registry model (what we plug into)
- **`registry.json`** (catalog): `{ $schema, name, homepage, include?, items[] }`. Large registries can compose files with `include`.
- **`registry-item.json`** fields:
  - `name`, `type`, `title`, `description`, `author`
  - `dependencies`, `devDependencies`, `registryDependencies`
  - `files[]` with `{path, content, type, target?}`
  - `cssVars{theme,light,dark}`, `css`, `envVars`, `tailwind` (v3 only)
  - `docs`, `categories`, `meta`, `extends`
  - `config` (only on `registry:base`), `font` (only on `registry:font`)
- **Item types:** `registry:ui`, `component`, `block`, `lib`, `hook`, `page`, `file`, `theme`, `style`, `item`, `base`, `font`. `example` and `internal` are internal-only.
- **Address forms the CLI accepts:**
  - `button` (bare name resolves to the built-in `@shadcn` registry: `https://ui.shadcn.com/r/styles/{style}/{name}.json`; this cannot be overridden)
  - `@ns/item`
  - full URL
  - local `./file.json`
  - GitHub `owner/repo/item[#ref]` (repo with a root `registry.json`, no build needed)
- **Namespaces** are configured in `components.json` → `registries`. The value is either a string containing `{name}` (and optionally `{style}`), or `{url, headers, params}` with `${ENV}` interpolation. Namespaces can also be declared in `package.json#registries`.
- **Auto-discovery:** an unknown `@ns` is looked up in the public directory (`ui.shadcn.com/r/registries.json`, sourced from `apps/v4/registry/directory.json`) and written into `components.json` automatically.
- **Resolution:** `registryDependencies` are resolved recursively across registries, topologically sorted with themes first, and cssVars, css, and deps are deep-merged.
  - Install order: dependencies → env → fonts → files → CSS.
- **Install-time transforms (run inside the user's project):** import alias rewrite → strip `"use client"` if `rsc:false` → css-vars → tw-prefix → icons → menu → asChild→render (base-*) → RTL logical classes → Next 16 `middleware`→`proxy` → heading font → cleanup `cn-*` → TSX→JSX if `tsx:false`.
- **`shadcn build`** reads `registry.json`, inlines file contents, and writes `public/r/<name>.json`. It applies **no** code transforms; those happen at install.
- **Dynamic search:** `registry.json?q=&type=&limit=&offset=`. A server may return `pagination` to take over filtering.
- **Directory listing** is a PR to `apps/v4/registry/directory.json`. After that, Registry Health monitoring scores reliability, correctness, and installability.

### 2.5 CLI v4 surface (what our wrapper delegates to)
- `init [items…]` (alias `create`): `-t next|vite|start|react-router|laravel|astro`, `-b base|radix|aria`, `--monorepo`, `-p/--preset <name|code|url>`, `--rtl`, `--pointer`, `--css-variables`.
- `add`: `-o`, `-a`, `-p`, `--dry-run`, `--diff`, `--view`.
- `apply --preset … [--only theme,font]`.
- `view`, `search`/`list`, `docs`, `info --json`.
- `migrate cn|icons|base-color|radix|rtl`, `eject`.
- `build`, `registry add|validate`.
- `mcp` and `mcp init --client claude|cursor|vscode|codex|opencode`.
- `preset decode|url|open|resolve`.

**The key fact our architecture relies on.** `shadcn init <url>` and `shadcn init --preset <url>` fetch a **`registry:base`** item from any URL. That item's `config` (a deep-partial `components.json`, **including `registries`**) is merged into the user's `components.json` (`packages/shadcn/src/commands/init.ts`, `mergeConfig`). With `extends: "none"`, the item replaces shadcn's default style index. **That means one URL from our site can fully configure a Fabricator project, using only the official CLI.**

### 2.6 Website stack (what we replicate)
- **Framework:** Next 16 (Turbopack) and React 19.2.
- **Styling:** Tailwind 4.3 and `tw-animate-css`.
- **Docs:** Fumadocs (`fumadocs-core/ui/mdx`), with `rehype-pretty-code` + shiki for highlighting.
- **State:** next-themes, jotai (persisted user prefs), nuqs (URL state for the creator).
- **Previews:**
  - Generated `__index__.tsx` maps of `React.lazy` imports, keyed by `<base>-<style>`.
  - `ComponentPreview` and `ComponentSource` are server components.
  - Blocks render in iframes (`/view/[style]/[name]`) inside a resizable panel.
- **Package-manager tabs:** a shiki transformer produces the npm/pnpm/yarn/bun variants of every `npx …` command.
- **AI routes:** `/docs/x.md` → `/llm/[...slug]` returns markdown with demo source inlined. `/llms.txt`. JSON Schemas live under `/schema*`.
- **`/create`:** a preset designer. URL state, plus a preview iframe synced through `postMessage`. `/init?…` returns the `registry:base` JSON for the CLI. `/init.md` gives manual install steps.

---

## 3. Architecture decisions

| # | Decision | Rationale |
|---|---|---|
| **D1** | **Distribute through the official `shadcn` CLI as the engine.** Fabricator is a spec-compliant shadcn registry hosted at `fabricator-ui.com/r`. | Gives users zero-friction compatibility (`bunx --bun shadcn add @fabricator/x`). We inherit every framework, transform, monorepo, RTL, and icon feature for free, with no fork to maintain. |
| **D2** | **Ship `fabricator-ui` as a thin wrapper CLI** that depends on a pinned `shadcn` and delegates commands. | Gives us a branded UX (`bunx --bun fabricator-ui init`), our defaults, and our own commands (`doctor`, `upgrade`) without re-implementing resolution. If shadcn ever exposes a programmatic API (`shadcn/registry` already exports resolve/add helpers), we can call it in-process. |
| **D3** | **Namespace `@fabricator`, registered in the shadcn directory.** Also make the repo a valid **GitHub registry** (root `registry.json` with `include`), so `bunx --bun shadcn add gabrielespinheira/fabricator-ui/<item>` works too. | Auto-discovery means users never need to edit `components.json`. GitHub addressing is a free fallback that keeps working even if the site is down. |
| **D4** | **Two registry URL modes:**<br>• **Blend mode** (directory default): `https://fabricator-ui.com/r/{style}/{name}.json`. Exclusive components are compiled for the user's existing shadcn style (nova, vega, …), so they look native in any shadcn app.<br>• **Fabricator mode** (written by `fabricator-ui init`): `https://fabricator-ui.com/r/fabricator/{style}/{name}.json`. Serves the Fabricator design for the base parsed from `{style}`. | This meets both audiences: existing shadcn users who want extra components, and new users who want the Fabricator look. `@dashboardblocks` and `@better-auth-ui` already use the `{style}` pattern in the directory. |
| **D5** | **The `style` field in `components.json` always stays a valid shadcn style** (for example `base-nova`). It is never set to `base-fabricator`. | A bare `shadcn add button`, and any third-party item with a bare `registryDependencies: ["button"]`, resolves against `ui.shadcn.com/r/styles/{style}/…`. A custom style name would 404 there and break compatibility with the whole ecosystem. The Fabricator look comes from the D4 URL, not from the `style` field. |
| **D6** | **All Fabricator `registryDependencies` are fully qualified** (`@fabricator/button`). Bare names are used only when we intentionally depend on upstream shadcn. | A bare name always resolves to `@shadcn`. |
| **D7** | **API superset rule:** a Fabricator replacement for a shadcn component keeps the same item name, file path, export names, props, variants, and `data-slot`s. We may **add** props and variants but never remove or rename them. | Code written against shadcn must keep compiling when a user swaps in `@fabricator/button`. This is also what makes upstream merges cheap. |
| **D8** | **Vendor upstream source with the same `cn-*` + style-map architecture**, and reuse `createStyleMap` and `transformStyle` from `shadcn/utils` in our build script. | Our design system becomes `registry/styles/style-fabricator.css` plus tokens. Redesigning a component usually means editing CSS maps, not the TSX, so upstream fixes to the TSX merge cleanly. |
| **D9** | **Vendor all three bases. Base UI is the primary target** (default in docs and init). Radix and Aria follow in parity. For exclusive components with no matching primitive in a base, serve the Base UI implementation as a fallback (shadcn already does this for `combobox` in Radix). | Matches upstream defaults. Keeps a clear priority order without dropping users of other bases. |
| **D10** | **Upstream sync via a vendor branch** (`upstream/shadcn`), which holds pristine snapshots imported by `scripts/sync-upstream.ts` at a pinned SHA recorded in `upstream.lock.json`. It is merged into `main` with normal git 3-way merges. | Upstream ships often (68 changelog entries since 2023). A vendor branch turns each upgrade into a reviewable merge instead of a manual re-copy. |
| **D11** | **Tailwind v4 only, React 19 only.** | Matches every current upstream base and style. |
| **D13** | **Bun is the repo's package manager and script runner** (`bun install`, `bun run`, `bunx`, one `bun.lock`). npm and pnpm are not used to develop this repo. Two exceptions: the published CLI still targets **Node** (users run it with `npx`, `pnpm dlx`, `yarn dlx` or `bunx`), and the docs still show all four package-manager tabs, defaulting to **bun**. | Fast installs and scripts. Upstream already runs its registry build with Bun (`bun ./scripts/build-registry.mts`). Users keep whatever package manager they have; the shadcn CLI detects it on their side. |
| **D12** | **MIT license with attribution:** keep shadcn's copyright notice in `LICENSE.md` and in a `NOTICE`/README credits section. | Required by MIT for substantial copies, and good open-source practice. |

---

## 4. Target repository structure

```
fabricator-ui/
├─ apps/
│  └─ web/                               # Next.js 16 site = docs + registry host (Vercel)
│     ├─ app/
│     │  ├─ (app)/(root)/page.tsx        # landing (hero can reuse the Three.js "fabricator" scene from tmp/)
│     │  ├─ (app)/docs/[[...slug]]/      # MDX docs
│     │  ├─ (app)/docs/changelog/
│     │  ├─ (app)/blocks/[...categories]/
│     │  ├─ (app)/charts/[type]/
│     │  ├─ (app)/(create)/create/       # Fabricator preset designer
│     │  ├─ (app)/(create)/init/route.ts # GET -> registry:base JSON (Fabricator init payload)
│     │  ├─ (app)/(create)/init/md/route.ts
│     │  ├─ (app)/llm/[[...slug]]/route.ts   # /docs/*.md
│     │  ├─ (view)/view/[style]/[name]/  # iframe renders for blocks
│     │  ├─ (view)/preview/[base]/[name]/
│     │  ├─ r/registries.json?/…         # (optional) dynamic search route
│     │  ├─ api/search/route.ts          # Fumadocs search
│     │  ├─ og/route.tsx  sitemap.ts  robots.ts  rss.xml/route.ts
│     ├─ content/docs/                   # MDX: (root)/, components/{base,radix,aria}/, installation/, registry/, …
│     ├─ registry/
│     │  ├─ bases/{base,radix,aria}/{ui,examples,blocks,lib,hooks,components,internal}/
│     │  ├─ styles/style-{vega,nova,maia,lyra,mira,luma,sera,rhea}.css   # upstream (blend mode)
│     │  ├─ styles/style-fabricator.css (+ -compact etc.)                # OUR design system
│     │  ├─ tokens/                      # Fabricator token sources (colors, surfaces, motion…)
│     │  ├─ bases.ts styles.ts themes.ts fonts.ts config.ts presets.ts
│     │  └─ __index__.tsx __components__/ (generated)
│     ├─ examples/{base,radix,aria}/
│     ├─ components/                     # site-only components (preview, source, block viewer, cmd menu…)
│     ├─ lib/                            # registry loaders, highlight, llm, format-code, source.ts
│     ├─ scripts/build-registry.mts      # adapted from upstream
│     ├─ public/r/                       # generated registry JSON (gitignored except index/config)
│     ├─ public/schema/…  public/llms.txt
│     └─ source.config.ts next.config.mjs mdx-components.tsx components.json
├─ packages/
│  ├─ cli/                               # `fabricator-ui` on npm (wrapper around `shadcn`)
│  ├─ react/                             # `@fabricator-ui/react`, headless primitives (Phase 5+, optional)
│  └─ tests/                             # CLI e2e: scaffold templates, install every item, typecheck/build
├─ templates/                            # (optional, Phase 6) Fabricator starter templates
├─ skills/fabricator/                    # agent skill (SKILL.md, rules/*.md) like shadcn/skills
├─ registry.json                         # root GitHub-registry catalog (`include`s apps/web/registry/...)
├─ upstream.lock.json                    # pinned shadcn SHA + imported path manifest
├─ scripts/sync-upstream.ts
├─ .changeset/  turbo.json  bunfig.toml  bun.lock  package.json (workspaces)  tsconfig.json
├─ AGENTS.md  CLAUDE.md (imports AGENTS.md)  LICENSE.md  NOTICE.md  README.md  CONTRIBUTING.md  PLAN.md
└─ tmp/                                  # existing Three.js experiments (gitignored), to mine for the hero
```

**Tooling:** Bun ≥ 1.4 (workspaces declared in the root `package.json` `"workspaces": ["apps/*", "packages/*"]`, `"packageManager": "bun@1.4.x"`), Turborepo 2 (supports Bun workspaces and `bun.lock`), TypeScript 5.x, ESLint 9 + Prettier (with `prettier-plugin-tailwindcss` and `@ianvs/prettier-plugin-sort-imports`), Vitest 3 (run via `bun run test`; `bun test` is an option for pure-logic packages), Changesets, commitlint, lefthook. Supply-chain safety equivalent to upstream's pnpm `minimumReleaseAge`: set `[install] minimumReleaseAge = 172800` (48h, in seconds) in `bunfig.toml`, matching Bun's `--minimum-release-age` flag. Node ≥ 20.18.1 stays installed for running Next.js tooling parity checks and for testing the CLI under Node.

---

## 5. The registry (core product)

### 5.1 Source layout and item declaration
- Items are declared in TypeScript (`_registry.ts` per folder, typed `Registry["items"]` from `shadcn/schema`) and aggregated per base in `bases/<base>/registry.ts`. They are validated with `registryItemSchema` from zod at build time, exactly like upstream.
- Each base has `index` and `style` items of type `registry:style` that carry the base primitive dependency (`@base-ui/react`, `radix-ui`, or `react-aria-components`) plus `cn`, `class-variance-authority`, `tw-animate-css`, `shadcn` (for `shadcn/tailwind.css`), and the shared `css` block.
- Fabricator-exclusive items live in the same base trees and are flagged with `meta: { fabricator: true }` and `categories`. This keeps one pipeline for everything.
- Each item has `meta.links.docs` and `meta.links.examples` pointing to `fabricator-ui.com`, so `shadcn docs @fabricator/x` works.

### 5.2 Build pipeline (`apps/web/scripts/build-registry.mts`)
Adapted from upstream's 1,840-line script, keeping its stages:
1. Build the base indexes (`registry/bases/__index__.tsx`, `__components__/<base>.tsx` lazy shards).
2. For each **base × style** (8 upstream styles + Fabricator styles): `createStyleMap(styleCss)` → `transformStyle(source)`. Write a temporary `registry/<base>-<style>/…`. Cache by sha256.
3. Generate `registry/__index__.tsx` and `examples/__index__.tsx` for the docs site.
4. Write the per-style `registry.json`, then `shadcn build` into the output tree:
   - **Blend mode:** `public/r/<base>-<style>/<name>.json` (24 combos)
   - **Fabricator mode:** `public/r/fabricator/<base>-<style>/<name>.json`. Content is compiled with `style-fabricator.css` for that base. It is the same for every shadcn style suffix, so it can be emitted once per base and copied or rewritten in routing.
5. Write `public/r/registry.json` (the catalog for `shadcn search @fabricator`), `public/r/index.json` (merged across bases with `meta.links`), `public/r/config.json` (Fabricator presets), and `public/r/colors/*.json`.
6. Copy compiled UI into `styles/<base>-<style>/ui` for docs imports, resolving `IconPlaceholder` to lucide. Also build the RTL variants.

Turbo task: `build` depends on `registry:build`. Generated folders are gitignored (same as upstream), except small committed indexes.

**Routing alternative.** Instead of materialising every combination, `app/r/[...path]/route.ts` can serve Fabricator mode by parsing `<base>` from the `{style}` segment and returning the prebuilt per-base file, with `generateStaticParams` + `force-static` so it is still CDN-cached. Start with plain static files and switch only if the build size becomes a problem.

### 5.3 The init endpoint: `GET /init`
Returns a `registry:base` item, modelled on upstream `buildRegistryBase`:
```jsonc
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "fabricator-base", "type": "registry:base", "extends": "none",
  "config": {
    "style": "base-nova",                // D5: always a valid shadcn style
    "iconLibrary": "lucide", "rtl": false, "menuColor": "default", "menuAccent": "subtle",
    "tailwind": { "baseColor": "neutral" },
    "registries": {
      "@fabricator": "https://fabricator-ui.com/r/fabricator/{style}/{name}.json"
    }
  },
  "dependencies": ["shadcn@<pinned>", "class-variance-authority", "cn", "tw-animate-css", "@base-ui/react", "lucide-react"],
  "registryDependencies": ["@fabricator/utils", "@fabricator/font-<x>"],
  "cssVars": { "theme": { … }, "light": { … }, "dark": { … } },   // Fabricator tokens (§6)
  "css": { "@import \"tw-animate-css\"": {}, "@import \"shadcn/tailwind.css\"": {}, "@layer base": { … } }
}
```
- Query params mirror upstream (`base`, `theme`, `font`, `radius`, `iconLibrary`, `rtl`, …) plus Fabricator dimensions (`density`, `surface`, `motion`).
- Works with the official CLI as-is: `bunx --bun shadcn@latest init https://fabricator-ui.com/init?base=base` or `--preset <url>`.
- `/init.md` returns manual install instructions for agents and for people who don't use the CLI.

### 5.4 Presets
- Ship named Fabricator presets in `public/r/config.json`, for example `fabricator`, `fabricator-compact`, `fabricator-square`, `fabricator-pill`.
- **Do not reuse shadcn's preset code format.** It is a frozen bit layout with shadcn-only enums, so it cannot carry our dimensions. Use **readable preset URLs** (`/init?preset=fabricator&radius=pill`). If short codes are wanted later, define a separate codec in `packages/cli`, prefixed `f…` to avoid collisions.

### 5.5 Discovery and listing
- [ ] Submit `@fabricator` to the `apps/v4/registry/directory.json` PR. Requirements:
  - public, flat (`/r/registry.json` + `/r/<name>.json`)
  - no `content` in catalog `files`
  - passes `pnpm validate:registries` in their repo
  - Use the **blend-mode** URL with `{style}` for the directory entry.
- [ ] Root `registry.json` (with `include`) so GitHub addressing works: `bunx --bun shadcn add gabrielespinheira/fabricator-ui/<item>`.
- [ ] Keep Registry Health green: HTTPS, JSON content-type, unique names, every item passing `shadcn add --dry-run`. Add our own CI check that mimics theirs.
- [ ] Optional: dynamic search (`?q=`) once the catalog grows past a few hundred items.

### 5.6 Item naming
- Upstream replacements use the **same names** (`button`, `dialog`, `sidebar`, …) per D7.
- Exclusive components use descriptive, unprefixed names (`surface`, `stepper`, …). Each name is checked against upstream's list so a future shadcn component never collides with an existing Fabricator one. If it does collide, the upstream one wins and ours is renamed in a major version.
- Blocks: `<category>-<nn>` (`login-01`), matching upstream.
- Examples: `<component>-example` / `<component>-demo` (MCP's `get_item_examples_from_registries` searches these patterns).

### 5.7 Versioning
- The site serves the latest version. Breaking registry changes are announced in the changelog with a migration guide, the same way shadcn handles them.
- Optional channel URLs: `/r/next/…` (canary) and `/r/v1/…` (frozen), selectable through `components.json` `registries` URL or `params.version`.

### 5.8 Headless package (later, optional)
Mirror upstream's `@shadcn/react` pattern: complex stateful logic ships as an npm package (`@fabricator-ui/react/<primitive>`), while the styled wrapper is a copy-in registry file listing it in `dependencies`. Only use this for components whose logic users should not fork, such as virtualisation or complex gestures.

---

## 6. Fabricator design system layer

Starting point is `tmp/TODO.md`: Colors, Surfaces, Radius (square | rounded | pill), Icon pack, Size (default | compact), Theme (system | dark | light), and Motion. Inspiration sources are listed in `tmp/README.md` (fluidfunctionalism, kibo-ui, skiper-ui, magicui, …).

### 6.1 Token contract
- **Never rename or remove shadcn tokens:**
  - `background`, `foreground`
  - `card`, `popover`, `primary`, `secondary`, `muted`, `accent` (each with `-foreground`)
  - `destructive`, `border`, `input`, `ring`
  - `chart-1…5`
  - `sidebar-*`
  - `radius` and the derived `--radius-sm…4xl`
  - `font-sans`, `font-heading`, `font-mono`

  Every upstream and third-party component depends on these names.
- **Add Fabricator tokens** with distinct names, delivered through the `cssVars` of the items that need them, so blend-mode users receive them only when required:
  - Surfaces: `--surface-sunken`, `--surface`, `--surface-raised`, `--surface-overlay` (+ foregrounds), in light and dark
  - Elevation: `--shadow-*`
  - Motion: `--motion-duration-{fast,base,slow}`, `--motion-ease-{standard,emphasized,spring}`, respecting `prefers-reduced-motion`
  - Density: `--control-height-{sm,md,lg}` (optional, if compact mode is token-driven rather than style-driven)
- Colors are OKLCH, and every pair is checked for WCAG AA contrast in CI (script in `apps/web/scripts`).

### 6.2 Mapping each TODO dimension
| Dimension | Mechanism |
|---|---|
| Colors | Theme `cssVars` (base color + accent), delivered by the `/init` payload and `registry:theme` items (`@fabricator/theme-<x>`). |
| Surfaces | New tokens (above) plus `Surface` component(s). Style map classes use `bg-surface-raised` etc. |
| Radius: square / rounded | `--radius` token (`0` vs default). No recompile needed. |
| Radius: pill | **Style-level.** Needs `rounded-full` on controls, not a bigger `--radius`, so it is a style variant (`style-fabricator-pill.css` or `@apply` overrides layered on `style-fabricator.css`). |
| Size: default / compact | **Style-level**, the same way shadcn splits `luma`/`rhea` and `vega`/`nova`. Ship `fabricator` and `fabricator-compact` style maps. |
| Theme: system / dark / light | `next-themes` (Next) or the documented provider for Vite and others. Docs pages mirror upstream's `dark-mode/*` pages. |
| Icon pack | Reuse upstream `IconPlaceholder` and CLI `iconLibrary` (lucide, tabler, hugeicons, phosphor, remixicon). A custom Fabricator icon pack would need a new placeholder attribute, which the shadcn CLI does not support. Option: ship icons as a `registry:ui` `icons` item, resolved to lucide by default. |
| Motion | Tokens plus `tw-animate-css`. Optional `motion` (Framer) only in exclusive components that need springs, listed as an item dependency. |
| Fonts | Reuse shadcn `registry:font` items (bare `font-inter` works), or publish our own `@fabricator/font-*`. |

### 6.3 Style authoring workflow
1. Copy `style-nova.css` → `style-fabricator.css`, keeping all ~420 `cn-*` selectors.
2. Redesign component by component in the docs site. Use the `/preview/[base]/[name]` route and a Storybook-like "sink" page (upstream has `internal/sink`) that renders every component in every state.
3. Use the build script to diff compiled output against nova so changes stay intentional.
4. Exclusive components ship `cn-*` rules for **all 8 upstream styles + Fabricator styles**, so they work in blend mode. A lint script fails the build if any `cn-*` class used in source is missing from any style map.

---

## 7. The `fabricator-ui` CLI (`packages/cli`)

### 7.1 Package
- `name: "fabricator-ui"`, `bin: { "fabricator-ui": "./dist/index.js" }` with a `#!/usr/bin/env node` shebang, ESM. Built with `bun build ./src/index.ts --target=node --format=esm --outdir=dist` (or tsup if bundling edge cases appear). `engines.node >= 20.18.1`. It must not use Bun-only APIs (`Bun.*`, `bun:*`), because most users will run it under Node.
- Deps: `shadcn` (pinned, e.g. `4.21.x`; bumped deliberately with a test run), `commander`, `prompts`/`@clack/prompts`, `execa`, `zod`, `kleur`.
- Usage (all supported for users): `bunx --bun fabricator-ui@latest <cmd>`, `npx fabricator-ui@latest …`, `pnpm dlx fabricator-ui …`, `yarn dlx fabricator-ui …`. CI runs the e2e suite under both Node and Bun.

### 7.2 Commands
| Command | Behaviour |
|---|---|
| `init [--template next\|vite\|start\|react-router\|astro] [--base base\|radix\|aria] [--preset <name>] [--monorepo] [--rtl]` | Builds the `https://fabricator-ui.com/init?...` URL from flags or prompts, then runs `shadcn init <url> [flags]`. In an existing shadcn project, offers to **add the `@fabricator` registry** (`shadcn registry add @fabricator=<url>`) without touching the theme, or to apply the Fabricator theme (`shadcn apply --preset <url>`). |
| `add <items…>` | Rewrites bare names to `@fabricator/<name>` (`--shadcn` keeps upstream), then runs `shadcn add`. Passes through `--overwrite`, `--all`, `--path`, `--dry-run`, `--diff`, `--view`. |
| `apply [preset]` | Runs `shadcn apply --preset <fabricator-url>`, with `--only theme,font` passed through. |
| `search` / `list` / `view` / `docs` | Run the shadcn commands scoped to `@fabricator`. |
| `diff [item]` | Runs `shadcn add @fabricator/<item> --diff` to show upstream changes against local edits. |
| `doctor` | Runs `shadcn info --json` and checks: Tailwind v4, React 19, `components.json` valid, `@fabricator` registry configured, the `style` field is a valid shadcn style, `shadcn/tailwind.css` imported, Fabricator tokens present. Prints fixes. |
| `mcp` / `mcp init --client …` | Writes MCP config for `bunx --bun shadcn@latest mcp` with the `@fabricator` registry present (shadcn's MCP server already reads `components.json` registries). |
| `upgrade` | Re-installs all Fabricator items present in the project with `--diff` review (a later phase). |

### 7.3 Implementation notes
- Locate the shadcn binary with `require.resolve("shadcn/package.json")` and run it with `execa(process.execPath, [bin, ...args], { stdio: "inherit" })`. Forward exit codes and signals.
- Respect the package manager detected from `npm_config_user_agent` (shadcn already does this inside).
- Telemetry: none by default.
- Tests (`packages/tests`): for each upstream template (`next-app`, `vite-app`, `start-app`, `react-router-app`, `astro-app`, + monorepo variants):
  1. `fabricator-ui init`
  2. `add --all` against a **locally served registry** (`REGISTRY_URL` and our own `FABRICATOR_REGISTRY_URL` env override)
  3. `tsc --noEmit`
  4. `build`

  Run in CI on a matrix of base × template.

---

## 8. The website (`apps/web`)

### 8.1 Stack
Next 16 (App Router, Turbopack), React 19.2, Tailwind 4.3, Fumadocs 16 (core/ui/mdx), rehype-pretty-code + shiki, next-themes, jotai, nuqs, `@vercel/analytics`, `next/og`. Hosted on **Vercel**. `bun run build` = `registry:build && next build`. Vercel detects `bun.lock` and installs with Bun.

### 8.2 Information architecture
| Route | Content |
|---|---|
| `/` | Landing: hero (possibly the Three.js fabricator scene from `tmp/`, lazy-loaded with a static poster fallback), value props, live component grid, install command. |
| `/docs` | Introduction, Installation (next, vite, react-router, tanstack-start, astro, laravel, manual), `components.json`, Theming and tokens, Design system (Surfaces, Radius, Size, Motion, Color), Dark mode, RTL, CLI, Registry (how to consume `@fabricator`, use in an existing shadcn project, blend vs Fabricator mode), MCP, Agent skills, Figma (later), Changelog. |
| `/docs/components/[base]/[name]` | One page per component per base, with a **base switcher** (Base UI / Radix / React Aria). Sections: Preview + code, Installation (CLI tabs plus a Manual tab with full source), Usage, Composition tree, Examples, API reference (props tables), Accessibility, Changelog notes. |
| `/blocks`, `/blocks/[category]` | Block viewer: iframe at desktop/tablet/mobile widths, resizable panel, code view with file tree, copy CLI command. |
| `/charts/[type]` | Chart gallery (area, bar, line, pie, radar, radial, tooltip). |
| `/create` | Fabricator preset designer: base, style (fabricator / compact / pill), color, surface, radius, font, icon library, motion, RTL. Live iframe preview through `postMessage`. Outputs the `bunx --bun fabricator-ui init --preset …` command, the raw `bunx --bun shadcn init <url>` command, and a share URL. |
| `/colors` | Token and palette browser (OKLCH values, copy as CSS var / Tailwind class). |
| `/docs/*.md`, `/llms.txt`, `/llms-full.txt` | AI-friendly exports. Upstream has no `llms-full.txt`; we can add one. |
| `/r/**` | Registry JSON (§5). |
| `/init`, `/init.md` | CLI init payload (§5.3). |
| `/schema/*.json` | Re-host or link shadcn's schemas. Items keep `$schema: https://ui.shadcn.com/schema/registry-item.json`. |
| `/og`, `/sitemap.xml`, `/robots.txt`, `/rss.xml` | SEO and syndication. |

### 8.3 Site components to port from upstream (`apps/v4/components/*`)
`component-preview`, `component-preview-tabs`, `component-source`, `code-block-command` (package-manager tabs), `code-tabs` (CLI/Manual), `copy-button`, `docs-base-switcher`, `block-viewer`, `block-display`, `chart-display`, `command-menu` (⌘K, `/`, with ⌘C to copy an add command), `docs-sidebar`, `docs-toc`, `docs-copy-page` (copy markdown, open in ChatGPT/Claude/v0), `theme-provider` (with the "d" hotkey), `mode-switcher`, `site-header`/`footer`, `open-in-v0-button` (v0 accepts any registry item URL).

Supporting libs: `lib/registry.ts`, `lib/highlight-code.ts` (shiki + package-manager transformer + LRU cache), `lib/format-code.ts` (rewrite internal imports to `@/components/ui/*`), `lib/llm.ts` (inline demo source into markdown), `lib/source.ts` (Fumadocs loader), `lib/page-tree.ts` (per-base filtering).

Re-skin all of these with the Fabricator design. The site should be the flagship demo of the system.

### 8.4 Quality targets
- Lighthouse ≥ 95 on docs pages. Previews are lazy and code is highlighted on the server.
- All docs pages statically generated (`force-static` + `generateStaticParams`).
- Visual regression screenshots per component × base × style (Playwright; upstream has `registry:capture` scripts to borrow).
- Accessibility: axe checks on every example page in CI; keyboard and screen-reader notes in each component doc.

---

## 9. Component inventory (Phase 1 clone scope)

Everything below is vendored from upstream `apps/v4/registry/bases/*` at the pinned SHA. Columns show the primitive per base (R = `radix-ui`, B = `@base-ui/react`, A = `react-aria-components`, — = plain HTML).

| Component | R / B / A | Extra npm deps | registryDependencies |
|---|---|---|---|
| accordion | R/B/A | | |
| alert | —/—/— | | |
| alert-dialog | R/B/A | | button |
| aspect-ratio | R/—/— | | |
| attachment | R/B/— | | button |
| avatar | R/B/— | | |
| badge | R/B/— | | |
| breadcrumb | R/B/A | | |
| bubble | R/B/— | | |
| button | R/B/A | | |
| button-group | R/B/— | | separator |
| calendar | R/B/A | react-day-picker, date-fns (R/B) | button (+select on aria) |
| card | — | | |
| carousel | — | embla-carousel-react | button |
| chart | — | recharts@3.8 | card |
| checkbox | R/B/A | | |
| collapsible | R/B/A | | |
| combobox | B/B/A | | button, input-group |
| command | R/B/A | cmdk (R/B) | dialog, input-group |
| context-menu | R/B/A | | |
| dialog | R/B/A | | button |
| direction | R/B/A | | |
| drawer | vaul / B / B | | |
| dropdown-menu | R/B/A | | |
| empty | — | | |
| field | — | | label, separator |
| form | (nyv4 only: react-hook-form, zod) | | |
| hover-card | R/B/A | | |
| input | —/B/A | | |
| input-group | —/—/A | | button, input, textarea |
| input-otp | — | input-otp | |
| item | R/B/A | | separator |
| kbd | —/—/A | | |
| label | R/—/A | | |
| marker | R/B/— | | |
| menubar | R/B/✗ | | |
| message | — | | |
| message-scroller | — | @shadcn/react | button |
| native-select | — | | |
| navigation-menu | R/B/✗ | | |
| pagination | — | | button |
| popover | R/B/A | | |
| progress | R/B/A | | |
| questionnaire | — | @shadcn/react | button |
| radio-group | R/B/A | | |
| resizable | — | react-resizable-panels@4 | |
| scroll-area | R/B/— | | |
| select | R/B/A | | |
| separator | R/B/A | | |
| sheet | R/B/A | | button |
| sidebar | R/B/A | | button, separator, sheet, tooltip, input, use-mobile, skeleton |
| skeleton | — | | |
| slider | R/B/A | | |
| sonner | — | sonner, next-themes | (Radix/Aria; Base uses `toast`) |
| spinner | — | | |
| switch | R/B/A | | |
| table | —/—/A | | |
| tabs | R/B/A | | |
| textarea | —/—/A | | |
| toast | ✗/B/✗ | | button |
| toggle | R/B/A | | |
| toggle-group | R/B/A | | toggle |
| tooltip | R/B/A | | |

Plus:
- **lib:** `utils` (`cn`)
- **hook:** `use-mobile`
- **blocks per base:** login-01…05, signup-01…05, dashboard-01 (@dnd-kit, @tanstack/react-table, zod), sidebar-01…16, preview-01…03
- **charts:** 70 items (area/bar/line/pie/radar/radial/tooltip), currently only in `new-york-v4`. Port them into the base trees or keep a `new-york-v4` compatibility tree.
- **themes:** 24, **fonts:** 26 × 2, **examples:** ~500 per base

**Two dependencies to decide on early:**
- `message-scroller` and `questionnaire` depend on **`@shadcn/react`**. Either keep that dependency (it's MIT and on npm, which is simplest) or re-home the logic into `@fabricator-ui/react` later.
- The chat components (`message`, `bubble`, `attachment`, `marker`, `message-scroller`) are documented together with `@shadcn/helpers` (AI-SDK mocks). Mirror those docs only if we keep chat as a focus.

### 9.1 Fabricator-exclusive component backlog (to be confirmed)
Candidates that fit the TODO and inspiration list and are absent upstream: Surface/Panel system, Segmented control, Stepper, Timeline, Stat/KPI card, Tag input, File dropzone, Color picker, Number input/stepper, Date-range picker (preset ranges), Rating, Tree view, Kanban, Sortable list, Virtualised list/table, Code block (shiki), Copy button, Marquee, Animated number, Dock, Spotlight/command palette variants, Motion primitives (reveal, stagger, morph), Toolbar, Banner/Announcement bar, Rich-text editor (later). Each one goes through §10's Definition of Done.

---

## 10. Definition of Done (per component)

- [ ] Source in `registry/bases/base` (required), plus `radix` and `aria` (or a documented fallback).
- [ ] Uses `cn-*` placeholders. Rules exist in **every** style map (8 upstream + Fabricator). The lint check passes.
- [ ] `data-slot` on every part. API superset of upstream if it replaces one (D7).
- [ ] `IconPlaceholder` for all icons. Logical (RTL-safe) classes, or `cn-rtl-flip` where needed.
- [ ] `"use client"` only if interactive. No `forwardRef`.
- [ ] Item declared with deps, namespaced `registryDependencies`, `meta.links`, `categories`, `description`.
- [ ] ≥ 1 `*-example` demo per variant or state. Docs page per base with props table and accessibility notes.
- [ ] `shadcn add --dry-run` succeeds for every base × style. CLI e2e installs it into every template and the result typechecks and builds.
- [ ] axe passes. Keyboard navigation verified. `prefers-reduced-motion` respected.
- [ ] Visual snapshots approved (light/dark, LTR/RTL).
- [ ] Changelog entry.

---

## 11. Upstream sync process

1. `bun run sync:upstream --ref <sha|tag>` sparse-clones `shadcn-ui/ui` and copies the manifest paths into the `upstream/shadcn` branch:
   - `apps/v4/registry/{bases,styles,themes.ts,base-colors.ts,fonts.ts,config.ts,bases.ts,styles.tsx}`
   - `apps/v4/examples/**`
   - selected `apps/v4/components/*` and `lib/*` for the site
   - `apps/v4/content/docs/components/**`
   - `apps/v4/scripts/build-registry.mts`

   It rewrites `apps/v4/` → `apps/web/` and commits with the SHA in the message and `upstream.lock.json`.
2. Merge `upstream/shadcn` into `main` and resolve conflicts. Our changes mostly live in **new files** (`style-fabricator.css`, tokens, exclusive items, site re-skin), which keeps conflicts small.
3. Run the parity and e2e suites, then release.
4. Cadence: check monthly, or on notable upstream changelog entries. Watch `apps/v4/content/docs/changelog/`.

---

## 12. Roadmap

### Phase 0: Repo foundation (≈ 1–2 days)
- [ ] `git init` hygiene: create `main` (repo is on `master` with no commits), add `.gitignore` (keep `tmp/` ignored), `LICENSE.md` (MIT + shadcn notice), `NOTICE.md`, `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.
- [ ] Bun workspaces + Turborepo + shared tsconfig, ESLint, Prettier, Changesets, commitlint, Husky/lefthook.
- [ ] GitHub repo, CI skeleton (lint, typecheck, test, build), Vercel project for `apps/web`, domain `fabricator-ui.com`.
- [ ] Reserve the npm name `fabricator-ui` (publish a 0.0.0 placeholder) and the `@fabricator-ui` npm org.

### Phase 1: Clone shadcn at parity (≈ 1–2 weeks)
- [ ] Write `scripts/sync-upstream.ts` and the `upstream/shadcn` vendor branch. Import the pinned SHA.
- [ ] Scaffold `apps/web` by porting the upstream v4 app (Next/Fumadocs config, layouts, preview components, build script), renamed and with shadcn branding removed.
- [ ] `registry:build` produces blend-mode output for all 3 bases × 8 styles.
- [ ] **Parity test:** for every item, compare our `public/r/<base>-<style>/<name>.json` file contents with `https://ui.shadcn.com/r/styles/<base>-<style>/<name>.json`, ignoring `meta.links` and paths. Must be 100% identical.
- [ ] `/init` endpoint returns a valid `registry:base`. `bunx --bun shadcn init http://localhost:3000/init` works in a fresh Next and Vite app and writes the `@fabricator` registry into `components.json`.
- [ ] `bunx --bun shadcn add @fabricator/button` works in an existing shadcn project (local `registries` override pointing at localhost).
- **Exit criteria:** the full upstream catalog is installable from our registry, every template builds, and the docs site renders every component page.

### Phase 2: Website MVP (≈ 1–2 weeks, overlaps with Phase 1)
- [ ] Landing, docs shell, sidebar, TOC, search (⌘K), dark mode, components pages with base switcher, blocks viewer, charts, changelog, OG images, sitemap, `llms.txt`, `.md` routes.
- [ ] Docs for: installation per framework, using Fabricator in an existing shadcn project, `components.json`, theming, CLI, registry, MCP.
- [ ] Deploy to Vercel (preview per PR). Monitor `/r/**` responses (JSON content-type, CORS `*`, caching headers).

### Phase 3: CLI (≈ 1 week)
- [ ] `packages/cli` with `init`, `add`, `apply`, `search/list/view/docs`, `diff`, `doctor`, `mcp`.
- [ ] e2e matrix in CI against a locally served registry (Node and Bun). Publish `0.1.0` from GitHub Actions: Changesets for versions and changelogs, `bun pm pack` to build the tarball, then `npm publish <tgz> --provenance --access public` using npm trusted publishing (OIDC, no long-lived token). `bun publish` has no provenance flag, which is why the final upload uses the npm binary that ships with Node on the CI runner. This is the only place npm is invoked.

### Phase 4: Fabricator design system v1 (≈ 2–4 weeks, iterative)
- [ ] Token spec (§6): colors, surfaces, radius, density, motion, typography. Contrast CI.
- [ ] `style-fabricator.css` (+ `-compact`, pill variant). Fabricator mode URLs. Fabricator presets in `/r/config.json`.
- [ ] `/create` designer for Fabricator dimensions.
- [ ] Re-skin the website with the design system.
- [ ] Decide the default icon library and fonts.

### Phase 5: Exclusive components (ongoing)
- [ ] Prioritise the §9.1 backlog. Ship each against the DoD (§10) with blend-mode style rules for all 8 shadcn styles.
- [ ] Optional `@fabricator-ui/react` headless package for complex logic.

### Phase 6: Launch and ecosystem
- [ ] PR to shadcn's `directory.json` for `@fabricator`. Verify Registry Health.
- [ ] `skills/fabricator` agent skill (`bunx --bun skills add gabrielespinheira/fabricator-ui`), modelled on `skills/shadcn` (rules for styling, forms, composition, icons, with Incorrect/Correct pairs). MCP docs.
- [ ] "Open in v0" buttons. Optional Fabricator starter templates (`templates/*`) usable with `shadcn init -t` equivalents through our CLI.
- [ ] Announce: README, docs, socials, and a showcase (Three.js hero).

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Upstream changes CLI internals or schema (it moves fast: v4 in 2026-03, Base UI default in 2026-07, `cn` package in 2026-09). | Pin `shadcn` in our CLI. Validate items with `shadcn/schema` at build. Parity and e2e suites run nightly against `shadcn@latest` to catch breakage early. |
| `@shadcn` built-in registry can't be overridden, so bare names in third-party items pull upstream components over ours. | D5/D6. `fabricator-ui add` rewrites bare names. Document that the CLI prompts before overwriting. `doctor` detects mixed sources. |
| Maintenance cost of 3 bases × N styles for exclusive components. | Base UI is the primary target, with fallbacks for the others. CI lint guarantees every `cn-*` rule exists in every style. Pure-HTML components share one source. |
| Build size and time from many combinations. | Cache by hash (upstream does this). Fabricator mode is built once per base. Route-level static generation if needed. |
| Legal and brand: copying shadcn's site and branding. | Keep the MIT notice. Remove all shadcn branding, logos, and copy from the site. Credit shadcn/ui prominently. |
| Registry downtime breaks installs. | Static CDN hosting on Vercel, the GitHub-registry fallback, and health monitoring. |

---

## 14. Open questions for you

1. **Bases:** ship all three (Base UI, Radix, React Aria) from day one as planned, or launch with Base UI + Radix and add Aria later?
2. **Upstream styles on the site:** should our docs keep showing all 8 shadcn styles (useful for blend-mode users), or only Fabricator styles plus a single "shadcn compatibility" toggle?
3. **Chat and AI components** (`message-scroller`, `questionnaire` via `@shadcn/react`): keep them as-is in v1?
4. **Exclusive components:** which 5–10 from §9.1 (or others) are the first priority?
5. ~~**GitHub org/repo name**~~ Answered: `gabrielespinheira/fabricator-ui`.
6. **Icon pack:** reuse the five supported libraries, or design a custom Fabricator set (§6.2 caveat)?

---

## Appendix A: Upstream reference paths (in `shadcn-ui/ui` @ `295a1f11`)

| Topic | Path |
|---|---|
| components.json + registry schemas | `packages/registry/src/registry/schema.ts` |
| Address resolution / namespaces / GitHub | `packages/registry/src/registry/{address,builder,fetcher,resolver,api,github*}.ts` |
| Install transforms | `packages/registry/src/utils/transformers/*`, `packages/registry/src/utils/updaters/*` |
| Framework detection | `packages/registry/src/utils/get-project-info.ts`, `utils/frameworks.ts` |
| CLI commands | `packages/shadcn/src/commands/*` (init merges `registry:base` config at `init.ts` `mergeConfig`) |
| Presets | `packages/shadcn/src/preset/*`, `packages/registry/src/preset/preset.ts` |
| Style map compiler | `packages/shadcn/src/styles/{create-style-map,transform-style-map}.ts` (exported via `shadcn/utils`) |
| Shared CSS | `packages/shadcn/src/tailwind.css` (`shadcn/tailwind.css`) |
| MCP server | `packages/shadcn/src/mcp/index.ts` |
| Registry source | `apps/v4/registry/**` (see `apps/v4/registry/README.md`) |
| Registry build | `apps/v4/scripts/build-registry.mts` |
| registry:base builder | `apps/v4/registry/config.ts` (`buildRegistryBase`, `buildRegistryTheme`) |
| Init endpoint | `apps/v4/app/(app)/(create)/init/route.ts` |
| Docs previews | `apps/v4/components/{component-preview,component-source,block-viewer}.tsx`, `apps/v4/lib/{registry,highlight-code,llm}.ts` |
| Directory | `apps/v4/registry/directory.json`, docs `apps/v4/content/docs/registry/*.mdx` |
| Templates | `templates/*`, `packages/shadcn/src/templates/*` |
| Agent skills | `skills/shadcn/*`, `skills/migrate-radix-to-base/*` |

## Appendix B: Commands users will run

```bash
# New project with the Fabricator look
bunx --bun fabricator-ui@latest init -t next
#   = bunx --bun shadcn@latest init "https://fabricator-ui.com/init?base=base&preset=fabricator" -t next

# Existing shadcn project: just add components (blend mode, auto-discovered namespace)
bunx --bun shadcn@latest add @fabricator/stepper

# Existing shadcn project: adopt the Fabricator theme
bunx --bun fabricator-ui@latest apply fabricator

# Browse
bunx --bun shadcn@latest search @fabricator -q date
bunx --bun shadcn@latest view @fabricator/button

# GitHub fallback (no site needed)
bunx --bun shadcn@latest add gabrielespinheira/fabricator-ui/button
```
