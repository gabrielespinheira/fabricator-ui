"use client"

import * as React from "react"
import { ImageIcon } from "lucide-react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  FileUpload,
  FileUploadDescription,
  FileUploadDropzone,
  FileUploadMedia,
  FileUploadTitle,
  useFileUrl,
} from "@/styles/base-fabricator/ui/file-upload"

export function FileUploadImage() {
  const [files, setFiles] = React.useState<File[]>([])
  const image = files[0]
  const url = useFileUrl(image)

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      accept="image/*"
      className="w-full max-w-xs"
    >
      <FileUploadDropzone
        aria-label={image ? `Replace ${image.name}` : "Choose a cover image"}
        className="aspect-video overflow-hidden p-0"
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <>
            <FileUploadMedia>
              <ImageIcon />
            </FileUploadMedia>
            <FileUploadTitle>Cover image</FileUploadTitle>
            <FileUploadDescription>PNG, JPG or WebP</FileUploadDescription>
          </>
        )}
      </FileUploadDropzone>
      {image && (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">
            {image.name}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setFiles([])}>
            Remove
          </Button>
        </div>
      )}
    </FileUpload>
  )
}
