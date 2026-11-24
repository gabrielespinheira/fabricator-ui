import { StrictMode } from "react"
import { ThemeProvider } from "next-themes"
import { createRoot } from "react-dom/client"

import { App } from "./app"
import type { ExplorerHost } from "./explorer-host"
import { parsePreview } from "./explorer-model"
import { Preview } from "./preview"

export function mountExplorer(host: ExplorerHost) {
  const root = document.getElementById("root")
  if (!root) throw new Error("The explorer's root element is missing.")

  const preview = parsePreview(window.location.search)
  createRoot(root).render(
    <StrictMode>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="fabricator.demo.theme"
      >
        {preview ? <Preview preview={preview} /> : <App host={host} />}
      </ThemeProvider>
    </StrictMode>
  )
}
