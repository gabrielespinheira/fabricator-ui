"use client"

import * as React from "react"

import {
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/styles/base-fabricator/ui/attachment"
import { Button } from "@/styles/base-fabricator/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/styles/base-fabricator/ui/field"
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
import { Input } from "@/styles/base-fabricator/ui/input"

export function FileUploadForm() {
  const [files, setFiles] = React.useState<File[]>([])
  const [submitted, setSubmitted] = React.useState<string | null>(null)

  return (
    <form
      className="w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const resume = data
          .getAll("resume")
          .filter((entry) => entry instanceof File)
        setSubmitted(
          `${data.get("name") || "Someone"} sent ${resume.map((file) => file.name).join(", ") || "no file"}.`
        )
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="applicant-name">Name</FieldLabel>
          <Input id="applicant-name" name="name" autoComplete="name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="resume">Résumé</FieldLabel>
          <FileUpload
            inputId="resume"
            name="resume"
            value={files}
            onValueChange={setFiles}
            accept=".pdf,.doc,.docx"
          >
            {files.length === 0 ? (
              <FileUploadDropzone aria-describedby="resume-description">
                <FileUploadMedia />
                <FileUploadTitle>
                  Drop your résumé or click to browse
                </FileUploadTitle>
              </FileUploadDropzone>
            ) : (
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
          <FieldDescription id="resume-description">
            PDF or Word, one file.
          </FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Button type="submit">Apply</Button>
        </Field>
        {submitted && (
          <p role="status" className="text-sm text-muted-foreground">
            {submitted}
          </p>
        )}
      </FieldGroup>
    </form>
  )
}
