"use client"

import { MessengerAvatar } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-avatar"
import {
  MessengerConversationMenu,
  MessengerIconButton,
} from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
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

function getSubtitle(
  conversation: Conversation,
  people: Person[],
  now: number,
  timeFormat: TimeFormat
) {
  const members = conversation.memberIds.flatMap(
    (id) => people.find((person) => person.id === id) ?? []
  )
  if (conversation.kind === "group") {
    const names = members.map((person) => person.name.split(" ")[0])
    return `${names.join(", ")} and you`
  }
  const [contact] = members
  return contact ? formatPresence(contact.presence, now, timeFormat) : ""
}

/**
 * Who the conversation is with, calls, the conversation's menu and the
 * details panel. While the list isn't beside it (phones, narrow windows, or
 * closed) a button at the start leads back to it.
 */
export function MessengerConversationHeader({
  conversation,
  people,
  now,
  timeFormat,
  canShowList,
  onShowList,
  onCall,
  onShowDetails,
  onToggleMute,
  onBlock,
}: {
  conversation: Conversation
  people: Person[]
  now: number
  timeFormat: TimeFormat
  canShowList: boolean
  onShowList: () => void
  onCall: (kind: "voice" | "video") => void
  onShowDetails: () => void
  onToggleMute: () => void
  onBlock: () => void
}) {
  const contact =
    conversation.kind === "direct"
      ? people.find((person) => person.id === conversation.memberIds[0])
      : undefined
  const isOnline = contact?.presence.kind === "online"

  return (
    <AppShellHeader trigger="never" className="gap-(--density-8)">
      {canShowList && (
        <MessengerIconButton
          label="Conversations"
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
        <MessengerAvatar
          name={conversation.title}
          src={conversation.avatar ?? contact?.avatar}
        />
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-(length:--density-text-13) font-semibold">
            {conversation.title}
          </h1>
          <p className="flex min-w-0 items-center gap-(--density-6) text-(length:--density-text-12) text-muted-foreground">
            {isOnline && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-success"
              />
            )}
            <span className="truncate">
              {getSubtitle(conversation, people, now, timeFormat)}
            </span>
          </p>
        </div>
      </div>
      <AppShellHeaderActions
        actions={[
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
            onSelect: () => onCall("voice"),
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
            onSelect: () => onCall("video"),
          },
        ]}
        menuLabel="Conversation options"
        menu={
          <MessengerConversationMenu
            isMuted={conversation.isMuted}
            canBlock={conversation.kind === "direct" && !conversation.isBlocked}
            onShowDetails={onShowDetails}
            onToggleMute={onToggleMute}
            onBlock={onBlock}
          />
        }
      />
      <AppShellPanelTrigger panel="details" />
    </AppShellHeader>
  )
}
