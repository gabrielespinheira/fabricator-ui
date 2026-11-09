"use client"

import * as React from "react"
import { ImagesIcon } from "lucide-react"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentTitle,
} from "@/styles/radix-fabricator/ui/attachment"
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
} from "@/styles/radix-fabricator/ui/file-upload"

export function FileUploadMultiple() {
  const [files, setFiles] = React.useState<File[]>([])

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      accept="image/*"
      multiple
      className="w-full max-w-md"
    >
      <FileUploadDropzone>
        <FileUploadMedia>
          <ImagesIcon />
        </FileUploadMedia>
        <FileUploadTitle>Add photos</FileUploadTitle>
        <FileUploadDescription>
          Drop images or click to browse
        </FileUploadDescription>
      </FileUploadDropzone>
      {files.length > 0 && (
        <FileUploadList className="grid grid-cols-3 gap-2">
          {files.map((file) => (
            <FileUploadItem
              key={`${file.name}-${file.lastModified}`}
              file={file}
              orientation="vertical"
              className="w-full"
            >
              <FileUploadItemPreview />
              <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
              </AttachmentContent>
              <AttachmentActions>
                <FileUploadItemDelete variant="secondary" />
              </AttachmentActions>
            </FileUploadItem>
          ))}
        </FileUploadList>
      )}
    </FileUpload>
  )
}
