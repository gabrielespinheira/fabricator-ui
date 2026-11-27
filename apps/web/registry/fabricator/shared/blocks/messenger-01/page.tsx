"use client"

import * as React from "react"
import { cn } from "cn"

import { MessengerComposer } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-composer"
import {
  MessengerConfirmDialog,
  MessengerIconButton,
  MessengerPhotoDialog,
  notifyMessenger,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import { MessengerConversationHeader } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-conversation-header"
import { MessengerConversationList } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-conversation-list"
import { MessengerDetails } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-details"
import { CloseIcon } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import { type MessengerMessageHandlers } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message"
import { type Photo } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-message-body"
import { MessengerPeopleList } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-people-list"
import { MessengerSidebar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-sidebar"
import {
  MessengerNewConversation,
  MessengerTranscript,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-transcript"
import { useMessenger } from "@/registry/bases/__base__/blocks/messenger-01/hooks/use-messenger"
import {
  PEOPLE,
  SAMPLE_NOW,
  SAMPLE_TIME_FORMAT,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-data"
import {
  describeBody,
  filterConversations,
  filterPeople,
  getVisibleUnread,
  ME,
  sortConversations,
  type ChatMessage,
  type Person,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  AppShell,
  AppShellContent,
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
import { InputSearch } from "@/registry/bases/__base__/ui/input-group"
import { SidebarTrigger } from "@/registry/bases/__base__/ui/sidebar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// For someone at work who catches up on their conversations and answers. The
// transcript is the signature: it gets the main column, between the app's
// navigation as an icon rail with the conversations beside it, and a details
// panel that opens on the right.
//
// The conversations are a left App Shell panel rather than the sidebar, so a
// phone gets a list first: on phones the panel takes the whole screen
// (`mobile="swap"`), opening a conversation steps it aside, and the back
// button in the conversation's header brings it back. From tablets up it docks
// beside the sidebar; where the window is too narrow for both, it floats as a
// sheet that the same back button opens.

const NOW = SAMPLE_NOW
const TIME_FORMAT = SAMPLE_TIME_FORMAT

// On a phone the sidebar shows by moving the page aside. The list covers the
// page, so it moves with it.
const MOVES_WITH_PAGE =
  "group-data-reveal/sidebar-wrapper:origin-left group-data-reveal/sidebar-wrapper:transition-[transform,border-radius,box-shadow] group-data-reveal/sidebar-wrapper:duration-sheet-exit group-data-reveal/sidebar-wrapper:ease-drawer group-data-reveal-dragging/sidebar-wrapper:transition-none group-data-[reveal=open]/sidebar-wrapper:z-15! group-data-[reveal=open]/sidebar-wrapper:[transform:translateX(calc(var(--sidebar-reveal-width)*var(--sidebar-reveal-direction)*var(--sidebar-reveal-progress,1)))_scale(calc(1-(1-var(--sidebar-reveal-scale))*var(--sidebar-reveal-progress,1)))] group-data-[reveal=open]/sidebar-wrapper:rounded-[48px] group-data-[reveal=open]/sidebar-wrapper:shadow-surface-6 group-data-[reveal=open]/sidebar-wrapper:duration-sheet motion-reduce:transition-none"

function getReplyTo(message: ChatMessage | undefined) {
  if (!message) return undefined
  const author = PEOPLE.find((person) => person.id === message.senderId)
  return {
    id: message.id,
    author: message.senderId === ME ? "yourself" : (author?.name ?? "someone"),
    text: describeBody(message.body),
  }
}

function Messenger() {
  const { size } = useAppShell()
  const list = useShellPanel("conversations")
  const details = useShellPanel("details")
  const [hasChosen, setChosen] = React.useState(false)
  // A phone starts on the list and shows one or the other: with the list up,
  // nothing is being read.
  const isAway = size === "phone" && (list.open || !hasChosen)
  const { state, dispatch, clock, send, transmit } = useMessenger({
    isReading: size !== null && !isAway,
  })
  const [query, setQuery] = React.useState("")
  const [isPickingPerson, setPickingPerson] = React.useState(false)
  const [confirming, setConfirming] = React.useState<"block" | "report">(
    "block"
  )
  const [isConfirmOpen, setConfirmOpen] = React.useState(false)
  const [photo, setPhoto] = React.useState<Photo>()
  const [isPhotoOpen, setPhotoOpen] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const hasShownPhoneList = React.useRef(false)

  // A phone starts on the list. Floating panels start closed, so the list
  // opens once, as soon as the shell has made it the phone's screen. A
  // passive effect: the shell reads panel state it syncs in its own layout
  // effect, which runs after this component's.
  const { isFloating: isListFloating, setOpen: setListOpen } = list
  React.useEffect(() => {
    if (size !== "phone" || !isListFloating || hasShownPhoneList.current) return
    hasShownPhoneList.current = true
    setListOpen(true)
  }, [size, isListFloating, setListOpen])

  const conversation =
    state.conversations.find(({ id }) => id === state.openId) ??
    state.conversations[0]
  const { id } = conversation
  const members = conversation.memberIds.flatMap(
    (memberId) => PEOPLE.find((person) => person.id === memberId) ?? []
  )
  const contact = conversation.kind === "direct" ? members[0] : undefined
  const contactName = contact?.name.split(" ")[0] ?? conversation.title
  const visible = filterConversations(
    sortConversations(state.conversations),
    query,
    PEOPLE
  )
  const unread = state.conversations.filter(
    (entry) => !entry.isMuted && getVisibleUnread(entry, isAway ? null : id) > 0
  ).length

  // Where the list covers the conversation, opening one steps it aside.
  const showConversation = () => {
    setChosen(true)
    if (list.isFloating) list.setOpen(false)
  }

  const open = (nextId: string) => {
    dispatch({ type: "open", id: nextId })
    showConversation()
  }

  const stopPicking = () => {
    setPickingPerson(false)
    setQuery("")
  }

  const startWith = (person: Person) => {
    dispatch({ type: "start", person, at: clock() })
    stopPicking()
    showConversation()
  }

  const openPhoto = (next: Photo) => {
    setPhoto(next)
    setPhotoOpen(true)
  }

  const confirm = (next: "block" | "report") => {
    setConfirming(next)
    setConfirmOpen(true)
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notifyMessenger("Text copied")
    } catch {
      notifyMessenger("The browser didn't allow copying")
    }
  }

  const unblock = () => dispatch({ type: "block", id, isBlocked: false })

  const handlers: MessengerMessageHandlers = {
    onAction: (action, message) => {
      switch (action) {
        case "reply":
          return dispatch({ type: "reply", id, messageId: message.id })
        case "copy":
          return void copyText(describeBody(message.body))
        case "unread":
          return dispatch({ type: "unread", id, messageId: message.id })
        case "retry":
          dispatch({ type: "retry", id, messageId: message.id, at: clock() })
          return transmit(id, [message.id])
        case "delete": {
          const index = conversation.messages.indexOf(message)
          dispatch({ type: "delete", id, messageId: message.id })
          return notifyMessenger("Message deleted", () =>
            dispatch({ type: "restore", id, message, index })
          )
        }
      }
    },
    onReact: (message, emoji) =>
      dispatch({ type: "react", id, messageId: message.id, emoji }),
    onOpenPhoto: openPhoto,
    // Download from your file storage.
    onDownload: () => {},
  }

  return (
    <>
      <MessengerSidebar unread={unread} />
      <AppShellPanel
        id="conversations"
        side="left"
        label="Conversations"
        defaultOpen
        defaultWidth={340}
        minWidth={280}
        maxWidth={440}
        mobile="swap"
        // The details panel's toggle is on the other side of the shell, so
        // this header keeps no room for it and shares the list's edges.
        className={cn(
          "[--app-shell-control-inset:var(--density-8)] [--app-shell-panel-trigger-room:0px]",
          MOVES_WITH_PAGE
        )}
      >
        <AppShellPanelHeader className="gap-(--density-4) ps-(--density-8)">
          <SidebarTrigger />
          <AppShellPanelTitle role="heading" aria-level={isAway ? 1 : 2}>
            {isPickingPerson ? "New message" : "Messages"}
          </AppShellPanelTitle>
          <MessengerIconButton
            label={isPickingPerson ? "Back to messages" : "New message"}
            onClick={() => {
              if (isPickingPerson) return stopPicking()
              setPickingPerson(true)
              setQuery("")
              searchRef.current?.focus()
            }}
          >
            {isPickingPerson ? (
              <CloseIcon />
            ) : (
              <IconPlaceholder
                lucide="SquarePenIcon"
                tabler="IconEdit"
                hugeicons="PencilEdit02Icon"
                phosphor="NotePencilIcon"
                remixicon="RiEditBoxLine"
              />
            )}
          </MessengerIconButton>
          {/* A sheet keeps its close button; on a phone, picking a
              conversation is the way out. */}
          {isListFloating && size !== "phone" && <AppShellPanelClose />}
        </AppShellPanelHeader>
        <form
          role="search"
          className="shrink-0 px-(--density-8) pb-(--density-12)"
          onSubmit={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isPickingPerson && !query)
              stopPicking()
            if (event.key !== "ArrowDown") return
            event.preventDefault()
            listRef.current
              ?.querySelector<HTMLElement>('[role="option"][tabindex="0"]')
              ?.focus()
          }}
        >
          <InputSearch
            ref={searchRef}
            aria-label={
              isPickingPerson ? "Search people" : "Search conversations"
            }
            placeholder={isPickingPerson ? "Who to" : "Search"}
            value={query}
            onValueChange={setQuery}
          />
        </form>
        <AppShellPanelContent ref={listRef}>
          {isPickingPerson ? (
            <MessengerPeopleList
              people={filterPeople(PEOPLE, query)}
              query={query}
              onPick={startWith}
              onClearQuery={() => setQuery("")}
            />
          ) : (
            <MessengerConversationList
              conversations={visible}
              people={PEOPLE}
              openId={id}
              isAway={isAway}
              typing={state.typing}
              query={query}
              now={NOW}
              timeFormat={TIME_FORMAT}
              onSelect={(nextId) => dispatch({ type: "open", id: nextId })}
              onOpen={open}
              onClearQuery={() => setQuery("")}
            />
          )}
        </AppShellPanelContent>
      </AppShellPanel>

      <AppShellMain>
        <MessengerConversationHeader
          conversation={conversation}
          members={members}
          now={NOW}
          timeFormat={TIME_FORMAT}
          // Where the list floats, or was closed, a button brings it back.
          canShowList={list.isFloating || !list.open}
          onShowList={() => list.setOpen(true)}
          handlers={{
            // Start a call with your calling service.
            onCall: () => {},
            onShowDetails: () => details.setOpen(true),
            onTogglePin: () =>
              dispatch({ type: "pin", id, isPinned: !conversation.isPinned }),
            onToggleMute: () =>
              dispatch({ type: "mute", id, isMuted: !conversation.isMuted }),
            onBlock: () => confirm("block"),
            onUnblock: unblock,
            onReport: () => confirm("report"),
          }}
        />
        {/* The transcript scrolls in its own viewport above the composer. */}
        <AppShellContent className="flex flex-col overflow-hidden">
          {conversation.messages.length === 0 ? (
            <MessengerNewConversation
              conversation={conversation}
              onWave={() => send(id, "👋", [])}
            />
          ) : (
            <MessengerTranscript
              key={id}
              conversation={conversation}
              people={PEOPLE}
              unreadFromId={state.unreadFrom[id]}
              typingId={state.typing[id]}
              now={NOW}
              timeFormat={TIME_FORMAT}
              handlers={handlers}
            />
          )}
          {conversation.isBlocked ? (
            <div className="flex shrink-0 flex-col items-center gap-(--density-8) px-(--density-16) pt-(--density-8) pb-[max(var(--density-24),env(safe-area-inset-bottom))] text-center">
              <p className="text-(length:--density-text-13) text-muted-foreground">
                You blocked {contactName}. They can&apos;t message or call you.
              </p>
              <Button variant="outline" size="sm" onClick={unblock}>
                Unblock {contactName}
              </Button>
            </div>
          ) : (
            <MessengerComposer
              key={`composer-${id}`}
              recipient={contactName}
              isNew={conversation.startedAt !== undefined}
              draft={state.drafts[id] ?? ""}
              replyTo={getReplyTo(
                conversation.messages.find(
                  (message) => message.id === state.replyTo[id]
                )
              )}
              onDraftChange={(text) => dispatch({ type: "draft", id, text })}
              onCancelReply={() =>
                dispatch({ type: "reply", id, messageId: undefined })
              }
              onSend={(text, files) => send(id, text, files)}
            />
          )}
        </AppShellContent>
      </AppShellMain>

      <AppShellPanel id="details" label="Details" defaultWidth={320}>
        <MessengerDetails
          conversation={conversation}
          members={members}
          now={NOW}
          timeFormat={TIME_FORMAT}
          onMutedChange={(isMuted) => dispatch({ type: "mute", id, isMuted })}
          onOpenPhoto={openPhoto}
        />
      </AppShellPanel>

      <MessengerPhotoDialog
        photo={photo}
        open={isPhotoOpen}
        onOpenChange={setPhotoOpen}
      />
      <MessengerConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setConfirmOpen}
        {...(confirming === "block"
          ? {
              title: `Block ${conversation.title}?`,
              description:
                "They can't message or call you, and won't see when you're online. You can unblock them here at any time.",
              cancelLabel: "Keep in touch",
              actionLabel: `Block ${contactName}`,
              onConfirm: () => dispatch({ type: "block", id, isBlocked: true }),
            }
          : {
              title: `Report ${conversation.title}?`,
              description:
                "The last 20 messages go to your workspace admins. They aren't told who reported them.",
              cancelLabel: "Don't report",
              actionLabel: `Report ${contactName}`,
              onConfirm: () => notifyMessenger("Report sent to your admins"),
            })}
      />
    </>
  )
}

export default function MessagesPage() {
  return (
    <AppShell storageKey="messenger-01" defaultOpen={false}>
      <Messenger />
    </AppShell>
  )
}
