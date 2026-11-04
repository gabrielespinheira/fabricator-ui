// The example imports the App Shell model from the registry's source (the
// file `fabricator-ui add app-shell-model` installs), so web and native run
// the same navigation, layout and panel logic. Everything else resolves from
// this app's own node_modules: React Native pins its own React.
const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")

const modelFile = path.resolve(
  __dirname,
  "../web/registry/fabricator/shared/lib/app-shell-model.ts"
)
const config = getDefaultConfig(__dirname)

config.watchFolders = [path.dirname(modelFile)]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")]
config.resolver.disableHierarchicalLookup = true
config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === "@fabricator-ui/app-shell-model"
    ? { type: "sourceFile", filePath: modelFile }
    : context.resolveRequest(context, moduleName, platform)

module.exports = config
