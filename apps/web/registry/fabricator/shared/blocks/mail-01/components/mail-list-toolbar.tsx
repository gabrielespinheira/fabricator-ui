"use client"

import * as React from "react"

import {
  MailCheckbox,
  MailFilterToggle,
  MailIconButton,
  MailMenuButton,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import {
  type MailFilter,
  type SnoozeOption,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Search } from "@/registry/bases/__base__/ui/search"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export type MailBulkAction = "archive" | "delete" | "markRead" | "markUnread"

/**
 * What the list shows (search, a filter and the count), or, while rows are
 * selected, how many and what can be done to them.
 */
export function MailListToolbar({
  searchRef,
  query,
  onQueryChange,
  filter,
  onFilterChange,
  count,
  selectedCount,
  isAllSelected,
  areSelectedRead,
  snoozeOptions,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  onSnooze,
}: {
  searchRef: React.Ref<HTMLInputElement>
  query: string
  onQueryChange: (query: string) => void
  filter: MailFilter
  onFilterChange: (filter: MailFilter) => void
  count: number
  selectedCount: number
  isAllSelected: boolean
  areSelectedRead: boolean
  snoozeOptions: SnoozeOption[]
  onSelectAll: (isSelected: boolean) => void
  onClearSelection: () => void
  onBulkAction: (action: MailBulkAction) => void
  onSnooze: (until: number) => void
}) {
  const isSelecting = selectedCount > 0

  return (
    // Sized by the list's width, not the window's: the panel and the
    // sidebar change how much room it has.
    <div className="@container/mail-toolbar">
      <div className="flex min-h-(--density-36) flex-wrap items-center gap-x-(--density-10) gap-y-(--density-8) px-(--density-8)">
        <MailCheckbox
          checked={isAllSelected}
          indeterminate={isSelecting && !isAllSelected}
          onCheckedChange={onSelectAll}
          label={isSelecting ? "Select all conversations" : "Select all"}
        />
        {isSelecting ? (
          <>
            <p
              aria-live="polite"
              className="text-(length:--density-text-13) font-medium tabular-nums"
            >
              {selectedCount} selected
            </p>
            <div className="flex items-center">
              <MailIconButton
                label="Archive"
                onClick={() => onBulkAction("archive")}
              >
                <IconPlaceholder
                  lucide="ArchiveIcon"
                  tabler="IconArchive"
                  hugeicons="Archive02Icon"
                  phosphor="ArchiveIcon"
                  remixicon="RiArchiveLine"
                />
              </MailIconButton>
              <MailIconButton
                label={areSelectedRead ? "Mark as unread" : "Mark as read"}
                onClick={() =>
                  onBulkAction(areSelectedRead ? "markUnread" : "markRead")
                }
              >
                {areSelectedRead ? (
                  <IconPlaceholder
                    lucide="MailIcon"
                    tabler="IconMail"
                    hugeicons="Mail01Icon"
                    phosphor="EnvelopeSimpleIcon"
                    remixicon="RiMailLine"
                  />
                ) : (
                  <IconPlaceholder
                    lucide="MailOpenIcon"
                    tabler="IconMailOpened"
                    hugeicons="MailOpen01Icon"
                    phosphor="EnvelopeOpenIcon"
                    remixicon="RiMailOpenLine"
                  />
                )}
              </MailIconButton>
              <MailMenuButton
                label="Snooze"
                icon={
                  <IconPlaceholder
                    lucide="AlarmClockIcon"
                    tabler="IconAlarm"
                    hugeicons="AlarmClockIcon"
                    phosphor="AlarmIcon"
                    remixicon="RiAlarmLine"
                  />
                }
                groups={[
                  {
                    id: "snooze",
                    label: "Snooze until",
                    entries: snoozeOptions.map((option) => ({
                      id: option.id,
                      label: option.label,
                      detail: option.detail,
                      onSelect: () => onSnooze(option.until),
                    })),
                  },
                ]}
              />
              <MailIconButton
                label="Delete"
                onClick={() => onBulkAction("delete")}
              >
                <IconPlaceholder
                  lucide="Trash2Icon"
                  tabler="IconTrash"
                  hugeicons="Delete02Icon"
                  phosphor="TrashIcon"
                  remixicon="RiDeleteBinLine"
                />
              </MailIconButton>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ms-auto"
              onClick={onClearSelection}
            >
              Clear selection
            </Button>
          </>
        ) : (
          <>
            <form
              role="search"
              className="min-w-40 flex-1"
              onSubmit={(event) => event.preventDefault()}
            >
              <Search
                ref={searchRef}
                collapsible={false}
                width="100%"
                label="Search mail"
                placeholder="Search mail"
                value={query}
                onValueChange={onQueryChange}
              />
            </form>
            <MailFilterToggle value={filter} onValueChange={onFilterChange} />
            {/* A narrow list has no room for it beside the search. */}
            <p
              aria-live="polite"
              className="ms-auto hidden text-(length:--density-text-12) text-muted-foreground tabular-nums @md/mail-toolbar:block"
            >
              {count === 1 ? "1 conversation" : `${count} conversations`}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
