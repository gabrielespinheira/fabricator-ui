import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { BoldIcon, ItalicIcon } from "@fabricator-ui/icons-react-native"

import { Text } from "@/registry/native/ui/text"
import { Toggle } from "@/registry/native/ui/toggle"

function ToggleExample() {
  const [isBold, setIsBold] = React.useState(true)
  return (
    <ExampleWrapper>
      <Example title="Variants" className="flex-row items-center">
        <Toggle accessibilityLabel="Bold">
          <BoldIcon />
        </Toggle>
        <Toggle accessibilityLabel="Italic" variant="outline">
          <ItalicIcon />
        </Toggle>
        <Toggle defaultPressed>On</Toggle>
        <Toggle variant="outline" defaultPressed>
          On
        </Toggle>
      </Example>
      <Example title="Sizes" className="flex-row items-center">
        <Toggle size="sm" accessibilityLabel="Small">
          <BoldIcon />
        </Toggle>
        <Toggle size="default" accessibilityLabel="Default">
          <BoldIcon />
        </Toggle>
        <Toggle size="lg" accessibilityLabel="Large">
          <BoldIcon />
        </Toggle>
      </Example>
      <Example title="Controlled" className="flex-row items-center">
        <Toggle pressed={isBold} onPressedChange={setIsBold}>
          <BoldIcon />
          Bold
        </Toggle>
        <Text className="text-muted-foreground">{isBold ? "On" : "Off"}</Text>
      </Example>
      <Example title="Disabled" className="flex-row items-center">
        <Toggle disabled>Off</Toggle>
        <Toggle disabled defaultPressed>
          On
        </Toggle>
      </Example>
    </ExampleWrapper>
  )
}

export { ToggleExample }
