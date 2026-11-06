import { NextResponse, type NextRequest } from "next/server"
import { registryItemSchema } from "shadcn/schema"

import { usesFabricatorIcons } from "@/registry/fabricator-init"
import {
  buildAppShellItem,
  parseAppShellParams,
  parseAppShellTarget,
} from "@/app/(view)/app-shell/_lib/app-shell-source"
import { buildNativeAppShellItem } from "@/app/(view)/app-shell/_lib/app-shell-source-native"

/**
 * An App Shell written out from the option cards' choices, as a registry item:
 * `fabricator-ui add app-shell "<this URL>"`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const target = parseAppShellTarget(params)
  const options = parseAppShellParams(params, target)
  const item = registryItemSchema.safeParse(
    params.get("platform") === "native"
      ? buildNativeAppShellItem(options)
      : buildAppShellItem(options, {
          icons: usesFabricatorIcons(params),
          ...target,
        })
  )
  if (!item.success) {
    return NextResponse.json(
      { error: "Invalid registry item", details: item.error.format() },
      { status: 500 }
    )
  }
  return NextResponse.json(item.data)
}
