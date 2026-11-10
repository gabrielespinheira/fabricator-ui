import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import {
  AttachmentContent,
  AttachmentDescription,
  AttachmentTitle,
} from "@/registry/native/ui/attachment"
import {
  FileUpload,
  FileUploadDescription,
  FileUploadDropzone,
  FileUploadField,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadMedia,
  FileUploadTitle,
  FileUploadTrigger,
  formatFileSize,
  useFileUpload,
  type FileUploadFile,
} from "@/registry/native/ui/file-upload"
import { Text } from "@/registry/native/ui/text"

function PickerStatus() {
  const { canPick } = useFileUpload()
  return canPick ? null : (
    <Text className="text-muted-foreground">
      The host app supplies document picking. Validation and file removal work
      independently.
    </Text>
  )
}
function PickedFiles() {
  const { files } = useFileUpload()
  return (
    <FileUploadList>
      {files.map((file) => (
        <FileUploadItem key={file.uri} file={file}>
          <FileUploadItemPreview />
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {formatFileSize(file.size)}
            </AttachmentDescription>
          </AttachmentContent>
          <FileUploadItemDelete />
        </FileUploadItem>
      ))}
    </FileUploadList>
  )
}
const INITIAL_FILES: FileUploadFile[] = [
  {
    uri: "file:///example-report.pdf",
    name: "example-report.pdf",
    size: 2048,
    type: "application/pdf",
  },
]
function FileUploadExample() {
  const [error, setError] = React.useState("")
  return (
    <ExampleWrapper fit>
      <Example title="Multiple files and validation">
        <FileUpload
          multiple
          accept="image/*,.pdf"
          maxSize={5 * 1024 * 1024}
          maxFiles={3}
          defaultValue={INITIAL_FILES}
          onFileReject={(rejections) =>
            setError(
              rejections
                .map(({ file, reason }) => `${file.name}: ${reason}`)
                .join(", ")
            )
          }
        >
          <FileUploadDropzone>
            <FileUploadMedia />
            <FileUploadTitle>Choose files</FileUploadTitle>
            <FileUploadDescription>
              Images or PDF, up to 5 MB each. At most 3 files.
            </FileUploadDescription>
            <FileUploadTrigger>Browse files</FileUploadTrigger>
          </FileUploadDropzone>
          <PickerStatus />
          <PickedFiles />
        </FileUpload>
        {error ? <Text className="text-destructive-text">{error}</Text> : null}
      </Example>
      <Example title="Single file field">
        <FileUpload accept=".pdf">
          <FileUploadField placeholder="Choose a PDF" />
          <PickedFiles />
        </FileUpload>
      </Example>
      <Example title="Disabled">
        <FileUpload disabled defaultValue={INITIAL_FILES}>
          <FileUploadField />
          <PickedFiles />
        </FileUpload>
      </Example>
    </ExampleWrapper>
  )
}
export { FileUploadExample }
