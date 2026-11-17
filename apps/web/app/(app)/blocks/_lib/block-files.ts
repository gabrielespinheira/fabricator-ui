import "server-only"

import { type registryItemFileSchema } from "shadcn/schema"
import { type z } from "zod"

import { formatCode } from "@/lib/format-code"
import { highlightCode } from "@/lib/highlight-code"
import { getRegistryItem } from "@/lib/registry"
import { SITE_BLOCK_STYLE } from "@/lib/site-style"

import { type BlockFile } from "../_components/block-viewer"

/** A block's files as the CLI writes them, highlighted for the code view. */
export async function getBlockFiles(name: string): Promise<BlockFile[]> {
  const item = await getRegistryItem(name, SITE_BLOCK_STYLE)
  if (!item?.files) return []

  return Promise.all(
    item.files.map(async (file: z.infer<typeof registryItemFileSchema>) => {
      const target = file.target ?? file.path
      const code = await formatCode(file.content ?? "", SITE_BLOCK_STYLE, {
        keepDefaultExport: file.type === "registry:page",
      })
      const language = target.split(".").pop() ?? "tsx"
      return {
        target,
        code,
        highlightedCode: await highlightCode(code, language),
      }
    })
  )
}
