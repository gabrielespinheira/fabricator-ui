import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { buildSvg, exportPngs, renderSvgPng, resolveName } from "./png"

const directories: string[] = []
function outDir() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "icons-png-"))
  directories.push(directory)
  return directory
}
afterEach(() => {
  for (const directory of directories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true })
})

/** Width and height from a PNG's IHDR chunk. */
function dimensions(file: string) {
  const buffer = fs.readFileSync(file)
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
}

const defaults = {
  set: "outline" as const,
  size: 16,
  scales: [1, 2],
  color: "#000000",
  strokeWidth: 2,
  template: false,
}

describe("exportPngs", () => {
  it("rasterizes canonical SVG artwork at the requested native pixel size", async () => {
    const png = Buffer.from(
      await renderSvgPng(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="#4565d6"/></svg>',
        48
      )
    )
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([48, 48])
  })
  it("writes one file per scale at the right pixel size", async () => {
    const directory = outDir()
    const files = await exportPngs(["house"], {
      ...defaults,
      outDir: directory,
    })
    expect(files.map((file) => path.basename(file))).toEqual([
      "house.png",
      "house@2x.png",
    ])
    expect(files.map(dimensions)).toEqual([
      [16, 16],
      [32, 32],
    ])
  })

  it("names macOS template images and draws them black", async () => {
    const directory = outDir()
    const files = await exportPngs(["bell"], {
      ...defaults,
      color: "#ff0000",
      template: true,
      outDir: directory,
    })
    expect(files.map((file) => path.basename(file))).toEqual([
      "bellTemplate.png",
      "bellTemplate@2x.png",
    ])
    expect(
      buildSvg("bell", { ...defaults, color: "#ff0000", template: true })
    ).toContain('stroke="#000000"')
  })

  it("renders brand marks, in brand colours when asked", async () => {
    const directory = outDir()
    await exportPngs(["github"], {
      ...defaults,
      set: "brands",
      scales: [1],
      outDir: directory,
    })
    expect(fs.existsSync(path.join(directory, "github.png"))).toBe(true)
    expect(
      buildSvg("spotify", { ...defaults, set: "brands", color: "brand" })
    ).toContain('fill="#1ED760"')
  })

  it("accepts aliases and refuses unknown names", () => {
    expect(resolveName("home", "outline")).toBe("house")
    expect(() => resolveName("not-an-icon", "outline")).toThrow(/no icon named/)
  })
})

describe("gradient brand marks", () => {
  it("render their gradients to PNG", async () => {
    const directory = outDir()
    expect(
      buildSvg("firefox", { ...defaults, set: "brands", color: "brand" })
    ).toContain("<radialGradient")
    const [file] = await exportPngs(["firefox"], {
      ...defaults,
      set: "brands",
      color: "brand",
      scales: [1],
      outDir: directory,
    })
    expect(fs.statSync(file ?? "").size).toBeGreaterThan(500)
  })
})
