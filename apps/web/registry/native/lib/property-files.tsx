import * as React from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "@fabricator-ui/icons-react-native"
import { Image, Linking, Pressable, View } from "react-native"

import { formatFileSize } from "@/registry/fabricator/shared/lib/file-upload-model"
import {
  getFileLimits,
  getFileLink,
  isImageFile,
  readPropertyFiles,
  type PropertyFile,
} from "@/registry/fabricator/shared/lib/property-model"
import {
  readTextSetting,
  type PropertyDefinition,
} from "@/registry/fabricator/shared/lib/property-types"
import { useMutedColor } from "@/registry/native/lib/property-marks"
import { Button } from "@/registry/native/ui/button"
import { Drawer, DrawerContent, DrawerTitle } from "@/registry/native/ui/drawer"
import { Input } from "@/registry/native/ui/input"
import { Spinner } from "@/registry/native/ui/spinner"
import { Text } from "@/registry/native/ui/text"

// Files and pictures on a record. The app picks and stores them, which needs a
// native picker of its choice, and answers with their addresses.

/** Picks and stores files, and returns how to reach them. Throw to say why not. */
type PropertyFilesAdd = (
  property: PropertyDefinition
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
  const muted = useMutedColor()
  const source = file.thumbnail ?? file.url
  if (!isImageFile(file) || failedUrl === source) {
    const Icon = isImageFile(file) ? ImageIcon : FileIcon
    return <Icon size={16} color={muted} />
  }
  return (
    <Image
      alt=""
      accessible={false}
      source={{ uri: source }}
      resizeMode="cover"
      className={className}
      onError={() => setFailedUrl(source)}
    />
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
    return <PropertyImage file={file} className="cn-properties-file-image" />
  return (
    <View className="cn-properties-file-chip shrink flex-row items-center">
      <PropertyImage file={file} className="cn-properties-file-mark" />
      <Text numberOfLines={1} className="cn-properties-value-text shrink">
        {file.name}
      </Text>
    </View>
  )
}

/** The files at a glance: pictures in a row, or a count on a card. */
function PropertyThumbnails({
  property,
  value,
  variant,
}: {
  property: PropertyDefinition
  value: unknown
  variant: "row" | "card"
}) {
  const muted = useMutedColor()
  const files = readPropertyFiles(value)
  if (variant === "card")
    return (
      <>
        <PaperclipIcon size={14} color={muted} />
        <Text data-variant="card" className="cn-properties-value-text">
          {files.length}
        </Text>
      </>
    )
  return (
    <View
      data-slot="properties-files"
      className="cn-properties-files flex-row flex-wrap items-center"
    >
      {files.map((file) => (
        <View
          key={file.id}
          accessibilityLabel={file.name}
          className="cn-properties-file overflow-hidden"
        >
          <PropertyFileFace property={property} file={file} />
        </View>
      ))}
    </View>
  )
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
  const muted = useMutedColor()
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [isAdding, setIsAdding] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // A slow upload lands on what the value is then, not on what it was.
  const latest = React.useRef(value)
  React.useEffect(() => {
    latest.current = value
  }, [value])
  const files = readPropertyFiles(value)
  const index = files.findIndex(({ id }) => id === openId)
  const opened = index < 0 ? null : files[index]
  const { maxFiles } = getFileLimits(property)
  const isFull = maxFiles !== undefined && files.length >= maxFiles
  const isImages = readTextSetting(property, "accept") === "images"
  const noun = isImages ? "images" : "files"

  function save(next: readonly PropertyFile[]) {
    latest.current = next
    onValueChange(next.length ? next : null)
  }
  async function upload() {
    if (!onFilesAdd) return
    setIsAdding(false)
    setError(null)
    setIsUploading(true)
    try {
      const added = await onFilesAdd(property)
      if (added.length) save([...readPropertyFiles(latest.current), ...added])
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "The upload failed."
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <View
      data-slot="properties-files-editor"
      className="cn-properties-files-editor"
    >
      {files.length || isUploading ? (
        <View
          data-slot="properties-files"
          className="cn-properties-files flex-row flex-wrap items-center"
        >
          {files.map((file) => (
            <Pressable
              key={file.id}
              accessibilityRole="button"
              accessibilityLabel={file.name}
              className="cn-properties-file overflow-hidden"
              onPress={() => setOpenId(file.id)}
            >
              <PropertyFileFace property={property} file={file} />
            </Pressable>
          ))}
          {isUploading && (
            <View
              accessibilityLabel="Uploading"
              className="cn-properties-file cn-properties-upload items-center justify-center"
            >
              <Spinner />
            </View>
          )}
          {!isFull && !isUploading && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${noun} to ${property.name}`}
              className="cn-properties-file cn-properties-file-add items-center justify-center"
              onPress={() => setIsAdding(true)}
            >
              <PlusIcon size={16} color={muted} />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${property.name}: Add ${noun}`}
          className="cn-properties-trigger justify-center"
          onPress={() => setIsAdding(true)}
        >
          <Text className="cn-properties-empty">Add {noun}</Text>
        </Pressable>
      )}
      {error && (
        <View className="cn-properties-upload-error flex-row items-center">
          <CircleAlertIcon size={14} />
          <Text
            accessibilityRole="alert"
            className="cn-properties-error flex-1"
          >
            {error}
          </Text>
          <Button size="xs" variant="ghost" onPress={() => void upload()}>
            Try again
          </Button>
        </View>
      )}
      <PropertyFileSheet
        file={opened}
        onClose={() => setOpenId(null)}
        onCover={
          opened && isImageFile(opened) && opened !== files.find(isImageFile)
            ? () => save([opened, ...files.filter((entry) => entry !== opened)])
            : undefined
        }
        onMove={(delta) => {
          if (!opened) return
          const next = [...files]
          next.splice(index, 1)
          next.splice(index + delta, 0, opened)
          save(next)
        }}
        canMoveBack={index > 0}
        canMoveForward={index >= 0 && index < files.length - 1}
        onRemove={() => save(files.filter((entry) => entry !== opened))}
      />
      <PropertyFileAddSheet
        open={isAdding}
        onOpenChange={setIsAdding}
        noun={noun}
        onUpload={onFilesAdd ? () => void upload() : undefined}
        onLink={(url) => save([...files, ...readPropertyFiles(url)])}
      />
    </View>
  )
}

/** One file: what it is, large enough to see, and what can be done with it. */
function PropertyFileSheet({
  file,
  onClose,
  onCover,
  onMove,
  canMoveBack,
  canMoveForward,
  onRemove,
}: {
  file: PropertyFile | null
  onClose: () => void
  onCover?: () => void
  onMove: (delta: -1 | 1) => void
  canMoveBack: boolean
  canMoveForward: boolean
  onRemove: () => void
}) {
  const link = file ? getFileLink(file) : undefined
  function choose(action: () => void) {
    onClose()
    action()
  }
  return (
    <Drawer
      open={file !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DrawerContent>
        {file && (
          <View className="cn-properties-sheet">
            <DrawerTitle>{file.name}</DrawerTitle>
            {isImageFile(file) && (
              <PropertyImage
                file={file}
                className="cn-properties-file-preview w-full"
              />
            )}
            {file.size !== undefined && (
              <Text className="cn-properties-kind">
                {formatFileSize(file.size)}
              </Text>
            )}
            <View className="cn-properties-file-actions">
              {link && (
                <Button
                  variant="ghost"
                  className="cn-properties-sheet-row justify-start"
                  onPress={() =>
                    choose(() => void Linking.openURL(link).catch(onClose))
                  }
                >
                  <ExternalLinkIcon />
                  Open original
                </Button>
              )}
              {onCover && (
                <Button
                  variant="ghost"
                  className="cn-properties-sheet-row justify-start"
                  onPress={() => choose(onCover)}
                >
                  <ImageIcon />
                  Use as cover
                </Button>
              )}
              {canMoveBack && (
                <Button
                  variant="ghost"
                  className="cn-properties-sheet-row justify-start"
                  onPress={() => choose(() => onMove(-1))}
                >
                  <ArrowLeftIcon />
                  Move back
                </Button>
              )}
              {canMoveForward && (
                <Button
                  variant="ghost"
                  className="cn-properties-sheet-row justify-start"
                  onPress={() => choose(() => onMove(1))}
                >
                  <ArrowRightIcon />
                  Move forward
                </Button>
              )}
              <Button
                variant="ghost"
                className="cn-properties-sheet-row justify-start"
                onPress={() => choose(onRemove)}
              >
                <Trash2Icon />
                Remove
              </Button>
            </View>
          </View>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function PropertyFileAddSheet({
  open,
  onOpenChange,
  noun,
  onUpload,
  onLink,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  noun: string
  onUpload?: () => void
  onLink: (url: string) => void
}) {
  const [hasBadLink, setHasBadLink] = React.useState(false)
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <View className="cn-properties-sheet">
          <DrawerTitle>Add {noun}</DrawerTitle>
          {onUpload && (
            <Button variant="outline" onPress={onUpload}>
              <UploadIcon />
              Upload {noun}
            </Button>
          )}
          <View className="cn-properties-form-field">
            <Text className="cn-properties-form-label">Link</Text>
            <Input
              accessibilityLabel="Link to a file"
              aria-invalid={hasBadLink || undefined}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://"
              onChangeText={() => setHasBadLink(false)}
              onSubmitEditing={(event) => {
                const url = event.nativeEvent.text.trim()
                if (!/^https?:\/\/\S+$/i.test(url)) return setHasBadLink(true)
                onOpenChange(false)
                onLink(url)
              }}
            />
            {hasBadLink && (
              <Text accessibilityRole="alert" className="cn-properties-error">
                Enter a web address.
              </Text>
            )}
          </View>
        </View>
      </DrawerContent>
    </Drawer>
  )
}

export {
  PropertyFilesEditor,
  PropertyImage,
  PropertyThumbnails,
  type PropertyFilesAdd,
}
