import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { loadDuotoneIcons } from "./duotone"

describe("loadDuotoneIcons", () => {
  it("splits each file into the outline and its secondary layer", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "duotone-"))
    fs.writeFileSync(
      path.join(directory, "square.svg"),
      '<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><g id="secondary"><rect x="5" y="5" width="14" height="14"/></g></svg>'
    )
    expect(loadDuotoneIcons(directory)).toEqual([
      {
        name: "square",
        node: [
          ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
        ],
        secondary: [["rect", { x: "5", y: "5", width: "14", height: "14" }]],
      },
    ])
    fs.rmSync(directory, { recursive: true, force: true })
  })

  it("returns nothing while no duotone icon is drawn", () => {
    expect(loadDuotoneIcons(path.join(os.tmpdir(), "no-duotone-here"))).toEqual(
      []
    )
  })
})
