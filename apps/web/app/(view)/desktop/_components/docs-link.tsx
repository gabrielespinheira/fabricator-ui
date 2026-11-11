"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { getDesktopLink } from "../_lib/navigation"

export function DesktopDocsLink({
  href = "",
  ...props
}: React.ComponentProps<"a">) {
  const search = useSearchParams()
  const destination = getDesktopLink(href, search.toString())
  if (destination.startsWith("/desktop/") || destination.startsWith("#")) {
    return <Link href={destination} {...props} />
  }
  return <a href={destination} {...props} />
}
