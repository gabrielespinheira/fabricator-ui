import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { DownloadIcon } from "@fabricator-ui/icons-react-native"

import { Avatar, AvatarFallback } from "@/registry/native/ui/avatar"
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

function showFailure() {
  const id = toast.add({
    type: "error",
    priority: "high",
    title: "Changes weren't saved",
    description:
      "The server didn't answer. Your edits are still here, so you can try again in a moment.",
    actionProps: { children: "Try again", onPress: () => toast.close(id) },
  })
}

function showPromise() {
  toast.promise(
    new Promise<{ name: string }>((resolve) => {
      setTimeout(() => resolve({ name: "Team offsite" }), 2000)
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

function ToastExample() {
  const [ownManager] = React.useState(createToastManager)
  return (
    <ExampleWrapper>
      <Toaster limit={3} />
      <Example title="With an action" className="flex-row flex-wrap">
        <Button variant="outline" onPress={showEvent}>
          Beside the text
        </Button>
        <Button variant="outline" onPress={showFailure}>
          Under the text
        </Button>
      </Example>
      <Example title="Icons" className="flex-row flex-wrap">
        <Button
          variant="outline"
          onPress={() => toast.add({ title: "Link copied" })}
        >
          None
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              title: "Export ready",
              description: "invoices-november.csv, 2.4 MB",
              data: { icon: <DownloadIcon aria-hidden /> },
            })
          }
        >
          Custom
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              title: "Olivia Martin commented",
              description: "Can we move the launch to Thursday?",
              data: {
                icon: (
                  <Avatar size="sm">
                    <AvatarFallback>OM</AvatarFallback>
                  </Avatar>
                ),
              },
            })
          }
        >
          Avatar
        </Button>
      </Example>
      <Example title="Long text, all of it on a press">
        <Button
          variant="outline"
          onPress={() =>
            toast.add({
              type: "warning",
              title: "Three members couldn't be invited",
              description:
                "Their addresses belong to another workspace on your plan. Ask its owner to release them, or invite each person with a different address. Invitations already sent to the other nine people are on their way and expire in seven days.",
            })
          }
        >
          Show
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
