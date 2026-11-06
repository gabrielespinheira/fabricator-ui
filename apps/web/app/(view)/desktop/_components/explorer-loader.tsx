"use client"

import dynamic from "next/dynamic"

// The explorer reads the window it runs in (Electron, Tauri or a browser),
// so it renders on the client only.
export const ExplorerLoader = dynamic(
  () => import("./explorer").then((mod) => mod.DesktopExplorer),
  { ssr: false }
)
