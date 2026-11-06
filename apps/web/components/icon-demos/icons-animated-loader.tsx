"use client"

import dynamic from "next/dynamic"

// Every docs page imports the demo map, and Next lists a client module on any
// page that can reach it. Calling dynamic from a client module is what keeps
// Motion and the animated icons off all the pages but the one that shows them.
export const IconsAnimated = dynamic(() =>
  import("./icons-animated").then((module) => module.IconsAnimated)
)
