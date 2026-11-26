"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import {
  FOLDER_FRONT_PATH,
  FOLDER_FRONT_VIEW_BOX,
  getFolderColorVariables,
  getFolderFileCount,
  getFolderFilePose,
} from "@/registry/bases/__base__/lib/folder-model"

// A folder as a tile, the way a drive shows one: the folder drawn with its
// first files peeking out, its name and its details below. Hover, focus or
// `open` lifts the files out and tips the front panel forward. A link or a
// button in the title makes the whole tile the target.

const folderVariants = cva(
  "cn-folder group/folder relative flex flex-col items-center text-center",
  {
    variants: {
      variant: {
        default: "cn-folder-variant-default",
        glass: "cn-folder-variant-glass",
      },
      size: {
        sm: "cn-folder-size-sm",
        default: "cn-folder-size-default",
        lg: "cn-folder-size-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// The front panel's shape, stretched over its box. The box keeps the view
// box's aspect ratio, so the stretch never distorts the corners.
const FRONT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FOLDER_FRONT_VIEW_BOX}" preserveAspectRatio="none"><path d="${FOLDER_FRONT_PATH}"/></svg>`
const FRONT_MASK = `url("data:image/svg+xml,${encodeURIComponent(FRONT_SVG)}")`
const [, , FRONT_WIDTH, FRONT_HEIGHT] = FOLDER_FRONT_VIEW_BOX.split(" ")
const FRONT_STYLE: React.CSSProperties = {
  aspectRatio: `${FRONT_WIDTH} / ${FRONT_HEIGHT}`,
  maskImage: FRONT_MASK,
  WebkitMaskImage: FRONT_MASK,
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
}
const COVER_STYLE: React.CSSProperties = {
  aspectRatio: FRONT_STYLE.aspectRatio,
}

type FolderProps = Omit<React.ComponentProps<"div">, "color"> &
  VariantProps<typeof folderVariants> & {
    /** A palette colour (`blue`), a role (`primary`) or any CSS colour. Neutral when unset. */
    color?: string
    /** Holds the folder open, as hover does: a drop target, the folder on view. */
    open?: boolean
  }

function Folder({
  className,
  variant = "default",
  size = "default",
  color,
  open = false,
  style,
  ...props
}: FolderProps) {
  return (
    <div
      data-slot="folder"
      data-variant={variant}
      data-size={size}
      data-open={open ? "" : undefined}
      className={cn(folderVariants({ variant, size }), className)}
      style={color ? { ...getFolderColorVariables(color), ...style } : style}
      {...props}
    />
  )
}

/** The folder drawn: its back, the lining, the files inside and the front panel. */
function FolderPreview({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="folder-preview"
      className={cn(
        "cn-folder-preview @container/folder-preview relative isolate w-full",
        className
      )}
      {...props}
    >
      <span
        data-slot="folder-back"
        aria-hidden
        className="cn-folder-back absolute"
      />
      <span
        data-slot="folder-lining"
        aria-hidden
        className="cn-folder-lining absolute inset-x-0 bottom-0"
        style={FRONT_STYLE}
      />
      {children}
      <span
        data-slot="folder-front"
        aria-hidden
        className="cn-folder-front absolute inset-x-0 bottom-0"
        style={FRONT_STYLE}
      >
        <svg
          viewBox={FOLDER_FRONT_VIEW_BOX}
          preserveAspectRatio="none"
          className="cn-folder-front-edge absolute inset-0 size-full"
        >
          <path d={FOLDER_FRONT_PATH} vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
    </div>
  )
}

type FolderFilePlace = { index: number; count: number }

const FolderFileContext = React.createContext<FolderFilePlace>({
  index: 0,
  count: 1,
})

/** The files that peek out, the first on top. Shows up to three. */
function FolderFiles({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const files = React.Children.toArray(children)
  const count = getFolderFileCount(files.length)
  return (
    <div
      data-slot="folder-files"
      data-count={count}
      aria-hidden
      className={cn(
        "cn-folder-files pointer-events-none absolute inset-0",
        className
      )}
      {...props}
    >
      {files.slice(0, count).map((file, index) => (
        <FolderFileContext
          key={React.isValidElement(file) && file.key ? file.key : index}
          value={{ index, count }}
        >
          {file}
        </FolderFileContext>
      ))}
    </div>
  )
}

/** A sheet of paper with lines, or the thumbnail you put in it. */
function FolderFile({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<"div">) {
  const { index, count } = React.useContext(FolderFileContext)
  const { rest, open, layer } = getFolderFilePose(index, count)
  return (
    <div
      data-slot="folder-file"
      data-index={index}
      className={cn("cn-folder-file absolute overflow-hidden", className)}
      style={
        {
          "--folder-file-index": index,
          "--folder-file-x": rest.x,
          "--folder-file-y": rest.y,
          "--folder-file-rotate": rest.rotate,
          "--folder-file-dx": open.x - rest.x,
          "--folder-file-dy": open.y - rest.y,
          "--folder-file-drotate": open.rotate - rest.rotate,
          zIndex: layer,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {children ?? (
        <span
          data-slot="folder-file-lines"
          className="cn-folder-file-lines flex size-full flex-col"
        >
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      )}
    </div>
  )
}

/** What's printed on the front panel: a badge, avatars, a logo. */
function FolderCover({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="folder-cover"
      className={cn(
        "cn-folder-cover absolute inset-x-0 bottom-0 flex items-end justify-between",
        className
      )}
      style={{ ...COVER_STYLE, ...style }}
      {...props}
    />
  )
}

function FolderTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="folder-title"
      className={cn("cn-folder-title w-full min-w-0", className)}
      {...props}
    />
  )
}

function FolderDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="folder-description"
      className={cn("cn-folder-description w-full min-w-0", className)}
      {...props}
    />
  )
}

export {
  Folder,
  FolderCover,
  FolderDescription,
  FolderFile,
  FolderFiles,
  FolderPreview,
  FolderTitle,
  folderVariants,
}
