import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { InfoIcon } from "@fabricator-ui/icons-react-native"

import { Button } from "@/registry/native/ui/button"
import { Text } from "@/registry/native/ui/text"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/native/ui/tooltip"

const SIDES = ["top", "bottom"] as const

function TooltipExample() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [taps, setTaps] = React.useState(0)
  return (
    <ExampleWrapper>
      <Example title="Long press to show. A tap stays the button's own">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline" />}
            onPress={() => setTaps(taps + 1)}
          >
            Tapped {taps} times
          </TooltipTrigger>
          <TooltipContent>
            <Text>Add to library</Text>
          </TooltipContent>
        </Tooltip>
      </Example>
      <Example title="Sides" className="flex-row flex-wrap">
        {SIDES.map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger render={<Button variant="outline" />}>
              {side}
            </TooltipTrigger>
            <TooltipContent side={side}>On the {side}</TooltipContent>
          </Tooltip>
        ))}
      </Example>
      <Example title="An icon button: the text is also its accessibility hint">
        <Tooltip>
          <TooltipTrigger
            accessibilityLabel="More info"
            render={<Button variant="ghost" size="icon" />}
          >
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent>
            Press and hold on any control for help
          </TooltipContent>
        </Tooltip>
      </Example>
      <Example title="A shorter press, from the provider">
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>
              Quick
            </TooltipTrigger>
            <TooltipContent>Shows after 200ms</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Example>
      <Example title="Disabled">
        <Tooltip>
          <TooltipTrigger disabled render={<Button variant="outline" />}>
            Disabled
          </TooltipTrigger>
          <TooltipContent>Never shows</TooltipContent>
        </Tooltip>
      </Example>
      <Example title="Controlled">
        <Button variant="outline" onPress={() => setIsOpen(!isOpen)}>
          {isOpen ? "Hide from state" : "Show from state"}
        </Button>
        <Tooltip open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger render={<Button variant="secondary" />}>
            Anchor
          </TooltipTrigger>
          <TooltipContent>Open from state</TooltipContent>
        </Tooltip>
      </Example>
    </ExampleWrapper>
  )
}

export { TooltipExample }
