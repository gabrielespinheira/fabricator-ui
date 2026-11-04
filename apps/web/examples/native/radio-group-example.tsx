import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { Pressable } from "react-native"

import { RadioGroup, RadioGroupItem } from "@/registry/native/ui/radio-group"
import { Text } from "@/registry/native/ui/text"

const PLANS = ["Starter", "Pro", "Enterprise"]

function RadioGroupExample() {
  const [plan, setPlan] = React.useState("Pro")
  return (
    <ExampleWrapper>
      <Example title="Default">
        <RadioGroup defaultValue="comfortable">
          <RadioGroupItem accessibilityLabel="Default" value="default" />
          <RadioGroupItem
            accessibilityLabel="Comfortable"
            value="comfortable"
          />
          <RadioGroupItem accessibilityLabel="Compact" value="compact" />
        </RadioGroup>
      </Example>
      <Example title="Controlled, with labels">
        <RadioGroup value={plan} onValueChange={setPlan}>
          {PLANS.map((name) => (
            <Pressable
              key={name}
              className="flex-row items-center gap-2"
              onPress={() => setPlan(name)}
            >
              <RadioGroupItem accessibilityLabel={name} value={name} />
              <Text>{name}</Text>
            </Pressable>
          ))}
        </RadioGroup>
        <Text className="text-muted-foreground">Plan: {plan}</Text>
      </Example>
      <Example title="Invalid">
        <RadioGroup defaultValue="no">
          <RadioGroupItem accessibilityLabel="Yes" value="yes" aria-invalid />
          <RadioGroupItem accessibilityLabel="No" value="no" aria-invalid />
        </RadioGroup>
      </Example>
      <Example title="A disabled item">
        <RadioGroup defaultValue="on">
          <RadioGroupItem accessibilityLabel="Available" value="on" />
          <RadioGroupItem accessibilityLabel="Sold out" value="off" disabled />
        </RadioGroup>
      </Example>
      <Example title="All disabled">
        <RadioGroup disabled defaultValue="a">
          <RadioGroupItem accessibilityLabel="Option A" value="a" />
          <RadioGroupItem accessibilityLabel="Option B" value="b" />
        </RadioGroup>
      </Example>
      <Example title="Read only">
        <RadioGroup readOnly defaultValue="a">
          <RadioGroupItem accessibilityLabel="Option A" value="a" />
          <RadioGroupItem accessibilityLabel="Option B" value="b" />
        </RadioGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { RadioGroupExample }
