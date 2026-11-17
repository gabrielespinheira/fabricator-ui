"use client"

import * as React from "react"

import {
  MailCompose,
  type MailDraft,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-compose"
import {
  MailMenuItems,
  notifyMail,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import {
  MailListToolbar,
  type MailBulkAction,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-list-toolbar"
import {
  MAIL_FOLDERS,
  MailSidebar,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-sidebar"
import {
  MailThreadList,
  type MailRowAction,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-thread-list"
import {
  MailThreadView,
  type MailThreadAction,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-thread-view"
import {
  MAIL_CONTACTS,
  MAIL_LABELS,
  MAIL_RECIPIENTS,
  MAIL_THREADS,
  SAMPLE_NOW,
  SAMPLE_TIME_FORMAT,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  findContact,
  formatFileSize,
  formatMailDateTime,
  formatSnoozedUntil,
  getMailCounts,
  getSnoozeOptions,
  getVisibleThreads,
  mailReducer,
  ME,
  type MailAction,
  type MailBox,
  type MailFilter,
  type MailThread,
  type MailView,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPanel,
  useShellPanel,
} from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// An email app as a list and its detail: folders and labels in the sidebar,
// the conversations in the main column, and the open one in a panel beside
// them. On a phone the list is the screen and a conversation takes its place,
// with the panel's back button to return.

const NOW = SAMPLE_NOW
const TIME_FORMAT = SAMPLE_TIME_FORMAT
const SNOOZE_OPTIONS = getSnoozeOptions(NOW, TIME_FORMAT)

const pencilIcon = (
  <IconPlaceholder
    lucide="SquarePenIcon"
    tabler="IconEdit"
    hugeicons="PencilEdit02Icon"
    phosphor="NotePencilIcon"
    remixicon="RiEditBoxLine"
  />
)

const MOVE_MESSAGES: Record<Exclude<MailBox, "sent" | "drafts">, string> = {
  archive: "archived",
  trash: "moved to Trash",
  spam: "reported as spam",
  inbox: "moved to Inbox",
}

function describeCount(count: number) {
  return count === 1 ? "Conversation" : `${count} conversations`
}

function getViewLabel(view: MailView) {
  return view.kind === "folder"
    ? (MAIL_FOLDERS.find(({ id }) => id === view.folder)?.label ?? "Mail")
    : (MAIL_LABELS.find(({ id }) => id === view.label)?.name ?? "Mail")
}

type Compose = {
  key: number
  title: string
  initial: MailDraft
  /** The draft this continues, removed once sent. */
  draftId?: string
}

const EMPTY_DRAFT: MailDraft = { toIds: [], subject: "", body: "" }

function quote(thread: MailThread) {
  const latest = thread.messages.at(-1)
  if (!latest) return ""
  const sender = findContact(MAIL_CONTACTS, latest.fromId)
  return [
    "",
    "",
    "---------- Forwarded message ----------",
    `From: ${sender?.name} <${sender?.email}>`,
    `Date: ${formatMailDateTime(latest.sentAt, TIME_FORMAT)}`,
    `Subject: ${thread.subject}`,
    "",
    latest.body,
  ].join("\n")
}

function ListEmpty({
  view,
  filter,
  query,
  onClearQuery,
  onShowAll,
}: {
  view: MailView
  filter: MailFilter
  query: string
  onClearQuery: () => void
  onShowAll: () => void
}) {
  const label = getViewLabel(view)
  const isSearch = query.trim() !== ""
  const isFiltered = filter !== "all"
  const isInbox = view.kind === "folder" && view.folder === "inbox"

  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {isSearch ? (
            <IconPlaceholder
              lucide="SearchIcon"
              tabler="IconSearch"
              hugeicons="Search01Icon"
              phosphor="MagnifyingGlassIcon"
              remixicon="RiSearchLine"
            />
          ) : (
            <IconPlaceholder
              lucide="InboxIcon"
              tabler="IconInbox"
              hugeicons="InboxIcon"
              phosphor="TrayIcon"
              remixicon="RiInboxLine"
            />
          )}
        </EmptyMedia>
        <EmptyTitle>
          {isSearch
            ? `No results for “${query.trim()}”`
            : isFiltered
              ? `No ${filter} conversations in ${label}`
              : isInbox
                ? "You're all caught up"
                : `Nothing in ${label}`}
        </EmptyTitle>
        <EmptyDescription>
          {isSearch
            ? "Try a name, an address or a word from the message."
            : isFiltered
              ? "Show everything to see the rest of this folder."
              : isInbox
                ? "New mail lands here. Archived conversations are in Archive."
                : "Conversations you move here will show up in this list."}
        </EmptyDescription>
      </EmptyHeader>
      {(isSearch || isFiltered) && (
        <EmptyContent>
          <Button
            variant="outline"
            size="sm"
            onClick={isSearch ? onClearQuery : onShowAll}
          >
            {isSearch ? "Clear search" : "Show all"}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

function Mail() {
  const [state, dispatch] = React.useReducer(
    mailReducer,
    { threads: MAIL_THREADS, openId: null, selectedIds: [] },
    (initial) => mailReducer(initial, { type: "open", id: "q4-plan" })
  )
  const [view, setView] = React.useState<MailView>({
    kind: "folder",
    folder: "inbox",
  })
  const [filter, setFilter] = React.useState<MailFilter>("all")
  const [query, setQuery] = React.useState("")
  const [compose, setCompose] = React.useState<Compose>({
    key: 0,
    title: "New message",
    initial: EMPTY_DRAFT,
  })
  const [isComposeOpen, setComposeOpen] = React.useState(false)
  const panel = useShellPanel("thread")
  const searchRef = React.useRef<HTMLInputElement>(null)
  const clockStart = React.useRef<number | null>(null)

  const visible = getVisibleThreads(state.threads, {
    view,
    filter,
    query,
    contacts: MAIL_CONTACTS,
  })
  const visibleIds = visible.map(({ id }) => id)
  const counts = React.useMemo(
    () => getMailCounts(state.threads),
    [state.threads]
  )
  const openThread = visible.find(({ id }) => id === state.openId) ?? null
  const selectedIds = state.selectedIds.filter((id) => visibleIds.includes(id))
  const areSelectedRead = visible
    .filter(({ id }) => selectedIds.includes(id))
    .every(({ isUnread }) => !isUnread)

  // The sample's clock starts at its "now" and runs in real time from the
  // first message you send.
  const clock = () => {
    clockStart.current ??= Date.now()
    return NOW + (Date.now() - clockStart.current)
  }

  /** Runs an action and offers to put the threads it changed back. */
  const withUndo = (ids: string[], message: string, action: MailAction) => {
    const before = state.threads.filter(({ id }) => ids.includes(id))
    const openId = state.openId
    dispatch(action)
    notifyMail(message, () =>
      dispatch({ type: "restore", threads: before, openId })
    )
  }

  const move = (ids: string[], box: keyof typeof MOVE_MESSAGES) =>
    withUndo(ids, `${describeCount(ids.length)} ${MOVE_MESSAGES[box]}`, {
      type: "move",
      ids,
      box,
      visibleIds,
    })

  const snooze = (ids: string[], until: number) =>
    withUndo(
      ids,
      `${describeCount(ids.length)} snoozed until ${formatSnoozedUntil(until, NOW, TIME_FORMAT)}`,
      { type: "snooze", ids, until, visibleIds }
    )

  const toggleUnread = (thread: MailThread) =>
    dispatch({
      type: "setUnread",
      ids: [thread.id],
      isUnread: !thread.isUnread,
    })

  const onRowAction = (id: string, action: MailRowAction) => {
    const thread = state.threads.find((entry) => entry.id === id)
    if (!thread) return
    if (action === "archive") move([id], "archive")
    else if (action === "delete") move([id], "trash")
    else toggleUnread(thread)
  }

  const onBulkAction = (action: MailBulkAction) => {
    if (action === "archive") move(selectedIds, "archive")
    else if (action === "delete") move(selectedIds, "trash")
    else
      dispatch({
        type: "setUnread",
        ids: selectedIds,
        isUnread: action === "markUnread",
      })
  }

  const onThreadAction = (action: MailThreadAction) => {
    if (!openThread) return
    const ids = [openThread.id]
    if (action === "toggleUnread") toggleUnread(openThread)
    else if (action === "archive") move(ids, "archive")
    else if (action === "delete") move(ids, "trash")
    else if (action === "spam") move(ids, "spam")
    else move(ids, "inbox")
  }

  const open = (id: string) => {
    dispatch({ type: "open", id })
    // Where the list covers the conversation, opening one shows it.
    panel.setOpen(true)
  }

  const changeView = (next: MailView) => {
    setView(next)
    setFilter("all")
    dispatch({ type: "clearSelection" })
  }

  const startCompose = (
    title: string,
    initial: MailDraft,
    draftId?: string
  ) => {
    setCompose((current) => ({
      key: current.key + 1,
      title,
      initial,
      draftId,
    }))
    setComposeOpen(true)
  }

  const send = (draft: MailDraft, files: File[]) => {
    const id = crypto.randomUUID()
    const sentAt = clock()
    dispatch({
      type: "send",
      thread: {
        id,
        subject: draft.subject || "(no subject)",
        box: "sent",
        isUnread: false,
        isStarred: false,
        labels: [],
        messages: [
          {
            id: `${id}-1`,
            fromId: ME,
            toIds: draft.toIds,
            sentAt,
            body: draft.body,
            attachments: files.map((file) => ({
              name: file.name,
              size: formatFileSize(file.size),
            })),
          },
        ],
      },
    })
    if (compose.draftId) dispatch({ type: "remove", id: compose.draftId })
    setComposeOpen(false)
    notifyMail("Message sent", () => dispatch({ type: "remove", id }))
  }

  const label = getViewLabel(view)

  return (
    <>
      <MailSidebar view={view} counts={counts} onViewChange={changeView} />
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb items={[{ label: "Mail" }, { label }]} />
          <AppShellHeaderActions
            primaryAction={{
              id: "compose",
              label: "Compose",
              icon: pencilIcon,
              onSelect: () => startCompose("New message", EMPTY_DRAFT),
            }}
            menuLabel="Mail options"
            menu={
              <MailMenuItems
                groups={[
                  {
                    id: "list",
                    entries: [
                      {
                        id: "read-all",
                        label: `Mark all in ${label} as read`,
                        icon: (
                          <IconPlaceholder
                            lucide="CheckCheckIcon"
                            tabler="IconChecks"
                            hugeicons="CheckmarkCircle02Icon"
                            phosphor="ChecksIcon"
                            remixicon="RiCheckDoubleLine"
                          />
                        ),
                        onSelect: () =>
                          dispatch({
                            type: "setUnread",
                            ids: visibleIds,
                            isUnread: false,
                          }),
                      },
                      {
                        id: "search",
                        label: "Search mail",
                        icon: (
                          <IconPlaceholder
                            lucide="SearchIcon"
                            tabler="IconSearch"
                            hugeicons="Search01Icon"
                            phosphor="MagnifyingGlassIcon"
                            remixicon="RiSearchLine"
                          />
                        ),
                        onSelect: () => searchRef.current?.focus(),
                      },
                    ],
                  },
                ]}
              />
            }
          />
        </AppShellHeader>
        <AppShellContent className="flex flex-col gap-(--density-12)">
          <h1 className="sr-only">{label}</h1>
          <MailListToolbar
            searchRef={searchRef}
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            count={visible.length}
            selectedCount={selectedIds.length}
            isAllSelected={
              visible.length > 0 && selectedIds.length === visible.length
            }
            areSelectedRead={areSelectedRead}
            snoozeOptions={SNOOZE_OPTIONS}
            onSelectAll={(isSelected) =>
              dispatch(
                isSelected
                  ? { type: "selectAll", ids: visibleIds }
                  : { type: "clearSelection" }
              )
            }
            onClearSelection={() => dispatch({ type: "clearSelection" })}
            onBulkAction={onBulkAction}
            onSnooze={(until) => snooze(selectedIds, until)}
          />
          {visible.length === 0 ? (
            <ListEmpty
              view={view}
              filter={filter}
              query={query}
              onClearQuery={() => {
                setQuery("")
                searchRef.current?.focus()
              }}
              onShowAll={() => setFilter("all")}
            />
          ) : (
            <MailThreadList
              threads={visible}
              contacts={MAIL_CONTACTS}
              openId={state.openId}
              selectedIds={selectedIds}
              now={NOW}
              timeFormat={TIME_FORMAT}
              onSelect={(id) => dispatch({ type: "open", id })}
              onOpen={open}
              onToggleSelected={(id) =>
                dispatch({ type: "toggleSelected", id })
              }
              onStar={(id, isStarred) =>
                dispatch({ type: "star", id, isStarred })
              }
              onAction={onRowAction}
            />
          )}
        </AppShellContent>
      </AppShellMain>
      <AppShellPanel
        id="thread"
        label="Conversation"
        defaultOpen
        defaultWidth={480}
        minWidth={360}
        maxWidth={720}
        mobile="swap"
      >
        <MailThreadView
          key={openThread?.id ?? "none"}
          thread={openThread}
          contacts={MAIL_CONTACTS}
          now={NOW}
          timeFormat={TIME_FORMAT}
          snoozeOptions={SNOOZE_OPTIONS}
          onAction={onThreadAction}
          onSnooze={(until) => {
            if (openThread) snooze([openThread.id], until)
          }}
          onReply={(body, recipientIds) => {
            if (!openThread) return
            dispatch({
              type: "reply",
              id: openThread.id,
              message: {
                id: crypto.randomUUID(),
                fromId: ME,
                toIds: recipientIds,
                sentAt: clock(),
                body,
              },
            })
            notifyMail("Reply sent")
          }}
          onForward={() => {
            if (!openThread) return
            startCompose("Forward", {
              toIds: [],
              subject: `Fwd: ${openThread.subject}`,
              body: quote(openThread),
            })
          }}
          onEditDraft={() => {
            const latest = openThread?.messages.at(-1)
            if (!openThread || !latest) return
            startCompose(
              "Draft",
              {
                toIds: latest.toIds,
                subject: openThread.subject,
                body: latest.body,
              },
              openThread.id
            )
          }}
        />
      </AppShellPanel>
      <MailCompose
        key={compose.key}
        open={isComposeOpen}
        onOpenChange={setComposeOpen}
        title={compose.title}
        initial={compose.initial}
        contacts={MAIL_RECIPIENTS}
        onSend={send}
      />
    </>
  )
}

export default function MailPage() {
  return (
    <AppShell storageKey="mail-01">
      <Mail />
    </AppShell>
  )
}
