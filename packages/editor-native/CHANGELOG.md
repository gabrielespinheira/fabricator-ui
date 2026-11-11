# @fabricator-ui/editor-native

## 0.1.1

### Patch Changes

- [#17](https://github.com/gabrielespinheira/fabricator-ui/pull/17) [`46105e0`](https://github.com/gabrielespinheira/fabricator-ui/commit/46105e0ea28dbf330d4bdbd308eb2c75f834a4ad) Thanks [@gabrielespinheira](https://github.com/gabrielespinheira)! - Name the podspec in `expo-module.config.json`, so Expo registers the editor's native view when the package is installed as symlinks (a `file:` or `link:` dependency). Before, the view compiled but failed with "native component is not registered".
