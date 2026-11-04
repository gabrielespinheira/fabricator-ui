import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/native/ui/dialog"
import { Input } from "@/registry/native/ui/input"

function DialogExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Edit profile
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit profile</DialogTitle>
              <DialogDescription>
                Make changes here, then save when you are done.
              </DialogDescription>
            </DialogHeader>
            <View className="gap-3">
              <Input placeholder="Name" defaultValue="Gabs" />
              <Input placeholder="Handle" defaultValue="@gabs" />
            </View>
            <DialogFooter showCloseButton>
              <DialogClose render={<Button />}>Save changes</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Example>
      <Example title="Controlled, no close button">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open from state
        </Button>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>Press outside to dismiss.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onPress={() => setIsOpen(false)}>Close from state</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Example>
    </ExampleWrapper>
  )
}

export { DialogExample }
