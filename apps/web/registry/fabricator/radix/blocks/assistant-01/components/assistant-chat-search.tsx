"use client"

import * as React from "react"

import { AssistantSearchResult } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-search-result"
import {
  searchAssistantChats,
  type AssistantChat,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/bases/radix/ui/command"

// Finds a chat by its title or by what was said in it. The model filters, so
// the command menu doesn't. React Aria's menu is a collection, so each base
// has a copy of this file.

export type AssistantChatSearchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  chats: AssistantChat[]
  onSelect: (chatId: string) => void
}

function ChatSearchDialog({
  onOpenChange,
  chats,
  onSelect,
}: Omit<AssistantChatSearchProps, "open">) {
  const [query, setQuery] = React.useState("")
  const results = searchAssistantChats(chats, query)

  // Radix hands focus back to a dialog's own trigger only; this one opens from
  // a shortcut or the sidebar.
  React.useLayoutEffect(() => {
    const origin = document.activeElement
    return () => {
      setTimeout(() => {
        const isLost = document.activeElement === document.body
        if (isLost && origin instanceof HTMLElement) origin.focus()
      })
    }
  }, [])

  return (
    <CommandDialog
      open
      onOpenChange={onOpenChange}
      title="Search chats"
      description="Find a chat by its name or by what was said in it."
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false} label="Search chats">
        <CommandInput
          placeholder="Search chats"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No chats with “{query.trim()}”.</CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading={query.trim() ? "Results" : "Recent"}>
              {results.map(({ chat, snippet }) => (
                <CommandItem
                  key={chat.id}
                  value={chat.id}
                  onSelect={() => {
                    onSelect(chat.id)
                    onOpenChange(false)
                  }}
                >
                  <AssistantSearchResult chat={chat} snippet={snippet} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

/** Mounted only while open: the dialog starts over, and leaves no hidden title behind. */
export function AssistantChatSearch({
  open,
  ...props
}: AssistantChatSearchProps) {
  return open ? <ChatSearchDialog {...props} /> : null
}
