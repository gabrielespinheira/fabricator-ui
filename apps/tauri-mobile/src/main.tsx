import { StrictMode } from "react"
import { ThemeProvider } from "next-themes"
import { createRoot } from "react-dom/client"

import { App } from "./app"

import "./styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("The Fabricator mobile root element is missing.")

createRoot(root).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="fabricator.tauri-mobile.theme"
    >
      <App />
    </ThemeProvider>
  </StrictMode>
)
