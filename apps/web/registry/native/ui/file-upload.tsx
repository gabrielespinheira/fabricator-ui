import * as React from "react"
import { FileIcon, UploadIcon, XIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Image, ScrollView, View } from "react-native"

import {
  checkFiles,
  formatFileSize,
  isFileTypeAccepted,
  type FileRejectionReason,
  type FileRejection as SharedFileRejection,
  type UploadFile,
} from "@/registry/fabricator/shared/lib/file-upload-model"
import { Attachment, AttachmentMedia } from "@/registry/native/ui/attachment"
import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"

type FileUploadFile = UploadFile & { uri: string; lastModified?: number }
type FileRejection = SharedFileRejection<FileUploadFile>
type FileUploadProps = Omit<
  React.ComponentProps<typeof View>,
  "defaultValue" | "onChange"
> & {
  value?: FileUploadFile[]
  defaultValue?: FileUploadFile[]
  onValueChange?: (files: FileUploadFile[]) => void
  onFileReject?: (rejections: FileRejection[]) => void
  accept?: string
  multiple?: boolean
  maxSize?: number
  maxFiles?: number
  disabled?: boolean
  name?: string
  inputId?: string
  /** The host supplies its document/image picker; assets use URI, name, type and size. */
  onPick?: () => Promise<FileUploadFile[]>
}
type FileUploadPicker = (options: {
  accept?: string
  multiple: boolean
}) => Promise<FileUploadFile[]>
const FileUploadPickerContext = React.createContext<FileUploadPicker | null>(
  null
)
function FileUploadPickerProvider({
  pickFiles,
  children,
}: {
  pickFiles: FileUploadPicker
  children: React.ReactNode
}) {
  return (
    <FileUploadPickerContext value={pickFiles}>
      {children}
    </FileUploadPickerContext>
  )
}
const FileUploadContext = React.createContext<{
  files: FileUploadFile[]
  addFiles: (files: readonly FileUploadFile[]) => void
  removeFile: (file: FileUploadFile) => void
  clearFiles: () => void
  openPicker: () => Promise<void>
  isDisabled: boolean
  isDragging: boolean
  setDragging: (value: boolean) => void
  multiple: boolean
  canPick: boolean
} | null>(null)
const FileUploadItemContext = React.createContext<FileUploadFile | null>(null)
function useFileUpload() {
  const value = React.use(FileUploadContext)
  if (!value) throw new Error("File Upload parts must be inside FileUpload")
  return value
}
function useFileUploadItem() {
  const value = React.use(FileUploadItemContext)
  if (!value)
    throw new Error("File Upload item parts must be inside FileUploadItem")
  return value
}
function useFileUrl(file: FileUploadFile | null | undefined) {
  return file?.uri
}
function FileUpload({
  value: prop,
  defaultValue = [],
  onValueChange,
  onFileReject,
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  disabled = false,
  onPick,
  name: _name,
  inputId,
  className,
  ...props
}: FileUploadProps) {
  const pickFiles = React.use(FileUploadPickerContext)
  const [current, setFiles] = useControllableState<FileUploadFile[]>({
    prop,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const files = current ?? defaultValue
  const addFiles = (incoming: readonly FileUploadFile[]) => {
    if (disabled || !incoming.length) return
    const result = checkFiles(incoming, {
      accept,
      maxSize,
      maxFiles: multiple ? maxFiles : 1,
      existingCount: multiple ? files.length : 0,
    })
    if (result.accepted.length)
      setFiles(multiple ? [...files, ...result.accepted] : result.accepted)
    if (result.rejected.length) onFileReject?.(result.rejected)
  }
  const openPicker = async () => {
    if (disabled) return
    if (onPick) addFiles(await onPick())
    else if (pickFiles) addFiles(await pickFiles({ accept, multiple }))
  }
  return (
    <FileUploadContext
      value={{
        files,
        addFiles,
        removeFile: (file) => {
          if (!disabled) setFiles(files.filter((entry) => entry !== file))
        },
        clearFiles: () => {
          if (!disabled) setFiles([])
        },
        openPicker,
        isDisabled: disabled,
        canPick: Boolean(onPick || pickFiles),
        isDragging: false,
        setDragging: () => {},
        multiple,
      }}
    >
      <View
        data-slot="file-upload"
        nativeID={inputId}
        data-disabled={disabled}
        className={cn("cn-file-upload gap-3", className)}
        {...props}
      />
    </FileUploadContext>
  )
}
function FileUploadDropzone({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { isDisabled } = useFileUpload()
  return (
    <View
      data-slot="file-upload-dropzone"
      data-disabled={isDisabled}
      className={cn(
        "cn-file-upload-dropzone items-center gap-3 rounded-xl bg-muted p-6",
        className
      )}
      {...props}
    >
      {children}
    </View>
  )
}
function FileUploadField({
  placeholder,
  className,
  ...props
}: React.ComponentProps<typeof Button> & {
  placeholder?: string
  "aria-invalid"?: boolean
}) {
  const { files, multiple, openPicker, isDisabled, canPick } = useFileUpload()
  return (
    <View
      data-slot="file-upload-field"
      className={cn(
        "cn-file-upload-field flex-row items-center gap-2 rounded-lg bg-muted p-1",
        className
      )}
    >
      {files.length > 0 && (
        <ScrollView
          horizontal
          data-slot="file-upload-chips"
          className="cn-file-upload-chips min-w-0 flex-1"
          contentContainerClassName="gap-2"
        >
          <>
            {files.map((file) => (
              <FileUploadChip key={file.uri} file={file} />
            ))}
          </>
        </ScrollView>
      )}
      <Button
        data-slot="file-upload-field-browse"
        variant="ghost"
        disabled={isDisabled || !canPick}
        onPress={() => void openPicker()}
        className="cn-file-upload-field-browse"
        {...props}
      >
        <View className="cn-file-upload-field-icon">
          <UploadIcon />
        </View>
        <Text className="cn-file-upload-field-text">
          {files.length
            ? "Browse"
            : (placeholder ?? (multiple ? "Choose files" : "Choose a file"))}
        </Text>
      </Button>
    </View>
  )
}
function FileUploadChip({ file }: { file: FileUploadFile }) {
  const { removeFile, isDisabled } = useFileUpload()
  return (
    <View
      data-slot="file-upload-chip"
      className="cn-file-upload-chip flex-row items-center gap-2 rounded-md bg-card px-2"
    >
      <View
        data-slot="file-upload-chip-preview"
        className="cn-file-upload-chip-preview"
      >
        <View
          data-slot="file-upload-chip-icon"
          className="cn-file-upload-chip-icon"
        >
          <FileIcon size={16} />
        </View>
      </View>
      <Text numberOfLines={1} className="cn-file-upload-chip-name max-w-40">
        {file.name}
      </Text>
      <Button
        data-slot="file-upload-chip-remove"
        className="cn-file-upload-chip-remove"
        variant="ghost"
        size="icon-xs"
        disabled={isDisabled}
        accessibilityLabel={`Remove ${file.name}`}
        onPress={() => removeFile(file)}
      >
        <XIcon />
      </Button>
    </View>
  )
}
function FileUploadMedia({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="file-upload-media"
      className={cn("cn-file-upload-media", className)}
      {...props}
    >
      {children ?? <UploadIcon size={24} />}
    </View>
  )
}
function FileUploadTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="file-upload-title"
      className={cn("cn-file-upload-title font-medium", className)}
      {...props}
    />
  )
}
function FileUploadDescription({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="file-upload-description"
      className={cn(
        "cn-file-upload-description text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
function FileUploadTrigger({
  className,
  onPress,
  disabled,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { openPicker, isDisabled, canPick } = useFileUpload()
  return (
    <Button
      data-slot="file-upload-trigger"
      variant="outline"
      className={cn("cn-file-upload-trigger", className)}
      disabled={disabled ?? (isDisabled || !canPick)}
      onPress={(event) => {
        onPress?.(event)
        if (!event.defaultPrevented) void openPicker()
      }}
      {...props}
    />
  )
}
function FileUploadList({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="file-upload-list"
      className={cn("cn-file-upload-list gap-2", className)}
      {...props}
    />
  )
}
function FileUploadItem({
  file,
  className,
  ...props
}: React.ComponentProps<typeof Attachment> & { file: FileUploadFile }) {
  return (
    <FileUploadItemContext value={file}>
      <Attachment
        data-slot="file-upload-item"
        className={cn("cn-file-upload-item", className)}
        {...props}
      />
    </FileUploadItemContext>
  )
}
function FileUploadItemPreview({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AttachmentMedia>, "variant">) {
  const file = useFileUploadItem()
  return (
    <AttachmentMedia
      data-slot="file-upload-item-preview"
      variant={file.type.startsWith("image/") ? "image" : "icon"}
      className={cn("cn-file-upload-item-preview", className)}
      {...props}
    >
      {file.type.startsWith("image/") ? (
        <Image source={{ uri: file.uri }} alt="" className="size-full" />
      ) : (
        (children ?? <FileIcon />)
      )}
    </AttachmentMedia>
  )
}
function FileUploadItemDelete({
  className,
  onPress,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const file = useFileUploadItem()
  const { removeFile, isDisabled } = useFileUpload()
  return (
    <Button
      data-slot="file-upload-item-delete"
      variant="ghost"
      size="icon-xs"
      accessibilityLabel={`Remove ${file.name}`}
      disabled={isDisabled}
      className={cn("cn-file-upload-item-delete", className)}
      onPress={(event) => {
        onPress?.(event)
        if (!event.defaultPrevented) removeFile(file)
      }}
      {...props}
    >
      {children ?? <XIcon />}
    </Button>
  )
}
export {
  FileUploadPickerProvider,
  type FileUploadPicker,
  FileUpload,
  FileUploadDropzone,
  FileUploadField,
  FileUploadMedia,
  FileUploadTitle,
  FileUploadDescription,
  FileUploadTrigger,
  FileUploadList,
  FileUploadItem,
  FileUploadItemPreview,
  FileUploadItemDelete,
  useFileUpload,
  useFileUrl,
  checkFiles,
  isFileTypeAccepted,
  formatFileSize,
  type FileRejection,
  type FileRejectionReason,
  type FileUploadFile,
}
