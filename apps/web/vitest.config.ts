import { fileURLToPath } from "node:url"
import tsconfigPaths from "vite-tsconfig-paths"
import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    fsModuleCachePath: fileURLToPath(
      new URL("./node_modules/.vitest-cache", import.meta.url)
    ),
    include: [...configDefaults.include, "../mobile/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/node_modules/**", ".next/**"],
  },
  plugins: [tsconfigPaths({ ignoreConfigErrors: true })],
})
