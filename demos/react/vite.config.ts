import { defineConfig, mergeConfig } from "vite"

import { explorerConfig } from "./explorer-config.ts"

export default defineConfig(
  mergeConfig(explorerConfig, {
    server: { port: 4100 },
    preview: { port: 4100 },
  })
)
