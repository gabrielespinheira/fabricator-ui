import { cn } from "cn"

import {
  type Conversation,
  type Person,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

function Face({
  name,
  src,
  className,
}: {
  name: string
  src?: string
  className: string
}) {
  return (
    <Avatar
      size="sm"
      className={cn("absolute size-(--messenger-face)", className)}
    >
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="text-foreground/70">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

/** A group without a picture of its own: two of the people in it. */
export function MessengerGroupAvatar({
  members,
  size = "default",
}: {
  members: Person[]
  size?: "default" | "lg"
}) {
  const [front, back] = members
  return (
    <span
      data-size={size}
      className="relative size-(--messenger-avatar) shrink-0 [--messenger-avatar:var(--density-32)] [--messenger-face:calc(var(--messenger-avatar)*0.68)] data-[size=lg]:[--messenger-avatar:var(--density-40)]"
    >
      {back && (
        <Face
          name={back.name}
          src={back.avatar}
          className="start-0 top-0 mask-[radial-gradient(circle_at_calc(var(--messenger-avatar)-var(--messenger-face)/2)_calc(var(--messenger-avatar)-var(--messenger-face)/2),transparent_calc(var(--messenger-face)/2+var(--density-2)),black_calc(var(--messenger-face)/2+var(--density-2)+0.5px))]"
        />
      )}
      {front && (
        <Face name={front.name} src={front.avatar} className="end-0 bottom-0" />
      )}
    </span>
  )
}

/**
 * A person or a group: their picture, or initials, and a dot while online.
 * The dot sits in a hole cut from the picture, so the gap around it is always
 * the surface behind: a row at rest, under the pointer or selected.
 */
export function MessengerAvatar({
  name,
  src,
  isOnline = false,
  size = "default",
  className,
}: {
  name: string
  src?: string
  isOnline?: boolean
  size?: "sm" | "default" | "lg"
  className?: string
}) {
  return (
    <span
      data-size={size}
      className="relative inline-flex shrink-0 [--messenger-dot:var(--density-10)] data-[size=sm]:[--messenger-dot:var(--density-8)]"
    >
      <Avatar
        size={size}
        className={cn(
          isOnline &&
            "mask-[radial-gradient(circle_at_calc(100%-var(--messenger-dot)/2)_calc(100%-var(--messenger-dot)/2),transparent_calc(var(--messenger-dot)/2+var(--density-2)),black_calc(var(--messenger-dot)/2+var(--density-2)+0.5px))]",
          className
        )}
      >
        {src && <AvatarImage src={src} alt="" />}
        <AvatarFallback className="text-foreground/70">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {isOnline && (
        <AvatarBadge
          role="img"
          aria-label="Online"
          className="size-(--messenger-dot) bg-success ring-0"
        />
      )}
    </span>
  )
}

/** Who a conversation is with. */
export function MessengerConversationAvatar({
  conversation,
  members,
  size,
  showsPresence = false,
}: {
  conversation: Conversation
  members: Person[]
  size?: "default" | "lg"
  showsPresence?: boolean
}) {
  const contact = conversation.kind === "direct" ? members[0] : undefined
  const src = conversation.avatar ?? contact?.avatar
  if (!contact && !src)
    return <MessengerGroupAvatar members={members} size={size} />
  return (
    <MessengerAvatar
      name={conversation.title}
      src={src}
      isOnline={showsPresence && contact?.presence.kind === "online"}
      size={size}
    />
  )
}
