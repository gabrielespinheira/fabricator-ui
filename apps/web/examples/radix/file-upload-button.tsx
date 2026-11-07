"use client"

import * as React from "react"
import { PaperclipIcon } from "lucide-react"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/styles/radix-fabricator/ui/attachment"
import {
  FileUpload,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
  formatFileSize,
} from "@/styles/radix-fabricator/ui/file-upload"

export function FileUploadButton() {
  const [files, setFiles] = React.useState<File[]>([])

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      multiple
      className="w-full max-w-sm"
    >
      <FileUploadTrigger>
        <PaperclipIcon data-icon="inline-start" />
        Attach files
      </FileUploadTrigger>
      {files.length > 0 && (
        <FileUploadList>
          {files.map((file) => (
            <FileUploadItem
              key={`${file.name}-${file.lastModified}`}
              file={file}
              size="sm"
            >
              <FileUploadItemPreview />
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
      )}
    </FileUpload>
  )
}
