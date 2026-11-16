import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

import { createExplorerPlugin } from "./scripts/explorer-plugin"

const directory = path.dirname(fileURLToPath(import.meta.url))
const webDirectory = path.resolve(directory, "../web")

export default defineConfig({
  clearScreen: false,
  plugins: [createExplorerPlugin(webDirectory)],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: "next/link",
        replacement: path.join(directory, "src/adapters/link.tsx"),
      },
      {
        find: "next/image",
        replacement: path.join(directory, "src/adapters/image.tsx"),
      },
      {
        find: /^@\/app\/(?:\(app\)\/)?\(create\)\/components\/icon-placeholder$/,
        replacement: path.join(directory, "src/adapters/icon-placeholder.tsx"),
      },
      { find: "@/lib/site-icons", replacement: "@fabricator-ui/icons" },
      {
        find: "@/registry/icons/__lucide__",
        replacement: "@fabricator-ui/icons",
      },
      { find: "lucide-react", replacement: "@fabricator-ui/icons" },
      {
        find: "@/components/markdown",
        replacement: path.join(
          webDirectory,
          "styles/base-fabricator/ui/markdown.tsx"
        ),
      },
      {
        find: /^@\/components\/ui\//,
        replacement: `${webDirectory}/styles/base-fabricator/ui/`,
      },
      {
        find: /^@\/registry\/base-fabricator\/(ui|lib|hooks)\//,
        replacement: `${webDirectory}/styles/base-fabricator/$1/`,
      },
      {
        find: /^@\/styles\/(?:base|radix|aria)-[^/]+\//,
        replacement: `${webDirectory}/styles/base-fabricator/`,
      },
      { find: "@", replacement: webDirectory },
    ],
  },
  server: {
    host: process.env.TAURI_DEV_HOST ?? "0.0.0.0",
    port: 1420,
    strictPort: true,
    fs: { allow: [path.resolve(directory, "../..")] },
    hmr: process.env.TAURI_DEV_HOST
      ? { protocol: "ws", host: process.env.TAURI_DEV_HOST, port: 1421 }
      : undefined,
  },
  build: {
    target: ["safari16.4", "chrome111"],
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes('"use client"')
        )
          return
        if (
          warning.code === "SOURCEMAP_ERROR" &&
          warning.message.includes("Can't resolve original location")
        )
          return
        warn(warning)
      },
    },
  },
})
