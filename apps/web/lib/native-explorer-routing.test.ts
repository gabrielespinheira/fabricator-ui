import { describe, expect, it } from "vitest"

import {
  getComponentDocsUrl,
  getComponentInstallCommand,
  getPathFromUrl,
} from "../../mobile/src/library/library-model"

describe("native explorer routes", () => {
  it("opens Icons and components without accepting nonexistent icon routes", () => {
    expect(getPathFromUrl("fabricator-ui://icons")).toBe("/icons")
    expect(getPathFromUrl("fabricator-ui://components/color-picker")).toBe(
      "/components/color-picker"
    )
    expect(getPathFromUrl("fabricator-ui://icons/missing")).toBeNull()
  })
  it("gives composed examples valid installation and documentation targets", () => {
    expect(getComponentInstallCommand("data-table")).toBe(
      "npx fabricator-ui@latest add table button checkbox input"
    )
    expect(getComponentInstallCommand("typography")).toBe(
      "npx fabricator-ui@latest add text"
    )
    expect(getComponentDocsUrl("data-table")).toContain("/native/table")
  })
})
