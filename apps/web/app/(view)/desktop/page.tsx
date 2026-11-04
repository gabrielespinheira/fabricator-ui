import type { Metadata } from "next"

import { ExplorerLoader } from "./_components/explorer-loader"

// The desktop example's window: `bun run desktop` (Electron) and
// `bun run desktop:tauri` open it from apps/desktop. In a browser it is the
// same explorer without native window controls.
export const metadata: Metadata = {
  title: "Desktop example",
  description:
    "Every Fabricator UI component in a desktop window built with the App Shell.",
  robots: { index: false },
}

export default function DesktopExamplePage() {
  return <ExplorerLoader />
}
