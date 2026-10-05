"use client"

import { Suspense } from "react"

import { Separator } from "@/registry/new-york-v4/ui/separator"
import { ProjectForm } from "@/app/(app)/(create)/components/project-form"
import { V0Button } from "@/app/(app)/(create)/components/v0-button"

export function DesignerActions() {
  return (
    <>
      <div className="hidden items-center gap-2 group-has-data-[slot=designer]/layout:md:flex">
        <Separator orientation="vertical" />
        <Suspense fallback={null}>
          <V0Button />
        </Suspense>
        <Suspense fallback={null}>
          <ProjectForm />
        </Suspense>
      </div>
      <div className="hidden items-center gap-2 group-has-data-[slot=designer]/layout:flex group-has-data-[slot=designer]/layout:md:hidden">
        <Separator orientation="vertical" />
        <Suspense fallback={null}>
          <V0Button />
        </Suspense>
      </div>
    </>
  )
}
