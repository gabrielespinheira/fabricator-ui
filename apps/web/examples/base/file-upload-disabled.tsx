import {
  FileUpload,
  FileUploadDescription,
  FileUploadDropzone,
  FileUploadMedia,
  FileUploadTitle,
  FileUploadTrigger,
} from "@/styles/base-fabricator/ui/file-upload"

export function FileUploadDisabled() {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <FileUpload disabled>
        <FileUploadDropzone>
          <FileUploadMedia />
          <FileUploadTitle>Uploads are paused</FileUploadTitle>
          <FileUploadDescription>
            Your storage is full. Free some space to add files.
          </FileUploadDescription>
        </FileUploadDropzone>
      </FileUpload>
      <FileUpload disabled>
        <FileUploadTrigger>Attach files</FileUploadTrigger>
      </FileUpload>
    </div>
  )
}
