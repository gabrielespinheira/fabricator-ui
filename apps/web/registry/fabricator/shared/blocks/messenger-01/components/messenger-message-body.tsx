import { FileTypeIcon } from "@fabricator-ui/icons/files"

import {
  describeFile,
  formatDuration,
  type ChatMessage,
} from "@/registry/bases/__base__/blocks/messenger-01/lib/messenger-model"
import { AspectRatio } from "@/registry/bases/__base__/ui/aspect-ratio"
import {
  Attachment,
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

function Reactions({
  message,
  isMine,
}: {
  message: ChatMessage
  isMine: boolean
}) {
  const reactions = message.reactions ?? []
  if (reactions.length === 0) return null
  return (
    <BubbleReactions
      align={isMine ? "start" : "end"}
      role="img"
      aria-label={reactions.map((reaction) => reaction.label).join(", ")}
    >
      {reactions.map((reaction) => (
        <span key={reaction.emoji}>
          {reaction.emoji}
          {reaction.count > 1 && (
            <span className="ms-0.5 tabular-nums">{reaction.count}</span>
          )}
        </span>
      ))}
    </BubbleReactions>
  )
}

/**
 * One message's content: text and photos in a bubble, mine tinted at the end
 * edge; files as attachments and voice messages as a compact player.
 */
export function MessengerMessageBody({
  message,
  isMine,
  senderName,
}: {
  message: ChatMessage
  isMine: boolean
  senderName: string
}) {
  const { body } = message
  const align = isMine ? "end" : "start"
  const variant = isMine ? "tinted" : "secondary"
  // Reactions overlap the bubble's lower edge; the row below keeps clear.
  const hasReactions = (message.reactions?.length ?? 0) > 0

  if (body.kind === "file") {
    return (
      <Attachment className="w-72 max-w-full">
        <AttachmentMedia>
          <FileTypeIcon name={body.name} className="size-6" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>{body.name}</AttachmentTitle>
          <AttachmentDescription>
            {describeFile(body.name, body.size)}
          </AttachmentDescription>
        </AttachmentContent>
      </Attachment>
    )
  }

  if (body.kind === "voice") {
    return (
      <AudioPlayer
        variant="compact"
        src={body.src}
        peaks={body.peaks}
        title={`Voice message from ${senderName}, ${formatDuration(body.duration)}`}
        className="w-72 max-w-full"
      />
    )
  }

  if (body.kind === "image") {
    return (
      <Bubble
        variant={variant}
        align={align}
        className={hasReactions ? "mb-(--density-12)" : undefined}
      >
        <BubbleContent className="w-72 max-w-full p-(--density-4)">
          <AspectRatio ratio={4 / 3}>
            <img
              src={body.src}
              alt={body.alt}
              className="size-full rounded-md object-cover"
            />
          </AspectRatio>
          {body.caption && (
            <p className="px-(--density-10) pt-(--density-6) pb-(--density-4)">
              {body.caption}
            </p>
          )}
        </BubbleContent>
        <Reactions message={message} isMine={isMine} />
      </Bubble>
    )
  }

  return (
    <Bubble
      variant={variant}
      align={align}
      className={hasReactions ? "mb-(--density-12)" : undefined}
    >
      <BubbleContent>{body.text}</BubbleContent>
      <Reactions message={message} isMine={isMine} />
    </Bubble>
  )
}
