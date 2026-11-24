import type { ComponentType } from "react"

/** What the explorer runs in: a browser tab, or an app that adds its own page. */
export type ExplorerHost = {
  name: string
  status: string
  Services?: ComponentType
}
