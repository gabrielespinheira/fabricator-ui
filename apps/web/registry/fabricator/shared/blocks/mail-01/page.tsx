"use client"

import * as React from "react"

import {
  MailCompose,
  type MailComposeValue,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-compose"
import {
  MailFilterPanel,
  MailFilterTabs,
  MailIconButton,
  MailMenuButton,
  notifyMail,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-controls"
import { mailIcons } from "@/registry/bases/__base__/blocks/mail-01/components/mail-icons"
import {
  MailCaughtUp,
  MailListEmpty,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-list-empty"
import {
  MailListToolbar,
  type MailBulkAction,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-list-toolbar"
import {
  getMailViewLabel,
  MailSidebar,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-sidebar"
import {
  MailThreadHeader,
  type MailThreadAction,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-thread-header"
import {
  MailThreadList,
  MailThreadListSkeleton,
  type MailRowAction,
} from "@/registry/bases/__base__/blocks/mail-01/components/mail-thread-list"
import { MailThreadView } from "@/registry/bases/__base__/blocks/mail-01/components/mail-thread-view"
import { useMailShortcuts } from "@/registry/bases/__base__/blocks/mail-01/hooks/use-mail-shortcuts"
import {
  INCOMING_THREAD,
  MAIL_ACCOUNTS,
  MAIL_CONTACTS,
  MAIL_RECIPIENTS,
  MAIL_THREADS,
  SAMPLE_NOW,
  SAMPLE_TIME_FORMAT,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-data"
import {
  canApplyMailAction,
  findNextSnoozed,
  formatFileSize,
  formatMailTime,
  formatSnoozedUntil,
  getAdjacentId,
  getDraftBody,
  getForwardQuote,
  getListPosition,
  getMailCounts,
  getReplyRecipientIds,
  getSnoozeOptions,
  getVisibleThreads,
  hasDraftContent,
  isSameDraft,
  mailReducer,
  ME,
  splitDraftBody,
  type MailAccountId,
  type MailAction,
  type MailBox,
  type MailFilter,
  type MailReplyDraft,
  type MailThread,
  type MailThreadMove,
  type MailView,
} from "@/registry/bases/__base__/blocks/mail-01/lib/mail-model"
import { useIsMobile } from "@/registry/bases/__base__/hooks/use-mobile"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellMain,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
  useAppShell,
  useShellPanel,
} from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import { DensityProvider } from "@/registry/bases/__base__/ui/density"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { Kbd, KbdGroup } from "@/registry/bases/__base__/ui/kbd"
import {
  SidebarTrigger,
  useSidebar,
} from "@/registry/bases/__base__/ui/sidebar"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"

// Ada works through her inbox and answers what matters. The list is a start
// panel she sizes, and the open conversation is the main column, with the
// reply ready at its foot: move with the arrows or J and K, act, and the next
// one opens. On a phone the list is the screen, a conversation takes its
// place, and a back button returns.

const NOW = SAMPLE_NOW
const TIME_FORMAT = SAMPLE_TIME_FORMAT
const SNOOZE_OPTIONS = getSnoozeOptions(NOW, TIME_FORMAT)
const INBOX: MailView = { kind: "folder", folder: "inbox" }

/** Under this width the sidebar becomes a rail, so list and thread both fit. */
const RAIL_BELOW = 1100

// A stand-in for your mail API: how long each request takes.
const SEND_TIME = 700
const FETCH_TIME = 900

function wait(time: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, time))
}

/** Sends and checks fail without a network, as a real request would. */
async function request(time: number) {
  await wait(time)
  if (!navigator.onLine) throw new Error("offline")
}

const MOVE_MESSAGES: Record<Exclude<MailBox, "sent" | "drafts">, string> = {
  archive: "archived",
  trash: "moved to Trash",
  spam: "reported as spam",
  inbox: "moved to Inbox",
}

function describeCount(count: number) {
  return count === 1 ? "Conversation" : `${count} conversations`
}

type Compose = MailComposeValue & {
  key: number
  title: string
  /** The draft this continues, replaced on close and removed once sent. */
  draftId?: string
}

const EMPTY_COMPOSE: MailComposeValue = {
  draft: { toIds: [], subject: "", body: "" },
  files: [],
}

const NO_SUBJECT = "(no subject)"
const MOVES: MailThreadMove[] = ["archive", "moveToInbox", "delete", "snooze"]

/** A tablet, or a narrow window, keeps the folders as a rail of icons. */
function useSidebarRail(isNarrow: boolean) {
  const { open, setOpen } = useSidebar()
  const wasOpen = React.useRef(false)
  const isRail = React.useRef(false)
  React.useEffect(() => {
    if (isNarrow === isRail.current) return
    isRail.current = isNarrow
    if (isNarrow) wasOpen.current = open
    setOpen(isNarrow ? false : wasOpen.current)
  }, [isNarrow, open, setOpen])
}

function Mail() {
  const [state, dispatch] = React.useReducer(
    mailReducer,
    { threads: MAIL_THREADS, openId: null, selectedIds: [], replyDrafts: {} },
    (initial) => mailReducer(initial, { type: "open", id: "q4-plan" })
  )
  const [accountId, setAccountId] = React.useState<MailAccountId>("work")
  const [isLoading, setLoading] = React.useState(false)
  const [view, setView] = React.useState<MailView>(INBOX)
  const [filter, setFilter] = React.useState<MailFilter>("all")
  const [query, setQuery] = React.useState("")
  const [checkedAt, setCheckedAt] = React.useState(NOW)
  const [checkState, setCheckState] = React.useState<
    "idle" | "checking" | "failed"
  >("idle")
  const [compose, setCompose] = React.useState<Compose>({
    ...EMPTY_COMPOSE,
    key: 0,
    title: "New message",
  })
  const [isComposeOpen, setComposeOpen] = React.useState(false)

  const { size, width, isMainCovered } = useAppShell()
  const { state: sidebarState, isMobile: isSidebarSheet } = useSidebar()
  const list = useShellPanel("conversations")
  const isPhone = size === "phone"
  const isNarrow = width > 0 && !isPhone && width < RAIL_BELOW
  useSidebarRail(isNarrow)

  const searchRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)
  const replyRef = React.useRef<HTMLTextAreaElement>(null)
  const clockStart = React.useRef<number | null>(null)
  const draftFiles = React.useRef(new Map<string, File[]>())

  // A phone starts on the list. Floating panels start closed, so the list
  // opens once, as soon as the shell has made it the phone's screen. A
  // passive effect: the shell reads panel state it syncs in its own layout
  // effect, which runs after this component's.
  const hasShownPhoneList = React.useRef(false)
  const { isFloating: isListFloating, setOpen: setListOpen } = list
  React.useEffect(() => {
    if (!isPhone || !isListFloating || hasShownPhoneList.current) return
    hasShownPhoneList.current = true
    setListOpen(true)
  }, [isPhone, isListFloating, setListOpen])

  const account = MAIL_ACCOUNTS.find(({ id }) => id === accountId)
  const contacts = React.useMemo(
    () =>
      MAIL_CONTACTS.map((contact) =>
        contact.id === ME && account
          ? { ...contact, email: account.email }
          : contact
      ),
    [account]
  )
  const threads = React.useMemo(
    () => state.threads.filter((thread) => thread.account === accountId),
    [state.threads, accountId]
  )
  const counts = React.useMemo(() => getMailCounts(threads), [threads])
  const visible = getVisibleThreads(threads, {
    view,
    filter,
    query,
    contacts,
    keepId: state.openId,
  })
  const visibleIds = visible.map(({ id }) => id)
  const openThread = threads.find(({ id }) => id === state.openId) ?? null
  const selectedIds = state.selectedIds.filter((id) => visibleIds.includes(id))
  const hasSelection = selectedIds.length > 0
  const selected = visible.filter(({ id }) => selectedIds.includes(id))
  const areSelectedRead = selected.every(({ isUnread }) => !isUnread)
  const selectedMoves = MOVES.filter((entry) =>
    selected.every((thread) => canApplyMailAction(thread, entry))
  )

  const label = getMailViewLabel(view)
  const folder = view.kind === "folder" ? view.folder : null
  const isCaughtUp =
    folder === "inbox" &&
    filter === "all" &&
    query.trim() === "" &&
    visible.length === 0
  const nextSnoozed = findNextSnoozed(threads)

  // The sample's clock starts at its "now" and runs in real time from the
  // first message you send.
  const clock = () => {
    clockStart.current ??= Date.now()
    return NOW + (Date.now() - clockStart.current)
  }

  // Keys act from anywhere, so the row they land on comes into view, and takes
  // the focus when the list (or a row that just left it) had it.
  const focusOpenRow = React.useRef(false)
  const markRowFocus = () => {
    const focused = document.activeElement
    focusOpenRow.current =
      focused === document.body || !!listRef.current?.contains(focused)
  }
  React.useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-thread-open="${state.openId}"]`
    )
    row?.closest("li")?.scrollIntoView({ block: "nearest" })
    if (focusOpenRow.current) row?.focus({ preventScroll: true })
    focusOpenRow.current = false
  }, [state.openId])

  /** Runs an action and offers to put the threads it changed back. */
  const withUndo = (ids: string[], message: string, action: MailAction) => {
    const before = state.threads.filter(({ id }) => ids.includes(id))
    const openId = state.openId
    markRowFocus()
    dispatch(action)
    notifyMail(message, {
      label: "Undo",
      onSelect: () => dispatch({ type: "restore", threads: before, openId }),
    })
  }

  const move = (ids: string[], box: keyof typeof MOVE_MESSAGES) => {
    if (ids.length === 0) return
    withUndo(ids, `${describeCount(ids.length)} ${MOVE_MESSAGES[box]}`, {
      type: "move",
      ids,
      box,
      visibleIds,
    })
  }

  const snooze = (ids: string[], until: number) =>
    withUndo(
      ids,
      `${describeCount(ids.length)} snoozed until ${formatSnoozedUntil(until, NOW, TIME_FORMAT)}`,
      { type: "snooze", ids, until, visibleIds }
    )

  const setUnread = (ids: string[], isUnread: boolean) =>
    dispatch({ type: "setUnread", ids, isUnread })

  const onRowAction = (id: string, action: MailRowAction) => {
    const thread = threads.find((entry) => entry.id === id)
    if (!thread) return
    if (action === "archive") move([id], "archive")
    else if (action === "delete") move([id], "trash")
    else setUnread([id], !thread.isUnread)
  }

  const onBulkAction = (action: MailBulkAction) => {
    if (action === "archive") move(selectedIds, "archive")
    else if (action === "moveToInbox") move(selectedIds, "inbox")
    else if (action === "delete") move(selectedIds, "trash")
    else setUnread(selectedIds, action === "markUnread")
  }

  /** E and # act on what is selected, or on the open conversation. */
  const onMoveKey = (action: "archive" | "delete") => {
    if (hasSelection) {
      if (selectedMoves.includes(action)) onBulkAction(action)
      return
    }
    if (openThread && canApplyMailAction(openThread, action)) {
      onThreadAction(action)
    }
  }

  const onThreadAction = (action: MailThreadAction) => {
    if (!openThread) return
    const { id, isUnread, isStarred } = openThread
    if (action === "toggleUnread") setUnread([id], !isUnread)
    else if (action === "toggleStar")
      dispatch({ type: "star", id, isStarred: !isStarred })
    else if (action === "archive") move([id], "archive")
    else if (action === "delete") move([id], "trash")
    else if (action === "spam") move([id], "spam")
    else move([id], "inbox")
  }

  const open = (id: string) => {
    dispatch({ type: "open", id })
    // Where the list covers the conversation, opening one steps it aside.
    if (list.isFloating) list.setOpen(false)
  }

  const moveTo = (direction: "next" | "previous") => {
    const id = getAdjacentId(visibleIds, state.openId, direction)
    if (!id || id === state.openId) return
    markRowFocus()
    dispatch({ type: "open", id })
  }

  const changeView = (next: MailView) => {
    setView(next)
    setFilter("all")
    setQuery("")
    dispatch({ type: "close" })
    if (list.isFloating) list.setOpen(true)
  }

  const changeAccount = (id: MailAccountId) => {
    if (id === accountId) return
    setAccountId(id)
    changeView(INBOX)
    setLoading(true)
    void wait(FETCH_TIME).then(() => setLoading(false))
  }

  const checkMail = async () => {
    setCheckState("checking")
    try {
      await request(FETCH_TIME)
    } catch {
      setCheckState("failed")
      return
    }
    setCheckState("idle")
    setCheckedAt(clock())
    const isNew = !state.threads.some(({ id }) => id === INCOMING_THREAD.id)
    if (isNew) dispatch({ type: "send", thread: INCOMING_THREAD })
    else notifyMail("No new mail")
  }

  const startCompose = (
    title: string,
    value: MailComposeValue,
    draftId?: string
  ) => {
    setCompose(({ key }) => ({ ...value, key: key + 1, title, draftId }))
    setComposeOpen(true)
  }

  const toThread = (
    { draft, files }: MailComposeValue,
    { id, box }: { id: string; box: "sent" | "drafts" }
  ): MailThread => ({
    id,
    account: accountId,
    subject: draft.subject.trim() || NO_SUBJECT,
    box,
    isUnread: false,
    isStarred: false,
    labels: [],
    messages: [
      {
        id: `${id}-1`,
        fromId: ME,
        toIds: draft.toIds,
        sentAt: clock(),
        body: getDraftBody(draft),
        attachments: [
          ...(draft.attachments ?? []),
          ...files.map((file) => ({
            name: file.name,
            size: formatFileSize(file.size),
          })),
        ],
      },
    ],
  })

  const sendMessage = async (value: MailComposeValue) => {
    try {
      await request(SEND_TIME)
    } catch {
      return "You're offline. The message is kept here until you send it."
    }
    const { title, draftId } = compose
    const id = crypto.randomUUID()
    dispatch({ type: "send", thread: toThread(value, { id, box: "sent" }) })
    if (draftId) dispatch({ type: "remove", id: draftId })
    setComposeOpen(false)
    notifyMail("Message sent", {
      label: "Undo",
      onSelect: () => {
        dispatch({ type: "remove", id })
        startCompose(title, value)
      },
    })
    return undefined
  }

  const closeCompose = (value: MailComposeValue) => {
    setComposeOpen(false)
    const isUnchanged =
      isSameDraft(value.draft, compose.draft) &&
      value.files.length === compose.files.length
    if (
      isUnchanged ||
      !hasDraftContent(value.draft, { fileCount: value.files.length })
    ) {
      return
    }
    const id = compose.draftId ?? crypto.randomUUID()
    const before = state.threads.find((thread) => thread.id === id)
    draftFiles.current.set(id, value.files)
    dispatch({ type: "send", thread: toThread(value, { id, box: "drafts" }) })
    notifyMail("Saved to Drafts", {
      label: before ? "Undo" : "Discard",
      onSelect: () =>
        dispatch(
          before ? { type: "send", thread: before } : { type: "remove", id }
        ),
    })
  }

  const discardCompose = (value: MailComposeValue) => {
    const { title, draftId } = compose
    const before = state.threads.find(({ id }) => id === draftId)
    setComposeOpen(false)
    if (before) dispatch({ type: "remove", id: before.id })
    if (!hasDraftContent(value.draft, { fileCount: value.files.length })) return
    notifyMail("Draft discarded", {
      label: "Undo",
      onSelect: () => {
        if (before) dispatch({ type: "send", thread: before })
        startCompose(title, value, draftId)
      },
    })
  }

  const forward = () => {
    if (!openThread) return
    startCompose("Forward", {
      draft: {
        toIds: [],
        subject: `Fwd: ${openThread.subject}`,
        body: "",
        quote: getForwardQuote(openThread, contacts, TIME_FORMAT),
        attachments: openThread.messages.at(-1)?.attachments,
      },
      files: [],
    })
  }

  const editDraft = () => {
    const latest = openThread?.messages.at(-1)
    if (!openThread || !latest) return
    const files = draftFiles.current.get(openThread.id) ?? []
    const isFile = (name: string) => files.some((file) => file.name === name)
    startCompose(
      "Draft",
      {
        draft: {
          toIds: latest.toIds,
          subject: openThread.subject === NO_SUBJECT ? "" : openThread.subject,
          ...splitDraftBody(latest.body),
          attachments: latest.attachments?.filter(({ name }) => !isFile(name)),
        },
        files,
      },
      openThread.id
    )
  }

  const reply = async (thread: MailThread, draft: MailReplyDraft) => {
    const latest = thread.messages.at(-1)
    if (!latest) return undefined
    try {
      await request(SEND_TIME)
    } catch {
      return "You're offline. The reply is kept here until you send it."
    }
    const { id } = thread
    const messageId = crypto.randomUUID()
    dispatch({
      type: "reply",
      id,
      message: {
        id: messageId,
        fromId: ME,
        toIds: getReplyRecipientIds(latest, draft.mode),
        sentAt: clock(),
        body: draft.body,
        attachments: draft.files.map((file) => ({
          name: file.name,
          size: formatFileSize(file.size),
        })),
      },
    })
    notifyMail("Reply sent", {
      label: "Undo",
      onSelect: () => {
        dispatch({ type: "unsendReply", id, messageId, draft })
        dispatch({ type: "open", id })
      },
    })
    return undefined
  }

  const startReply = (mode: MailReplyDraft["mode"]) => {
    if (!openThread) return
    const draft = state.replyDrafts[openThread.id]
    dispatch({
      type: "draftReply",
      id: openThread.id,
      draft: { body: draft?.body ?? "", files: draft?.files ?? [], mode },
    })
    replyRef.current?.focus()
  }

  useMailShortcuts(
    {
      onNext: () => moveTo("next"),
      onPrevious: () => moveTo("previous"),
      onArchive: () => onMoveKey("archive"),
      onDelete: () => onMoveKey("delete"),
      onToggleUnread: () =>
        hasSelection
          ? onBulkAction(areSelectedRead ? "markUnread" : "markRead")
          : onThreadAction("toggleUnread"),
      onToggleStar: () => onThreadAction("toggleStar"),
      onToggleSelected: () => {
        if (openThread) dispatch({ type: "toggleSelected", id: openThread.id })
      },
      onReply: () => startReply("reply"),
      onReplyAll: () => startReply("replyAll"),
      onForward: forward,
      onSearch: () => {
        if (list.isFloating || !list.open) list.setOpen(true)
        searchRef.current?.focus()
      },
      onCompose: () => startCompose("New message", EMPTY_COMPOSE),
    },
    {
      isEnabled: !isComposeOpen,
      hasThread: openThread !== null,
      hasSelection,
    }
  )

  // On a phone the list is the page while it shows, so it has the heading.
  const isListPage = isPhone && isMainCovered
  const caughtUp = (
    <MailCaughtUp
      nextUp={
        nextSnoozed?.snoozedUntil === undefined
          ? undefined
          : `“${nextSnoozed.subject}” comes back ${formatSnoozedUntil(nextSnoozed.snoozedUntil, NOW, TIME_FORMAT)}.`
      }
      onShowArchive={() => changeView({ kind: "folder", folder: "archive" })}
    />
  )
  // Until the shell has measured itself, its panels read as closed.
  const canShowList = size !== null && (list.isFloating || !list.open)

  return (
    <>
      <MailSidebar
        accountId={accountId}
        view={view}
        counts={counts}
        onAccountChange={changeAccount}
        onViewChange={changeView}
      />
      <AppShellPanel
        id="conversations"
        side="left"
        label="Conversations"
        defaultOpen
        defaultWidth={isNarrow ? 340 : 400}
        minWidth={320}
        maxWidth={isNarrow ? 360 : 520}
        mobile="swap"
      >
        {/* The page's one filled button; on phones it floats at the thumb. */}
        <AppShellPanelHeader className="ps-(--density-16) has-[>[data-slot=sidebar-trigger]:first-child]:ps-(--density-10)">
          {(isSidebarSheet || sidebarState === "collapsed") && (
            <SidebarTrigger />
          )}
          {isListPage ? (
            <h1 className="min-w-0 flex-1 truncate text-(length:--density-text-14) weight-semibold">
              {label}
            </h1>
          ) : (
            <AppShellPanelTitle>{label}</AppShellPanelTitle>
          )}
          <span role="status" className="flex shrink-0 text-muted-foreground">
            {checkState === "checking" && (
              <Spinner aria-label="Checking for mail" />
            )}
          </span>
          {!isPhone && (
            <Button
              size="sm"
              aria-keyshortcuts="C"
              onClick={() => startCompose("New message", EMPTY_COMPOSE)}
            >
              {mailIcons.compose}
              Compose
            </Button>
          )}
          <MailMenuButton
            label="List options"
            icon={mailIcons.more}
            groups={[
              {
                id: "list",
                entries: [
                  {
                    id: "select-all",
                    label: "Select all",
                    icon: mailIcons.selectAll,
                    onSelect: () =>
                      dispatch({ type: "selectAll", ids: visibleIds }),
                  },
                  {
                    id: "read-all",
                    label: `Mark all in ${label} as read`,
                    icon: mailIcons.readAll,
                    onSelect: () => setUnread(visibleIds, false),
                  },
                  {
                    id: "check",
                    label: "Check for mail",
                    icon: mailIcons.refresh,
                    detail: formatMailTime(checkedAt, NOW, TIME_FORMAT),
                    onSelect: () => void checkMail(),
                  },
                ],
              },
            ]}
          />
          {/* A sheet keeps its close button; on a phone, picking a
              conversation is the way out. */}
          {list.isFloating && !isPhone && <AppShellPanelClose />}
        </AppShellPanelHeader>
        <MailFilterTabs value={filter} onValueChange={setFilter}>
          <MailListToolbar
            searchRef={searchRef}
            query={query}
            onQueryChange={setQuery}
            selection={
              hasSelection
                ? {
                    selectedCount: selectedIds.length,
                    isAllSelected: selectedIds.length === visible.length,
                    areSelectedRead,
                    moves: selectedMoves,
                    snoozeOptions: SNOOZE_OPTIONS,
                    onSelectAll: (isSelected) =>
                      dispatch(
                        isSelected
                          ? { type: "selectAll", ids: visibleIds }
                          : { type: "clearSelection" }
                      ),
                    onClearSelection: () =>
                      dispatch({ type: "clearSelection" }),
                    onBulkAction,
                    onSnooze: (until) => snooze(selectedIds, until),
                  }
                : null
            }
          />
          {checkState === "failed" && (
            <div className="shrink-0 px-(--density-16) pb-(--density-12)">
              <Alert variant="error">
                {mailIcons.alert}
                <AlertTitle>Couldn&apos;t check for mail</AlertTitle>
                <AlertDescription>
                  You&apos;re offline. This is your mail from{" "}
                  {formatMailTime(checkedAt, NOW, TIME_FORMAT)}.
                </AlertDescription>
                <AlertAction>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void checkMail()}
                  >
                    Retry
                  </Button>
                </AlertAction>
              </Alert>
            </div>
          )}
          <MailFilterPanel value={filter}>
            <AppShellPanelContent
              aria-busy={isLoading || undefined}
              className="flex scroll-fade flex-col px-(--density-6) pb-(--density-16) in-data-[size=phone]:pb-20"
            >
              {isLoading ? (
                <MailThreadListSkeleton />
              ) : visible.length > 0 ? (
                <MailThreadList
                  threads={visible}
                  contacts={contacts}
                  replyDrafts={state.replyDrafts}
                  openId={isPhone ? null : state.openId}
                  selectedIds={selectedIds}
                  now={NOW}
                  timeFormat={TIME_FORMAT}
                  listRef={listRef}
                  onSelect={(id) => dispatch({ type: "open", id })}
                  onOpen={(id) =>
                    // While rows are being picked by touch, a tap picks.
                    isPhone && hasSelection
                      ? dispatch({ type: "toggleSelected", id })
                      : open(id)
                  }
                  onToggleSelected={(id) =>
                    dispatch({ type: "toggleSelected", id })
                  }
                  onClearSelection={() => dispatch({ type: "clearSelection" })}
                  onStar={(id, isStarred) =>
                    dispatch({ type: "star", id, isStarred })
                  }
                  onAction={onRowAction}
                />
              ) : isCaughtUp ? (
                isPhone ? (
                  caughtUp
                ) : (
                  <p className="px-(--density-10) py-(--density-8) text-(length:--density-text-13) text-muted-foreground">
                    Nothing left to read.
                  </p>
                )
              ) : (
                <MailListEmpty
                  view={view}
                  label={label}
                  filter={filter}
                  query={query}
                  onClearQuery={() => {
                    setQuery("")
                    searchRef.current?.focus()
                  }}
                  onShowAll={() => setFilter("all")}
                />
              )}
            </AppShellPanelContent>
          </MailFilterPanel>
        </MailFilterTabs>
        {isPhone && (
          <Button
            size="icon-lg"
            aria-label="Compose"
            onClick={() => startCompose("New message", EMPTY_COMPOSE)}
            className="absolute end-(--density-16) bottom-[max(var(--density-16),env(safe-area-inset-bottom))] z-20 rounded-full shadow-surface-4"
          >
            {mailIcons.compose}
          </Button>
        )}
      </AppShellPanel>

      <AppShellMain>
        {/* Its icons stand on the thread's edges, not its buttons' boxes. */}
        <AppShellHeader
          trigger={canShowList && !isPhone ? "auto" : "never"}
          className="px-[calc(var(--density-24)-var(--density-6))] in-data-[size=phone]:px-(--density-6)"
        >
          <div className="mx-auto flex w-full max-w-[calc(45rem+2*var(--density-6))] min-w-0 items-center">
            {canShowList && (
              <MailIconButton
                label={`Back to ${label}`}
                onClick={() => list.setOpen(true)}
              >
                {mailIcons.back}
              </MailIconButton>
            )}
            {openThread && (
              <MailThreadHeader
                thread={openThread}
                position={getListPosition(visibleIds, openThread.id)}
                isPhone={isPhone}
                snoozeOptions={SNOOZE_OPTIONS}
                onAction={onThreadAction}
                onSnooze={(until) => snooze([openThread.id], until)}
                onReplyAll={() => startReply("replyAll")}
                onForward={forward}
                onMove={moveTo}
              />
            )}
          </div>
        </AppShellHeader>
        <AppShellContent
          key={openThread?.id ?? "none"}
          className="flex flex-col"
        >
          {openThread && !isListPage ? (
            <MailThreadView
              thread={openThread}
              contacts={contacts}
              now={NOW}
              timeFormat={TIME_FORMAT}
              replyRef={replyRef}
              replyDraft={state.replyDrafts[openThread.id]}
              onReplyDraftChange={(draft) =>
                dispatch({ type: "draftReply", id: openThread.id, draft })
              }
              onReply={(draft) => reply(openThread, draft)}
              onForward={forward}
              onEditDraft={editDraft}
              onMoveToInbox={() => onThreadAction("moveToInbox")}
              onStar={() => onThreadAction("toggleStar")}
              // Start the file's download here.
              onDownload={({ name }) => notifyMail(`Downloading ${name}`)}
            />
          ) : (
            !isListPage && (
              <>
                <h1 className="sr-only">{label}</h1>
                {isCaughtUp && !isLoading ? (
                  caughtUp
                ) : (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">{mailIcons.read}</EmptyMedia>
                      <EmptyTitle>
                        {isLoading ? "Opening your mail" : "Nothing open"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {isLoading ? (
                          account?.email
                        ) : (
                          <>
                            Pick a conversation, or press{" "}
                            <KbdGroup className="align-middle">
                              <Kbd>J</Kbd>
                            </KbdGroup>{" "}
                            for the first.
                          </>
                        )}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </>
            )
          )}
        </AppShellContent>
      </AppShellMain>

      <MailCompose
        key={compose.key}
        open={isComposeOpen}
        title={compose.title}
        from={account?.email ?? ""}
        initial={compose}
        contacts={MAIL_RECIPIENTS}
        onSend={sendMessage}
        onDiscard={discardCompose}
        onClose={closeCompose}
      />
    </>
  )
}

export default function MailPage() {
  const isMobile = useIsMobile()
  return (
    // Rows and controls the size of a thumb on a phone.
    <DensityProvider density={isMobile ? "spacious" : "default"}>
      <AppShell storageKey="mail-01-start" minMainWidth={400}>
        <Mail />
      </AppShell>
    </DensityProvider>
  )
}
