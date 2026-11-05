import { describe, expect, it } from "vitest"

import {
  buildRootPackage,
  buildWebPackageForDesktop,
  withPins,
} from "./workspace-config"

describe("buildRootPackage", () => {
  const pkg = {
    name: "app",
    scripts: { build: "turbo build", dev: "turbo dev" },
  }

  it("starts only the web app from dev", () => {
    expect(
      buildRootPackage(pkg, { packageManager: "bun", hasDesktop: false })
        .scripts
    ).toEqual({ build: "turbo build", dev: "turbo run dev --filter=web" })
  })

  it("adds a script per app", () => {
    const { scripts } = buildRootPackage(pkg, {
      packageManager: "pnpm",
      hasDesktop: true,
      mobileReact: "19.3.0",
    })
    expect(scripts?.["dev:desktop"]).toBe(
      "turbo run dev --filter=web --filter=desktop"
    )
    expect(scripts?.["dev:mobile"]).toBe("cd apps/mobile && pnpm run start")
  })

  it("pins React and Babel for npm and bun, with a mobile app", () => {
    for (const packageManager of ["npm", "bun"] as const) {
      expect(
        buildRootPackage(pkg, {
          packageManager,
          hasDesktop: false,
          mobileReact: "19.3.0",
        }).overrides
      ).toEqual({
        react: "19.3.0",
        "react-dom": "19.3.0",
        "@babel/core": "^7.29.0",
      })
    }
  })

  it("uses yarn's field", () => {
    const root = buildRootPackage(pkg, {
      packageManager: "yarn",
      hasDesktop: false,
      mobileReact: "19.3.0",
    })
    expect(root.resolutions?.react).toBe("19.3.0")
    expect(root.overrides).toBeUndefined()
  })

  it("pins nothing for pnpm, or without a mobile app", () => {
    expect(
      buildRootPackage(pkg, {
        packageManager: "pnpm",
        hasDesktop: false,
        mobileReact: "19.3.0",
      }).overrides
    ).toBeUndefined()
    expect(
      buildRootPackage(pkg, { packageManager: "npm", hasDesktop: true })
        .overrides
    ).toBeUndefined()
  })
})

describe("withPins", () => {
  it("keeps what's pinned", () => {
    expect(
      withPins({ overrides: { a: "1" } }, "npm", { b: "2" }).overrides
    ).toEqual({ a: "1", b: "2" })
  })
})

describe("buildWebPackageForDesktop", () => {
  it("adds the static build script and what it needs", () => {
    const web = buildWebPackageForDesktop(
      { scripts: { build: "next build" }, devDependencies: { z: "1" } },
      "bun"
    )
    expect(web.scripts["build:static"]).toBe(
      "cross-env FABRICATOR_DESKTOP=1 bun run build"
    )
    expect(Object.keys(web.devDependencies)).toEqual(["cross-env", "z"])
  })
})
