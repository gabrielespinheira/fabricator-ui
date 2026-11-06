import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { Pressable, View } from "react-native"

import { Checkbox } from "@/registry/native/ui/checkbox"
import { Text } from "@/registry/native/ui/text"

function CheckboxExample() {
  const [isChecked, setIsChecked] = React.useState(true)
  return (
    <ExampleWrapper>
      <Example title="States" className="flex-row items-center">
        <Checkbox accessibilityLabel="Off" />
        <Checkbox accessibilityLabel="On" defaultChecked />
        <Checkbox accessibilityLabel="Mixed" indeterminate />
        <Checkbox accessibilityLabel="Invalid" aria-invalid />
        <Checkbox accessibilityLabel="Disabled" disabled />
        <Checkbox accessibilityLabel="Disabled on" disabled defaultChecked />
      </Example>
      <Example title="With a label">
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => setIsChecked(!isChecked)}
        >
          <Checkbox
            accessibilityLabel="Accept the terms"
            checked={isChecked}
            onCheckedChange={setIsChecked}
          />
          <Text>Accept the terms</Text>
        </Pressable>
        <View>
          <Text className="text-muted-foreground">
            {isChecked ? "Accepted" : "Not accepted"}
          </Text>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { CheckboxExample }
