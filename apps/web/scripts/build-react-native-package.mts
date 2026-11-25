import { cp, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { REACT_NATIVE_PACKAGE_COMPONENTS } from "@fabricator-ui/setup"

import { toNativeStylesheet } from "@/registry/fabricator/native-theme"

import manifest from "../../../packages/react-native/package.json" with { type: "json" }
import { readPackageRegistryFiles } from "./package-registry-files"
import { transformPackageSource } from "./react-package-source"

const web = path.resolve(import.meta.dirname, "..")
const repo = path.resolve(web, "../..")
const packageRoot = path.join(repo, "packages/react-native")
const names = REACT_NATIVE_PACKAGE_COMPONENTS
const files = await readPackageRegistryFiles(
  path.join(web, "public/r/native"),
  "registry/native/",
  names
)
const paths = new Set(files.keys())
const allowedExports = new Map(Object.entries(manifest.exports))
for (const name of names) {
  const entry = `ui/${name}.tsx`
  if (
    !files.has(entry) ||
    allowedExports.get(`./${name}`) !== `./dist/${entry}`
  )
    throw new Error(`Missing native package entry for ${name}`)
}
if (Object.keys(manifest.exports).length !== names.length + 1) {
  throw new Error("Native package exports and supported components differ")
}

const staging = await mkdtemp(path.join(packageRoot, ".dist-native-"))
try {
  const used = new Set<string>()
  for (const [filename, source] of files) {
    const { content, dependencies } = transformPackageSource(
      filename,
      source,
      paths,
      "native"
    )
    for (const dependency of dependencies) {
      if (
        !Object.hasOwn(manifest.dependencies, dependency) &&
        !Object.hasOwn(manifest.peerDependencies, dependency)
      ) {
        throw new Error(
          `Undeclared native dependency ${dependency} in ${filename}`
        )
      }
      used.add(dependency)
    }
    const target = path.join(staging, filename)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content)
  }
  for (const dependency of Object.keys(manifest.dependencies)) {
    if (!used.has(dependency))
      throw new Error(`Unused native dependency ${dependency}`)
  }
  await writeFile(
    path.join(staging, "styles.css"),
    `@source "./";\n\n${toNativeStylesheet()}`
  )
  for (const notice of ["LICENSE.md", "NOTICE.md"]) {
    await cp(path.join(repo, notice), path.join(staging, notice))
  }
  const dist = path.join(packageRoot, "dist")
  await rm(dist, { recursive: true, force: true })
  await rename(staging, dist)
  console.log(`Built ${manifest.name} (${names.length} exports)`)
} finally {
  await rm(staging, { recursive: true, force: true })
}
