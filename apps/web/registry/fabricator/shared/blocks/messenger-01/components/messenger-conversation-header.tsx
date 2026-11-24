"use client"

import { MessengerConversationAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import {
  MessengerIconButton,
  MessengerMenuItems,
  type MessengerMenuEntry,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import { WarningIcon } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  formatPresence,
  type Conversation,
  type Person,
  type TimeFormat,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  AppShellHeader,
  AppShellHeaderActions,
  AppShellPanelTrigger,
} from "@/registry/bases/__base__/ui/app-shell"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** What the conversation's menu does. */
export type ConversationHandlers = {
  onCall: (kind: "voice" | "video") => void
  onShowDetails: () => void
  onTogglePin: () => void
  onToggleMute: () => void
  onBlock: () => void
  onUnblock: () => void
  onReport: () => void
}

const blockIcon = (
  <IconPlaceholder
    lucide="BanIcon"
    tabler="IconBan"
    hugeicons="UnavailableIcon"
    phosphor="ProhibitIcon"
    remixicon="RiForbidLine"
  />
)

function getMenu(
  conversation: Conversation,
  handlers: ConversationHandlers
): MessengerMenuEntry[][] {
  const { isPinned, isMuted, isBlocked, kind } = conversation
  const options: MessengerMenuEntry[] = [
    {
      id: "details",
      label: "Details",
      icon: (
        <IconPlaceholder
          lucide="InfoIcon"
          tabler="IconInfoCircle"
          hugeicons="InformationCircleIcon"
          phosphor="InfoIcon"
          remixicon="RiInformationLine"
        />
      ),
      onSelect: handlers.onShowDetails,
    },
    {
      id: "pin",
      label: isPinned ? "Unpin" : "Pin to top",
      icon: isPinned ? (
        <IconPlaceholder
          lucide="PinOffIcon"
          tabler="IconPinnedOff"
          hugeicons="PinOffIcon"
          phosphor="PushPinSlashIcon"
          remixicon="RiUnpinLine"
        />
      ) : (
        <IconPlaceholder
          lucide="PinIcon"
          tabler="IconPin"
          hugeicons="PinIcon"
          phosphor="PushPinIcon"
          remixicon="RiPushpinLine"
        />
      ),
      onSelect: handlers.onTogglePin,
    },
    {
      id: "mute",
      label: isMuted ? "Unmute" : "Mute",
      icon: isMuted ? (
        <IconPlaceholder
          lucide="BellIcon"
          tabler="IconBell"
          hugeicons="Notification01Icon"
          phosphor="BellIcon"
          remixicon="RiNotification3Line"
        />
      ) : (
        <IconPlaceholder
          lucide="BellOffIcon"
          tabler="IconBellOff"
          hugeicons="NotificationOff01Icon"
          phosphor="BellSlashIcon"
          remixicon="RiNotificationOffLine"
        />
      ),
      onSelect: handlers.onToggleMute,
    },
  ]
  if (kind === "group") return [options]
  return [
    options,
    [
      isBlocked
        ? {
            id: "unblock",
            label: "Unblock",
            icon: blockIcon,
            onSelect: handlers.onUnblock,
          }
        : {
            id: "block",
            label: "Block…",
            icon: blockIcon,
            isDestructive: true,
            onSelect: handlers.onBlock,
          },
      {
        id: "report",
        label: "Report…",
        icon: <WarningIcon />,
        isDestructive: true,
        onSelect: handlers.onReport,
      },
    ],
  ]
}

function getCalls(handlers: ConversationHandlers) {
  return [
    {
      id: "voice-call",
      label: "Voice call",
      icon: (
        <IconPlaceholder
          lucide="PhoneIcon"
          tabler="IconPhone"
          hugeicons="Call02Icon"
          phosphor="PhoneIcon"
          remixicon="RiPhoneLine"
        />
      ),
      onSelect: () => handlers.onCall("voice"),
    },
    {
      id: "video-call",
      label: "Video call",
      icon: (
        <IconPlaceholder
          lucide="VideoIcon"
          tabler="IconVideo"
          hugeicons="Video01Icon"
          phosphor="VideoCameraIcon"
          remixicon="RiVidiconLine"
        />
      ),
      onSelect: () => handlers.onCall("video"),
    },
  ]
}

function Subtitle({
  conversation,
  members,
  now,
  timeFormat,
}: {
  conversation: Conversation
  members: Person[]
  now: number
  timeFormat: TimeFormat
}) {
  if (conversation.kind === "direct") {
    const [contact] = members
    if (!contact) return null
    return (
      <>
        {contact.presence.kind === "online" && (
          <span
            aria-hidden
            className="size-(--density-6) shrink-0 rounded-full bg-success"
          />
        )}
        <span className="truncate">
          {formatPresence(contact.presence, now, timeFormat)}
        </span>
      </>
    )
  }
  const names = members.map((person) => person.name.split(" ")[0]).join(", ")
  return (
    <>
      <span className="truncate @max-[48rem]/app-shell:hidden">
        {names} and you
      </span>
      <span className="@min-[48rem]/app-shell:hidden">
        {members.length + 1} people
      </span>
    </>
  )
}

/**
 * Who the conversation is with, calls, the conversation's menu and the
 * details panel. While the list isn't beside it (phones, narrow windows, or
 * closed) a button at the start leads back to it.
 */
export function MessengerConversationHeader({
  conversation,
  members,
  now,
  timeFormat,
  canShowList,
  onShowList,
  handlers,
}: {
  conversation: Conversation
  members: Person[]
  now: number
  timeFormat: TimeFormat
  canShowList: boolean
  onShowList: () => void
  handlers: ConversationHandlers
}) {
  return (
    <AppShellHeader trigger="never">
      {canShowList && (
        <MessengerIconButton
          label="Back to conversations"
          onClick={onShowList}
          className="-ms-(--density-4)"
        >
          <IconPlaceholder
            lucide="ChevronLeftIcon"
            tabler="IconChevronLeft"
            hugeicons="ArrowLeft01Icon"
            phosphor="CaretLeftIcon"
            remixicon="RiArrowLeftSLine"
          />
        </MessengerIconButton>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-(--density-10)">
        <MessengerConversationAvatar
          conversation={conversation}
          members={members}
        />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-(length:--density-text-13) weight-semibold">
            {conversation.title}
          </h1>
          <p className="flex min-w-0 items-center gap-(--density-6) text-(length:--density-text-12) text-muted-foreground">
            <Subtitle
              conversation={conversation}
              members={members}
              now={now}
              timeFormat={timeFormat}
            />
          </p>
        </div>
      </div>
      <AppShellHeaderActions
        actions={conversation.isBlocked ? [] : getCalls(handlers)}
        menuLabel="Conversation options"
        menu={<MessengerMenuItems groups={getMenu(conversation, handlers)} />}
      />
      <AppShellPanelTrigger panel="details" />
    </AppShellHeader>
  )
}
