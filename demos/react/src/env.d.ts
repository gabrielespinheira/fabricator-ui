/// <reference types="vite/client" />

declare module "virtual:fabricator-explorer" {
  import type { ComponentType } from "react"
  import type { CatalogItem } from "./explorer-model"

  export type ExplorerDemo = {
    id: string
    item: string
    title: string
    isFullPage: boolean
    load: () => Promise<{ default: ComponentType }>
  }
  export const catalog: CatalogItem[]
  export const demos: ExplorerDemo[]
  export const blocks: ExplorerDemo[]
}
