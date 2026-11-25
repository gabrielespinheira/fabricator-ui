"use client"

// What a record view holds whatever it opens in: a bar that says where it
// lives and leaves it, a title edited where it is read, and the content.
import * as React from "react"
import { cn } from "cn"

import {
  type RecordViewMode,
  type RecordViewProps,
} from "@/registry/bases/__base__/lib/record-view-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Skeleton } from "@/registry/bases/__base__/ui/skeleton"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const modeIcons: Record<RecordViewMode, React.ReactNode> = {
  side: (
    <IconPlaceholder
      lucide="PanelLeftIcon"
      tabler="IconLayoutSidebar"
      hugeicons="SidebarLeftIcon"
      phosphor="SidebarIcon"
      remixicon="RiSideBarLine"
      className="rotate-180"
    />
  ),
  center: (
    <IconPlaceholder
      lucide="SquareIcon"
      tabler="IconPlayerStopFilled"
      hugeicons="StopIcon"
      phosphor="StopIcon"
      remixicon="RiStopFill"
    />
  ),
  page: (
    <IconPlaceholder
      lucide="MaximizeIcon"
      tabler="IconMaximize"
      hugeicons="PlusSignIcon"
      phosphor="PlusIcon"
      remixicon="RiAddLine"
    />
  ),
}

/** The drawing of a mode, for its menu. */
function RecordViewModeIcon({ mode }: { mode: RecordViewMode }) {
  return modeIcons[mode]
}

function RecordViewHeader({
  context,
  description,
  actions,
  modeMenu,
  isReadOnly,
  onCopyLink,
  onOpenChange,
}: Pick<
  RecordViewProps,
  | "context"
  | "description"
  | "actions"
  | "isReadOnly"
  | "onCopyLink"
  | "onOpenChange"
> & {
  /** The base's own menu of modes. */
  modeMenu?: React.ReactNode
}) {
  return (
    <header
      data-slot="record-view-header"
      className="cn-record-view-header flex shrink-0 items-center"
    >
      <div
        data-slot="record-view-context"
        className="cn-record-view-context flex min-w-0 flex-1 items-center"
      >
        {context ?? <span className="truncate">{description}</span>}
        {isReadOnly && (
          <span role="status" className="cn-record-view-badge shrink-0">
            Read only
          </span>
        )}
      </div>
      <div
        data-slot="record-view-actions"
        className="cn-record-view-actions flex shrink-0 items-center"
      >
        {onCopyLink && <RecordViewCopyLink onCopyLink={onCopyLink} />}
        {modeMenu}
        {actions}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Close record"
          onClick={() => onOpenChange(false)}
        >
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
          />
        </Button>
      </div>
    </header>
  )
}

function RecordViewCopyLink({ onCopyLink }: { onCopyLink: () => void }) {
  const [isCopied, setIsCopied] = React.useState(false)
  React.useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setIsCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [isCopied])
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={isCopied ? "Link copied" : "Copy link"}
      onClick={() => {
        onCopyLink()
        setIsCopied(true)
      }}
    >
      {isCopied ? (
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
      ) : (
        <IconPlaceholder
          lucide="LinkIcon"
          tabler="IconLink"
          hugeicons="LinkIcon"
          phosphor="LinkIcon"
          remixicon="RiLinksLine"
        />
      )}
    </Button>
  )
}

/** The record's name. Editable, it saves on Enter or on leaving the field. */
function RecordViewTitle({
  title,
  onTitleChange,
  className,
}: Pick<RecordViewProps, "title" | "onTitleChange"> & { className?: string }) {
  const isCancelled = React.useRef(false)
  if (!onTitleChange)
    return (
      <p
        aria-hidden="true"
        data-slot="record-view-title"
        className={cn("cn-record-view-title", className)}
      >
        {title}
      </p>
    )
  return (
    <textarea
      key={title}
      rows={1}
      aria-label="Title"
      data-slot="record-view-title"
      data-escape="undo"
      defaultValue={title}
      className={cn(
        "cn-record-view-title field-sizing-content w-full resize-none outline-none",
        className
      )}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          event.stopPropagation()
          isCancelled.current = true
          event.currentTarget.value = title
          event.currentTarget.blur()
        }
      }}
      onBlur={(event) => {
        const next = event.target.value.trim()
        if (!isCancelled.current && next && next !== title) onTitleChange(next)
        else event.target.value = title
        isCancelled.current = false
      }}
    />
  )
}

function RecordViewBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="record-view-body"
      className={cn(
        "cn-record-view-body @container/record-view min-h-0 flex-1 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

/** The record's picture. One that doesn't load leaves no gap behind. */
function RecordViewCover({
  src,
  alt = "",
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  src: string
  alt?: string
  /** Controls that come forward with the pointer, such as "Change". */
  children?: React.ReactNode
}) {
  const [failed, setFailed] = React.useState<string | null>(null)
  if (failed === src) return null
  return (
    <div
      data-slot="record-view-cover"
      className={cn(
        "cn-record-view-cover group/record-view-cover relative shrink-0 overflow-hidden",
        className
      )}
      {...props}
    >
      <img
        src={src}
        alt={alt}
        decoding="async"
        className="size-full object-cover"
        onError={() => setFailed(src)}
      />
      {children && (
        <div className="cn-record-view-cover-actions absolute flex items-center">
          {children}
        </div>
      )}
    </div>
  )
}

function RecordViewSection({
  className,
  title,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="record-view-section"
      className={cn("cn-record-view-section flex flex-col", className)}
      {...props}
    >
      {title && <h3 className="cn-record-view-section-title">{title}</h3>}
      {children}
    </section>
  )
}

function RecordViewFooter({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="record-view-footer"
      className={cn(
        "cn-record-view-footer flex shrink-0 items-center",
        className
      )}
      {...props}
    />
  )
}

function RecordViewState({
  state = "ready",
  onRetry,
  children,
}: Pick<RecordViewProps, "state" | "onRetry" | "children">) {
  if (state === "loading")
    return (
      <div
        role="status"
        aria-label="Loading record"
        data-slot="record-view-loading"
        className="cn-record-view-state flex flex-col"
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="cn-record-view-skeleton flex items-center">
            <Skeleton className="cn-record-view-skeleton-label" />
            <Skeleton className="cn-record-view-skeleton-value" />
          </div>
        ))}
        <Skeleton className="cn-record-view-skeleton-block" />
      </div>
    )
  if (state === "missing")
    return (
      <div
        data-slot="record-view-missing"
        className="cn-record-view-message flex flex-col items-center"
      >
        <p role="status" className="cn-record-view-message-title">
          This record isn’t here
        </p>
        <p>It may have been deleted, or you may not have access to it.</p>
      </div>
    )
  if (state === "error")
    return (
      <div
        data-slot="record-view-error"
        className="cn-record-view-message flex flex-col items-center"
      >
        <p role="alert" className="cn-record-view-message-title">
          Couldn’t load this record
        </p>
        <p>Check your connection and try again.</p>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    )
  return children
}

/** Everything inside the surface, the same in all three modes. */
function RecordViewFrame({
  mode = "side",
  modeMenu,
  title,
  onTitleChange,
  cover,
  aside,
  children,
  footer,
  state = "ready",
  onRetry,
  ...header
}: Omit<RecordViewProps, "open" | "className" | "onModeChange"> & {
  modeMenu?: React.ReactNode
}) {
  return (
    <div
      data-slot="record-view"
      data-mode={mode}
      className="cn-record-view-layout flex min-h-0 flex-1 flex-col"
    >
      <RecordViewHeader {...header} modeMenu={modeMenu} />
      <RecordViewBody>
        {state === "ready" && cover}
        <div className="cn-record-view-content">
          {state !== "missing" && state !== "error" && (
            <RecordViewTitle
              title={title}
              onTitleChange={header.isReadOnly ? undefined : onTitleChange}
            />
          )}
          <RecordViewState state={state} onRetry={onRetry}>
            <div className="cn-record-view-columns">
              {aside && (
                <div
                  data-slot="record-view-aside"
                  className="cn-record-view-aside"
                >
                  {aside}
                </div>
              )}
              <div
                data-slot="record-view-main"
                className="cn-record-view-main flex min-w-0 flex-col"
              >
                {children}
              </div>
            </div>
          </RecordViewState>
        </div>
      </RecordViewBody>
      {footer && <RecordViewFooter>{footer}</RecordViewFooter>}
    </div>
  )
}

export {
  RecordViewBody,
  RecordViewCover,
  RecordViewFooter,
  RecordViewFrame,
  RecordViewHeader,
  RecordViewModeIcon,
  RecordViewSection,
  RecordViewState,
  RecordViewTitle,
  type RecordViewMode,
  type RecordViewProps,
}
