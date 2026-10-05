import { type NextRequest } from "next/server"
import { track } from "@vercel/analytics/server"

import { resolveFabricatorSearchParams } from "@/registry/fabricator-init"
import { buildInstructions } from "@/app/(app)/(create)/lib/build-instructions"
import { parseDesignSystemConfig } from "@/app/(app)/(create)/lib/parse-config"

export async function GET(request: NextRequest) {
  try {
    const resolved = resolveFabricatorSearchParams(request.nextUrl.searchParams)
    if (!resolved.success) {
      return new Response(resolved.error, { status: 400 })
    }
    const searchParams = resolved.params
    const result = parseDesignSystemConfig(searchParams)

    if (!result.success) {
      return new Response(result.error, { status: 400 })
    }

    track("create_app_manual", result.data)

    const markdown = buildInstructions(result.data)

    return new Response(markdown, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    })
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "An unknown error occurred",
      { status: 500 }
    )
  }
}
