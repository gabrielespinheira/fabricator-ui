"use client"

import * as React from "react"

import { MessengerIconButton } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-controls"
import { CloseIcon } from "@/registry/bases/__base__/blocks/messenger-01/components/messenger-icons"
import {
  ChatInput,
  ChatInputActions,
  ChatInputAttachment,
  ChatInputAttachments,
  ChatInputButton,
  ChatInputFooter,
  ChatInputHeader,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  useChatInputAttachments,
} from "@/registry/bases/__base__/ui/chat-input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/**
 * The composer docked under the transcript. The draft is the conversation's
 * own, so switching away and back keeps it; files ride along with the next
 * message, and a reply quotes what it answers above the field.
 */
export function MessengerComposer({
  recipient,
  isNew,
  draft,
  replyTo,
  onDraftChange,
  onCancelReply,
  onSend,
}: {
  recipient: string
  /** I just started this conversation, so writing comes next. */
  isNew: boolean
  draft: string
  replyTo: { id: string; author: string; text: string } | undefined
  onDraftChange: (text: string) => void
  onCancelReply: () => void
  onSend: (text: string, files: File[]) => void
}) {
  const files = useChatInputAttachments()
  const pickerRef = React.useRef<HTMLInputElement>(null)
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  const replyToId = replyTo?.id

  // Reply is chosen in a menu, which gives focus back to its trigger as it
  // closes; the field takes it after that.
  React.useEffect(() => {
    if (!replyToId) return
    const timer = window.setTimeout(() => fieldRef.current?.focus(), 200)
    return () => window.clearTimeout(timer)
  }, [replyToId])

  const attachments = (
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
  )

  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 px-(--density-16) pb-[max(var(--density-16),env(safe-area-inset-bottom))]">
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
        {replyTo ? (
          // The quote and the files share the pill's first row, so a reply
          // with files stacks them in one box.
          <div className="col-span-full row-start-1 flex min-w-0 flex-col">
            <ChatInputHeader className="flex-nowrap pe-(--density-8) pt-(--density-8)">
              <div className="flex min-w-0 flex-1 flex-col text-(length:--density-text-12)">
                <span className="font-medium">Reply to {replyTo.author}</span>
                <span className="truncate text-muted-foreground">
                  {replyTo.text}
                </span>
              </div>
              <MessengerIconButton label="Cancel reply" onClick={onCancelReply}>
                <CloseIcon />
              </MessengerIconButton>
            </ChatInputHeader>
            {attachments}
          </div>
        ) : (
          attachments
        )}
        <ChatInputTextarea
          ref={fieldRef}
          autoFocus={isNew}
          placeholder={`Message ${recipient}`}
          onKeyDown={(event) => {
            if (event.key === "Escape" && replyTo) onCancelReply()
          }}
        />
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
