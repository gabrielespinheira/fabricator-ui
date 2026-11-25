import { readFile } from "node:fs/promises"
import path from "node:path"
import { z } from "zod"

const retiredRenderer = z.enum(["swiftui", "compose"])
const retiredConfig = z.object({
  schemaVersion: z.literal(1),
  renderer: retiredRenderer,
})

class RetiredRendererError extends Error {
  override name = "RetiredRendererError"

  constructor(renderer: z.infer<typeof retiredRenderer>) {
    const name = renderer === "swiftui" ? "SwiftUI" : "Kotlin Compose"
    super(
      `The ${name} preview has been retired. Use --cwd to target a React web or React Native project.`
    )
  }
}

export async function assertSupportedRenderer(cwd: string, platform?: string) {
  const requested = retiredRenderer.safeParse(platform)
  if (requested.success) throw new RetiredRendererError(requested.data)

  let config: unknown
  try {
    config = JSON.parse(
      await readFile(path.join(cwd, "fabricator.json"), "utf8")
    )
  } catch (error) {
    if (error instanceof SyntaxError) return
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return
    throw error
  }
  const legacy = retiredConfig.safeParse(config)
  if (legacy.success) throw new RetiredRendererError(legacy.data.renderer)
}
