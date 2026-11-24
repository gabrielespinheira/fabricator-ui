"use client"

import * as React from "react"
import { cn } from "cn"

import { AssistantIconButton } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-controls"
import { AssistantSources } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-sources"
import { useAssistantCopy } from "@/registry/bases/__base__/blocks/assistant-01/hooks/use-assistant-copy"
import {
  getReplySources,
  getReplyText,
  type AssistantRating,
  type AssistantReply,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import { MessageFooter } from "@/registry/bases/__base__/ui/message"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// What a person does with a reply: check its sources, copy it, ask again, say
// whether it helped. Sources always show; the actions rest on the last reply
// and come with the pointer or the focus on the ones above it.

export function AssistantReplyActions({
  reply,
  isLast,
  onRetry,
  onRate,
}: {
  reply: AssistantReply
  isLast: boolean
  onRetry: () => void
  onRate: (rating: AssistantRating) => void
}) {
  const { isCopied, copy } = useAssistantCopy()
  const text = getReplyText(reply)
  const isGood = reply.rating === "good"
  const isBad = reply.rating === "bad"

  return (
    <MessageFooter className="-ms-(--density-6) flex-wrap px-0">
      <AssistantSources sources={getReplySources(reply)} />
      <div
        className={cn(
          "flex items-center pointer-coarse:first:-ms-(--density-8)",
          !isLast &&
            "opacity-0 transition-opacity duration-feedback ease-feedback group-focus-within/message:opacity-100 group-hover/message:opacity-100 pointer-coarse:opacity-100"
        )}
      >
        {text && (
          <AssistantIconButton
            label={isCopied ? "Copied" : "Copy reply"}
            onClick={() => copy(text)}
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
          </AssistantIconButton>
        )}
        <AssistantIconButton label="Try again" onClick={onRetry}>
          <IconPlaceholder
            lucide="RotateCwIcon"
            tabler="IconRotateClockwise"
            hugeicons="RotateClockwiseIcon"
            phosphor="ArrowClockwiseIcon"
            remixicon="RiRestartLine"
          />
        </AssistantIconButton>
        {text && (
          <>
            <AssistantIconButton
              label="Good reply"
              isPressed={isGood}
              onClick={() => onRate("good")}
            >
              <IconPlaceholder
                lucide="ThumbsUpIcon"
                tabler="IconThumbUp"
                hugeicons="ThumbsUpIcon"
                phosphor="ThumbsUpIcon"
                remixicon="RiThumbUpLine"
              />
            </AssistantIconButton>
            <AssistantIconButton
              label="Bad reply"
              isPressed={isBad}
              onClick={() => onRate("bad")}
            >
              <IconPlaceholder
                lucide="ThumbsDownIcon"
                tabler="IconThumbDown"
                hugeicons="ThumbsDownIcon"
                phosphor="ThumbsDownIcon"
                remixicon="RiThumbDownLine"
              />
            </AssistantIconButton>
          </>
        )}
      </div>
    </MessageFooter>
  )
}
