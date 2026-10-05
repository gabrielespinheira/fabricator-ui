import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  ensureRegistry,
  getBaseFromStyle,
  getCatalogStyle,
  readComponentsJson,
  withTemporaryRegistry,
} from "./config"

const URL = "https://fabricator-ui.com/r/fabricator/{style}/{name}.json"

let dir: string
const file = () => path.join(dir, "components.json")
const write = (value: unknown) =>
  writeFileSync(file(), `${JSON.stringify(value, null, 2)}\n`)
const read = () => readFileSync(file(), "utf8")

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "fabricator-cli-"))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("ensureRegistry", () => {
  it("reports a missing components.json", () => {
    expect(ensureRegistry(dir, URL)).toEqual({ status: "missing" })
  })

  it("reports invalid JSON without touching the file", () => {
    writeFileSync(file(), "{ nope")
    expect(ensureRegistry(dir, URL).status).toBe("invalid")
    expect(read()).toBe("{ nope")
  })

  it("adds the registry, keeps other keys and order, writes 2-space JSON", () => {
    write({
      style: "base-nova",
      tailwind: { css: "app/globals.css" },
      registries: { "@acme": "https://acme.dev/r/{name}.json" },
    })
    expect(ensureRegistry(dir, URL).status).toBe("added")
    expect(read()).toBe(
      `${JSON.stringify(
        {
          style: "base-nova",
          tailwind: { css: "app/globals.css" },
          registries: {
            "@acme": "https://acme.dev/r/{name}.json",
            "@fabricator": URL,
          },
        },
        null,
        2
      )}\n`
    )
  })

  it("creates the registries object when absent", () => {
    write({ style: "base-nova" })
    ensureRegistry(dir, URL)
    expect(JSON.parse(read())).toEqual({
      style: "base-nova",
      registries: { "@fabricator": URL },
    })
  })

  it("never clobbers an existing @fabricator entry", () => {
    const custom = {
      url: "https://mirror.example.com/r/{name}.json",
      headers: { Authorization: "x" },
    }
    write({ style: "base-nova", registries: { "@fabricator": custom } })
    const before = read()
    expect(ensureRegistry(dir, URL)).toEqual({
      status: "exists",
      url: custom.url,
    })
    expect(read()).toBe(before)
  })
})

describe("withTemporaryRegistry", () => {
  it("adds the registry during the callback and restores the file byte-for-byte", async () => {
    writeFileSync(file(), '{"style":"base-nova"}')
    const during = await withTemporaryRegistry(dir, URL, async () =>
      readComponentsJson(dir)
    )
    expect(
      during.exists && "config" in during && during.config.registries
    ).toEqual({ "@fabricator": URL })
    expect(read()).toBe('{"style":"base-nova"}')
  })

  it("restores even when the callback throws", async () => {
    writeFileSync(file(), '{"style":"base-nova"}')
    await expect(
      withTemporaryRegistry(dir, URL, async () =>
        Promise.reject(new Error("boom"))
      )
    ).rejects.toThrow("boom")
    expect(read()).toBe('{"style":"base-nova"}')
  })
})

describe("style helpers", () => {
  it("derives the base from a style id", () => {
    expect(getBaseFromStyle("base-nova")).toBe("base")
    expect(getBaseFromStyle("aria-luma")).toBe("aria")
    expect(getBaseFromStyle("new-york")).toBe("radix")
    expect(getBaseFromStyle("fabricator")).toBeUndefined()
    expect(getBaseFromStyle(undefined)).toBeUndefined()
  })

  it("falls back to base-nova for catalog lookups", () => {
    expect(getCatalogStyle({ style: "radix-vega" })).toBe("radix-vega")
    expect(getCatalogStyle({ style: "new-york" })).toBe("base-nova")
    expect(getCatalogStyle(undefined)).toBe("base-nova")
  })
})
