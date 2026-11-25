import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  type MailFilter,
  type MailView,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"

function getFolderHint(view: MailView) {
  if (view.kind === "label") {
    return "Conversations with this label show up here."
  }
  switch (view.folder) {
    case "starred":
      return "Star a conversation to keep it at hand."
    case "snoozed":
      return "Snoozed conversations wait here until it's time."
    case "drafts":
      return "Messages you haven't sent are kept here."
    case "sent":
      return "Messages you send show up here."
    case "trash":
      return "Deleted conversations stay here for 30 days."
    case "spam":
      return "Nothing suspicious has arrived."
    default:
      return "Conversations you archive are kept here."
  }
}

/** The inbox with everything dealt with, and what comes back next. */
export function MailCaughtUp({
  nextUp,
  onShowArchive,
}: {
  /** "Quarterly OKR check-in comes back tomorrow, 8:00 AM." */
  nextUp?: string
  onShowArchive: () => void
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{mailIcons.readAll}</EmptyMedia>
        <EmptyTitle>You&apos;re all caught up</EmptyTitle>
        <EmptyDescription>
          {nextUp ?? "New mail lands here as it arrives."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm" onClick={onShowArchive}>
          Open archive
        </Button>
      </EmptyContent>
    </Empty>
  )
}

/** A list with nothing to show: the search, the filter or the folder. */
export function MailListEmpty({
  view,
  label,
  filter,
  query,
  onClearQuery,
  onShowAll,
}: {
  view: MailView
  label: string
  filter: MailFilter
  query: string
  onClearQuery: () => void
  onShowAll: () => void
}) {
  const search = query.trim()

  if (search) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">{mailIcons.search}</EmptyMedia>
          <EmptyTitle className="max-w-full break-words">
            No results for “{search}”
          </EmptyTitle>
          <EmptyDescription>
            Nothing in {label} mentions it. Try a name, an address or another
            word.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onClearQuery}>
            Clear search
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (filter !== "all") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {filter === "unread" ? mailIcons.read : mailIcons.star}
          </EmptyMedia>
          <EmptyTitle>
            Nothing {filter} in {label}
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onShowAll}>
            Show all
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{mailIcons.inbox}</EmptyMedia>
        <EmptyTitle>Nothing in {label}</EmptyTitle>
        <EmptyDescription>{getFolderHint(view)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
