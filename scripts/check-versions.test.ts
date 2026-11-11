import { describe, expect, test } from "vitest"

import { getVersionProblems } from "./check-versions"

const manifest = (version: string) => JSON.stringify({ name: "x", version })

function createFiles(version: string): Record<string, string> {
  return {
    "package.json": JSON.stringify({
      name: "root",
      private: true,
      version,
      workspaces: ["apps/web", "packages/*"],
    }),
    "apps/web/package.json": manifest(version),
    "packages/cli/package.json": manifest(version),
    "apps/desktop/src-tauri/tauri.conf.json": JSON.stringify({ version }),
    "apps/desktop/src-tauri/Cargo.toml": `[package]\nname = "desktop"\nversion = "${version}"\n`,
    "bun.lock": `{\n  "workspaces": {\n    "": {\n      "name": "root",\n    },\n    "apps/web": {\n      "name": "web",\n      "version": "${version}",\n    },\n  },\n}\n`,
    "CHANGELOG.md": `# Changelog\n\n## [${version}](https://example.com) (2026-11-11)\n\n### Features\n`,
  }
}

const check = (files: Record<string, string>, branch?: string) =>
  getVersionProblems({
    read: (path) => files[path] ?? null,
    paths: Object.keys(files),
    branch,
  })

describe("getVersionProblems", () => {
  test("passes when every version file follows the root version", () => {
    expect(check(createFiles("0.7.0"))).toEqual([])
  })

  test("names a workspace manifest left behind", () => {
    const files = {
      ...createFiles("0.7.0"),
      "packages/cli/package.json": manifest("0.6.0"),
    }
    expect(check(files)).toEqual([
      "packages/cli/package.json is 0.6.0, not 0.7.0",
    ])
  })

  test("names stale native and lockfile versions", () => {
    const stale = createFiles("0.6.0")
    const files = {
      ...createFiles("0.7.0"),
      "apps/desktop/src-tauri/Cargo.toml":
        stale["apps/desktop/src-tauri/Cargo.toml"] ?? "",
      "bun.lock": stale["bun.lock"] ?? "",
    }
    expect(check(files)).toEqual([
      "apps/desktop/src-tauri/Cargo.toml is 0.6.0, not 0.7.0",
      "bun.lock lists apps/web at 0.6.0, not 0.7.0",
    ])
  })

  test("leaves scaffold templates on their own versions", () => {
    const files = {
      ...createFiles("0.7.0"),
      "packages/cli/templates/desktop-tauri/src-tauri/Cargo.toml": `[package]\nname = "app"\nversion = "0.1.0"\n`,
    }
    expect(check(files)).toEqual([])
  })

  test("requires the changelog to open with the current version", () => {
    const files = {
      ...createFiles("0.7.0"),
      "CHANGELOG.md": createFiles("0.6.0")["CHANGELOG.md"] ?? "",
    }
    expect(check(files)).toEqual(["CHANGELOG.md opens with 0.6.0, not 0.7.0"])
  })

  test("fails a release branch whose versions were never bumped", () => {
    const files = createFiles("0.6.0")
    expect(check(files, "release/v0.7.0")).toEqual([
      "release/v0.7.0 releases 0.7.0, but package.json is 0.6.0",
    ])
    expect(check(files, "release/v0-7-0")).toEqual([
      "release/v0-7-0 releases 0.7.0, but package.json is 0.6.0",
    ])
    expect(check(files, "fix/release-lockstep")).toEqual([])
  })
})
