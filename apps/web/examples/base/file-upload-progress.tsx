"use client"

import * as React from "react"
import { CheckIcon, XIcon } from "lucide-react"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/styles/base-fabricator/ui/attachment"
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
} from "@/styles/base-fabricator/ui/file-upload"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"

// Stands in for a real upload: every file gains a random step each tick.
function useSimulatedUpload(files: File[]) {
  const [progress, setProgress] = React.useState(() => new Map<File, number>())

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((current) => {
        const pending = files.filter((file) => (current.get(file) ?? 0) < 100)
        if (pending.length === 0) return current
        const next = new Map(current)
        for (const file of pending) {
          const step = 8 + Math.round(Math.random() * 14)
          next.set(file, Math.min(100, (current.get(file) ?? 0) + step))
        }
        return next
      })
    }, 300)
    return () => window.clearInterval(interval)
  }, [files])

  return progress
}

export function FileUploadProgress() {
  const [files, setFiles] = React.useState<File[]>([])
  const progress = useSimulatedUpload(files)

  return (
    <FileUpload
      value={files}
      onValueChange={setFiles}
      multiple
      className="w-full max-w-md"
    >
      <FileUploadDropzone>
        <FileUploadMedia />
        <FileUploadTitle>Upload to the shared drive</FileUploadTitle>
        <FileUploadDescription>
          Files upload as soon as you add them
        </FileUploadDescription>
      </FileUploadDropzone>
      {files.length > 0 && (
        <FileUploadList aria-label="Uploads">
          {files.map((file) => {
            const percent = progress.get(file) ?? 0
            const isDone = percent >= 100

            return (
              <FileUploadItem
                key={`${file.name}-${file.lastModified}`}
                file={file}
                state={isDone ? "done" : "uploading"}
              >
                {isDone ? (
                  <FileUploadItemPreview>
                    <CheckIcon />
                  </FileUploadItemPreview>
                ) : (
                  <AttachmentMedia>
                    <Spinner />
                  </AttachmentMedia>
                )}
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>
                    {isDone
                      ? `Uploaded · ${formatFileSize(file.size)}`
                      : `Uploading · ${percent}%`}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <FileUploadItemDelete
                    aria-label={
                      isDone ? `Remove ${file.name}` : `Cancel ${file.name}`
                    }
                  >
                    <XIcon />
                  </FileUploadItemDelete>
                </AttachmentActions>
              </FileUploadItem>
            )
          })}
        </FileUploadList>
      )}
    </FileUpload>
  )
}
