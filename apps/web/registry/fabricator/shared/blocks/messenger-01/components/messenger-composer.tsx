"use client"

import * as React from "react"

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
} from "@/registry/bases/__base__/ui/chat-input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/**
 * The composer docked under the transcript. The draft is the conversation's
 * own, so switching away and back keeps it; files ride along with the next
 * message.
 */
export function MessengerComposer({
  recipient,
  draft,
  onDraftChange,
  onSend,
}: {
  recipient: string
  draft: string
  onDraftChange: (text: string) => void
  onSend: (text: string, files: File[]) => void
}) {
  const files = useChatInputAttachments()
  const pickerRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 px-(--density-16) pb-(--density-16)">
      <ChatInput
        value={draft}
        onValueChange={onDraftChange}
        hasContent={files.hasContent}
        isUploading={files.isUploading}
        onAttach={files.attach}
        onSubmit={(text) => {
          onSend(
            text.trim(),
            files.attachments.flatMap((entry) => entry.file ?? [])
          )
          files.clear()
        }}
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
        <ChatInputTextarea placeholder={`Message ${recipient}`} />
        <ChatInputFooter>
          <ChatInputTools>
            <ChatInputButton
              aria-label="Attach files"
              onClick={() => pickerRef.current?.click()}
            >
              <IconPlaceholder
                lucide="PaperclipIcon"
                tabler="IconPaperclip"
                hugeicons="Attachment01Icon"
                phosphor="PaperclipIcon"
                remixicon="RiAttachment2"
              />
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
    </div>
  )
}
