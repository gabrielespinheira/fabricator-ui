# Registry

Declaring items, building them, and which files are authored or generated. Endpoints that serve setup (`/init`, `/create`) are in [CLI.md](CLI.md).

## Authored and generated

Paths under `apps/web/`. Edit only the authored sources; rebuild the rest (contract 6).

| Authored                                                                   | What                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `registry/bases/{base,radix,aria}/`                                        | Components, blocks, hooks, libs, `_registry.ts`     |
| `registry/styles/fabricator/*.css`, `registry/styles/style-<upstream>.css` | Style maps                                          |
| `registry/fabricator/`                                                     | Foundations, overrides, extra items, design spec    |
| `registry/native/`, `registry/styles/native/*.css`, `examples/native/`     | The native tree                                     |
| `registry/{bases,styles,themes,fonts,config,presets}.ts`                   | Registry metadata, themes, presets, `registry:base` |
| `examples/{base,radix,aria}/*.tsx`                                         | Docs demos, flat folders                            |
| `content/docs/**`                                                          | MDX docs                                            |

| Generated, committed                                                                                                        | Generated, gitignored                          |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `registry/styles/style-fabricator.css`, `style-native.css`                                                                  | `styles/<base>-<style>/`, `styles/native/`     |
| `registry/**/__index__.tsx`, `__components__/`, `__blocks__.json`, `examples/__index__.tsx`, `examples/native/__index__.ts` | `public/r/**` (except small committed indexes) |
| `app/fabricator.css`, `lib/site-icons*.ts(x)`                                                                               | `examples/__styles__/`, `.upstream-registry/`  |

## Declaring an item

Items are objects in each folder's `_registry.ts`, typed `Registry["items"]` from `shadcn/schema` and validated at build time.

```ts
{
  name: "stepper",                   // kebab-case; upstream's name when it replaces one
  type: "registry:ui",
  title: "Stepper",
  description: "A multi-step progress indicator with keyboard navigation.",
  dependencies: [],                  // npm deps beyond the base's index item
  registryDependencies: ["@fabricator/button"],
  files: [{ path: "ui/stepper.tsx", type: "registry:ui" }],
  categories: ["navigation"],
  meta: { fabricator: true },        // true when the item doesn't exist upstream
}
```

- **Type:** `registry:ui` (primitive), `:component` (composed), `:block`, `:page` (route), `:hook`, `:lib`, `:theme` (tokens), `:base` (init payload), `:font`, `:file` / `:item` (config or agent files).
- `registry:page` and `registry:file` need an explicit `target`; blocks use `app/<route>/page.tsx`. The CLI remaps per framework.
- **Names:** blocks `<category>-<nn>` (`login-01`); examples `<component>-example` or `<component>-<intent>`. Check exclusive names against upstream's catalog.
- New tokens ship in the item's `cssVars` (`theme`, `light`, `dark`); new CSS (`@utility`, `@keyframes`) in `css`.

## Build

- **Pipeline:** placeholders + style map → `createStyleMap` / `transformStyle` from `shadcn/utils` → `shadcn build` (`apps/web/scripts/build-registry.mts`). The build also rewrites bare `registryDependencies` to `@fabricator/<name>` and points `meta.links` at this site.
- **Full build** (canonical, formatted; before committing): `bun run registry:build`. It includes the native build.
- **Targeted** (fast, unformatted, iteration only; in `apps/web`): `bun run registry:build --examples | --indexes | --style <id|all> | --registry <id|all>`.
- Editing an existing example needs no rebuild; adding, removing or renaming one needs `--examples`.
- The full `registry:native` rewrites `styles/native`; avoid it while others work in the tree (`--check` writes nothing).

## Output

| Output                         | Path                                                  | Served at                                  |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------ |
| Published items                | `public/r/styles/<base>-fabricator/<name>.json`       | `/r/fabricator/<base>-<style>/<name>.json` |
| The same with Fabricator Icons | `public/r/styles/icons-fabricator/<base>/<name>.json` | the same URL with `?icons=fabricator`      |
| Native items                   | `public/r/native/`                                    | `/r/fabricator/native/<name>.json`         |
| Upstream styles, parity only   | `.upstream-registry/<base>-<style>/<name>.json`       | never published                            |
| Catalogs                       | `public/r/registry.json`, `index.json`, `config.json` |                                            |

Rewrites are in `next.config.mjs`; the retired blend-mode URLs redirect to the Fabricator one. Endpoints under `/r/**` return `application/json` with permissive CORS and long CDN caching.

## Done when

- [ ] A full `bun run registry:build` ran; the committed indexes changed with it and nothing gitignored is staged.
- [ ] Every placeholder has a rule in every style map it needs (the build's coverage lint).
- [ ] `shadcn add --dry-run` of a new or changed item succeeds against the local registry for each base.
