"use client"

import dynamic from "next/dynamic"

// The animated icons bring Motion; splitting them out keeps it off the
// first load of a page that only reaches them at the bottom.
export const IconsPreview = dynamic(() =>
  import("./icons-preview").then((module) => module.IconsPreview)
)
