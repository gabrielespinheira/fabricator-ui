import { describe, expect, it } from "vitest"

import {
  DEFAULT_LOADER,
  isLoaderName,
  LOADER_CSS,
  LOADER_NAMES,
  LOADER_ROOT_VARS,
  LOADERS,
} from "../loader"

describe("loaders", () => {
  it("defaults to the skeleton", () => {
    expect(DEFAULT_LOADER).toBe("skeleton")
    expect(LOADER_ROOT_VARS.loader).toBe("skeleton")
  })

  it("sets the same tokens in every loader", () => {
    const [first, ...rest] = LOADER_NAMES.map((name) =>
      Object.keys(LOADERS[name]).sort()
    )
    for (const tokens of rest) expect(tokens).toEqual(first)
  })

  it("names itself in --loader, for code that reads it", () => {
    for (const name of LOADER_NAMES) expect(LOADERS[name].loader).toBe(name)
  })

  it("times the blueprint trace by the reveal role and the motion scale", () => {
    expect(LOADERS.blueprint["loader-trace"]).toContain("var(--motion-reveal)")
    expect(LOADERS.blueprint["loader-trace"]).toContain(
      "var(--motion-scale, 1)"
    )
  })

  it("draws a blueprint control as its outline: no fill, no pattern", () => {
    expect(LOADERS.blueprint["loader-control-fill"]).toBe("transparent")
    expect(LOADERS.blueprint["loader-control-animation"]).toBe("none")
    expect(LOADERS.blueprint["loader-outline"]).not.toBe("transparent")
    expect(Object.keys(LOADERS.blueprint).join(" ")).not.toMatch(/image/)
  })

  it("keeps layout calm with either loader: the skeleton's block", () => {
    for (const name of LOADER_NAMES) {
      expect(LOADERS[name]["loader-fill"]).toBe(LOADERS.skeleton["loader-fill"])
      expect(LOADERS[name]["loader-animation"]).toBe("var(--animate-pulse)")
    }
  })

  it("keeps the skeleton's look for controls too: no outline, no pen", () => {
    expect(LOADERS.skeleton["loader-control-fill"]).toBe("var(--hover)")
    expect(LOADERS.skeleton["loader-outline"]).toBe("transparent")
    expect(LOADERS.skeleton["loader-trace"]).toBe("none")
  })

  it("switches with data-loader and a utility, and ships the trace", () => {
    expect(
      LOADER_CSS[':root[data-loader="blueprint"], [data-loader="blueprint"]']
    ).toMatchObject({ "--loader": "blueprint" })
    expect(LOADER_CSS["@utility loader-skeleton"]).toMatchObject({
      "--loader": "skeleton",
    })
    expect(Object.keys(LOADER_CSS)).toEqual(
      expect.arrayContaining([
        "@keyframes fabricator-loader-trace",
        "@property --loader-head",
        "@property --loader-tail",
      ])
    )
  })

  it("recognises a loader name", () => {
    expect(isLoaderName("blueprint")).toBe(true)
    expect(isLoaderName("spinner")).toBe(false)
  })
})
