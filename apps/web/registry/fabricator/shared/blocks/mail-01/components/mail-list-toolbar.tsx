"use client"

import * as React from "react"

import {
  MailCheckbox,
  MailFilterList,
  MailIconButton,
  MailMenuButton,
  type MailMenuGroup,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  type MailThreadMove,
  type SnoozeOption,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { Search } from "@/registry/bases/__base__/ui/search"

export type MailBulkAction =
  | "archive"
  | "moveToInbox"
  | "delete"
  | "markRead"
  | "markUnread"

/** "Snooze until" as a menu's rows, for the toolbar and the open thread. */
export function getSnoozeMenu(
  options: SnoozeOption[],
  onSnooze: (until: number) => void
): MailMenuGroup[] {
  return [
    {
      id: "snooze",
      label: "Snooze until",
      entries: options.map(({ id, label, detail, until }) => ({
        id,
        label,
        detail,
        icon: mailIcons.snooze,
        onSelect: () => onSnooze(until),
      })),
    },
  ]
}

function SelectionBar({
  selectedCount,
  isAllSelected,
  areSelectedRead,
  moves,
  snoozeOptions,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  onSnooze,
}: {
  selectedCount: number
  isAllSelected: boolean
  areSelectedRead: boolean
  /** What every selected conversation can do. */
  moves: MailThreadMove[]
  snoozeOptions: SnoozeOption[]
  onSelectAll: (isSelected: boolean) => void
  onClearSelection: () => void
  onBulkAction: (action: MailBulkAction) => void
  onSnooze: (until: number) => void
}) {
  return (
    <>
      <div className="grid size-(--density-32) shrink-0 place-items-center">
        <MailCheckbox
          checked={isAllSelected}
          indeterminate={!isAllSelected}
          onCheckedChange={onSelectAll}
          label="Select all conversations"
        />
      </div>
      <p
        aria-live="polite"
        className="min-w-0 truncate text-(length:--density-text-13) font-medium tabular-nums"
      >
        {selectedCount}
        <span className="in-data-[size=phone]:sr-only"> selected</span>
      </p>
      <div className="ms-auto -me-(--density-6) flex shrink-0 items-center">
        {moves.includes("archive") && (
          <MailIconButton
            label="Archive"
            shortcut="E"
            onClick={() => onBulkAction("archive")}
          >
            {mailIcons.archive}
          </MailIconButton>
        )}
        {moves.includes("moveToInbox") && (
          <MailIconButton
            label="Move to inbox"
            onClick={() => onBulkAction("moveToInbox")}
          >
            {mailIcons.inbox}
          </MailIconButton>
        )}
        {moves.includes("delete") && (
          <MailIconButton
            label="Delete"
            shortcut="#"
            onClick={() => onBulkAction("delete")}
          >
            {mailIcons.trash}
          </MailIconButton>
        )}
        <MailIconButton
          label={areSelectedRead ? "Mark as unread" : "Mark as read"}
          shortcut="U"
          onClick={() =>
            onBulkAction(areSelectedRead ? "markUnread" : "markRead")
          }
        >
          {areSelectedRead ? mailIcons.unread : mailIcons.read}
        </MailIconButton>
        {moves.includes("snooze") && (
          <MailMenuButton
            label="Snooze"
            icon={mailIcons.snooze}
            groups={getSnoozeMenu(snoozeOptions, onSnooze)}
          />
        )}
        <MailIconButton
          label="Clear selection"
          shortcut="Esc"
          onClick={onClearSelection}
        >
          {mailIcons.close}
        </MailIconButton>
      </div>
    </>
  )
}

/**
 * What the list shows: a search and one of three filters or, while rows are
 * selected, how many there are and what can be done to them.
 */
export function MailListToolbar({
  searchRef,
  query,
  onQueryChange,
  selection,
}: {
  searchRef: React.Ref<HTMLInputElement>
  query: string
  onQueryChange: (query: string) => void
  /** While nothing is selected, null. */
  selection: React.ComponentProps<typeof SelectionBar> | null
}) {
  return (
    <div
      className="flex shrink-0 flex-col gap-(--density-8) px-(--density-16) pb-(--density-8)"
      onKeyDown={(event) => {
        // Not from a menu: its events reach here through React.
        const isInside =
          event.target instanceof Node &&
          event.currentTarget.contains(event.target)
        if (event.key === "Escape" && isInside) selection?.onClearSelection()
      }}
    >
      <form
        role="search"
        className="relative"
        onSubmit={(event) => event.preventDefault()}
      >
        <Search
          ref={searchRef}
          collapsible={false}
          width="100%"
          label="Search mail"
          placeholder="Search mail"
          aria-keyshortcuts="/"
          value={query}
          onValueChange={onQueryChange}
        />
        {query === "" && (
          <Kbd className="absolute end-(--density-12) top-1/2 -translate-y-1/2 in-data-[size=phone]:hidden">
            /
          </Kbd>
        )}
      </form>
      <div className="flex h-(--density-36) items-center gap-(--density-10)">
        <div hidden={selection !== null}>
          <MailFilterList />
        </div>
        {selection ? <SelectionBar {...selection} /> : null}
      </div>
    </div>
  )
}
