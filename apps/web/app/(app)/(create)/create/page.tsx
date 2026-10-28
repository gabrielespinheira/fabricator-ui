import * as React from "react"
import type { Metadata } from "next"

import { SetupWizard } from "./_components/setup-wizard"

const title = "Get started"
const description =
  "Make Fabricator UI yours, pick your framework and extras, and get the command that installs it."

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

export default function CreatePage() {
  // The wizard reads its state from the URL.
  return (
    <React.Suspense fallback={null}>
      <SetupWizard />
    </React.Suspense>
  )
}
