"use client"

import * as React from "react"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/styles/aria-fabricator/ui/attachment"
import {
  FileUpload,
  FileUploadDescription,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadMedia,
  FileUploadTitle,
  formatFileSize,
} from "@/styles/aria-fabricator/ui/file-upload"

export function FileUploadDemo() {
  const [files, setFiles] = React.useState<File[]>([])

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      multiple
      className="w-full max-w-md"
    >
      <FileUploadDropzone>
        <FileUploadMedia />
        <FileUploadTitle>Drop files here or click to browse</FileUploadTitle>
        <FileUploadDescription>
          Any file, as many as you like
        </FileUploadDescription>
      </FileUploadDropzone>
      {files.length > 0 && (
        <FileUploadList>
          {files.map((file) => (
            <FileUploadItem
              key={`${file.name}-${file.lastModified}`}
              file={file}
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
