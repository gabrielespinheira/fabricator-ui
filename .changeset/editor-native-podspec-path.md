---
"@fabricator-ui/editor-native": patch
---

Name the podspec in `expo-module.config.json`, so Expo registers the editor's native view when the package is installed as symlinks (a `file:` or `link:` dependency). Before, the view compiled but failed with "native component is not registered".
