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
} from "@/styles/aria-fabricator/ui/chat-input"

type Attached = {
  id: string
  name: string
  src?: string
  isUploading: boolean
}

const SAMPLES: Attached[] = [
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

const IMAGES: Attached[] = [
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

function useAttachments(initial: Attached[]) {
  const [attached, setAttached] = React.useState(initial)
  const timers = React.useRef<number[]>([])

  React.useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])

  const attach = (files: File[]) => {
    const added = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      src: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
      isUploading: true,
    }))
    setAttached((entries) => [...entries, ...added])
    // A stand-in for the upload: each file lands a moment later.
    for (const entry of added)
      timers.current.push(
        window.setTimeout(
          () =>
            setAttached((entries) =>
              entries.map((item) =>
                item.id === entry.id ? { ...item, isUploading: false } : item
              )
            ),
          1200
        )
      )
  }

  const remove = (id: string) =>
    setAttached((entries) => entries.filter((entry) => entry.id !== id))

  return { attached, attach, remove, clear: () => setAttached([]) }
}

function AttachmentInput({
  layout,
  initial,
}: {
  layout: "default" | "compact"
  initial: Attached[]
}) {
  const { attached, attach, remove, clear } = useAttachments(initial)
  const pickerRef = React.useRef<HTMLInputElement>(null)

  return (
    <ChatInput
      layout={layout}
      hasContent={attached.length > 0}
      isUploading={attached.some((entry) => entry.isUploading)}
      onAttach={attach}
      onSubmit={clear}
    >
      <ChatInputAttachments>
        {attached.map((entry) => (
          <ChatInputAttachment
            key={entry.id}
            name={entry.name}
            src={entry.src}
            isUploading={entry.isUploading}
            onRemove={() => remove(entry.id)}
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
              attach(Array.from(event.target.files ?? []))
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
      <AttachmentInput layout="default" initial={SAMPLES} />
      <AttachmentInput layout="compact" initial={IMAGES} />
    </div>
  )
}
