import { NextResponse, type NextRequest } from "next/server"
import { registryItemSchema } from "shadcn/schema"

import { usesFabricatorIcons } from "@/registry/fabricator-init"
import {
  buildAppShellItem,
  parseAppShellParams,
} from "@/app/(view)/app-shell/_lib/app-shell-source"

/**
 * An App Shell written out from the option cards' choices, as a registry item:
 * `fabricator-ui add app-shell "<this URL>"`.
 */
export async function GET(request: NextRequest) {
  const item = registryItemSchema.safeParse(
    buildAppShellItem(parseAppShellParams(request.nextUrl.searchParams), {
      icons: usesFabricatorIcons(request.nextUrl.searchParams),
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
