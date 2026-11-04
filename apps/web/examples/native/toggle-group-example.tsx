import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
} from "@fabricator-ui/icons-react-native"

import { Text } from "@/registry/native/ui/text"
import { ToggleGroup, ToggleGroupItem } from "@/registry/native/ui/toggle-group"

function ToggleGroupExample() {
  const [align, setAlign] = React.useState(["center"])
  return (
    <ExampleWrapper>
      <Example title="Single: the selection slides">
        <ToggleGroup defaultValue={["left"]}>
          <ToggleGroupItem value="left" accessibilityLabel="Align left">
            <AlignLeftIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" accessibilityLabel="Align center">
            <AlignCenterIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" accessibilityLabel="Align right">
            <AlignRightIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </Example>
      <Example title="Multiple">
        <ToggleGroup multiple defaultValue={["bold"]}>
          <ToggleGroupItem value="bold" accessibilityLabel="Bold">
            <BoldIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" accessibilityLabel="Italic">
            <ItalicIcon />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" accessibilityLabel="Underline">
            <UnderlineIcon />
          </ToggleGroupItem>
        </ToggleGroup>
      </Example>
      <Example title="Outline, joined">
        <ToggleGroup variant="outline" spacing={0} defaultValue={["week"]}>
          <ToggleGroupItem value="day">Day</ToggleGroupItem>
          <ToggleGroupItem value="week">Week</ToggleGroupItem>
          <ToggleGroupItem value="month">Month</ToggleGroupItem>
        </ToggleGroup>
      </Example>
      <Example title="Sizes">
        <ToggleGroup size="sm" defaultValue={["a"]}>
          <ToggleGroupItem value="a">Small</ToggleGroupItem>
          <ToggleGroupItem value="b">Small</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup size="lg" defaultValue={["a"]}>
          <ToggleGroupItem value="a">Large</ToggleGroupItem>
          <ToggleGroupItem value="b">Large</ToggleGroupItem>
        </ToggleGroup>
      </Example>
      <Example title="Vertical">
        <ToggleGroup orientation="vertical" defaultValue={["a"]}>
          <ToggleGroupItem value="a">First</ToggleGroupItem>
          <ToggleGroupItem value="b">Second</ToggleGroupItem>
        </ToggleGroup>
      </Example>
      <Example title="Controlled">
        <ToggleGroup value={align} onValueChange={setAlign}>
          <ToggleGroupItem value="left">Left</ToggleGroupItem>
          <ToggleGroupItem value="right">Right</ToggleGroupItem>
        </ToggleGroup>
        <Text className="text-muted-foreground">
          {align[0] ?? "Nothing selected"}
        </Text>
      </Example>
      <Example title="Disabled">
        <ToggleGroup disabled defaultValue={["a"]}>
          <ToggleGroupItem value="a">On</ToggleGroupItem>
          <ToggleGroupItem value="b">Off</ToggleGroupItem>
        </ToggleGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { ToggleGroupExample }
