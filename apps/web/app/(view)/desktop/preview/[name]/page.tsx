import * as React from "react"
import { notFound } from "next/navigation"

import { getRegistryComponent } from "@/lib/registry"

/** Isolate full-screen demos and overlays from the explorer's own shell. */
export default async function DesktopPreviewPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const Component = getRegistryComponent(name, "base-fabricator")
  if (!Component) notFound()
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      {React.createElement(Component)}
    </div>
  )
}
