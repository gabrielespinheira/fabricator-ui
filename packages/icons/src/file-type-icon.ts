import { createElement } from "react"

import type { FileIconProps } from "./file-icon.js"
import {
  getFileIconName,
  getFolderIconName,
} from "./generated/file-associations.js"
import { fileComponents } from "./generated/file-components.js"
import { FileIconError } from "./generated/runtime/files.js"

export type FileTypeIconProps = FileIconProps & {
  name: string
  kind?: "file" | "folder"
  open?: boolean
}

export function FileTypeIcon({
  name,
  kind = "file",
  open = false,
  ...props
}: FileTypeIconProps) {
  const id =
    kind === "folder" ? getFolderIconName(name, open) : getFileIconName(name)
  const Component = fileComponents[id]
  if (!Component) throw new FileIconError(`Missing file icon: ${id}`)
  return createElement(Component, props)
}
