"use client"

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// What can be done to a chat, in the menu its title opens. React Aria picks
// menu items with onAction, so that base has its own copy of this file.

export type AssistantChatMenuProps = {
  isPinned: boolean
  onRename: () => void
  onTogglePin: () => void
  onShare: () => void
  onExport: () => void
  onDelete: () => void
}

export function AssistantChatMenu({
  isPinned,
  onRename,
  onTogglePin,
  onShare,
  onExport,
  onDelete,
}: AssistantChatMenuProps) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem onClick={onRename}>
          <IconPlaceholder
            lucide="PencilIcon"
            tabler="IconPencil"
            hugeicons="PencilEdit01Icon"
            phosphor="PencilSimpleIcon"
            remixicon="RiPencilLine"
          />
          Rename…
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTogglePin}>
          <IconPlaceholder
            lucide="PinIcon"
            tabler="IconPin"
            hugeicons="PinIcon"
            phosphor="PushPinIcon"
            remixicon="RiPushpinLine"
          />
          {isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <IconPlaceholder
            lucide="ShareIcon"
            tabler="IconShare"
            hugeicons="Share01Icon"
            phosphor="ShareIcon"
            remixicon="RiShareLine"
          />
          Share link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          <IconPlaceholder
            lucide="DownloadIcon"
            tabler="IconDownload"
            hugeicons="Download01Icon"
            phosphor="DownloadSimpleIcon"
            remixicon="RiDownloadLine"
          />
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <IconPlaceholder
            lucide="Trash2Icon"
            tabler="IconTrash"
            hugeicons="Delete02Icon"
            phosphor="TrashIcon"
            remixicon="RiDeleteBinLine"
          />
          Delete chat…
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}
