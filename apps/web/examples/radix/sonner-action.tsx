"use client"

import { toast } from "sonner"

import { Button } from "@/styles/radix-nova/ui/button"

export function SonnerAction() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast("Conversation archived", {
            action: { label: "Undo", onClick: () => toast("Restored") },
          })
        }
      >
        Short
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast("Event created", {
            description: "Friday, December 4 at 9:00 AM",
            action: { label: "Undo", onClick: () => toast("Event removed") },
          })
        }
      >
        With Description
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Changes weren't saved", {
            description:
              "The server didn't answer. Your edits are still here, so you can try again in a moment.",
            action: {
              label: "Try again",
              onClick: () => toast.success("Changes saved"),
            },
          })
        }
      >
        Below the Text
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast("Delete 3 files?", {
            cancel: { label: "Cancel", onClick: () => toast.dismiss() },
            action: {
              label: "Delete",
              onClick: () => toast.success("Files deleted"),
            },
          })
        }
      >
        Two Actions
      </Button>
    </div>
  )
}
