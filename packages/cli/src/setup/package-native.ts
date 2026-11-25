import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  EXPO_SDK,
  REACT_NATIVE_PACKAGE,
  REACT_NATIVE_PACKAGE_STYLES,
} from "@fabricator-ui/setup"
import { z } from "zod"

import manifest from "../../../react-native/package.json" with { type: "json" }
import cliPackage from "../../package.json" with { type: "json" }
import { mountNativeRoot } from "../mount/root"
import {
  isExpoProject,
  readPackageJson,
  writeNativeEnvironment,
} from "../utils/native"
import type { SetupContext } from "./steps"

const ROOT_MODULE = `${REACT_NATIVE_PACKAGE}/fabricator-root`
const THEME_FILE = "fabricator-theme.css"
const nativeLook = z.object({
  files: z.array(z.object({ target: z.string(), content: z.string() })),
})
const packageSchema = z
  .object({
    dependencies: z.record(z.string(), z.string()).optional(),
  })
  .loose()

const STARTER = `import { Button } from "${REACT_NATIVE_PACKAGE}/button"
import { View } from "react-native"

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Button>Get started</Button>
    </View>
  )
}
`

export function validateExpoPackageTarget(directory: string) {
  const app = readPackageJson(directory)
  const expo = app?.dependencies?.expo
  if (
    !isExpoProject(app) ||
    !expo ||
    !new RegExp(`^[~^]?${EXPO_SDK}\\.`).test(expo)
  ) {
    throw new Error(
      `Package setup requires an Expo SDK ${EXPO_SDK} app. Select its directory with --cwd.`
    )
  }
}

async function fetchNativeLook(context: SetupContext) {
  const { setup, baseUrl } = context
  if (Object.keys(setup.look).length === 0) return undefined

  const url = new URL(`${baseUrl}/init`)
  url.search = new URLSearchParams({
    ...setup.look,
    platform: "native",
  }).toString()
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  if (!response.ok)
    throw new Error(`Could not load the Expo theme (${response.status}).`)
  const payload = nativeLook.parse(await response.json())
  const css = payload.files.find((file) => file.target === "fabricator.css")
  if (!css)
    throw new Error("The Expo theme response did not include fabricator.css.")
  return css.content
}

export async function configureNativePackage(
  context: SetupContext,
  directory: string,
  isNew: boolean
) {
  validateExpoPackageTarget(directory)
  const theme = await fetchNativeLook(context)
  const { cssEntry, hasCustomMetro } = writeNativeEnvironment(directory)
  const stylesheet = path.join(directory, cssEntry)
  const types = path.join(path.dirname(stylesheet), "uniwind-types.d.ts")
  if (!existsSync(types)) {
    writeFileSync(types, 'import "uniwind/types"\n', { flag: "wx" })
  }
  const css = readFileSync(stylesheet, "utf8")
  const imports = []
  if (!css.includes(REACT_NATIVE_PACKAGE_STYLES))
    imports.push(`@import "${REACT_NATIVE_PACKAGE_STYLES}";`)
  if (theme) {
    const themeFile = path.join(path.dirname(stylesheet), THEME_FILE)
    if (!existsSync(themeFile)) writeFileSync(themeFile, theme, { flag: "wx" })
    else if (readFileSync(themeFile, "utf8") !== theme) {
      context.notes.push(
        `Review the requested theme in ${path.relative(directory, themeFile)} before replacing your overrides.`
      )
    }
    if (!css.includes(`./${THEME_FILE}`))
      imports.push(`@import "./${THEME_FILE}";`)
  }
  if (imports.length) {
    const preamble =
      /^(?:\s*(?:\/\*[\s\S]*?\*\/|@(?:charset|import)[^;]+;))*/.exec(
        css
      )?.[0] ?? ""
    writeFileSync(
      stylesheet,
      `${preamble.trimEnd()}\n${imports.join("\n")}\n${css.slice(preamble.length).trimStart()}`
    )
  }

  if (hasCustomMetro)
    context.notes.push(
      `Wrap the existing Metro config with withUniwindConfig and set cssEntryFile to "./${cssEntry}".`
    )
  const layout = ["src/app/_layout.tsx", "app/_layout.tsx"].find((name) =>
    existsSync(path.join(directory, name))
  )
  if (layout) {
    const file = path.join(directory, layout)
    const source = readFileSync(file, "utf8")
    const cssImport = path.posix.relative(path.posix.dirname(layout), cssEntry)
    const next =
      source.includes("<FabricatorRoot") && !source.includes(ROOT_MODULE)
        ? null
        : mountNativeRoot(source, {
            cssImport: cssImport.startsWith(".") ? cssImport : `./${cssImport}`,
            rootImport: `import { FabricatorRoot } from "${ROOT_MODULE}"`,
            replaceDemo: isNew,
            shell: false,
            sounds: false,
          })
    if (isNew && next && next !== source)
      writeFileSync(path.join(path.dirname(file), "index.tsx"), STARTER)
    if (next && next !== source) writeFileSync(file, next)
    if (isNew && !next)
      throw new Error(
        "The generated Expo Router layout has an unrecognized structure."
      )
    if (!next)
      context.notes.push(
        `Import "${cssEntry}" in your root layout and wrap the navigator in FabricatorRoot from "${ROOT_MODULE}".`
      )
  } else {
    if (isNew)
      throw new Error("The Expo template did not create a router layout.")
    context.notes.push(
      `Import "${cssEntry}" at the app entry and wrap your app in FabricatorRoot from "${ROOT_MODULE}".`
    )
  }

  const filename = path.join(directory, "package.json")
  const project = packageSchema.parse(
    JSON.parse(readFileSync(filename, "utf8"))
  )
  const nextManifest = JSON.stringify(
    {
      ...project,
      dependencies: {
        ...manifest.peerDependencies,
        [REACT_NATIVE_PACKAGE]: cliPackage.version,
        ...project.dependencies,
      },
    },
    null,
    2
  )
  if (readFileSync(filename, "utf8") !== `${nextManifest}\n`)
    writeFileSync(filename, `${nextManifest}\n`)
}
