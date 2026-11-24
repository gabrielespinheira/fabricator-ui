import { defineConfig, mergeConfig } from "vite"

import { explorerConfig } from "../react/explorer-config.ts"

// Set by the Tauri CLI when the app runs on a physical device.
const host = process.env.TAURI_DEV_HOST

export default defineConfig(
  mergeConfig(explorerConfig, {
    server: {
      host: host ?? "0.0.0.0",
      port: 1420,
      strictPort: true,
      hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    },
    preview: { host: "0.0.0.0", port: 1420 },
  })
)
