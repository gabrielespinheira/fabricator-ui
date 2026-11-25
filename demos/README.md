# Demos

One runnable demo per framework, each showing the library's components from this repository. They are for trying the library locally: nothing here is published, CI never runs it, and nothing outside this folder imports from it.

| Folder                         | Framework             | What                                                                | Runs on                                     |
| ------------------------------ | --------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| [`react`](react/README.md)     | React and Vite        | Every web component, example and block                              | Any browser                                 |
| [`electron`](electron)         | Electron              | The website's `/desktop` route in a window                          | macOS, Windows, Linux                       |
| [`tauri`](tauri/README.md)     | Tauri                 | The React demo bundled for mobile; the `/desktop` route in a window | iOS, iPadOS, Android, macOS, Windows, Linux |
| [`react-native`](react-native) | React Native and Expo | Every React Native component                                        | iOS, iPadOS, Android                        |

## Commands

Run them from the repository root with `bun run demo <command>`, or from this folder with `bun run <command>`. Arguments after the command reach the demo's script, such as `bun run demo react-native:ipad --device "<name>"`. Each command starts with the folder it runs in, and that folder's `package.json` has the rest of its scripts.

| Demo           | Launch                                                          | Check                                | Build                                    |
| -------------- | --------------------------------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `react`        | `react`                                                         | `react:check`, `react:check:browser` | `react:build`, `react:preview`           |
| `electron`     | `electron`                                                      |                                      |                                          |
| `tauri`        | `tauri:desktop`, `tauri:ios`, `tauri:ipad`, `tauri:android`     | `tauri:check`                        | `tauri:build:ios`, `tauri:build:android` |
| `react-native` | `react-native:ios`, `react-native:ipad`, `react-native:android` | `react-native:check`                 |                                          |

`bun run demo check` typechecks, formats and tests every demo, and checks the React Native sources with React Native's own types. Run it after changing a demo.

Run `bun install` and `bun run registry:build` at the root once first. `react-native` has its own install because React Native pins its own React; its launch commands run it. Prerequisites and what each check covers are in [`docs/PLATFORMS.md`](../docs/PLATFORMS.md) and the demos' READMEs.
