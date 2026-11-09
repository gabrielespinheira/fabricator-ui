"use client"

import * as React from "react"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/styles/radix-fabricator/ui/attachment"
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
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
  type FileRejection,
} from "@/styles/radix-fabricator/ui/file-upload"

const MAX_SIZE = 2 * 1024 * 1024
const MAX_FILES = 3

const REASONS: Record<FileRejection["reason"], string> = {
  type: "isn't a PDF or an image",
  size: `is larger than ${formatFileSize(MAX_SIZE)}`,
  count: `is one too many (${MAX_FILES} at most)`,
}

export function FileUploadValidation() {
  const [files, setFiles] = React.useState<File[]>([])
  const [rejections, setRejections] = React.useState<FileRejection[]>([])
  const isInvalid = rejections.length > 0

  return (
    <Field data-invalid={isInvalid} className="w-full max-w-md">
      <FieldLabel htmlFor="receipts">Receipts</FieldLabel>
      <FileUpload
        inputId="receipts"
        value={files}
        onValueChange={(next) => {
          setFiles(next)
          setRejections([])
        }}
        onFileReject={setRejections}
        accept="application/pdf,image/*"
        maxSize={MAX_SIZE}
        maxFiles={MAX_FILES}
        multiple
      >
        <FileUploadDropzone
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? "receipts-error" : undefined}
        >
          <FileUploadMedia />
          <FileUploadTitle>Drop receipts or click to browse</FileUploadTitle>
          <FileUploadDescription>
            PDF or images, up to {formatFileSize(MAX_SIZE)} each, {MAX_FILES} at
            most
          </FileUploadDescription>
        </FileUploadDropzone>
        <FieldError
          id="receipts-error"
          errors={rejections.map(({ file, reason }) => ({
            message: `${file.name} ${REASONS[reason]}.`,
          }))}
        />
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
    </Field>
  )
}
