"use client"

import * as React from "react"
import { PaperclipIcon } from "lucide-react"

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
  type ChatInputAttached,
} from "@/styles/radix-fabricator/ui/chat-input"

const SAMPLES: ChatInputAttached[] = [
  {
    id: "desk",
    name: "workspace.png",
    src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=300&auto=format&fit=crop&q=80",
    isUploading: false,
  },
  {
    id: "brief",
    name: "launch-brief.pdf",
    isUploading: false,
  },
]

const IMAGES: ChatInputAttached[] = [
  {
    id: "desk",
    name: "workspace.png",
    src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=300&auto=format&fit=crop&q=80",
    isUploading: false,
  },
  {
    id: "studio",
    name: "studio.png",
    src: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300&auto=format&fit=crop&q=80",
    isUploading: false,
  },
]

// A stand-in for an upload: each file lands a moment later.
function upload() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 1200))
}

function AttachmentInput({
  layout,
  initial,
}: {
  layout: "default" | "large"
  initial: ChatInputAttached[]
}) {
  const files = useChatInputAttachments({ initial, upload })
  const pickerRef = React.useRef<HTMLInputElement>(null)

  return (
    <ChatInput
      layout={layout}
      hasContent={files.hasContent}
      isUploading={files.isUploading}
      onAttach={files.attach}
      onSubmit={files.clear}
    >
      <ChatInputAttachments>
        {files.attachments.map((entry) => (
          <ChatInputAttachment
            key={entry.id}
            name={entry.name}
            src={entry.src}
            isUploading={entry.isUploading}
            onRemove={() => files.remove(entry.id)}
          />
        ))}
      </ChatInputAttachments>
      <ChatInputTextarea placeholder="Drop, paste or attach files…" />
      <ChatInputFooter>
        <ChatInputTools>
          <ChatInputButton
            aria-label="Attach files"
            onClick={() => pickerRef.current?.click()}
          >
            <PaperclipIcon />
          </ChatInputButton>
          <input
            ref={pickerRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              files.attach(Array.from(event.target.files ?? []))
              event.target.value = ""
            }}
          />
        </ChatInputTools>
        <ChatInputActions>
          <ChatInputSubmit />
        </ChatInputActions>
      </ChatInputFooter>
    </ChatInput>
  )
}

export function ChatInputAttachmentsDemo() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <AttachmentInput layout="default" initial={IMAGES} />
      <AttachmentInput layout="large" initial={SAMPLES} />
    </div>
  )
}
