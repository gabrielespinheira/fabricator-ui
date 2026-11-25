import type { ReactNode } from "react"

type RecordViewMode = "side" | "center" | "page"

const recordViewModes: readonly { id: RecordViewMode; label: string }[] = [
  { id: "side", label: "Side panel" },
  { id: "center", label: "Center peek" },
  { id: "page", label: "Full page" },
]

type RecordViewProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: RecordViewMode
  onModeChange?: (mode: RecordViewMode) => void
  title: string
  /** Makes the title editable in place. */
  onTitleChange?: (title: string) => void
  description?: string
  /** Where the record lives, at the start of the header: a project, its key. */
  context?: ReactNode
  state?: "ready" | "loading" | "missing" | "error"
  isReadOnly?: boolean
  onRetry?: () => void
  /** Copies the record's address. */
  onCopyLink?: () => void
  actions?: ReactNode
  /** A picture across the top: a RecordViewCover, or your own. */
  cover?: ReactNode
  /** The record's properties: under the title, and beside the content on a page. */
  aside?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

export { recordViewModes, type RecordViewMode, type RecordViewProps }
