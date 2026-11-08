import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/styles/radix-fabricator/ui/field"
import {
  FileUpload,
  FileUploadField,
} from "@/styles/radix-fabricator/ui/file-upload"

export function FileUploadFieldDemo() {
  return (
    <Field className="w-full max-w-sm">
      <FieldLabel htmlFor="file-upload-field">Attachments</FieldLabel>
      <FileUpload multiple maxSize={10 * 1024 * 1024}>
        <FileUploadField
          id="file-upload-field"
          aria-describedby="file-upload-field-description"
        />
      </FileUpload>
      <FieldDescription id="file-upload-field-description">
        Drop files on the field or choose them. Up to 10 MB each.
      </FieldDescription>
    </Field>
  )
}
