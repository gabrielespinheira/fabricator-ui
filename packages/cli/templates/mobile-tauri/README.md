# Tauri mobile

This host runs the Vite app in `apps/web`. Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your target, then run `__PACKAGE_MANAGER__ run init:ios` or `__PACKAGE_MANAGER__ run init:android` from this directory once. The Tauri initializer can install missing platform tools.

| Task                    | Command                                 |
| ----------------------- | --------------------------------------- |
| Run on iPhone           | `__PACKAGE_MANAGER__ run ios`           |
| Run on iPad             | `__PACKAGE_MANAGER__ run ipad`          |
| Run on Android          | `__PACKAGE_MANAGER__ run android`       |
| Build for Apple devices | `__PACKAGE_MANAGER__ run build:ios`     |
| Build for Android       | `__PACKAGE_MANAGER__ run build:android` |

The development server uses port 1422. To select a specific simulator or device, run the local Tauri CLI with `ios dev <device>` or `android dev <device>`. For client-side routes that must open or reload on the bundled origin, use a hash router.

Set your own bundle identifier in `src-tauri/tauri.conf.json` before initializing a project for distribution. Configure signing using [Apple’s Tauri guide](https://v2.tauri.app/distribute/sign/ios/) or [Android’s Tauri guide](https://v2.tauri.app/distribute/sign/android/).
