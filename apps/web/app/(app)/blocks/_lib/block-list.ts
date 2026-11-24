import { fabricatorBlocks } from "@/registry/fabricator/blocks"

import { getBlockSummary, orderBlocks, type BlockSummary } from "./blocks"

/** Every screen block, in the gallery's order. */
export const BLOCKS: BlockSummary[] = orderBlocks(fabricatorBlocks).map(
  ({ name, title, description, categories }) => ({
    name,
    title,
    description,
    summary: getBlockSummary(name, description),
    categories,
  })
)

/** A block as the registry declares it: its files and what it is built from. */
export function getBlockDeclaration(name: string) {
  return fabricatorBlocks.find((block) => block.name === name)
}
