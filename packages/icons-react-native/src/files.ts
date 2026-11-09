export * from "./generated/files.js"
export {
  FileIcon,
  type FileIconProps,
  type FileIconComponent,
} from "./file-icon.js"
export { FileTypeIcon, type FileTypeIconProps } from "./file-type-icon.js"
export {
  getFileIconName,
  getFolderIconName,
} from "./generated/file-associations.js"
export type { FileIconData, FilePalette } from "./generated/runtime/files.js"
export { renderFileSvg } from "./generated/runtime/file-svg.js"
