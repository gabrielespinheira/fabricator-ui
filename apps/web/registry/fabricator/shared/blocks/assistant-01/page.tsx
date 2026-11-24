"use client"

import * as React from "react"

import {
  ASSISTANT_ARTIFACT_PANEL,
  AssistantArtifactPanel,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-artifact-panel"
import {
  AssistantChatDialogs,
  type AssistantChatDialog,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-chat-dialogs"
import { AssistantChatSearch } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-chat-search"
import {
  AssistantColumn,
  AssistantComposerSlot,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-column"
import {
  AssistantComposer,
  type AssistantModelSettings,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-composer"
import { notifyAssistant } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-controls"
import { AssistantHeader } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-header"
import { AssistantNewChat } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-new-chat"
import {
  ASSISTANT_SEARCH_SHORTCUT,
  AssistantSidebar,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-sidebar"
import { AssistantTranscript } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-transcript"
import { useAssistantChats } from "@/registry/bases/__base__/blocks/assistant-01/hooks/use-assistant-chats"
import {
  formatChatAsMarkdown,
  getChatArtifacts,
  getChatInputStatus,
  toMarkdownFileName,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  ASSISTANT_CHATS,
  ASSISTANT_USER,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chats"
import { downloadAssistantFile } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-download"
import { DEFAULT_ASSISTANT_MODEL } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-models"
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  useShellPanel,
  useShellShortcut,
} from "@/registry/bases/__base__/ui/app-shell"
import { MessageScrollerProvider } from "@/registry/bases/__base__/ui/message-scroller"

// An AI assistant: someone asks about their data, follows the work and reuses
// the answer. The work is what the screen shows: the steps a reply took, the
// pages it read, and the chart and table it made, which stay open beside the
// conversation. Mount your Toaster once in the app's layout.

const PLACEHOLDER = ["Ask anything", "Drop a file to analyse it"]

/** The conversation keeps about 560px of text before the artifact docks. */
const MIN_MAIN_WIDTH = 616

export default function AssistantPage() {
  return (
    <AppShell storageKey="assistant-01" minMainWidth={MIN_MAIN_WIDTH}>
      <Assistant />
    </AppShell>
  )
}

function Assistant() {
  const assistant = useAssistantChats(ASSISTANT_CHATS)
  const artifactPanel = useShellPanel(ASSISTANT_ARTIFACT_PANEL)
  const [settings, setSettings] = React.useState<AssistantModelSettings>({
    modelId: DEFAULT_ASSISTANT_MODEL,
    effort: null,
  })
  const [artifactId, setArtifactId] = React.useState<string | null>(null)
  const [isSearchOpen, setSearchOpen] = React.useState(false)
  // Kept after closing, so the dialog keeps its title while it animates out.
  const [dialog, setDialog] = React.useState<AssistantChatDialog>({
    kind: "rename",
    chatId: "",
    title: "",
    open: false,
  })

  useShellShortcut(
    {
      id: "assistant.search",
      keys: ASSISTANT_SEARCH_SHORTCUT,
      label: "Search chats",
      allowInInputs: true,
    },
    () => setSearchOpen(true)
  )

  const chat = assistant.activeChat
  const status = chat ? getChatInputStatus(chat.messages) : "ready"
  // The artifact someone opened, or the newest one of the chat.
  const artifacts = chat ? getChatArtifacts(chat.messages) : []
  const artifact =
    artifacts.find((entry) => entry.id === artifactId) ?? artifacts.at(-1)

  const openDialog = (kind: AssistantChatDialog["kind"], chatId: string) => {
    const target = assistant.chats.find((entry) => entry.id === chatId)
    if (!target) return
    setDialog({ kind, chatId, title: target.title, open: true })
  }

  const shareLink = () => {
    void navigator.clipboard
      .writeText(window.location.href)
      .then(() => notifyAssistant("Link copied"))
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
    <>
      <AssistantSidebar
        chats={assistant.chats}
        activeId={chat?.id ?? null}
        onSelect={assistant.select}
        onNewChat={assistant.startNewChat}
        onSearch={() => setSearchOpen(true)}
        onRename={(chatId) => openDialog("rename", chatId)}
        onTogglePin={assistant.togglePin}
        onDelete={(chatId) => openDialog("delete", chatId)}
      />
      <AppShellMain>
        <AssistantHeader
          title={chat?.title ?? null}
          hasArtifact={Boolean(artifact)}
          menu={{
            isPinned: chat?.isPinned ?? false,
            onRename: () => chat && openDialog("rename", chat.id),
            onTogglePin: () => chat && assistant.togglePin(chat.id),
            onShare: shareLink,
            onExport: () =>
              chat &&
              downloadAssistantFile(
                toMarkdownFileName(chat.title),
                "text/markdown",
                formatChatAsMarkdown(chat.title, chat.messages)
              ),
            onDelete: () => chat && openDialog("delete", chat.id),
          }}
          onNewChat={assistant.startNewChat}
        />
        <AppShellContent className="flex flex-col overflow-hidden">
          <AssistantColumn>
            {chat ? (
              <MessageScrollerProvider
                key={chat.id}
                autoScroll
                defaultScrollPosition="end"
              >
                <AssistantTranscript
                  messages={chat.messages}
                  isBusy={status !== "ready"}
                  onRetry={assistant.retry}
                  onRate={assistant.rate}
                  onConnect={assistant.connect}
                  onOpenArtifact={(id) => {
                    setArtifactId(id)
                    artifactPanel.setOpen(true)
                  }}
                />
                <AssistantComposerSlot className="pb-(--density-16)">
                  {composer}
                </AssistantComposerSlot>
              </MessageScrollerProvider>
            ) : (
              <AssistantNewChat
                name={ASSISTANT_USER.firstName}
                composer={composer}
                onPick={(prompt) => assistant.send(prompt, [])}
              />
            )}
          </AssistantColumn>
        </AppShellContent>
      </AppShellMain>
      {artifact && <AssistantArtifactPanel artifact={artifact} />}
      <AssistantChatSearch
        open={isSearchOpen}
        onOpenChange={setSearchOpen}
        chats={assistant.chats}
        onSelect={assistant.select}
      />
      <AssistantChatDialogs
        dialog={dialog}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
        onRename={(title) => assistant.rename(dialog.chatId, title)}
        onDelete={() => assistant.remove(dialog.chatId)}
      />
    </>
  )
}
