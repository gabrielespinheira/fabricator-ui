"use client"

import { FileTypeIcon } from "@fabricator-ui/icons/files"

import { AssistantArtifactCard } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-artifact-card"
import { AssistantReplyActions } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-reply-actions"
import { AssistantSteps } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-steps"
import {
  groupReplyParts,
  isReplyRunning,
  type AssistantMessage as AssistantMessageData,
  type AssistantQuestion,
  type AssistantRating,
  type AssistantReply,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  Alert,
  AlertAction,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
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
import { Message, MessageContent } from "@/registry/bases/__base__/ui/message"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

export type AssistantReplyHandlers = {
  onRetry: (replyId: string) => void
  onRate: (replyId: string, rating: AssistantRating) => void
  onConnect: (replyId: string, stepId: string, service: string) => void
  onOpenArtifact: (artifactId: string) => void
}

function AssistantReplyMessage({
  reply,
  isLast,
  onRetry,
  onRate,
  onConnect,
  onOpenArtifact,
}: AssistantReplyHandlers & { reply: AssistantReply; isLast: boolean }) {
  const isRunning = isReplyRunning(reply)
  const groups = groupReplyParts(reply.parts)

  return (
    <Message>
      <MessageContent className="gap-(--density-12)">
        {groups.map((group, index) => {
          if (group.type === "steps") {
            const isLastGroup = index === groups.length - 1
            return (
              <AssistantSteps
                key={group.key}
                group={group}
                isLive={isRunning && (isLastGroup || group.isRunning)}
                onConnect={(stepId, service) =>
                  onConnect(reply.id, stepId, service)
                }
              />
            )
          }
          if (group.type === "artifact") {
            return (
              <AssistantArtifactCard
                key={group.key}
                artifact={group.artifact}
                onOpen={() => onOpenArtifact(group.artifact.id)}
              />
            )
          }
          return (
            <Bubble key={group.key} variant="ghost">
              {/* The ghost bubble's clear border would set the text a pixel
                  in from the steps and the actions. */}
              <BubbleContent className="border-0">
                <Markdown size="sm">{group.text}</Markdown>
              </BubbleContent>
            </Bubble>
          )
        })}
        {reply.status === "thinking" && (
          <span
            role="status"
            className="h-(--density-28) shimmer text-(length:--density-text-13) leading-(--density-28)"
          >
            Thinking…
          </span>
        )}
        {reply.status === "stopped" && (
          <Marker role="status">
            <MarkerContent>You stopped this reply.</MarkerContent>
          </Marker>
        )}
        {reply.status === "failed" && (
          <Alert variant="error">
            <IconPlaceholder
              lucide="CircleAlertIcon"
              tabler="IconAlertCircle"
              hugeicons="AlertCircleIcon"
              phosphor="WarningCircleIcon"
              remixicon="RiErrorWarningLine"
            />
            <AlertTitle>{reply.error}</AlertTitle>
            <AlertAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRetry(reply.id)}
              >
                Retry
              </Button>
            </AlertAction>
          </Alert>
        )}
        {(reply.status === "done" || reply.status === "stopped") && (
          <AssistantReplyActions
            reply={reply}
            isLast={isLast}
            onRetry={() => onRetry(reply.id)}
            onRate={(rating) => onRate(reply.id, rating)}
          />
        )}
      </MessageContent>
    </Message>
  )
}

function AssistantQuestionMessage({
  question,
}: {
  question: AssistantQuestion
}) {
  return (
    <Message align="end">
      <MessageContent className="items-end">
        {question.attachments.map((attachment) => (
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
        {question.text && (
          <Bubble align="end">
            <BubbleContent className="whitespace-pre-wrap">
              {question.text}
            </BubbleContent>
          </Bubble>
        )}
      </MessageContent>
    </Message>
  )
}

export function AssistantMessage({
  message,
  isLast,
  ...handlers
}: AssistantReplyHandlers & {
  message: AssistantMessageData
  isLast: boolean
}) {
  if (message.role === "user") {
    return <AssistantQuestionMessage question={message} />
  }
  return <AssistantReplyMessage reply={message} isLast={isLast} {...handlers} />
}
