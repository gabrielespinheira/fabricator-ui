import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/registry/native/ui/drawer"
import { Input } from "@/registry/native/ui/input"

const DIRECTIONS = ["down", "up", "left", "right"] as const

function DrawerExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Drawer>
          <DrawerTrigger render={<Button variant="secondary" />}>
            Open drawer
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Move goal</DrawerTitle>
              <DrawerDescription>
                Set your daily activity goal.
              </DrawerDescription>
            </DrawerHeader>
            <View className="m-4 h-40 rounded-2xl bg-muted" />
            <DrawerFooter>
              <DrawerClose render={<Button />}>Submit</DrawerClose>
              <DrawerClose render={<Button variant="outline" />}>
                Cancel
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Example>
      <Example
        title="Swipe directions, with a handle"
        className="flex-row flex-wrap"
      >
        {DIRECTIONS.map((direction) => (
          <Drawer key={direction} showSwipeHandle swipeDirection={direction}>
            <DrawerTrigger render={<Button variant="outline" />}>
              {direction}
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Swipe {direction}</DrawerTitle>
                <DrawerDescription>
                  Flick it, or drag it past half way.
                </DrawerDescription>
              </DrawerHeader>
              <DrawerFooter>
                <DrawerClose render={<Button />}>Close</DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ))}
      </Example>
      <Example title="An input stays above the keyboard">
        <Drawer showSwipeHandle>
          <DrawerTrigger render={<Button variant="outline" />}>
            Invite someone
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Invite to Acme Inc</DrawerTitle>
              <DrawerDescription>
                They'll get an email from us.
              </DrawerDescription>
            </DrawerHeader>
            <View className="p-4">
              <Input
                placeholder="gabs@fabricator.dev"
                keyboardType="email-address"
              />
            </View>
            <DrawerFooter>
              <DrawerClose render={<Button />}>Send invite</DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Example>
      <Example title="Not modal: the page stays usable">
        <Drawer modal={false} showSwipeHandle>
          <DrawerTrigger render={<Button variant="outline" />}>
            Open non-modal
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>No scrim</DrawerTitle>
              <DrawerDescription>
                Swipe it away when you're done.
              </DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      </Example>
      <Example title="Controlled">
        <Button variant="outline" onPress={() => setIsOpen(true)}>
          Open from state
        </Button>
        <Drawer open={isOpen} onOpenChange={setIsOpen} showSwipeHandle>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Open from state</DrawerTitle>
              <DrawerDescription>
                Swipe or press outside to close.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter>
              <Button onPress={() => setIsOpen(false)}>Close from state</Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </Example>
    </ExampleWrapper>
  )
}

export { DrawerExample }
