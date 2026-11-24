import { FileTypeIcon } from "@fabricator-ui/icons/files"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/registry/bases/__base__/ui/attachment"
import {
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemPreview,
  FileUploadList,
  formatFileSize,
} from "@/registry/bases/__base__/ui/file-upload"

/** The files going out with a message, each with a way to take it off. */
export function MailFileList({ files }: { files: readonly File[] }) {
  return (
    <FileUploadList
      aria-label="Attachments"
      className="w-full flex-row flex-wrap gap-(--density-8)"
    >
      {files.map((file) => (
        <FileUploadItem
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          size="sm"
          className="w-auto max-w-64"
        >
          <FileUploadItemPreview>
            <FileTypeIcon name={file.name} className="size-5" />
          </FileUploadItemPreview>
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {formatFileSize(file.size)}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <FileUploadItemDelete />
          </AttachmentActions>
        </FileUploadItem>
      ))}
    </FileUploadList>
  )
}
