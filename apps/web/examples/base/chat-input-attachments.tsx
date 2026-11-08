"use client"

import * as React from "react"
import { FileTextIcon, PaperclipIcon, XIcon } from "lucide-react"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/styles/base-fabricator/ui/attachment"
import {
  ChatInput,
  ChatInputActions,
  ChatInputButton,
  ChatInputFooter,
  ChatInputHeader,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
} from "@/styles/base-fabricator/ui/chat-input"

type Picked = { id: string; file: File; url: string | null }

export function ChatInputAttachments() {
  const [picked, setPicked] = React.useState<Picked[]>([])
  const pickerRef = React.useRef<HTMLInputElement>(null)

  const addFiles = (files: File[]) =>
    setPicked((current) => [
      ...current,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    ])

  const removeFile = (id: string) =>
    setPicked((current) => {
      const removed = current.find((entry) => entry.id === id)
      if (removed?.url) URL.revokeObjectURL(removed.url)
      return current.filter((entry) => entry.id !== id)
    })

  return (
    <div className="mx-auto w-full max-w-xl">
      <ChatInput
        hasContent={picked.length > 0}
        onSubmit={() => {
          for (const entry of picked)
            if (entry.url) URL.revokeObjectURL(entry.url)
          setPicked([])
        }}
      >
        {picked.length > 0 && (
          <ChatInputHeader>
            {picked.map(({ id, file, url }) => (
              <Attachment key={id} size="sm" className="max-w-56">
                <AttachmentMedia variant={url ? "image" : "icon"}>
                  {url ? <img src={url} alt="" /> : <FileTextIcon />}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle className="truncate">
                    {file.name || "Pasted image"}
                  </AttachmentTitle>
                  <AttachmentDescription>
                    {Math.max(1, Math.round(file.size / 1024))} KB
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label={`Remove ${file.name || "pasted image"}`}
                    onClick={() => removeFile(id)}
                  >
                    <XIcon />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            ))}
          </ChatInputHeader>
        )}
        <ChatInputTextarea
          placeholder="Paste an image or attach a file…"
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files)
            if (files.length === 0) return
            event.preventDefault()
            addFiles(files)
          }}
        />
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
                addFiles(Array.from(event.target.files ?? []))
                event.target.value = ""
              }}
            />
          </ChatInputTools>
          <ChatInputActions>
            <ChatInputSubmit />
          </ChatInputActions>
        </ChatInputFooter>
      </ChatInput>
    </div>
  )
}
