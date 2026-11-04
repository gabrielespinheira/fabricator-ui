import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { Pressable } from "react-native"

import { Checkbox } from "@/registry/native/ui/checkbox"
import { Input } from "@/registry/native/ui/input"
import { Label } from "@/registry/native/ui/label"

function LabelExample() {
  const [isChecked, setIsChecked] = React.useState(false)
  return (
    <ExampleWrapper>
      <Example title="With a checkbox">
        <Pressable
          className="flex-row items-center gap-2"
          onPress={() => setIsChecked(!isChecked)}
        >
          <Checkbox
            accessibilityLabel="Accept terms and conditions"
            checked={isChecked}
            onCheckedChange={setIsChecked}
          />
          <Label>Accept terms and conditions</Label>
        </Pressable>
      </Example>
      <Example title="With an input" className="items-stretch gap-2">
        <Label nativeID="email-label">Email</Label>
        <Input
          aria-labelledby="email-label"
          placeholder="gabs@fabricator.dev"
        />
      </Example>
      <Example title="Disabled" className="items-stretch gap-2">
        <Label disabled nativeID="company-label">
          Company
        </Label>
        <Input
          aria-labelledby="company-label"
          editable={false}
          placeholder="Acme Inc"
        />
      </Example>
    </ExampleWrapper>
  )
}

export { LabelExample }
