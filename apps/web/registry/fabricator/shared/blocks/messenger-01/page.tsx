"use client"

import * as React from "react"

import { MessengerComposer } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-composer"
import {
  MessengerBlockDialog,
  MessengerIconButton,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import { MessengerConversationHeader } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-conversation-header"
import { MessengerConversationList } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-conversation-list"
import { MessengerDetails } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-details"
import { MessengerTranscript } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-transcript"
import {
  CONVERSATIONS,
  ME_PERSON,
  PEOPLE,
  SAMPLE_NOW,
  SAMPLE_REPLIES,
  SAMPLE_TIME_FORMAT,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-data"
import {
  filterConversations,
  formatFileSize,
  ME,
  messengerReducer,
  sortConversations,
  type ChatMessage,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import { AppNav, type AppNavGroup } from "@/registry/bases/__base__/ui/app-nav"
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
import {
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import { Search } from "@/registry/bases/__base__/ui/search"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarTrigger,
} from "@/registry/bases/__base__/ui/sidebar"
import { UserMenu } from "@/registry/bases/__base__/ui/user-menu"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A messaging app in three columns: the app's navigation as an icon rail, the
// conversations, and the open conversation, with its details in a panel that
// opens on the right.
//
// The conversations are a left App Shell panel rather than the sidebar, so a
// phone gets a list first: on phones the panel takes the whole screen
// (`mobile="swap"`), opening a conversation steps it aside, and the back
// button in the conversation's header brings it back. From tablets up it docks
// beside the sidebar; where the window is too narrow for both, it floats as a
// sheet that the same back button opens.

const NOW = SAMPLE_NOW
const TIME_FORMAT = SAMPLE_TIME_FORMAT

const chatIcon = (
  <IconPlaceholder
    lucide="MessageCircleIcon"
    tabler="IconMessageCircle"
    hugeicons="Message01Icon"
    phosphor="ChatCircleIcon"
    remixicon="RiChat1Line"
  />
)

function getNavGroups(unread: number): AppNavGroup[] {
  return [
    {
      id: "main",
      items: [
        {
          id: "chats",
          label: "Chats",
          href: "/messages",
          icon: chatIcon,
          badge: unread > 0 ? unread : undefined,
        },
        {
          id: "calls",
          label: "Calls",
          href: "/calls",
          icon: (
            <IconPlaceholder
              lucide="PhoneIcon"
              tabler="IconPhone"
              hugeicons="Call02Icon"
              phosphor="PhoneIcon"
              remixicon="RiPhoneLine"
            />
          ),
        },
        {
          id: "contacts",
          label: "Contacts",
          href: "/contacts",
          icon: (
            <IconPlaceholder
              lucide="UsersIcon"
              tabler="IconUsers"
              hugeicons="UserGroupIcon"
              phosphor="UsersIcon"
              remixicon="RiGroupLine"
            />
          ),
        },
        {
          id: "archived",
          label: "Archived",
          href: "/messages/archived",
          icon: (
            <IconPlaceholder
              lucide="ArchiveIcon"
              tabler="IconArchive"
              hugeicons="Archive02Icon"
              phosphor="ArchiveIcon"
              remixicon="RiArchiveLine"
            />
          ),
        },
      ],
    },
    {
      id: "settings",
      items: [
        {
          id: "settings",
          label: "Settings",
          href: "/settings",
          icon: (
            <IconPlaceholder
              lucide="SettingsIcon"
              tabler="IconSettings"
              hugeicons="Settings01Icon"
              phosphor="GearIcon"
              remixicon="RiSettingsLine"
            />
          ),
        },
      ],
    },
  ]
}

// A stand-in for your backend: the other side reads your message, types for a
// moment and answers. Replace it with your realtime subscription.
const READ_AFTER = 900
const TYPING_AFTER = 1600
const REPLY_AFTER = 3400

function Messenger() {
  const [state, dispatch] = React.useReducer(messengerReducer, {
    conversations: CONVERSATIONS,
    openId: "maya",
    drafts: {},
    typing: {},
  })
  const [query, setQuery] = React.useState("")
  const [isBlockOpen, setBlockOpen] = React.useState(false)
  const { size } = useAppShell()
  const list = useShellPanel("conversations")
  const details = useShellPanel("details")
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
  const searchRef = React.useRef<HTMLInputElement>(null)
  const timers = React.useRef<number[]>([])
  const objectUrls = React.useRef<string[]>([])
  const replyTurns = React.useRef<Record<string, number>>({})
  const clockStart = React.useRef<number | null>(null)

  React.useEffect(() => {
    const pendingTimers = timers.current
    const urls = objectUrls.current
    return () => {
      for (const timer of pendingTimers) window.clearTimeout(timer)
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])

  const conversation =
    state.conversations.find(({ id }) => id === state.openId) ??
    state.conversations[0]
  const visible = filterConversations(
    sortConversations(state.conversations),
    query,
    PEOPLE
  )
  const unread = state.conversations.filter(
    ({ unreadCount, isMuted }) => unreadCount > 0 && !isMuted
  ).length

  // The sample's clock starts at its "now" and runs in real time from the
  // first message you send.
  const clock = () => {
    clockStart.current ??= Date.now()
    return NOW + (Date.now() - clockStart.current)
  }

  const later = (delay: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, delay))
  }

  const send = (id: string, text: string, files: File[]) => {
    const sent: ChatMessage[] = files.map((file) => {
      const isImage = file.type.startsWith("image/")
      const src = isImage ? URL.createObjectURL(file) : undefined
      if (src) objectUrls.current.push(src)
      return {
        id: crypto.randomUUID(),
        senderId: ME,
        sentAt: clock(),
        body: src
          ? { kind: "image", src, alt: file.name }
          : { kind: "file", name: file.name, size: formatFileSize(file.size) },
      }
    })
    if (text) {
      sent.push({
        id: crypto.randomUUID(),
        senderId: ME,
        sentAt: clock(),
        body: { kind: "text", text },
      })
    }
    for (const message of sent) dispatch({ type: "send", id, message })

    const target = state.conversations.find((entry) => entry.id === id)
    const replies = SAMPLE_REPLIES[id] ?? []
    if (sent.length === 0 || target?.isBlocked || replies.length === 0) return
    const turn = replyTurns.current[id] ?? 0
    replyTurns.current[id] = turn + 1
    const reply = replies[turn % replies.length]
    later(READ_AFTER, () => dispatch({ type: "read", id, at: clock() }))
    later(TYPING_AFTER, () =>
      dispatch({ type: "typing", id, personId: reply.senderId })
    )
    later(REPLY_AFTER, () =>
      dispatch({
        type: "receive",
        id,
        message: {
          id: crypto.randomUUID(),
          senderId: reply.senderId,
          sentAt: clock(),
          body: { kind: "text", text: reply.text },
        },
      })
    )
  }

  const open = (id: string) => {
    dispatch({ type: "open", id })
    // Where the list covers the conversation, opening one steps it aside.
    if (list.isFloating) list.setOpen(false)
  }

  const unblock = () =>
    dispatch({ type: "block", id: conversation.id, isBlocked: false })

  const contactName =
    conversation.kind === "direct"
      ? conversation.title.split(" ")[0]
      : conversation.title

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarContent>
          <AppNav groups={getNavGroups(unread)} pathname="/messages" />
        </SidebarContent>
        <SidebarFooter>
          <UserMenu user={ME_PERSON}>
            <DropdownMenuGroup>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Notifications</DropdownMenuItem>
            </DropdownMenuGroup>
          </UserMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <AppShellPanel
        id="conversations"
        side="left"
        label="Conversations"
        defaultOpen
        defaultWidth={340}
        minWidth={280}
        maxWidth={440}
        mobile="swap"
      >
        <AppShellPanelHeader className="gap-(--density-4)">
          <SidebarTrigger />
          <AppShellPanelTitle>Messages</AppShellPanelTitle>
          <MessengerIconButton
            label="New message"
            onClick={() => searchRef.current?.focus()}
          >
            <IconPlaceholder
              lucide="SquarePenIcon"
              tabler="IconEdit"
              hugeicons="PencilEdit02Icon"
              phosphor="NotePencilIcon"
              remixicon="RiEditBoxLine"
            />
          </MessengerIconButton>
          {/* A sheet keeps its close button; on a phone, picking a
              conversation is the way out. */}
          {isListFloating && size !== "phone" && <AppShellPanelClose />}
        </AppShellPanelHeader>
        <form
          role="search"
          className="shrink-0 px-(--density-12) pb-(--density-12)"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search
            ref={searchRef}
            collapsible={false}
            width="100%"
            label="Search conversations"
            placeholder="Search or start a chat"
            value={query}
            onValueChange={setQuery}
          />
        </form>
        <AppShellPanelContent>
          <MessengerConversationList
            conversations={visible}
            people={PEOPLE}
            openId={state.openId}
            typing={state.typing}
            query={query}
            now={NOW}
            timeFormat={TIME_FORMAT}
            onSelect={(id) => dispatch({ type: "open", id })}
            onOpen={open}
            onClearQuery={() => setQuery("")}
          />
        </AppShellPanelContent>
      </AppShellPanel>

      <AppShellMain>
        <MessengerConversationHeader
          conversation={conversation}
          people={PEOPLE}
          now={NOW}
          timeFormat={TIME_FORMAT}
          // Where the list floats, or was closed, a button brings it back.
          canShowList={list.isFloating || !list.open}
          onShowList={() => list.setOpen(true)}
          // Start a call with your calling service.
          onCall={() => {}}
          onShowDetails={() => details.setOpen(true)}
          onToggleMute={() =>
            dispatch({
              type: "mute",
              id: conversation.id,
              isMuted: !conversation.isMuted,
            })
          }
          onBlock={() => setBlockOpen(true)}
        />
        {/* The transcript scrolls in its own viewport above the composer. */}
        <AppShellContent className="flex flex-col overflow-hidden">
          <MessengerTranscript
            key={conversation.id}
            conversation={conversation}
            people={PEOPLE}
            typingId={state.typing[conversation.id]}
            now={NOW}
            timeFormat={TIME_FORMAT}
          />
          {conversation.isBlocked ? (
            <div className="flex shrink-0 flex-col items-center gap-(--density-8) px-(--density-16) pt-(--density-8) pb-(--density-24) text-center">
              <p className="text-(length:--density-text-13) text-muted-foreground">
                You blocked {contactName}. They can&apos;t message or call you.
              </p>
              <Button variant="outline" size="sm" onClick={unblock}>
                Unblock {contactName}
              </Button>
            </div>
          ) : (
            <MessengerComposer
              key={`composer-${conversation.id}`}
              recipient={contactName}
              draft={state.drafts[conversation.id] ?? ""}
              onDraftChange={(text) =>
                dispatch({ type: "draft", id: conversation.id, text })
              }
              onSend={(text, files) => send(conversation.id, text, files)}
            />
          )}
        </AppShellContent>
      </AppShellMain>

      <AppShellPanel id="details" label="Details" defaultWidth={320}>
        <MessengerDetails
          conversation={conversation}
          people={PEOPLE}
          now={NOW}
          timeFormat={TIME_FORMAT}
          onMutedChange={(isMuted) =>
            dispatch({ type: "mute", id: conversation.id, isMuted })
          }
          onBlock={() => setBlockOpen(true)}
          onUnblock={unblock}
        />
      </AppShellPanel>

      <MessengerBlockDialog
        name={conversation.title}
        open={isBlockOpen}
        onOpenChange={setBlockOpen}
        onConfirm={() =>
          dispatch({ type: "block", id: conversation.id, isBlocked: true })
        }
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
