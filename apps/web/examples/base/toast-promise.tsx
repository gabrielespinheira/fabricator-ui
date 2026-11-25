"use client"

import { Button } from "@/styles/base-nova/ui/button"
import { toast } from "@/styles/base-nova/ui/toast"

export function ToastPromise() {
  function createEvent() {
    toast.promise(
      new Promise<{ name: string }>((resolve) => {
        window.setTimeout(() => resolve({ name: "Team offsite" }), 2000)
      }),
      {
        loading: { title: "Creating event…" },
        success: (data) => ({
          title: `${data.name} created`,
          description: "Friday, December 4 at 9:00 AM",
          actionProps: { children: "View" },
        }),
        error: { title: "The event couldn't be created" },
      }
    )
  }

  function failToPublish() {
    toast
      .promise(
        new Promise<void>((_resolve, reject) => {
          window.setTimeout(reject, 2000)
        }),
        {
          loading: { title: "Publishing…" },
          success: { title: "Published" },
          error: {
            title: "Publishing failed",
            description: "The domain isn't verified yet.",
          },
        }
      )
      .catch(() => undefined)
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
