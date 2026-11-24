"use client"

import { toast } from "sonner"

import { Button } from "@/styles/radix-nova/ui/button"

export function SonnerPromise() {
  function createEvent() {
    toast.promise(
      () =>
        new Promise<{ name: string }>((resolve) =>
          setTimeout(() => resolve({ name: "Team offsite" }), 2000)
        ),
      {
        loading: "Creating event…",
        success: (data) => ({
          message: `${data.name} created`,
          description: "Friday, December 4 at 9:00 AM",
          action: {
            label: "View",
            onClick: () => toast(`Opening ${data.name}`),
          },
        }),
        error: "The event couldn't be created",
      }
    )
  }

  function failToPublish() {
    toast.promise(
      () =>
        new Promise<void>((_resolve, reject) => {
          setTimeout(reject, 2000)
        }),
      {
        loading: "Publishing…",
        success: "Published",
        error: () => ({
          message: "Publishing failed",
          description: "The domain isn't verified yet.",
        }),
      }
    )
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" onClick={createEvent}>
        Create Event
      </Button>
      <Button variant="outline" onClick={failToPublish}>
        Publish
      </Button>
    </div>
  )
}
