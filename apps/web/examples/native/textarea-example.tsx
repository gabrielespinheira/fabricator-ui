import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { Text } from "@/registry/native/ui/text"
import { Textarea } from "@/registry/native/ui/textarea"

function TextareaExample() {
  const [value, setValue] = React.useState("Thanks for the quick reply.")
  return (
    <ExampleWrapper>
      <Example title="Default">
        <Textarea placeholder="Type your message here." />
      </Example>
      <Example title="Controlled">
        <Textarea value={value} onChangeText={setValue} />
        <Text className="text-muted-foreground">{value.length} characters</Text>
      </Example>
      <Example title="Invalid">
        <Textarea aria-invalid defaultValue="Too short" />
      </Example>
      <Example title="Disabled">
        <Textarea disabled defaultValue="Replies are closed." />
      </Example>
    </ExampleWrapper>
  )
}

export { TextareaExample }
