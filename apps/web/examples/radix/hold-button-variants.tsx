import { SendIcon } from "lucide-react"

import { HoldButton } from "@/styles/radix-fabricator/ui/hold-button"

export function HoldButtonVariants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <HoldButton>
        <SendIcon />
        Publish release
      </HoldButton>
      <HoldButton variant="destructive">Remove member</HoldButton>
      <HoldButton size="sm" duration={800}>
        Archive
      </HoldButton>
      <HoldButton size="lg" duration={2000}>
        Transfer ownership
      </HoldButton>
      <HoldButton disabled>Delete workspace</HoldButton>
    </div>
  )
}
