import { FileTypeIcon } from "@fabricator-ui/icons/files"
import { cn } from "cn"

import {
  describeBody,
  describeFile,
  describeReaction,
  formatDuration,
  ME,
  type ChatMessage,
  type Person,
  type RunPosition,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import { AspectRatio } from "@/registry/bases/__base__/ui/aspect-ratio"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/registry/bases/__base__/ui/attachment"
import { AudioPlayer } from "@/registry/bases/__base__/ui/audio-player"
import {
  Bubble,
  BubbleContent,
  BubbleReactions,
} from "@/registry/bases/__base__/ui/bubble"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export type Photo = { src: string; alt: string; caption?: string }

// The corners a bubble shares with its neighbours in the run are tighter, on
// the side the run hangs from.
const JOINED_CORNERS: Record<RunPosition, { mine: string; theirs: string }> = {
  only: { mine: "", theirs: "" },
  first: { mine: "rounded-ee-sm", theirs: "rounded-es-sm" },
  middle: {
    mine: "rounded-ee-sm rounded-se-sm",
    theirs: "rounded-es-sm rounded-ss-sm",
  },
  last: { mine: "rounded-se-sm", theirs: "rounded-ss-sm" },
}

// Files and voice messages are drawn on the bubble's own fill. Their captions
// are muted text, which is too faint on a wash.
const MEDIA =
  "w-72 p-0 [--muted-foreground:color-mix(in_oklab,var(--foreground)_70%,transparent)]"

function Reactions({
  message,
  people,
  isMine,
  onReact,
}: {
  message: ChatMessage
  people: Person[]
  isMine: boolean
  onReact: (emoji: string) => void
}) {
  const reactions = message.reactions ?? []
  if (reactions.length === 0) return null
  return (
    <BubbleReactions
      align={isMine ? "start" : "end"}
      className="has-[button]:p-0"
    >
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="xs"
          aria-pressed={reaction.personIds.includes(ME)}
          onClick={() => onReact(reaction.emoji)}
          className="rounded-full text-foreground"
        >
          <span className="sr-only">{describeReaction(reaction, people)}</span>
          <span aria-hidden>{reaction.emoji}</span>
          {reaction.personIds.length > 1 && (
            <span aria-hidden className="tabular-nums">
              {reaction.personIds.length}
            </span>
          )}
        </Button>
      ))}
    </BubbleReactions>
  )
}

function Quote({
  original,
  people,
  onShow,
}: {
  original: ChatMessage | undefined
  people: Person[]
  onShow: (id: string) => void
}) {
  if (!original) {
    return (
      <p className="-mx-(--density-6) mb-(--density-6) rounded-lg bg-hover px-(--density-8) py-(--density-6) text-(length:--density-text-12) text-foreground/70">
        This message was deleted
      </p>
    )
  }
  const author = people.find((person) => person.id === original.senderId)
  return (
    <button
      type="button"
      onClick={() => onShow(original.id)}
      className="-mx-(--density-6) mb-(--density-6) flex w-[calc(100%+var(--density-12))] cursor-pointer flex-col rounded-lg bg-hover px-(--density-8) py-(--density-6) text-start text-(length:--density-text-12) outline-none hover:bg-active focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="sr-only">Show the message this answers:</span>
      <span className="font-medium">
        {original.senderId === ME ? "You" : (author?.name ?? "Someone")}
      </span>
      <span className="line-clamp-1 text-foreground/70">
        {describeBody(original.body)}
      </span>
    </button>
  )
}

function FileBody({
  name,
  size,
  onDownload,
}: {
  name: string
  size: string
  onDownload: () => void
}) {
  return (
    <Attachment className="w-full border-0 bg-transparent shadow-none dark:shadow-none">
      <AttachmentMedia>
        <FileTypeIcon name={name} className="size-6" />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle className="whitespace-normal">{name}</AttachmentTitle>
        <AttachmentDescription>
          {describeFile(name, size)}
        </AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction
          size="icon-sm"
          aria-label={`Download ${name}`}
          onClick={onDownload}
        >
          <IconPlaceholder
            lucide="DownloadIcon"
            tabler="IconDownload"
            hugeicons="Download01Icon"
            phosphor="DownloadIcon"
            remixicon="RiDownloadLine"
          />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  )
}

function PhotoBody({
  photo,
  onOpen,
}: {
  photo: Photo
  onOpen: (photo: Photo) => void
}) {
  return (
    <>
      <button
        type="button"
        aria-label={`Open photo: ${photo.alt}`}
        onClick={() => onOpen(photo)}
        className="relative block w-full cursor-pointer outline-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
      >
        <AspectRatio ratio={4 / 3}>
          <img src={photo.src} alt="" className="size-full object-cover" />
        </AspectRatio>
      </button>
      {photo.caption && (
        <p className="px-(--density-14) py-(--density-8)">{photo.caption}</p>
      )}
    </>
  )
}

/**
 * One message's content in a bubble, mine tinted at the end edge: text, a
 * photo to its edges, a file or a voice message. `children` sit beside it.
 */
export function MessengerMessageBody({
  message,
  original,
  people,
  position,
  senderName,
  onReact,
  onOpenPhoto,
  onDownload,
  onShowOriginal,
  children,
}: {
  message: ChatMessage
  /** The message this one answers, while it is still there. */
  original: ChatMessage | undefined
  people: Person[]
  position: RunPosition
  senderName: string
  onReact: (emoji: string) => void
  onOpenPhoto: (photo: Photo) => void
  onDownload: (name: string) => void
  onShowOriginal: (id: string) => void
  children?: React.ReactNode
}) {
  const { body } = message
  const isMine = message.senderId === ME
  const hasReactions = (message.reactions?.length ?? 0) > 0
  const shape = cn(
    "rounded-xl",
    JOINED_CORNERS[position][isMine ? "mine" : "theirs"]
  )

  return (
    <Bubble
      variant={isMine ? "tinted" : "muted"}
      align={isMine ? "end" : "start"}
      // Room beside it for the actions. Reactions hang below the bubble, so
      // it also keeps clear of the time and the next message.
      className={cn(
        "@xl/transcript:max-w-[min(calc(100%-var(--spacing)*32),var(--spacing)*120)]",
        hasReactions && "mb-(--density-20)"
      )}
    >
      {body.kind === "text" && (
        <BubbleContent className={shape}>
          {message.replyToId && (
            <Quote
              original={original}
              people={people}
              onShow={onShowOriginal}
            />
          )}
          {body.text}
        </BubbleContent>
      )}
      {body.kind === "image" && (
        <BubbleContent className={cn("w-80 border-0 p-0", shape)}>
          <PhotoBody photo={body} onOpen={onOpenPhoto} />
        </BubbleContent>
      )}
      {body.kind === "file" && (
        <BubbleContent className={cn(MEDIA, shape)}>
          <FileBody
            name={body.name}
            size={body.size}
            onDownload={() => onDownload(body.name)}
          />
        </BubbleContent>
      )}
      {body.kind === "voice" && (
        <BubbleContent className={cn(MEDIA, shape)}>
          <AudioPlayer
            variant="compact"
            src={body.src}
            peaks={body.peaks}
            title={`Voice message from ${senderName}, ${formatDuration(body.duration)}`}
            className="bg-transparent shadow-none data-[variant=compact]:rounded-none"
          />
        </BubbleContent>
      )}
      <Reactions
        message={message}
        people={people}
        isMine={isMine}
        onReact={onReact}
      />
      {children}
    </Bubble>
  )
}
