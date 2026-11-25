import path from "node:path"
import { fileURLToPath } from "node:url"
import type { UserConfig } from "vite"

import { createExplorerPlugin } from "./scripts/explorer-plugin.ts"

const directory = path.dirname(fileURLToPath(import.meta.url))
const webDirectory = path.resolve(directory, "../../apps/web")

/** The explorer's Vite setup, shared with the Tauri demo that bundles it. */
export const explorerConfig = {
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
        find: /^@\/registry\/base-fabricator\/hooks\/use-mobile$/,
        replacement: path.join(webDirectory, "hooks/use-mobile.ts"),
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
  server: { fs: { allow: [path.resolve(directory, "../..")] } },
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
} satisfies UserConfig
