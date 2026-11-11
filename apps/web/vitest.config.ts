import tsconfigPaths from "vite-tsconfig-paths"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: [...configDefaults.include, "../mobile/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/node_modules/**", ".next/**"],
  },
  plugins: [tsconfigPaths({ ignoreConfigErrors: true })],
})
