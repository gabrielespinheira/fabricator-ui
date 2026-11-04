// The example imports the App Shell model and the theme from the registry's
// source, so web and native run the same navigation, layout and panel logic
// and draw the same colours, sizes and timings. Everything else resolves from
// this app's own node_modules: React Native pins its own React.
const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")

const registry = path.resolve(__dirname, "../web/registry/fabricator")
const registryAlias = "@/registry/fabricator/"
const config = getDefaultConfig(__dirname)

config.watchFolders = [registry]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")]
config.resolver.disableHierarchicalLookup = true
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@fabricator-ui/app-shell-model") {
    return {
      type: "sourceFile",
      filePath: path.join(registry, "shared/lib/app-shell-model.ts"),
    }
  }
  if (moduleName.startsWith(registryAlias)) {
    return {
      type: "sourceFile",
      filePath: path.join(
        registry,
        `${moduleName.slice(registryAlias.length)}.ts`
      ),
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
