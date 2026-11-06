import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Button } from "@/registry/native/ui/button"
import { createToastManager, toast, Toaster } from "@/registry/native/ui/toast"

function showEvent() {
  const id = toast.add({
    title: "Event created",
    description: "Sunday, December 3 at 9:00 AM",
    actionProps: {
      children: "Undo",
      onPress() {
        toast.close(id)
      },
    },
  })
}

function showPromise() {
  toast.promise(
    new Promise<{ name: string }>((resolve) => {
      setTimeout(() => resolve({ name: "Event" }), 2000)
    }),
    {
      loading: "Creating event…",
      success: (data) => `${data.name} created.`,
      error: "Could not create event.",
    }
  )
}

function ToastExample() {
  const [ownManager] = React.useState(createToastManager)
  return (
    <ExampleWrapper>
      <Toaster limit={3} />
      <Example title="With an action">
        <Button variant="outline" onPress={showEvent}>
          Show Toast
        </Button>
      </Example>
      <Example title="Types" className="flex-row flex-wrap">
        <Button
          variant="outline"
          onPress={() => toast.add({ description: "Event has been created." })}
        >
          Default
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              type: "success",
              description: "Event has been created.",
            })
          }
        >
          Success
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              type: "info",
              description: "Arrive 10 minutes before the event.",
            })
          }
        >
          Info
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              type: "warning",
              description: "The event cannot start before 8:00 AM.",
            })
          }
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              type: "error",
              description: "The event could not be created.",
              priority: "high",
            })
          }
        >
          Error
        </Button>
      </Example>
      <Example title="Promise, from loading to success">
        <Button variant="outline" onPress={showPromise}>
          Create Event
        </Button>
      </Example>
      <Example title="Stays until dismissed">
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              title: "Backup finished",
              description: "Swipe it away, or press the close button.",
              timeout: 0,
            })
          }
        >
          Show
        </Button>
      </Example>
      <Example
        title="Update and close everything"
        className="flex-row flex-wrap"
      >
        <Button
          variant="outline"
          onPress={() => {
            const id = toast.add({ title: "Uploading", type: "loading" })
            setTimeout(() => {
              toast.update(id, { title: "Uploaded", type: "success" })
            }, 1500)
          }}
        >
          Upload
        </Button>
        <Button variant="ghost" onPress={() => toast.close()}>
          Close all
        </Button>
      </Example>
      <Example title="Its own manager">
        <Toaster toastManager={ownManager} timeout={2000} />
        <Button
          variant="outline"
          onPress={() => ownManager.add({ title: "Gone in two seconds" })}
        >
          Show
        </Button>
      </Example>
    </ExampleWrapper>
  )
}

export { ToastExample }
