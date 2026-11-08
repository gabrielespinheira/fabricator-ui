"use client"

import * as React from "react"
import { AtSignIcon, DollarSignIcon, HashIcon, SlashIcon } from "lucide-react"

import {
  ChatInput,
  ChatInputActions,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputButton,
  ChatInputFooter,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  useChatInputAttachments,
} from "@/styles/base-fabricator/ui/chat-input"

const SIGILS = [
  { sigil: "@", label: "Mention a file", icon: AtSignIcon },
  { sigil: "/", label: "Run a skill", icon: SlashIcon },
  { sigil: "$", label: "Use an artifact", icon: DollarSignIcon },
  { sigil: "#", label: "Link a card", icon: HashIcon },
]

export function ChatInputMentions() {
  const files = useChatInputAttachments()
  const [value, setValue] = React.useState(
    "Review @src/app.tsx with /code-review, then update #612 and $launch-brief"
  )

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        value={value}
        onValueChange={setValue}
        // Files dropped on the card or pasted into the field ride along.
        onAttach={files.attach}
        hasContent={files.hasContent}
        onSubmit={files.clear}
      >
        <ChatInputAttachments>
          {files.attachments.map((entry) => (
            <ChatInputAttachment
              key={entry.id}
              name={entry.name}
              src={entry.src}
              onRemove={() => files.remove(entry.id)}
            />
          ))}
        </ChatInputAttachments>
        <ChatInputTextarea mentions={["@", "/", "$", "#"]} />
        <ChatInputFooter>
          <ChatInputTools>
            {SIGILS.map((entry) => (
              <ChatInputButton
                key={entry.sigil}
                aria-label={entry.label}
                title={entry.label}
                onClick={() =>
                  setValue(
                    `${value}${value && !value.endsWith(" ") ? " " : ""}${entry.sigil}`
                  )
                }
              >
                <entry.icon />
              </ChatInputButton>
            ))}
          </ChatInputTools>
          <ChatInputActions>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
