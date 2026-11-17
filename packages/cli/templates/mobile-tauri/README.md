# Tauri mobile host overlay

This template adds a Tauri 2 mobile host to a Vite React project. The frontend
uses Fabricator UI’s **web** components. `/r/fabricator/native/` is the React Native
registry and is not used here.

Merge the package scripts and development dependency into the Vite project and
copy `src-tauri/` beside its `package.json`. Preserve the frontend’s existing
dependencies, `vite.config.ts`, `dev` and `build` scripts. Vite must listen on port
1420 and use `TAURI_DEV_HOST` when Tauri provides it. Production output must be
`dist/`; no Next.js server is required at runtime.

Install the selected Fabricator components through the CLI, including `app-shell`
for the application frame. Add `viewport-fit=cover` to the viewport meta tag, pad
app chrome with `env(safe-area-inset-*)`, and resize the content with the visual
viewport when the software keyboard opens. Do not pass desktop window controls
to App Shell on mobile. Use a hash router or another local router whose paths
continue to work from the bundled origin.

Install the native prerequisites deliberately before initializing either target.
`tauri ios init` can invoke Homebrew for missing tools even with
`--skip-targets-install`; that flag only skips Rust targets. The template does not
initialize targets or install toolchains automatically.

```sh
bun run tauri ios init --ci --skip-targets-install
bun run ios
bun run build:ios -- --no-sign --target aarch64-sim

bun run tauri android init --ci --skip-targets-install
bun run android
bun run build:android
```

Set your own bundle identifier and signing team before building for a physical
Apple device. The `Info.ios.plist` permission strings describe the gallery’s
camera, microphone and photo examples; remove permissions the app does not use.
Local notifications, push, biometrics and haptics require their own configured
plugins. WidgetKit and Live Activities need separate Apple extension targets.

The Rust entry point includes real app-private storage commands and validates
inputs on the native side. The web root does not depend on those commands to
initialize. Follow the complete gallery in `apps/tauri-mobile` for its typed
bridge, persisted navigation, keyboard insets and component scenarios.
