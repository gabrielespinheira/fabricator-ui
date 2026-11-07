"use client"

import * as React from "react"
import { cn } from "cn"

import {
  Attachment,
  AttachmentMedia,
} from "@/registry/radix-fabricator/ui/attachment"
import {
  buttonVariants,
  type Button,
} from "@/registry/radix-fabricator/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A file picker with a drop zone, built on a real <input type="file"> that
// stays out of sight: the drop zone and the trigger open it, drops go
// through the same checks, and its FileList follows the picked files so a
// form posts them. The picked files are rows of the Attachment component.

type FileRejectionReason = "type" | "size" | "count"

type FileRejection = {
  file: File
  reason: FileRejectionReason
}

type FileCheckOptions = {
  /** The `accept` attribute: MIME types, `type/*` wildcards and extensions. */
  accept?: string
  /** Largest size in bytes. */
  maxSize?: number
  /** Most files in all, counting `existingCount`. */
  maxFiles?: number
  /** Files already picked. */
  existingCount?: number
}

/**
 * Whether a file matches an `accept` string, as the browser's picker reads
 * it: `.pdf` matches the name's extension, `image/*` the MIME family and
 * `application/pdf` the exact type. A file with no type only matches by
 * extension.
 */
function isFileTypeAccepted(
  file: Pick<File, "name" | "type">,
  accept: string | undefined
) {
  const patterns = (accept ?? "")
    .split(",")
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean)
  if (patterns.length === 0) return true

  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern === "*" || pattern === "*/*") return true
    if (pattern.startsWith(".")) return name.endsWith(pattern)
    if (!type) return false
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1))
    return type === pattern
  })
}

/**
 * Splits picked or dropped files into the accepted and the rejected, with a
 * reason for each rejection. Type is checked first, then size, then the
 * count, so a file of the wrong type never uses up a place.
 */
function checkFiles(
  files: readonly File[],
  {
    accept,
    maxSize = Infinity,
    maxFiles = Infinity,
    existingCount = 0,
  }: FileCheckOptions
) {
  const accepted: File[] = []
  const rejected: FileRejection[] = []

  for (const file of files) {
    if (!isFileTypeAccepted(file, accept)) {
      rejected.push({ file, reason: "type" })
    } else if (file.size > maxSize) {
      rejected.push({ file, reason: "size" })
    } else if (existingCount + accepted.length >= maxFiles) {
      rejected.push({ file, reason: "count" })
    } else {
      accepted.push(file)
    }
  }

  return { accepted, rejected }
}

const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const

/** A byte count for people: `512 B`, `1.5 KB`, `5 MB`, `123 MB`. */
function formatFileSize(bytes: number) {
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const rounded =
    unitIndex === 0 || value >= 100
      ? Math.round(value)
      : Math.round(value * 10) / 10
  return `${rounded} ${FILE_SIZE_UNITS[unitIndex]}`
}

function useControllable<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : uncontrolled
  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )
  return [value, setValue] as const
}

type FileUploadContextValue = {
  files: File[]
  addFiles: (files: readonly File[]) => void
  /** With `moveFocus`, focus goes to the next row's delete button (or the zone). */
  removeFile: (file: File, options?: { moveFocus?: boolean }) => void
  clearFiles: () => void
  openPicker: () => void
  isDisabled: boolean
  isDragging: boolean
  setDragging: (isDragging: boolean) => void
  multiple: boolean
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(
  null
)

/** The picked files and the picker's actions, for parts of your own. */
function useFileUpload() {
  const context = React.useContext(FileUploadContext)
  if (!context) {
    throw new Error("useFileUpload must be used within <FileUpload>.")
  }
  return context
}

const NO_FILES: File[] = []

type FileUploadProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  /** The picked files. Controlled. */
  value?: File[]
  defaultValue?: File[]
  onValueChange?: (files: File[]) => void
  /** Called with the files a pick or drop turned away, and why. */
  onFileReject?: (rejections: FileRejection[]) => void
  /** The `accept` attribute: `image/*`, `application/pdf`, `.md`… */
  accept?: string
  /** Keeps a list. Without it, a new file replaces the one picked. */
  multiple?: boolean
  /** Largest size in bytes. */
  maxSize?: number
  /** Most files in the list (with `multiple`). */
  maxFiles?: number
  disabled?: boolean
  /** Posts the files with a form under this name. */
  name?: string
  /** The hidden input's id, for a `<label htmlFor>`. */
  inputId?: string
}

function FileUpload({
  className,
  value: valueProp,
  defaultValue = NO_FILES,
  onValueChange,
  onFileReject,
  accept,
  multiple = false,
  maxSize,
  maxFiles,
  disabled = false,
  name,
  inputId,
  children,
  ref,
  ...props
}: FileUploadProps) {
  const [files, setFiles] = useControllable(
    valueProp,
    defaultValue,
    onValueChange
  )
  const [isDragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const pendingFocusIndexRef = React.useRef<number | null>(null)

  const addFiles = React.useCallback(
    (incoming: readonly File[]) => {
      if (disabled || incoming.length === 0) return
      const { accepted, rejected } = checkFiles(incoming, {
        accept,
        maxSize,
        maxFiles: multiple ? maxFiles : 1,
        existingCount: multiple ? files.length : 0,
      })
      if (accepted.length > 0) {
        setFiles(multiple ? [...files, ...accepted] : accepted)
      }
      if (rejected.length > 0) onFileReject?.(rejected)
    },
    [
      accept,
      disabled,
      files,
      maxFiles,
      maxSize,
      multiple,
      onFileReject,
      setFiles,
    ]
  )

  const removeFile = React.useCallback(
    (file: File, { moveFocus = false }: { moveFocus?: boolean } = {}) => {
      if (moveFocus) pendingFocusIndexRef.current = files.indexOf(file)
      setFiles(files.filter((picked) => picked !== file))
    },
    [files, setFiles]
  )

  // A removed row takes its focused delete button with it: hand focus to the
  // row that took its place, the one before it, or whatever opens the picker.
  React.useLayoutEffect(() => {
    const index = pendingFocusIndexRef.current
    const root = rootRef.current
    if (index === null || !root) return
    pendingFocusIndexRef.current = null
    const buttons = root.querySelectorAll<HTMLElement>(
      "[data-slot=file-upload-item-delete]"
    )
    const target =
      buttons[Math.min(index, buttons.length - 1)] ??
      root.querySelector<HTMLElement>(
        "[data-slot=file-upload-dropzone], [data-slot=file-upload-trigger]"
      )
    target?.focus()
  }, [files])

  const clearFiles = React.useCallback(() => setFiles([]), [setFiles])

  const openPicker = React.useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  // The input's own FileList is cleared after every pick (so picking the same
  // file again still fires), then set to the list, so a form posts what the
  // person sees.
  React.useEffect(() => {
    const input = inputRef.current
    if (!input || !name || typeof DataTransfer === "undefined") return
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
  }, [files, name])

  const context = React.useMemo<FileUploadContextValue>(
    () => ({
      files,
      addFiles,
      removeFile,
      clearFiles,
      openPicker,
      isDisabled: disabled,
      isDragging,
      setDragging,
      multiple,
    }),
    [
      files,
      addFiles,
      removeFile,
      clearFiles,
      openPicker,
      disabled,
      isDragging,
      multiple,
    ]
  )

  return (
    <FileUploadContext.Provider value={context}>
      <div
        ref={(element) => {
          rootRef.current = element
          if (typeof ref === "function") return ref(element)
          if (ref) ref.current = element
        }}
        data-slot="file-upload"
        data-disabled={disabled ? "" : undefined}
        data-dragging={isDragging ? "" : undefined}
        className={cn(
          "flex flex-col gap-(--density-12) text-(length:--density-text-13)",
          className
        )}
        {...props}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          data-slot="file-upload-input"
          className="sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.currentTarget.files ?? []))
            event.currentTarget.value = ""
          }}
        />
        {children}
      </div>
    </FileUploadContext.Provider>
  )
}

function hasFiles(event: React.DragEvent) {
  return event.dataTransfer.types.includes("Files")
}

function FileUploadDropzone({
  className,
  onClick,
  onKeyDown,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  ...props
}: React.ComponentProps<"div">) {
  const {
    addFiles,
    openPicker,
    isDisabled,
    isDragging,
    setDragging,
    multiple,
  } = useFileUpload()

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-disabled={isDisabled || undefined}
      data-slot="file-upload-dropzone"
      data-disabled={isDisabled ? "" : undefined}
      data-dragging={isDragging ? "" : undefined}
      data-multiple={multiple ? "" : undefined}
      className={cn(
        "group/file-upload-dropzone relative flex cursor-pointer flex-col items-center justify-center gap-(--density-6) rounded-xl border border-dashed border-border p-(--density-24) text-center text-foreground transition-[background-color,border-color] duration-feedback ease-feedback outline-none select-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive/50 data-dragging:border-solid data-dragging:border-foreground/30 data-dragging:bg-active data-dragging:aria-invalid:border-destructive/70 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:hover:bg-transparent",
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) openPicker()
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.target !== event.currentTarget) {
          return
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          openPicker()
        }
      }}
      onDragEnter={(event) => {
        onDragEnter?.(event)
        if (isDisabled || !hasFiles(event)) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => {
        onDragOver?.(event)
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = isDisabled ? "none" : "copy"
      }}
      onDragLeave={(event) => {
        onDragLeave?.(event)
        // Leaving for a child isn't leaving the zone.
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setDragging(false)
      }}
      onDrop={(event) => {
        onDrop?.(event)
        if (!hasFiles(event)) return
        event.preventDefault()
        setDragging(false)
        addFiles(Array.from(event.dataTransfer.files))
      }}
      {...props}
    />
  )
}

function FileUploadMedia({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="file-upload-media"
      className={cn(
        "mb-(--density-6) flex size-(--density-40) shrink-0 items-center justify-center rounded-xl bg-surface-4 text-foreground shadow-surface-4 transition-transform duration-move ease-move group-data-dragging/file-upload-dropzone:-translate-y-1 motion-reduce:transition-none motion-reduce:group-data-dragging/file-upload-dropzone:translate-y-0 [&_svg]:pointer-events-none [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-20)",
        className
      )}
      {...props}
    >
      {children ?? (
        <IconPlaceholder
          lucide="UploadIcon"
          tabler="IconUpload"
          hugeicons="Upload04Icon"
          phosphor="UploadSimpleIcon"
          remixicon="RiUploadLine"
        />
      )}
    </div>
  )
}

function FileUploadTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="file-upload-title"
      className={cn(
        "text-(length:--density-text-14) leading-snug font-medium",
        className
      )}
      {...props}
    />
  )
}

function FileUploadDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="file-upload-description"
      className={cn(
        "text-(length:--density-text-12) leading-snug text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function FileUploadTrigger({
  className,
  variant = "outline",
  size = "default",
  type = "button",
  disabled,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  const { openPicker, isDisabled } = useFileUpload()

  return (
    <button
      type={type}
      data-slot="file-upload-trigger"
      data-variant={variant}
      data-size={size}
      disabled={disabled ?? isDisabled}
      className={cn("self-start", buttonVariants({ variant, size }), className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) openPicker()
      }}
      {...props}
    />
  )
}

function FileUploadList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="list"
      data-slot="file-upload-list"
      className={cn("flex flex-col gap-(--density-8)", className)}
      {...props}
    />
  )
}

const FileUploadItemContext = React.createContext<File | null>(null)

function useFileUploadItem() {
  const file = React.useContext(FileUploadItemContext)
  if (!file) {
    throw new Error(
      "FileUploadItem parts must be used within <FileUploadItem>."
    )
  }
  return file
}

/** An object URL for the file while it is shown, revoked afterwards. */
function useFileUrl(file: File | null | undefined) {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!file) {
      setUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(file)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [file])

  return url
}

function FileUploadItem({
  file,
  className,
  ...props
}: React.ComponentProps<typeof Attachment> & { file: File }) {
  return (
    <FileUploadItemContext.Provider value={file}>
      <Attachment
        role="listitem"
        data-slot="file-upload-item"
        className={cn("w-full", className)}
        {...props}
      />
    </FileUploadItemContext.Provider>
  )
}

/** The file's picture for images, a file icon for anything else. */
function FileUploadItemPreview({
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof AttachmentMedia>, "variant">) {
  const file = useFileUploadItem()
  const isImage = file.type.startsWith("image/")
  const url = useFileUrl(isImage ? file : null)

  return (
    <AttachmentMedia
      variant={url ? "image" : "icon"}
      data-slot="file-upload-item-preview"
      className={cn("select-none", className)}
      {...props}
    >
      {url ? (
        <img src={url} alt="" />
      ) : (
        (children ?? (
          <IconPlaceholder
            lucide="FileIcon"
            tabler="IconFile"
            hugeicons="File01Icon"
            phosphor="FileIcon"
            remixicon="RiFileLine"
          />
        ))
      )}
    </AttachmentMedia>
  )
}

/** Removes its row's file, then moves focus to the next row (or the zone). */
function FileUploadItemDelete({
  className,
  variant = "ghost",
  size = "icon-xs",
  onClick,
  children,
  ...props
}: React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) {
  const file = useFileUploadItem()
  const { removeFile, isDisabled } = useFileUpload()

  return (
    <button
      type="button"
      aria-label={`Remove ${file.name}`}
      data-slot="file-upload-item-delete"
      data-variant={variant}
      data-size={size}
      disabled={isDisabled}
      className={cn("shrink-0", buttonVariants({ variant, size }), className)}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) removeFile(file, { moveFocus: true })
      }}
      {...props}
    >
      {children ?? (
        <IconPlaceholder
          lucide="XIcon"
          tabler="IconX"
          hugeicons="Cancel01Icon"
          phosphor="XIcon"
          remixicon="RiCloseLine"
        />
      )}
    </button>
  )
}

export {
  FileUpload,
  FileUploadDropzone,
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
}
