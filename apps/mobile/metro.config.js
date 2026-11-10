// The example runs the library the way a project installs it: components come
// from the compiled registry (apps/web/styles/native, the files `add` writes),
// demos from apps/web/examples/native, and the App Shell model and theme from
// the registry's source. Everything else resolves from this app's own
// node_modules: React Native pins its own React.
const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")
const { withUniwindConfig } = require("uniwind/metro")

const web = path.resolve(__dirname, "../web")
const repo = path.resolve(__dirname, "../..")
const registry = path.join(web, "registry/fabricator")
const compiled = path.join(web, "styles/native")
const examples = path.join(web, "examples/native")
const icons = path.join(repo, "packages/icons-react-native")

const registryAlias = "@/registry/fabricator/"
const nativeAlias = "@/registry/native/"
const examplesAlias = "@/examples/native/"

// The website's pure modules the example shares: the component groups and the
// explorer's navigation, which the desktop example renders too.
const SHARED_LIB = new Set([
  "@/lib/component-groups",
  "@/lib/component-explorer",
  "@/lib/icon-explorer",
])

const config = getDefaultConfig(__dirname)

function resolveSource(base, moduleName, alias) {
  const relative = moduleName.slice(alias.length)
  const stem = path.join(base, relative)
  const fs = require("node:fs")
  const match = [".tsx", ".ts"].find((extension) =>
    fs.existsSync(`${stem}${extension}`)
  )
  return { type: "sourceFile", filePath: `${stem}${match ?? ".ts"}` }
}

config.watchFolders = [
  registry,
  compiled,
  examples,
  icons,
  path.join(repo, "packages/icons"),
  path.join(repo, "packages/icons-static"),
  path.join(web, "lib"),
]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")]
config.resolver.disableHierarchicalLookup = true
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@fabricator-ui/app-shell-model") {
    return {
      type: "sourceFile",
      filePath: path.join(registry, "shared/lib/app-shell-model.ts"),
    }
  }
  if (moduleName === "@fabricator-ui/icons-react-native") {
    return {
      type: "sourceFile",
      filePath: path.join(icons, "dist/esm/index.js"),
    }
  }
  if (moduleName === "@fabricator-ui/icons-react-native/brands") {
    return {
      type: "sourceFile",
      filePath: path.join(icons, "dist/esm/brands.js"),
    }
  }
  const iconSources = {
    "@fabricator-ui/icons/catalog": "packages/icons/dist/esm/catalog.js",
    "@fabricator-ui/icons-static/nodes":
      "packages/icons-static/dist/esm/nodes.js",
    "@fabricator-ui/icons-react-native/files":
      "packages/icons-react-native/dist/esm/files.js",
  }
  if (Object.hasOwn(iconSources, moduleName)) {
    return {
      type: "sourceFile",
      filePath: path.join(repo, iconSources[moduleName]),
    }
  }
  if (SHARED_LIB.has(moduleName)) {
    return {
      type: "sourceFile",
      filePath: path.join(web, `${moduleName.slice(2)}.ts`),
    }
  }
  if (moduleName.startsWith(registryAlias)) {
    return resolveSource(registry, moduleName, registryAlias)
  }
  if (moduleName.startsWith(nativeAlias)) {
    return resolveSource(compiled, moduleName, nativeAlias)
  }
  if (moduleName.startsWith(examplesAlias)) {
    return resolveSource(examples, moduleName, examplesAlias)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
})
