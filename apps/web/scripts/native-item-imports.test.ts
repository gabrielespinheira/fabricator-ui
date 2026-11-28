import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { nativeItems } from "@/registry/native/_registry"

import { getNativeSourcePath, rewriteSharedImports } from "./native-registry"

const ROOT = path.resolve(import.meta.dirname, "..")
const ITEMS = new Map(nativeItems.map((item) => [item.name, item]))
const LOCAL_IMPORT = /from "@\/registry\/native\/([^"]+)"/g

function getInstalledFiles(name: string, seen = new Set<string>()) {
  const item = ITEMS.get(name)
  if (!item || seen.has(name)) return seen
  seen.add(name)
  for (const dependency of item.registryDependencies ?? []) {
    getInstalledFiles(dependency.replace(/^@fabricator\//, ""), seen)
  }
  return seen
}

function stripExtension(filePath: string) {
  return filePath.replace(/\.tsx?$/, "")
}

describe("native registry items", () => {
  // An import the item doesn't ship breaks `add <name>` in an Expo app and
  // the @fabricator-ui/react-native package build.
  it("ship every native module their files import", () => {
    const missing: string[] = []
    for (const item of nativeItems) {
      const installed = new Set(
        [...getInstalledFiles(item.name)].flatMap((name) =>
          (ITEMS.get(name)?.files ?? []).map((file) =>
            stripExtension(file.path)
          )
        )
      )
      for (const file of item.files ?? []) {
        const source = rewriteSharedImports(
          readFileSync(path.join(ROOT, getNativeSourcePath(file.path)), "utf8")
        )
        for (const [, target] of source.matchAll(LOCAL_IMPORT)) {
          if (!installed.has(stripExtension(target)))
            missing.push(`${item.name}: ${file.path} imports ${target}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})
