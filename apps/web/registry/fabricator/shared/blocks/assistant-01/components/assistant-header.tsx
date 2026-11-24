"use client"

import { ASSISTANT_ARTIFACT_PANEL } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-artifact-panel"
import {
  AssistantChatMenu,
  type AssistantChatMenuProps,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-chat-menu"
import {
  AssistantIconButton,
  AssistantTitleMenu,
} from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-controls"
import {
  AppShellHeader,
  AppShellPanelTrigger,
} from "@/registry/bases/__base__/ui/app-shell"
import { useSidebar } from "@/registry/bases/__base__/ui/sidebar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The chat's name, which is the page's heading and opens the chat's menu. New
// chat comes along while the sidebar that holds it is out of sight.

export function AssistantHeader({
  title,
  hasArtifact,
  menu,
  onNewChat,
}: {
  /** Null on a new chat, whose greeting is the heading. */
  title: string | null
  hasArtifact: boolean
  menu: AssistantChatMenuProps
  onNewChat: () => void
}) {
  const { isMobile, state } = useSidebar()
  const isSidebarHidden = isMobile || state === "collapsed"

  return (
    <AppShellHeader>
      {title !== null && (
        // Alone at the start, the name sits on the header's edge; its button's
        // padding hangs out.
        <h1 className="flex min-w-0 first:-ms-(--density-8)">
          <AssistantTitleMenu title={title}>
            <AssistantChatMenu {...menu} />
          </AssistantTitleMenu>
        </h1>
      )}
      <div className="ms-auto flex shrink-0 items-center gap-(--density-4)">
        {title !== null && isSidebarHidden && (
          <AssistantIconButton label="New chat" onClick={onNewChat}>
            <IconPlaceholder
              lucide="SquarePenIcon"
              tabler="IconEdit"
              hugeicons="PencilEdit02Icon"
              phosphor="NotePencilIcon"
              remixicon="RiEditBoxLine"
            />
          </AssistantIconButton>
        )}
      </div>
      {hasArtifact && <AppShellPanelTrigger panel={ASSISTANT_ARTIFACT_PANEL} />}
    </AppShellHeader>
  )
}
