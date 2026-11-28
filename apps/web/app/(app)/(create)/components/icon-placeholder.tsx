"use client"

import { lazy, Suspense, type ComponentProps } from "react"
import type { IconComponent } from "@fabricator-ui/icons"
import type { IconLibraryName } from "shadcn/icons"

import { useSiteSetting } from "@/lib/site-settings"
import * as fabricatorIconExports from "@/registry/icons/__fabricator__"

const fabricatorIcons: Readonly<Partial<Record<string, IconComponent>>> =
  fabricatorIconExports

const alternateIcons = {
  lucide: lazy(() =>
    import("@/registry/icons/icon-lucide").then(({ IconLucide }) => ({
      default: IconLucide,
    }))
  ),
  tabler: lazy(() =>
    import("@/registry/icons/icon-tabler").then(({ IconTabler }) => ({
      default: IconTabler,
    }))
  ),
  hugeicons: lazy(() =>
    import("@/registry/icons/icon-hugeicons").then(({ IconHugeicons }) => ({
      default: IconHugeicons,
    }))
  ),
  phosphor: lazy(() =>
    import("@/registry/icons/icon-phosphor").then(({ IconPhosphor }) => ({
      default: IconPhosphor,
    }))
  ),
  remixicon: lazy(() =>
    import("@/registry/icons/icon-remixicon").then(({ IconRemixicon }) => ({
      default: IconRemixicon,
    }))
  ),
}

export function IconPlaceholder({
  lucide,
  tabler,
  hugeicons,
  phosphor,
  remixicon,
  ...props
}: {
  [K in IconLibraryName]: string
} & ComponentProps<"svg">) {
  const [library] = useSiteSetting("iconLibrary")
  const FabricatorIcon = fabricatorIcons[lucide]
  const defaultIcon = FabricatorIcon ? <FabricatorIcon {...props} /> : null

  if (library === "fabricator") return defaultIcon

  const name = { lucide, tabler, hugeicons, phosphor, remixicon }[library]
  const AlternateIcon = alternateIcons[library]

  return (
    <Suspense fallback={defaultIcon}>
      <AlternateIcon name={name} {...props} />
    </Suspense>
  )
}
