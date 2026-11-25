import { defineConfig } from "vitest/config"

// The React demo has its own config; Turbo runs it with the workspace.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["react-native/{src,scripts}/**/*.test.ts"],
  },
})
