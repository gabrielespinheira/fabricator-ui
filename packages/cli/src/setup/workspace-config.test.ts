import { describe, expect, it } from "vitest"

import {
  buildRootPackage,
  buildWebPackageForDesktop,
  buildWorkspaceRoot,
  getNativePeerPins,
  withPins,
} from "./workspace-config"

describe("buildRootPackage", () => {
  const pkg = {
    name: "app",
    scripts: { build: "turbo build", dev: "turbo dev" },
  }

  it("starts only the web app from dev", () => {
    expect(
      buildRootPackage(pkg, {
        packageManager: "bun",
        hasWebApp: true,
        runner: "turborepo",
        hasDesktop: false,
      }).scripts
    ).toEqual({ build: "turbo build", dev: "turbo run dev --filter=web" })
  })

  it("starts a lone mobile app, with no web app to run", () => {
    const { scripts } = buildRootPackage(buildWorkspaceRoot("app"), {
      packageManager: "npm",
      hasWebApp: false,
      runner: "turborepo",
      hasDesktop: false,
      mobileReact: "19.3.0",
    })
    expect(scripts).toEqual({
      "dev:mobile": "cd apps/mobile && npm run start",
    })
  })

  it("starts the apps with Vite+ when it runs the tasks", () => {
    const { scripts } = buildRootPackage(pkg, {
      packageManager: "bun",
      hasWebApp: true,
      runner: "vite-plus",
      hasDesktop: true,
    })
    expect(scripts?.dev).toBe("vp run --filter web dev")
    expect(scripts?.["dev:desktop"]).toBe(
      "vp run --parallel --filter web --filter desktop dev"
    )
  })

  it("adds a script per app", () => {
    const { scripts } = buildRootPackage(pkg, {
      packageManager: "pnpm",
      hasWebApp: true,
      runner: "turborepo",
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
          hasWebApp: true,
          runner: "turborepo",
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
      hasWebApp: true,
      runner: "turborepo",
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
        hasWebApp: true,
        runner: "turborepo",
        hasDesktop: false,
        mobileReact: "19.3.0",
      }).overrides
    ).toBeUndefined()
    expect(
      buildRootPackage(pkg, {
        packageManager: "npm",
        hasWebApp: true,
        runner: "turborepo",
        hasDesktop: true,
      }).overrides
    ).toBeUndefined()
  })
})

describe("buildWorkspaceRoot", () => {
  it("is a private workspace of the apps", () => {
    expect(buildWorkspaceRoot("acme")).toEqual({
      name: "acme",
      private: true,
      workspaces: ["apps/*"],
    })
  })
})

describe("withPins", () => {
  it("keeps what's pinned", () => {
    expect(
      withPins({ overrides: { a: "1" } }, "npm", { b: "2" }).overrides
    ).toEqual({ a: "1", b: "2" })
  })
})

describe("getNativePeerPins", () => {
  it("takes Expo's version of every native module a peer range would hoist", () => {
    expect(
      getNativePeerPins({
        "react-native-worklets": "0.13.0",
        "react-native-svg": "15.16.0",
        "expo-audio": "~1.0.0",
      })
    ).toEqual({
      "react-native-worklets": "0.13.0",
      "react-native-svg": "15.16.0",
    })
  })

  it("leaves out what Expo doesn't pin", () => {
    expect(getNativePeerPins({ "react-native-svg": "15.16.0" })).toEqual({
      "react-native-svg": "15.16.0",
    })
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
