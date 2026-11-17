"use client"

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The chat's page menu, in the header's ellipsis. React Aria picks menu
// items with onAction; the other bases share a copy that uses onClick.

export function AssistantChatMenu({
  onRename,
  onExport,
  onDelete,
}: {
  onRename: () => void
  onExport: () => void
  onDelete: () => void
}) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem textValue="Rename…" onAction={onRename}>
          <IconPlaceholder
            lucide="PencilIcon"
            tabler="IconPencil"
            hugeicons="PencilEdit01Icon"
            phosphor="PencilSimpleIcon"
            remixicon="RiPencilLine"
          />
          Rename…
        </DropdownMenuItem>
        <DropdownMenuItem textValue="Export as Markdown" onAction={onExport}>
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
        <DropdownMenuItem
          variant="destructive"
          textValue="Delete chat…"
          onAction={onDelete}
        >
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
