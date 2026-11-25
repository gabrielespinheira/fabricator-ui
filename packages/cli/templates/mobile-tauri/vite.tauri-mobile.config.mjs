// Fabricator UI Tauri mobile renderer
import { defineConfig, loadConfigFromFile, mergeConfig } from "vite"

export default defineConfig(async (environment) => {
  const web = await loadConfigFromFile(environment)
  const host = process.env.TAURI_DEV_HOST
  return mergeConfig(web?.config ?? {}, {
    base: "/",
    server: {
      host: host || "localhost",
      port: 1422,
      strictPort: true,
      ...(host && { hmr: { protocol: "ws", host, port: 1423 } }),
    },
    build: {
      outDir: "../mobile/dist",
      emptyOutDir: true,
      target: ["safari16.4", "chrome111"],
    },
  })
})
