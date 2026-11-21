import { FolderIcon } from "@/lib/site-icons"
import { IconSlot } from "@/styles/base-fabricator/ui/app-shell"

export function IconSlotExample() {
  return (
    <span className="flex items-center gap-2 text-sm [&_svg]:size-4">
      <IconSlot icon={FolderIcon} />
      Projects
    </span>
  )
}
