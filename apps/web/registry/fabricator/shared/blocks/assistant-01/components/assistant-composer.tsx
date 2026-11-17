"use client"

import * as React from "react"

import { AssistantModelPicker } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-model-picker"
import {
  formatFileSize,
  type AssistantAttachment,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
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

export type AssistantModelSettings = {
  modelId: string
  effort: string | null
}

export function AssistantComposer({
  status,
  onSend,
  onStop,
  settings,
  onSettingsChange,
  placeholder,
  autoFocus,
}: {
  status: "ready" | "submitted" | "streaming"
  onSend: (text: string, attachments: AssistantAttachment[]) => void
  onStop: () => void
  settings: AssistantModelSettings
  onSettingsChange: (settings: AssistantModelSettings) => void
  placeholder: readonly string[]
  autoFocus?: boolean
}) {
  const files = useChatInputAttachments()
  const pickerRef = React.useRef<HTMLInputElement>(null)

  return (
    <ChatInput
      status={status}
      onStop={onStop}
      onAttach={files.attach}
      hasContent={files.hasContent}
      isUploading={files.isUploading}
      onSubmit={(text) => {
        onSend(
          text.trim(),
          files.attachments.map((entry) => ({
            name: entry.name,
            size: formatFileSize(entry.file?.size ?? 0),
          }))
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
      <ChatInputTextarea placeholder={placeholder} autoFocus={autoFocus} />
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
          <AssistantModelPicker
            modelId={settings.modelId}
            onModelChange={(modelId) =>
              onSettingsChange({ ...settings, modelId })
            }
            effort={settings.effort}
            onEffortChange={(effort) =>
              onSettingsChange({ ...settings, effort })
            }
          />
          <ChatInputSubmit />
        </ChatInputActions>
      </ChatInputFooter>
    </ChatInput>
  )
}
