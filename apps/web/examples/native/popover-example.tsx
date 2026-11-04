import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { Input } from "@/registry/native/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/registry/native/ui/popover"
import { Text } from "@/registry/native/ui/text"

const ALIGNMENTS = ["start", "center", "end"] as const
const SIDES = ["top", "bottom"] as const

function PopoverExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            Open popover
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Dimensions</PopoverTitle>
              <PopoverDescription>
                Set the dimensions for the layer.
              </PopoverDescription>
            </PopoverHeader>
            <View className="gap-2">
              <Input placeholder="Width" defaultValue="100%" />
              <Input placeholder="Height" defaultValue="25px" />
            </View>
          </PopoverContent>
        </Popover>
      </Example>
      <Example title="Alignments" className="flex-row flex-wrap">
        {ALIGNMENTS.map((align) => (
          <Popover key={align}>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              {align}
            </PopoverTrigger>
            <PopoverContent align={align} className="w-40">
              Aligned to {align}
            </PopoverContent>
          </Popover>
        ))}
      </Example>
      <Example title="Sides" className="flex-row flex-wrap">
        {SIDES.map((side) => (
          <Popover key={side}>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              {side}
            </PopoverTrigger>
            <PopoverContent side={side} className="w-40">
              <Text>On the {side}</Text>
            </PopoverContent>
          </Popover>
        ))}
      </Example>
      <Example title="Controlled">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger render={<Button variant="outline" />}>
            {isOpen ? "Open" : "Closed"}
          </PopoverTrigger>
          <PopoverContent>
            <PopoverHeader>
              <PopoverTitle>Open from state</PopoverTitle>
              <PopoverDescription>
                The trigger and the outside both go through onOpenChange.
              </PopoverDescription>
            </PopoverHeader>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setIsOpen(false)}
            >
              Close from state
            </Button>
          </PopoverContent>
        </Popover>
      </Example>
    </ExampleWrapper>
  )
}

export { PopoverExample }
