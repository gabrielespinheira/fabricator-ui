"use client"

import { type AssistantChat } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** A chat in the search: its name, then the line the search found it by. */
export function AssistantSearchResult({
  chat,
  snippet,
}: {
  chat: AssistantChat
  snippet: string | null
}) {
  return (
    <>
      <IconPlaceholder
        lucide="MessageCircleIcon"
        tabler="IconMessageCircle"
        hugeicons="Message01Icon"
        phosphor="ChatCircleIcon"
        remixicon="RiChat1Line"
      />
      <span className="max-w-full shrink-0 truncate text-foreground">
        {chat.title}
      </span>
      {snippet && <span className="min-w-0 truncate">{snippet}</span>}
    </>
  )
}
