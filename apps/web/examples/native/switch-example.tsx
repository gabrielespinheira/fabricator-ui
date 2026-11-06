import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Switch } from "@/registry/native/ui/switch"
import { Text } from "@/registry/native/ui/text"

function SwitchExample() {
  const [isOn, setIsOn] = React.useState(true)
  return (
    <ExampleWrapper>
      <Example title="States" className="flex-row flex-wrap items-center">
        <Switch accessibilityLabel="Off" />
        <Switch accessibilityLabel="On" defaultChecked />
        <Switch accessibilityLabel="Invalid" aria-invalid />
        <Switch accessibilityLabel="Disabled" disabled />
        <Switch accessibilityLabel="Disabled on" disabled defaultChecked />
        <Switch accessibilityLabel="Read only" readOnly defaultChecked />
      </Example>
      <Example title="Sizes" className="flex-row items-center">
        <Switch accessibilityLabel="Small" size="sm" defaultChecked />
        <Switch accessibilityLabel="Default" size="default" defaultChecked />
      </Example>
      <Example title="Controlled">
        <View className="flex-row items-center gap-2">
          <Switch
            accessibilityLabel="Airplane mode"
            checked={isOn}
            onCheckedChange={setIsOn}
          />
          <Text>Airplane mode is {isOn ? "on" : "off"}</Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { SwitchExample }
