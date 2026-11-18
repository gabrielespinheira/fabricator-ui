"use client"

import * as React from "react"
import { FileTypeIcon } from "@fabricator-ui/icons/files"

import { AssistantToolCall } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-tool-call"
import {
  type AssistantMessage as AssistantMessageData,
  type AssistantPart,
  type AssistantReply,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/registry/bases/__base__/ui/attachment"
import { Bubble, BubbleContent } from "@/registry/bases/__base__/ui/bubble"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Markdown } from "@/registry/bases/__base__/ui/markdown"
import { Marker, MarkerContent } from "@/registry/bases/__base__/ui/marker"
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/registry/bases/__base__/ui/message"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const COPIED_MS = 2000

function getReplyText(reply: AssistantReply) {
  return reply.parts
    .flatMap((part) => (part.type === "text" ? [part.text.trim()] : []))
    .join("\n\n")
}

function CopyReplyButton({ text }: { text: string }) {
  const [isCopied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!isCopied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [isCopied])

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isCopied ? "Copied" : "Copy reply"}
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
      }}
    >
      {isCopied ? (
        <IconPlaceholder
          lucide="CheckIcon"
          tabler="IconCheck"
          hugeicons="Tick02Icon"
          phosphor="CheckIcon"
          remixicon="RiCheckLine"
        />
      ) : (
        <IconPlaceholder
          lucide="CopyIcon"
          tabler="IconCopy"
          hugeicons="Copy01Icon"
          phosphor="CopyIcon"
          remixicon="RiFileCopyLine"
        />
      )}
    </Button>
  )
}

/** Consecutive tool calls sit together; text between them is a document. */
function groupParts(parts: AssistantPart[]) {
  const groups: Array<
    | {
        type: "tools"
        key: string
        parts: Extract<AssistantPart, { type: "tool" }>[]
      }
    | { type: "text"; key: string; text: string }
  > = []
  parts.forEach((part, index) => {
    const last = groups.at(-1)
    if (part.type === "text") {
      groups.push({ type: "text", key: `text-${index}`, text: part.text })
      return
    }
    if (last?.type === "tools") {
      last.parts.push(part)
      return
    }
    groups.push({ type: "tools", key: part.tool.id, parts: [part] })
  })
  return groups
}

function AssistantReplyMessage({ reply }: { reply: AssistantReply }) {
  const isThinking = reply.status === "thinking"
  return (
    <Message>
      <MessageContent className="w-full gap-(--density-12)">
        {groupParts(reply.parts).map((group) =>
          group.type === "tools" ? (
            <div key={group.key} className="flex flex-col items-start">
              {group.parts.map(({ tool }) => (
                <AssistantToolCall key={tool.id} tool={tool} />
              ))}
            </div>
          ) : (
            <Bubble key={group.key} variant="ghost">
              <BubbleContent>
                <Markdown size="sm">{group.text}</Markdown>
              </BubbleContent>
            </Bubble>
          )
        )}
        {isThinking && (
          <span
            role="status"
            className="h-(--density-28) shimmer text-(length:--density-text-13) leading-(--density-28)"
          >
            Thinking…
          </span>
        )}
        {reply.status === "stopped" && (
          <Marker role="status" className="text-muted-foreground">
            <MarkerContent>You stopped this reply.</MarkerContent>
          </Marker>
        )}
        {reply.status === "done" && (
          <MessageFooter className="-ms-(--density-8)">
            <CopyReplyButton text={getReplyText(reply)} />
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

export function AssistantMessage({
  message,
}: {
  message: AssistantMessageData
}) {
  if (message.role === "assistant") {
    return <AssistantReplyMessage reply={message} />
  }

  return (
    <Message align="end">
      <MessageContent className="items-end">
        {message.attachments.map((attachment) => (
          <Attachment key={attachment.name} size="sm">
            <AttachmentMedia>
              <FileTypeIcon name={attachment.name} className="size-5" />
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachment.name}</AttachmentTitle>
              <AttachmentDescription>{attachment.size}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ))}
        {message.text && (
          <Bubble align="end">
            <BubbleContent className="whitespace-pre-wrap">
              {message.text}
            </BubbleContent>
          </Bubble>
        )}
      </MessageContent>
    </Message>
  )
}
