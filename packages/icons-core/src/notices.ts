import fs from "node:fs"
import path from "node:path"

import { loadBrands } from "./brands"
import { readLock } from "./lock"
import { ANIMATED_SOURCES, BRAND_SOURCES, LUCIDE_SOURCES } from "./paths"
import { allowlistSchema, readJson } from "./schemas"

const MIT = `MIT License

Copyright (c) 2026 Fabricator UI contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`

/** The package licence: MIT for Fabricator's code, Lucide's ISC (and Feather's MIT) for the icons. */
export function licenseText({ animated = false } = {}) {
  const lucide = fs
    .readFileSync(path.join(LUCIDE_SOURCES, "LICENSE"), "utf8")
    .trim()
  const { lucide: lucideLock, animated: animatedLock } = readLock()
  const notice = `${MIT}

---

The outline icons come from Lucide ${lucideLock?.tag ?? "unknown"} (https://lucide.dev), used under
its licence, reproduced below. Brand marks are not covered by either licence:
see BRANDS.md.

${lucide}
`
  if (!animated) return notice
  const license = fs
    .readFileSync(path.join(ANIMATED_SOURCES, "LICENSE"), "utf8")
    .trim()
  return `${notice}
---

The animations in the \`/animated\` entry come from lucide-animated
(https://lucide-animated.com, ${animatedLock?.sha.slice(0, 7) ?? "unknown"}), used under its licence, reproduced
below.

${license}
`
}

/** The brand disclaimer, with every mark's source and licence, and the held marks with why. */
export function brandsText() {
  const brands = loadBrands()
  const allowlist = readJson(
    path.join(BRAND_SOURCES, "allowlist.json"),
    allowlistSchema
  )
  const held = allowlist.brands.filter((entry) => entry.held)
  const rows = brands.map(
    (brand) =>
      `| ${brand.title} | \`${brand.name}\` | ${brand.source}${brand.artSource ? `; art: ${brand.artSource}` : ""} | ${brand.license} | ${brand.guidelines ? `[guidelines](${brand.guidelines})` : ""} |`
  )
  return `# Brand marks

The brand marks in this package are trademarks of their owners. Including them
here does not imply any affiliation with, or endorsement by, those owners.

The package's MIT licence covers Fabricator's code, not the marks. Before you
use a mark, read its owner's brand guidelines, linked below where known, and
use it only to refer to that brand or its product.

Geometry is reproduced as the sources publish it. The only changes are a
uniform scale through the viewBox, so every mark sits at the same optical
size, and the colour you render it in.

To ask for a mark to be removed or updated, open an issue at
https://github.com/gabrielespinheira/fabricator-ui/issues. Removals ship in the
next patch release.

## Marks

| Brand | Name | Source | Licence | Guidelines |
| --- | --- | --- | --- | --- |
${rows.join("\n")}

## Credits

Some marks' licences ask for credit:

${brands
  .filter((brand) => brand.credit)
  .map((brand) => `- ${brand.title}: ${brand.credit}`)
  .join("\n")}

## Held

These marks are not included, because their owners' terms don't allow
redistributing them in a library like this one.

| Brand | Why |
| --- | --- |
${held.map((entry) => `| ${entry.title} | ${entry.held} |`).join("\n")}
`
}
