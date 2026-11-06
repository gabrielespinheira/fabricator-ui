import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { SheetSurfaceScrollView } from "@/registry/native/lib/sheet-surface"
import { Button } from "@/registry/native/ui/button"
import { Input } from "@/registry/native/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/registry/native/ui/sheet"
import { Text } from "@/registry/native/ui/text"

const SIDES = ["top", "right", "bottom", "left"] as const

function SheetExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <ExampleWrapper>
      <Example title="Sides" className="flex-row flex-wrap">
        {SIDES.map((side) => (
          <Sheet key={side}>
            <SheetTrigger render={<Button variant="outline" />}>
              {side}
            </SheetTrigger>
            <SheetContent side={side}>
              <SheetHeader>
                <SheetTitle>Edit profile</SheetTitle>
                <SheetDescription>
                  Swipe toward the {side} edge, or press outside, to close.
                </SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <SheetClose render={<Button />}>Save changes</SheetClose>
                <SheetClose render={<Button variant="outline" />}>
                  Cancel
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ))}
      </Example>
      <Example title="An input stays above the keyboard">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Edit name
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>Edit name</SheetTitle>
              <SheetDescription>
                Shown to everyone at Acme Inc.
              </SheetDescription>
            </SheetHeader>
            <View className="px-4">
              <Input placeholder="Name" defaultValue="Gabs" />
            </View>
            <SheetFooter>
              <SheetClose render={<Button />}>Save</SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Example>
      <Example title="Scrolling content">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Long sheet
          </SheetTrigger>
          <SheetContent side="bottom" className="h-3/4">
            <SheetHeader>
              <SheetTitle>Release notes</SheetTitle>
              <SheetDescription>
                Drag the list to scroll, the header to dismiss.
              </SheetDescription>
            </SheetHeader>
            <SheetSurfaceScrollView contentContainerClassName="gap-2 px-4">
              {Array.from({ length: 30 }, (_, index) => (
                <Text key={index}>Change {index + 1}</Text>
              ))}
            </SheetSurfaceScrollView>
          </SheetContent>
        </Sheet>
      </Example>
      <Example title="No close button">
        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>
            Open
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>No close button</SheetTitle>
              <SheetDescription>Press outside to close.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </Example>
      <Example title="Controlled, only closes from its button">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open from state
        </Button>
        <Sheet open={isOpen} onOpenChange={setIsOpen} disablePointerDismissal>
          <SheetContent side="bottom" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>Finish this first</SheetTitle>
              <SheetDescription>
                Swiping and pressing outside do nothing.
              </SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <Button onPress={() => setIsOpen(false)}>Close from state</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Example>
    </ExampleWrapper>
  )
}

export { SheetExample }
