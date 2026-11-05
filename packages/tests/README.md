# @fabricator-ui/tests

End-to-end install tests. Each scenario scaffolds a real app with the `fabricator-ui` CLI, installs components from a running registry, then type-checks and builds the app.

```bash
bun run dev                 # terminal 1: serves the registry on http://localhost:4000
bun run cli:build           # build packages/cli/dist
bun run test:e2e            # terminal 2: every scenario
bun run test:e2e --only create-next,monorepo-web
```

Scenarios install `@fabricator-ui/icons` and `-react-native` from tarballs of the workspace packages (`src/local-npm.ts`), and everything else from npm, so they test the icons this checkout builds. Build the package first: `bun run dev` and `bun run build` both do.

Set `FABRICATOR_REGISTRY_URL` to test another deployment. Apps are created under the OS temp dir and removed on success (`--keep` keeps them).

`create-*` run `create` for each framework, mount included, and build the result. `monorepo-web` is the regression test for components with lib dependencies in a monorepo. `monorepo-<package manager>-<runtime>` run the whole recipe: Next, Expo with the native shell and a desktop app, with `expo-doctor`, the iOS bundle, the static build and `cargo check` where Rust exists. A package manager that isn't installed is skipped.

`desktop-only` and `mobile-only` cover `--no-web`: the window keeps its web app, and a lone mobile app gets no monorepo. `monorepo-grow` starts from a web-only monorepo and runs what comes after `create`: `apps add`, `add --app`, `doctor` and `upgrade`. `create-everything` covers `--all` and a Tauri window without glass.

The `expo` scenario is the test of the React Native library: it creates an app with `create-expo-app`, runs `init` and `add --all`, bundles for iOS and Android, and typechecks the installed files. It has no access to `apps/mobile`.
