"use client"

import * as React from "react"

import {
  AssistantChatDialogs,
  type AssistantChatDialog,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-chat-dialogs"
import { AssistantChatMenu } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-chat-menu"
import {
  AssistantComposer,
  type AssistantModelSettings,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-composer"
import { AssistantNewChat } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-new-chat"
import { AssistantSidebar } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-sidebar"
import { AssistantTranscript } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-transcript"
import { useAssistantChats } from "@/registry/bases/__base__/blocks/assistant-01/hooks/use-assistant-chats"
import {
  formatChatAsMarkdown,
  getChatInputStatus,
  toMarkdownFileName,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  ASSISTANT_CHATS,
  type AssistantChat,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chats"
import { DEFAULT_ASSISTANT_MODEL } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-models"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
} from "@/registry/bases/__base__/ui/app-shell"
import { MessageScrollerProvider } from "@/registry/bases/__base__/ui/message-scroller"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// An AI assistant: the person's chats in the sidebar, the conversation with
// its tool calls in the main column, and the composer docked under it. A new
// chat centres the composer under a greeting.

const PLACEHOLDER = ["Ask anything", "Drop a file to analyse it"]
const COPIED_MS = 2000

function downloadMarkdown(chat: AssistantChat) {
  const blob = new Blob([formatChatAsMarkdown(chat.title, chat.messages)], {
    type: "text/markdown",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = toMarkdownFileName(chat.title)
  link.click()
  URL.revokeObjectURL(url)
}

export default function AssistantPage() {
  const assistant = useAssistantChats(ASSISTANT_CHATS)
  const [settings, setSettings] = React.useState<AssistantModelSettings>({
    modelId: DEFAULT_ASSISTANT_MODEL,
    effort: null,
  })
  // Kept after closing, so the dialog keeps its title while it animates out.
  const [dialog, setDialog] = React.useState<AssistantChatDialog>({
    kind: "rename",
    chatId: "",
    title: "",
    open: false,
  })
  const [isLinkCopied, setLinkCopied] = React.useState(false)

  React.useEffect(() => {
    if (!isLinkCopied) return
    const timer = setTimeout(() => setLinkCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [isLinkCopied])

  const chat = assistant.activeChat
  const status = chat ? getChatInputStatus(chat.messages) : "ready"
  const openDialog = (kind: AssistantChatDialog["kind"], chatId: string) => {
    const target = assistant.chats.find((entry) => entry.id === chatId)
    if (!target) return
    setDialog({ kind, chatId, title: target.title, open: true })
  }

  const composer = (
    <AssistantComposer
      status={status}
      onSend={assistant.send}
      onStop={assistant.stop}
      settings={settings}
      onSettingsChange={setSettings}
      placeholder={PLACEHOLDER}
      autoFocus={!chat}
    />
  )

  return (
    <AppShell storageKey="assistant-01">
      <AssistantSidebar
        chats={assistant.chats}
        activeId={chat?.id ?? null}
        onSelect={assistant.select}
        onNewChat={assistant.startNewChat}
        onRename={(chatId) => openDialog("rename", chatId)}
        onDelete={(chatId) => openDialog("delete", chatId)}
      />
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb items={[{ label: chat?.title ?? "New chat" }]} />
          {chat && (
            <AppShellHeaderActions
              actions={[
                {
                  id: "share",
                  label: isLinkCopied ? "Link copied" : "Share",
                  onSelect: () => {
                    void navigator.clipboard.writeText(window.location.href)
                    setLinkCopied(true)
                  },
                  icon: isLinkCopied ? (
                    <IconPlaceholder
                      lucide="CheckIcon"
                      tabler="IconCheck"
                      hugeicons="Tick02Icon"
                      phosphor="CheckIcon"
                      remixicon="RiCheckLine"
                    />
                  ) : (
                    <IconPlaceholder
                      lucide="ShareIcon"
                      tabler="IconShare"
                      hugeicons="Share01Icon"
                      phosphor="ShareIcon"
                      remixicon="RiShareLine"
                    />
                  ),
                },
              ]}
              menuLabel="Chat options"
              menu={
                <AssistantChatMenu
                  onRename={() => openDialog("rename", chat.id)}
                  onExport={() => downloadMarkdown(chat)}
                  onDelete={() => openDialog("delete", chat.id)}
                />
              }
            />
          )}
        </AppShellHeader>
        <AppShellContent className="flex flex-col">
          {chat ? (
            <MessageScrollerProvider
              key={chat.id}
              autoScroll
              defaultScrollPosition="end"
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <AssistantTranscript
                  messages={chat.messages}
                  isBusy={status !== "ready"}
                />
                <div className="mx-auto w-full max-w-3xl px-(--density-16) pb-(--density-16) md:px-(--density-24)">
                  {composer}
                </div>
              </div>
            </MessageScrollerProvider>
          ) : (
            <AssistantNewChat
              name="Ada"
              composer={composer}
              onPick={(prompt) => assistant.send(prompt, [])}
            />
          )}
        </AppShellContent>
      </AppShellMain>
      <AssistantChatDialogs
        dialog={dialog}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
        onRename={(title) => assistant.rename(dialog.chatId, title)}
        onDelete={() => assistant.remove(dialog.chatId)}
      />
    </AppShell>
  )
}
