# @fabricator-ui/tests

End-to-end install tests. Each scenario scaffolds a real app with the `fabricator-ui` CLI, installs components from a running registry, then type-checks and builds the app.

```bash
bun run dev                 # terminal 1: serves the registry on http://localhost:4000
bun run cli:build           # build packages/cli/dist
bun run test:e2e            # terminal 2: every scenario
bun run test:e2e --only vite-base,existing-shadcn
```

Scenarios install `@fabricator-ui/icons` and `-react-native` from tarballs of the workspace packages (`src/local-npm.ts`), and everything else from npm, so they test the icons this checkout builds. Build the package first: `bun run dev` and `bun run build` both do.

Set `FABRICATOR_REGISTRY_URL` to test another deployment. Apps are created under the OS temp dir and removed on success (`--keep` keeps them).

The `expo` scenario is the test of the React Native library: it creates an app with `create-expo-app`, runs `init` and `add --all`, bundles for iOS and Android, and typechecks the installed files. It has no access to `apps/mobile`.
