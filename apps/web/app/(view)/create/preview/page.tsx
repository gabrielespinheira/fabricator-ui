import * as React from "react"
import type { Metadata } from "next"

import { ShellPreviewApp } from "./_components/shell-preview-app"

export const metadata: Metadata = {
  title: "App Shell preview",
  robots: { index: false },
}

export default function ShellPreviewPage() {
  // The preview reads its options from the URL.
  return (
    <React.Suspense fallback={null}>
      <ShellPreviewApp />
    </React.Suspense>
  )
}
