"use client"

// Files and pictures on a record. The app stores them and answers with their
// addresses; this draws them, takes new ones by picker, drop, paste or link,
// and says what went wrong with the ones that didn't make it.
import * as React from "react"
import { cn } from "cn"

import { ControlPopover } from "@/registry/bases/__base__/components/property-controls"
import {
  checkFiles,
  formatFileSize,
} from "@/registry/bases/__base__/lib/file-upload-model"
import {
  getFileLimits,
  getFileLink,
  isImageFile,
  readPropertyFiles,
  type PropertyFile,
} from "@/registry/bases/__base__/lib/property-model"
import {
  readTextSetting,
  type PropertyDefinition,
} from "@/registry/bases/__base__/lib/property-types"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Input } from "@/registry/bases/__base__/ui/input"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** Stores files and returns how to reach them. Throw to say why it can't. */
type PropertyFilesAdd = (
  property: PropertyDefinition,
  files: File[]
) => Promise<PropertyFile[]>

/** A picture that steps aside for an icon when its address doesn't load. */
function PropertyImage({
  file,
  className,
}: {
  file: PropertyFile
  className?: string
}) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null)
  const source = file.thumbnail ?? file.url
  if (!isImageFile(file) || failedUrl === source)
    return (
      <span
        data-slot="properties-file-icon"
        className={cn(
          "cn-properties-file-icon inline-flex items-center justify-center",
          className
        )}
      >
        {isImageFile(file) ? (
          <IconPlaceholder
            lucide="ImageIcon"
            tabler="IconPhoto"
            hugeicons="ImageIcon"
            phosphor="ImageIcon"
            remixicon="RiImageLine"
          />
        ) : (
          <IconPlaceholder
            lucide="FileIcon"
            tabler="IconFile"
            hugeicons="FileIcon"
            phosphor="FileIcon"
            remixicon="RiFileLine"
          />
        )}
      </span>
    )
  return (
    <img
      src={source}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("object-cover", className)}
      onError={() => setFailedUrl(source)}
    />
  )
}

/** The files at a glance: pictures in a row, the rest counted. */
function PropertyThumbnails({
  property,
  value,
  variant,
}: {
  property: PropertyDefinition
  value: unknown
  variant: "row" | "card"
}) {
  const files = readPropertyFiles(value)
  if (variant === "card")
    return (
      <span className="cn-properties-number inline-flex items-center tabular-nums">
        <IconPlaceholder
          lucide="PaperclipIcon"
          tabler="IconPaperclip"
          hugeicons="Attachment01Icon"
          phosphor="PaperclipIcon"
          remixicon="RiAttachment2"
        />
        {files.length}
        <span className="sr-only"> files</span>
      </span>
    )
  return (
    <ul
      aria-label={property.name}
      data-slot="properties-files"
      data-display={readTextSetting(property, "display")}
      className="cn-properties-files flex list-none flex-wrap"
    >
      {files.map((file) => (
        <li
          key={file.id}
          className="cn-properties-file relative flex min-w-0 items-center overflow-hidden"
        >
          <PropertyFileFace property={property} file={file} />
        </li>
      ))}
    </ul>
  )
}

function PropertyFileFace({
  property,
  file,
}: {
  property: PropertyDefinition
  file: PropertyFile
}) {
  const isList = readTextSetting(property, "display") === "list"
  if (!isList && isImageFile(file))
    return (
      <>
        <PropertyImage file={file} className="cn-properties-file-image" />
        <span className="sr-only">{file.name}</span>
      </>
    )
  return (
    <span className="cn-properties-file-chip flex min-w-0 items-center">
      <PropertyImage file={file} className="cn-properties-file-mark shrink-0" />
      <span className="truncate">{file.name}</span>
      {file.size !== undefined && (
        <span className="cn-properties-file-size shrink-0 tabular-nums">
          {formatFileSize(file.size)}
        </span>
      )}
    </span>
  )
}

type PropertyUpload = {
  id: string
  file: File
  /** A local picture of it, while the real one is on its way. */
  preview?: string
  error?: string
}

const rejectionReasons = {
  type: "isn’t a type this property accepts",
  size: "is too large",
  count: "is one too many",
}

/** The uploads under way. Each saves as it lands, whatever order that is. */
function usePropertyUploads({
  property,
  value,
  onValueChange,
  onFilesAdd,
}: {
  property: PropertyDefinition
  value: unknown
  onValueChange: (value: unknown) => void
  onFilesAdd?: PropertyFilesAdd
}) {
  const [uploads, setUploads] = React.useState<readonly PropertyUpload[]>([])
  const [rejected, setRejected] = React.useState<string | null>(null)
  // Two uploads can land before a render, so both read the value from here.
  const latest = React.useRef(value)
  React.useEffect(() => {
    latest.current = value
  }, [value])

  function save(files: readonly PropertyFile[]) {
    latest.current = files
    onValueChange(files.length ? files : null)
  }

  async function send(upload: PropertyUpload) {
    if (!onFilesAdd) return
    setUploads((list) => [
      ...list.filter(({ id }) => id !== upload.id),
      { ...upload, error: undefined },
    ])
    try {
      const added = await onFilesAdd(property, [upload.file])
      save([...readPropertyFiles(latest.current), ...added])
      setUploads((list) => list.filter(({ id }) => id !== upload.id))
      if (upload.preview) URL.revokeObjectURL(upload.preview)
    } catch (failure) {
      const error =
        failure instanceof Error ? failure.message : "The upload failed."
      setUploads((list) =>
        list.map((entry) =>
          entry.id === upload.id ? { ...entry, error } : entry
        )
      )
    }
  }

  function add(files: readonly File[]) {
    if (!onFilesAdd || !files.length) return
    const waiting = uploads.filter(({ error }) => !error).length
    const { accepted, rejected: refused } = checkFiles(files, {
      ...getFileLimits(property),
      existingCount: readPropertyFiles(latest.current).length + waiting,
    })
    setRejected(
      refused.length
        ? `${refused[0].file.name} ${rejectionReasons[refused[0].reason]}.`
        : null
    )
    for (const file of accepted)
      void send({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      })
  }

  return {
    uploads,
    rejected,
    add,
    save,
    retry: (upload: PropertyUpload) => void send(upload),
    dismiss: (upload: PropertyUpload) => {
      if (upload.preview) URL.revokeObjectURL(upload.preview)
      setUploads((list) => list.filter(({ id }) => id !== upload.id))
    },
  }
}

function PropertyFilesEditor({
  property,
  value,
  onValueChange,
  onFilesAdd,
}: {
  property: PropertyDefinition
  value: unknown
  onValueChange: (value: unknown) => void
  onFilesAdd?: PropertyFilesAdd
}) {
  const [isOver, setIsOver] = React.useState(false)
  const files = readPropertyFiles(value)
  const { uploads, rejected, add, save, retry, dismiss } = usePropertyUploads({
    property,
    value,
    onValueChange,
    onFilesAdd,
  })
  const { maxFiles } = getFileLimits(property)
  const isFull = maxFiles !== undefined && files.length >= maxFiles
  const cover = files.find(isImageFile)
  const canDrop = !!onFilesAdd && !isFull
  const isDroppable = (event: React.DragEvent) =>
    canDrop && event.dataTransfer.types.includes("Files")

  return (
    <div
      data-slot="properties-files-editor"
      data-over={isOver || undefined}
      className="cn-properties-files-editor flex min-w-0 flex-col"
      onDragEnter={(event) => {
        if (!isDroppable(event)) return
        event.preventDefault()
        setIsOver(true)
      }}
      onDragOver={(event) => {
        if (!isDroppable(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "copy"
      }}
      onDragLeave={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setIsOver(false)
      }}
      onDrop={(event) => {
        if (!isDroppable(event)) return
        event.preventDefault()
        setIsOver(false)
        add([...event.dataTransfer.files])
      }}
      onPaste={(event) => {
        if (!canDrop || !event.clipboardData.files.length) return
        event.preventDefault()
        add([...event.clipboardData.files])
      }}
    >
      <ul
        aria-label={property.name}
        data-slot="properties-files"
        data-display={readTextSetting(property, "display")}
        className="cn-properties-files flex list-none flex-wrap"
      >
        {files.map((file, index) => (
          <li
            key={file.id}
            className="cn-properties-file relative flex min-w-0 items-center overflow-hidden"
          >
            <PropertyFileMenu
              property={property}
              file={file}
              isCover={file === cover && files.filter(isImageFile).length > 1}
              onCover={
                isImageFile(file) && file !== cover
                  ? () =>
                      save([file, ...files.filter(({ id }) => id !== file.id)])
                  : undefined
              }
              onMove={(delta) => {
                const next = [...files]
                next.splice(index, 1)
                next.splice(index + delta, 0, file)
                save(next)
              }}
              canMoveBack={index > 0}
              canMoveForward={index < files.length - 1}
              onRemove={() => save(files.filter(({ id }) => id !== file.id))}
            />
          </li>
        ))}
        {uploads.map((upload) => (
          <li
            key={upload.id}
            data-failed={upload.error ? true : undefined}
            className="cn-properties-file cn-properties-upload relative flex min-w-0 items-center overflow-hidden"
          >
            {upload.preview && (
              <img
                src={upload.preview}
                alt=""
                className="cn-properties-upload-image size-full object-cover"
              />
            )}
            <span
              role="status"
              className="cn-properties-upload-state absolute inset-0 flex items-center justify-center"
            >
              {upload.error ? (
                <IconPlaceholder
                  lucide="CircleAlertIcon"
                  tabler="IconExclamationCircle"
                  hugeicons="AlertCircleIcon"
                  phosphor="WarningCircleIcon"
                  remixicon="RiErrorWarningLine"
                />
              ) : (
                <Spinner aria-hidden="true" />
              )}
              <span className="sr-only">
                {upload.error
                  ? `${upload.file.name} didn’t upload`
                  : `Uploading ${upload.file.name}`}
              </span>
            </span>
          </li>
        ))}
        {!isFull && (
          <li className="cn-properties-file-add-item flex min-w-0">
            <PropertyFileAdd
              property={property}
              isEmpty={!files.length && !uploads.length}
              onFiles={onFilesAdd ? add : undefined}
              onLink={(url) => save([...files, ...readPropertyFiles(url)])}
            />
          </li>
        )}
      </ul>
      {uploads
        .filter(({ error }) => error)
        .map((upload) => (
          <p
            key={upload.id}
            role="alert"
            className="cn-properties-error cn-properties-upload-error flex min-w-0 items-center"
          >
            <span className="min-w-0 flex-1 truncate">
              {upload.file.name}: {upload.error}
            </span>
            <Button size="xs" variant="ghost" onClick={() => retry(upload)}>
              Try again
            </Button>
            <Button size="xs" variant="ghost" onClick={() => dismiss(upload)}>
              Dismiss
            </Button>
          </p>
        ))}
      {rejected && (
        <p role="alert" className="cn-properties-error">
          {rejected}
        </p>
      )}
    </div>
  )
}

/** One file: what it is, large enough to see, and what can be done with it. */
function PropertyFileMenu({
  property,
  file,
  isCover,
  canMoveBack,
  canMoveForward,
  onCover,
  onMove,
  onRemove,
}: {
  property: PropertyDefinition
  file: PropertyFile
  isCover: boolean
  canMoveBack: boolean
  canMoveForward: boolean
  onCover?: () => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const link = getFileLink(file)
  function choose(action: () => void) {
    setOpen(false)
    action()
  }
  return (
    <ControlPopover
      label={file.name}
      triggerLabel={null}
      open={open}
      onOpenChange={setOpen}
      isRaised
      layout="file"
      className="cn-properties-file-trigger"
      trigger={<PropertyFileFace property={property} file={file} />}
    >
      {isImageFile(file) && (
        <PropertyImage file={file} className="cn-properties-file-preview" />
      )}
      <div className="cn-properties-file-caption flex min-w-0 flex-col">
        <span className="truncate">{file.name}</span>
        <span className="cn-properties-kind">
          {[
            isCover ? "Cover" : null,
            file.size === undefined ? null : formatFileSize(file.size),
          ]
            .filter(Boolean)
            .join(", ") || (isImageFile(file) ? "Image" : "File")}
        </span>
      </div>
      <div className="cn-properties-file-actions flex flex-col">
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="cn-properties-action flex items-center"
          >
            <IconPlaceholder
              lucide="ExternalLinkIcon"
              tabler="IconExternalLink"
              hugeicons="LinkSquare02Icon"
              phosphor="ArrowSquareOutIcon"
              remixicon="RiExternalLinkLine"
            />
            Open original
          </a>
        )}
        {onCover && (
          <Button
            variant="ghost"
            className="cn-properties-action w-full"
            onClick={() => choose(onCover)}
          >
            <IconPlaceholder
              lucide="ImageIcon"
              tabler="IconPhoto"
              hugeicons="ImageIcon"
              phosphor="ImageIcon"
              remixicon="RiImageLine"
            />
            Use as cover
          </Button>
        )}
        {canMoveBack && (
          <Button
            variant="ghost"
            className="cn-properties-action w-full"
            onClick={() => choose(() => onMove(-1))}
          >
            <IconPlaceholder
              lucide="ArrowLeftIcon"
              tabler="IconArrowLeft"
              hugeicons="ArrowLeft01Icon"
              phosphor="ArrowLeftIcon"
              remixicon="RiArrowLeftLine"
            />
            Move back
          </Button>
        )}
        {canMoveForward && (
          <Button
            variant="ghost"
            className="cn-properties-action w-full"
            onClick={() => choose(() => onMove(1))}
          >
            <IconPlaceholder
              lucide="ArrowRightIcon"
              tabler="IconArrowRight"
              hugeicons="ArrowRight02Icon"
              phosphor="ArrowRightIcon"
              remixicon="RiArrowRightLine"
            />
            Move forward
          </Button>
        )}
        <Button
          variant="ghost"
          data-destructive=""
          className="cn-properties-action w-full"
          onClick={() => choose(onRemove)}
        >
          <IconPlaceholder
            lucide="Trash2Icon"
            tabler="IconTrash"
            hugeicons="Delete02Icon"
            phosphor="TrashIcon"
            remixicon="RiDeleteBinLine"
          />
          Remove
        </Button>
      </div>
    </ControlPopover>
  )
}

function PropertyFileAdd({
  property,
  isEmpty,
  onFiles,
  onLink,
}: {
  property: PropertyDefinition
  isEmpty: boolean
  onFiles?: (files: File[]) => void
  onLink: (url: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [hasBadLink, setHasBadLink] = React.useState(false)
  const picker = React.useRef<HTMLInputElement>(null)
  const errorId = React.useId()
  const { accept, maxFiles } = getFileLimits(property)
  const noun =
    readTextSetting(property, "accept") === "images" ? "images" : "files"

  function addLink(input: HTMLInputElement) {
    const url = input.value.trim()
    if (!url) return
    if (!/^https?:\/\/\S+$/i.test(url)) return setHasBadLink(true)
    setHasBadLink(false)
    setOpen(false)
    onLink(url)
  }

  return (
    <ControlPopover
      label={`Add ${noun}`}
      triggerLabel={isEmpty ? null : `Add ${noun} to ${property.name}`}
      open={open}
      onOpenChange={setOpen}
      isRaised
      layout="form"
      className={
        isEmpty
          ? cn("cn-properties-trigger")
          : cn("cn-properties-trigger cn-properties-file-add")
      }
      trigger={
        isEmpty ? (
          <span
            className="cn-properties-value inline-flex items-center"
            data-empty=""
          >
            <span className="sr-only">{property.name}: </span>
            Add {noun}
          </span>
        ) : (
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
        )
      }
    >
      <div className="cn-properties-form flex flex-col">
        {onFiles && (
          <>
            <input
              ref={picker}
              type="file"
              accept={accept}
              multiple={maxFiles !== 1}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              onChange={(event) => {
                const picked = [...(event.currentTarget.files ?? [])]
                event.currentTarget.value = ""
                setOpen(false)
                onFiles(picked)
              }}
            />
            <Button
              variant="outline"
              className="cn-properties-upload-button w-full"
              onClick={() => picker.current?.click()}
            >
              <IconPlaceholder
                lucide="UploadIcon"
                tabler="IconUpload"
                hugeicons="Upload04Icon"
                phosphor="UploadSimpleIcon"
                remixicon="RiUploadLine"
              />
              Upload {noun}
            </Button>
            <p className="cn-properties-form-note">
              Or drop or paste them on the row.
            </p>
          </>
        )}
        <div className="cn-properties-form-field flex flex-col">
          <span className="cn-properties-form-label">Link</span>
          <Input
            type="url"
            inputMode="url"
            aria-label="Link to a file"
            aria-invalid={hasBadLink || undefined}
            aria-describedby={hasBadLink ? errorId : undefined}
            placeholder="https://"
            onChange={() => setHasBadLink(false)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              addLink(event.currentTarget)
            }}
            onBlur={(event) => addLink(event.currentTarget)}
          />
          {hasBadLink && (
            <p id={errorId} role="alert" className="cn-properties-error">
              Enter a web address.
            </p>
          )}
        </div>
      </div>
    </ControlPopover>
  )
}

export {
  PropertyFilesEditor,
  PropertyImage,
  PropertyThumbnails,
  type PropertyFilesAdd,
}
