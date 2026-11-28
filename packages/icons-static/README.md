# @fabricator-ui/icons-static

The [Fabricator UI](https://fabricator-ui.vercel.app) icon library as standalone SVGs, sprites, JSON data and SVG strings, with a PNG exporter for desktop trays and menus. Browse the [Fabricator catalog](https://fabricator-ui.vercel.app/icons).

```sh
npm install @fabricator-ui/icons-static
```

## What's inside

| Path                                       | Content                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `icons/<name>.svg`                         | Rounded outline SVGs                                                 |
| `fill/<name>.svg` and `duotone/<name>.svg` | Filled and two-tone UI icons                                         |
| `brands/<name>.svg`                        | Brand marks in one colour (`currentColor`)                           |
| `brands/color/<name>.svg`                  | Brand marks in their own colours                                     |
| `sprite.svg`                               | Every outline icon as a `<symbol>`: `<use href="sprite.svg#house"/>` |
| `brands-sprite.svg`                        | Every brand mark as a `<symbol>`                                     |
| `icon-nodes.json`                          | Outline shapes per icon                                              |
| `icon-scales.json`                         | Outline artwork scale around the grid centre, defaults to 1          |
| `brand-nodes.json`                         | Brand shapes, art, colours and scale                                 |
| `tags.json`                                | Search tags per outline icon                                         |

SVG strings, for server templates and other frameworks:

```ts
import { House } from "@fabricator-ui/icons-static"
import { Github, GithubColor } from "@fabricator-ui/icons-static/brands"
```

## PNGs for desktop apps

Electron and Tauri render the app UI with the web packages. Trays, menus and notifications need raster images:

```sh
npm install --save-dev @resvg/resvg-js
npx fabricator-icons png house bell --size 16 --scale 1,2 --template --out src-tauri/icons/tray
```

`--template` writes black-on-transparent `<name>Template.png` and `<name>Template@2x.png`: Electron's `Tray` treats those as macOS template images, and Tauri takes them with `iconAsTemplate` (load PNGs with the `image-png` Cargo feature). Other options: `--set fill`, `--set duotone`, `--set brands`, `--color <css colour | brand>`, `--stroke <width>`.

Brand marks are trademarks of their owners. Read [BRANDS.md](./BRANDS.md) before using one.

## File icons

The `/files` entry exports 249 Charmed SVG strings, such as `FileTypescript`. The package includes `files/<name>.svg`, `files-sprite.svg`, and explicit `files/light/<name>.svg` and `files/dark/<name>.svg` variants for renderers without CSS support. Charmed Icons is MIT-licensed; see LICENSE.md.

## Licence

Fabricator's code and original artwork are MIT-licensed. Drawings derived from Lucide and Feather carry their upstream notices. See [LICENSE.md](./LICENSE.md).
