"use client"

import * as React from "react"
import { cn } from "cn"

import {
  Attachment,
  AttachmentMedia,
} from "@/registry/bases/__base__/ui/attachment"
import {
  buttonVariants,
  type Button,
} from "@/registry/bases/__base__/ui/button"
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
      "[data-slot=file-upload-item-delete], [data-slot=file-upload-chip-remove]"
    )
    const target =
      buttons[Math.min(index, buttons.length - 1)] ??
      root.querySelector<HTMLElement>(
        "[data-slot=file-upload-field-browse], [data-slot=file-upload-dropzone], [data-slot=file-upload-trigger]"
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
        className={cn("cn-file-upload flex flex-col", className)}
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

type DropTargetHandlers = Pick<
  React.ComponentProps<"div">,
  "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
>

/**
 * Makes an element take dropped files: it lights while files are over it and
 * hands a drop to the same checks as a pick. Your own handlers run first.
 */
function useFileDropTarget({
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: DropTargetHandlers): DropTargetHandlers {
  const { addFiles, isDisabled, setDragging } = useFileUpload()

  return {
    onDragEnter: (event) => {
      onDragEnter?.(event)
      if (isDisabled || !hasFiles(event)) return
      event.preventDefault()
      setDragging(true)
    },
    onDragOver: (event) => {
      onDragOver?.(event)
      if (!hasFiles(event)) return
      event.preventDefault()
      event.dataTransfer.dropEffect = isDisabled ? "none" : "copy"
    },
    onDragLeave: (event) => {
      onDragLeave?.(event)
      // Leaving for a child isn't leaving the target.
      const next = event.relatedTarget
      if (next instanceof Node && event.currentTarget.contains(next)) return
      setDragging(false)
    },
    onDrop: (event) => {
      onDrop?.(event)
      if (!hasFiles(event)) return
      event.preventDefault()
      setDragging(false)
      addFiles(Array.from(event.dataTransfer.files))
    },
  }
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
  const { openPicker, isDisabled, isDragging, multiple } = useFileUpload()
  const dropHandlers = useFileDropTarget({
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  })

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
        "cn-file-upload-dropzone group/file-upload-dropzone relative flex flex-col items-center justify-center text-center outline-none select-none",
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
      {...dropHandlers}
      {...props}
    />
  )
}

/** One picked file in a field: its picture or icon, name and remove. */
function FileUploadChip({ file }: { file: File }) {
  const { removeFile, isDisabled } = useFileUpload()
  const isImage = file.type.startsWith("image/")
  const url = useFileUrl(isImage ? file : null)

  return (
    <span
      title={`${file.name}, ${formatFileSize(file.size)}`}
      data-slot="file-upload-chip"
      className="cn-file-upload-chip inline-flex shrink-0 items-center"
    >
      {url ? (
        <img
          src={url}
          alt=""
          data-slot="file-upload-chip-preview"
          className="cn-file-upload-chip-preview shrink-0"
        />
      ) : (
        <span
          aria-hidden="true"
          data-slot="file-upload-chip-icon"
          className="cn-file-upload-chip-icon flex shrink-0 items-center"
        >
          <IconPlaceholder
            lucide="FileIcon"
            tabler="IconFile"
            hugeicons="File01Icon"
            phosphor="FileIcon"
            remixicon="RiFileLine"
          />
        </span>
      )}
      <span className="cn-file-upload-chip-name truncate">{file.name}</span>
      <button
        type="button"
        aria-label={`Remove ${file.name}`}
        disabled={isDisabled}
        data-slot="file-upload-chip-remove"
        className="cn-file-upload-chip-remove flex shrink-0 items-center justify-center outline-none"
        onClick={() => removeFile(file, { moveFocus: true })}
      >
        <IconPlaceholder
          lucide="XIcon"
          tabler="IconX"
          hugeicons="Cancel01Icon"
          phosphor="XIcon"
          remixicon="RiCloseLine"
        />
      </button>
    </span>
  )
}

/**
 * A file picker the size and frame of an Input, which it keeps whatever it
 * holds. Empty, it reads like one, with a placeholder that opens the picker.
 * Picked files sit in it as chips on one row that scrolls sideways, with a
 * plus button to add more (or replace the one) at its end.
 * Files dropped on it go through the same checks, and while they're over it
 * the frame lifts and says what a drop does.
 */
function FileUploadField({
  className,
  id,
  placeholder,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  ...props
}: Omit<React.ComponentProps<"div">, "placeholder"> & {
  /** Shown while no file is picked. */
  placeholder?: string
}) {
  const { files, openPicker, isDisabled, isDragging, multiple } =
    useFileUpload()
  const dropHandlers = useFileDropTarget({
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  })
  const hasPicked = files.length > 0
  const isInvalid = ariaInvalid === true || ariaInvalid === "true"
  const chipsRef = React.useRef<HTMLDivElement>(null)
  const previousCountRef = React.useRef(files.length)

  // An added file is the last chip: bring it into view.
  React.useEffect(() => {
    const chips = chipsRef.current
    if (chips && files.length > previousCountRef.current) {
      chips.scrollTo({ left: chips.scrollWidth, behavior: "smooth" })
    }
    previousCountRef.current = files.length
  }, [files.length])
  const emptyText =
    placeholder ??
    (multiple
      ? "Choose files or drop them here"
      : "Choose a file or drop it here")

  return (
    <div
      data-slot="file-upload-field"
      data-invalid={isInvalid ? "" : undefined}
      data-disabled={isDisabled ? "" : undefined}
      data-dragging={isDragging ? "" : undefined}
      data-filled={hasPicked ? "" : undefined}
      className={cn(
        "cn-file-upload-field group/file-upload-field relative flex w-full min-w-0 items-center",
        className
      )}
      {...dropHandlers}
      {...props}
    >
      {hasPicked && (
        <div
          ref={chipsRef}
          data-slot="file-upload-chips"
          className="cn-file-upload-chips flex min-w-0 flex-1 items-center overflow-x-auto"
        >
          {files.map((file) => (
            <FileUploadChip
              key={`${file.name}-${file.size}-${file.lastModified}`}
              file={file}
            />
          ))}
        </div>
      )}
      <button
        type="button"
        id={id}
        disabled={isDisabled}
        aria-label={
          hasPicked ? (multiple ? "Add files" : "Replace file") : undefined
        }
        data-slot="file-upload-field-browse"
        aria-describedby={ariaDescribedBy}
        className="cn-file-upload-field-browse flex min-w-0 items-center outline-none"
        onClick={openPicker}
      >
        <span
          aria-hidden="true"
          className="cn-file-upload-field-icon flex shrink-0 items-center"
        >
          {hasPicked ? (
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="PlusSignIcon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
            />
          ) : (
            <IconPlaceholder
              lucide="PaperclipIcon"
              tabler="IconPaperclip"
              hugeicons="Attachment01Icon"
              phosphor="PaperclipIcon"
              remixicon="RiAttachment2"
            />
          )}
        </span>
        {!hasPicked && (
          <span className="cn-file-upload-field-text truncate">
            {emptyText}
          </span>
        )}
      </button>
      <span
        aria-hidden="true"
        data-slot="file-upload-field-drop"
        className="cn-file-upload-field-drop pointer-events-none absolute flex items-center justify-center"
      >
        <IconPlaceholder
          lucide="ArrowDownIcon"
          tabler="IconArrowDown"
          hugeicons="ArrowDown02Icon"
          phosphor="ArrowDownIcon"
          remixicon="RiArrowDownLine"
        />
        {multiple ? "Drop to add" : "Drop to upload"}
      </span>
    </div>
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
        "cn-file-upload-media flex shrink-0 items-center justify-center [&_svg]:pointer-events-none",
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
      className={cn("cn-file-upload-title", className)}
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
      className={cn("cn-file-upload-description", className)}
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
      className={cn(
        buttonVariants({ variant, size }),
        "cn-file-upload-trigger",
        className
      )}
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
      className={cn("cn-file-upload-list flex flex-col", className)}
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
        className={cn("cn-file-upload-item", className)}
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
      className={cn("cn-file-upload-item-preview", className)}
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
      className={cn(
        buttonVariants({ variant, size }),
        "cn-file-upload-item-delete",
        className
      )}
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
}
