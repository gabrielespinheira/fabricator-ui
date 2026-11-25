"use client"

import { Button } from "@/styles/base-nova/ui/button"
import { toast } from "@/styles/base-nova/ui/toast"

export function ToastAction() {
  function archive() {
    const id = toast.add({
      title: "Conversation archived",
      actionProps: { children: "Undo", onClick: () => toast.close(id) },
    })
  }

  function schedule() {
    const id = toast.add({
      title: "Event created",
      description: "Friday, December 4 at 9:00 AM",
      actionProps: { children: "Undo", onClick: () => toast.close(id) },
    })
  }

  function failToSave() {
    const id = toast.add({
      type: "error",
      priority: "high",
      title: "Changes weren't saved",
      description:
        "The server didn't answer. Your edits are still here, so you can try again in a moment.",
      actionProps: { children: "Try again", onClick: () => toast.close(id) },
    })
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" onClick={archive}>
        Short
      </Button>
      <Button variant="outline" onClick={schedule}>
        With Description
      </Button>
      <Button variant="outline" onClick={failToSave}>
        Below the Text
      </Button>
    </div>
  )
}
