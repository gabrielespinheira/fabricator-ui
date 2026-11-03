# @fabricator-ui/icons

Fabricator Icons for React: every [Lucide](https://lucide.dev) icon under its Lucide name, with identical geometry, plus 108 brand marks. Part of [Fabricator UI](https://fabricator-ui.vercel.app).

```sh
npm install @fabricator-ui/icons
```

React 19 or later. Icons are plain server-renderable components: no context, no `"use client"`.

## Outline icons

```tsx
import { HouseIcon } from "@fabricator-ui/icons"

<HouseIcon />
<HouseIcon size={16} strokeWidth={1.5} className="text-muted-foreground" />
```

Each icon is exported as `HouseIcon` and `House`, and Lucide's aliases (`HomeIcon`) are exported too, so moving from `lucide-react` is an import change.

| Prop                           | Default        | Notes                                                    |
| ------------------------------ | -------------- | -------------------------------------------------------- |
| `size`                         | `24`           | Width and height                                         |
| `color`                        | `currentColor` | Stroke colour                                            |
| `strokeWidth`                  | `2`            |                                                          |
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

## Licence

MIT for Fabricator's code; the outline icons are Lucide's, under ISC. See [LICENSE.md](./LICENSE.md).
