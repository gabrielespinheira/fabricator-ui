import { NextResponse, type NextRequest } from "next/server"
import { registryItemSchema } from "shadcn/schema"

import { usesFabricatorIcons } from "@/registry/fabricator-init"
import {
  getSpinnerVariables,
  isSpinnerVariant,
} from "@/registry/fabricator/shared/lib/spinner-model"
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
  const spinner = params.get("spinner")
  if (spinner !== null && !isSpinnerVariant(spinner)) {
    return NextResponse.json(
      { error: `Unknown spinner "${spinner}".` },
      { status: 400 }
    )
  }
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
  if (spinner) {
    const variables = getSpinnerVariables(spinner)
    item.data.cssVars = {
      light: Object.fromEntries(
        Object.entries(variables)
          .filter(
            ([key]) =>
              params.get("platform") !== "native" || key === "--spinner-variant"
          )
          .map(([key, value]) => [key.slice(2), value])
      ),
    }
  }
  return NextResponse.json(item.data)
}
