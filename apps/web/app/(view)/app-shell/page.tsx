import * as React from "react"
import type { Metadata } from "next"

import { AppShellPlayground } from "./_components/playground"

const title = "App Shell playground"
const description =
  "Try every App Shell option in one screen: sidebar styles, tabs, the right panel, desktop window controls and density. The URL keeps your choices."

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          title
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      {
        url: `/og?title=${encodeURIComponent(
          title
        )}&description=${encodeURIComponent(description)}`,
      },
    ],
  },
}

export default function AppShellPlaygroundPage() {
  // The playground reads its options from the URL.
  return (
    <React.Suspense fallback={null}>
      <AppShellPlayground />
    </React.Suspense>
  )
}
