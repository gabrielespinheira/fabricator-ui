# @fabricator-ui/icons

The [Fabricator UI](https://fabricator-ui.vercel.app) icon library for React, with rounded Outline, Fill, Duotone and Animated icons, plus brand marks and file icons. Browse the [Fabricator catalog](https://fabricator-ui.vercel.app/icons).

```sh
npm install @fabricator-ui/icons
```

React 19 or later. Icons are plain server-renderable components: no context, no `"use client"`.

## UI icon weights

```tsx
import { BellIcon } from "@fabricator-ui/icons/animated"
import { PencilIcon } from "@fabricator-ui/icons/duotone"
import { BookmarkIcon } from "@fabricator-ui/icons/fill"

;<BellIcon variant="duotone" />
```

Each variant uses the same canonical names and aliases. All UI strokes are 1.75 units at 24px, including open paths and cutouts in Fill. With a numeric `size` and no `strokeWidth`, an icon picks a heavier stroke as it shrinks, so the line stays readable: 2.125 at 16px, 2.5 at 12px (`getAutoStrokeWidth`). Set `strokeWidth` to fix it.

## Outline icons

```tsx
import { HouseIcon } from "@fabricator-ui/icons"

<HouseIcon />
<HouseIcon size={16} strokeWidth={1.5} className="text-muted-foreground" />
```

Each icon is exported with and without the `Icon` suffix, for example `HouseIcon` and `House`. Catalog aliases such as `HomeIcon` resolve to the same component.

| Prop                           | Default        | Notes                                                    |
| ------------------------------ | -------------- | -------------------------------------------------------- |
| `size`                         | `24`           | Width and height                                         |
| `color`                        | `currentColor` | Stroke colour                                            |
| `strokeWidth`                  | By `size`      | 1.75 at 24px, heavier on smaller numeric sizes           |
| `absoluteStrokeWidth`          | `false`        | Keeps the stroke's pixel width at any size               |
| `nonScalingStroke`             | `false`        | Adds `vector-effect="non-scaling-stroke"` to every shape |
| `className`, any SVG attribute |                | `className` is merged after `fab-icon fab-icon-<name>`   |

Icons get `aria-hidden="true"` unless you give them `aria-label`, `aria-labelledby`, `title` or children such as `<title>`.

## Brand marks

```tsx
import { GithubIcon, GoogleIcon } from "@fabricator-ui/icons/brands"

<GithubIcon />                 // one colour, follows the text colour
<GoogleIcon color="brand" />   // the brand's own colours
```

`color="brand"` uses multi-colour art where the mark has it (the Google family, Figma, TikTok, YouTube, …), keeps black and near-black marks on the text colour, and lifts any hex that would vanish in dark mode. The switch is CSS `light-dark()`, so it follows `color-scheme`: next-themes sets it for you; apps that only toggle a `.dark` class add `.dark { color-scheme: dark }`.

Brand marks are trademarks of their owners. Read [BRANDS.md](./BRANDS.md) before using one.

## Names from data

```tsx
import { DynamicIcon } from "@fabricator-ui/icons/dynamic"
import { searchIcons } from "@fabricator-ui/icons/catalog"

<DynamicIcon name="house" fallback={null} />
<DynamicIcon set="brands" name="instagram" />

searchIcons("twitter", { set: "brands" }) // [{ name: "x", title: "X", … }]
```

`DynamicIcon` loads each icon on demand and renders `fallback` for names the set doesn't have. The catalog lists names, aliases, tags, categories and brand provenance; import it lazily, it covers every icon.

## Custom icons

```tsx
import { Icon, createIcon } from "@fabricator-ui/icons"

const Burger = createIcon({ name: "burger", node: [["path", { d: "M4 12h16" }]] })
<Icon data={{ name: "burger", node: [["path", { d: "M4 12h16" }]] }} />
```

## File icons

```tsx
import { FileTypeIcon, FileTypescriptIcon } from "@fabricator-ui/icons/files"

<FileTypeIcon name="page.tsx" />
<FileTypeIcon name="components" kind="folder" open />
<FileTypescriptIcon size={20} />
```

249 file and folder drawings from Charmed Icons (MIT), default size 16px. `getFileIconName` and `getFolderIconName` expose the case-insensitive filename associations. Colours follow CSS `color-scheme`; override `--file-icon-*` tokens to retint them. Direct imports tree-shake (about 1.4 KB min+gzip for TypeScript); `FileTypeIcon` includes all drawings and associations (about 138 KB min+gzip, React excluded).

## Licence

Fabricator's code and original artwork are MIT-licensed. Drawings derived from Lucide and Feather carry their upstream notices. See [LICENSE.md](./LICENSE.md).
