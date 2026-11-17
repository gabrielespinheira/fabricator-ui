import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    fsModuleCachePath: fileURLToPath(
      new URL("./node_modules/.vitest-cache", import.meta.url)
    ),
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
})
