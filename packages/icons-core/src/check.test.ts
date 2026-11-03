import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { checkDuotone, checkOriginals, checkSources } from "./check"

const svg = (children: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${children}</svg>`

const directories: string[] = []
function sources(files: Record<string, string>) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-check-"))
  directories.push(directory)
  for (const [file, content] of Object.entries(files))
    fs.writeFileSync(path.join(directory, file), content)
  return directory
}
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})

describe("checkSources", () => {
  it("passes for the committed sources", () => {
    expect(checkSources()).toEqual([])
  })
})

describe("checkOriginals", () => {
  it("accepts an original that follows the spec", () => {
    const directory = sources({
      "panel-toggle.svg": svg(
        '<rect x="3" y="3" width="18" height="18" rx="2"/>'
      ),
      "panel-toggle.json": JSON.stringify({
        tags: ["sidebar"],
        categories: ["layout"],
      }),
    })
    expect(checkOriginals(directory)).toEqual([])
  })

  it("refuses names Lucide uses, brand names and unknown categories", () => {
    const directory = sources({
      "house.svg": svg('<rect x="3" y="3" width="18" height="18" rx="2"/>'),
      "house.json": JSON.stringify({
        tags: ["home"],
        categories: ["buildings"],
      }),
      "github-star.svg": svg(
        '<rect x="3" y="3" width="18" height="18" rx="2"/>'
      ),
      "github-star.json": JSON.stringify({
        tags: ["star"],
        categories: ["nowhere"],
      }),
    })
    expect(checkOriginals(directory)).toEqual([
      'outline/github-star: "github" is a brand; brand marks go in sources/brands',
      "outline/github-star: unknown category nowhere",
      "outline/house: Lucide already uses this name; make ours an alias of Lucide's or rename it",
    ])
  })
})

describe("checkDuotone", () => {
  const square = '<rect width="18" height="18" x="3" y="3" rx="2" />'

  it("accepts the outline plus one closed secondary layer", () => {
    const directory = sources({
      "square.svg": svg(
        `${square}<g id="secondary"><rect x="5" y="5" width="14" height="14"/></g>`
      ),
    })
    expect(checkDuotone(directory)).toEqual([])
  })

  it("refuses open shapes and a changed outline", () => {
    const directory = sources({
      "square.svg": svg(
        '<rect width="18" height="18" x="3" y="3"/><g id="secondary"><path d="M5 5h4"/></g>'
      ),
    })
    expect(checkDuotone(directory)).toEqual([
      "duotone/square: the outline part must equal the outline icon",
      "duotone/square: <path> in the secondary layer must be a closed shape",
    ])
  })
})
