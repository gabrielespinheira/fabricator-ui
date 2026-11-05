import { Example, ExampleWrapper } from "@/examples/native/example"

import { Input } from "@/registry/native/ui/input"

function InputExample() {
  return (
    <ExampleWrapper fit>
      <Example title="Default">
        <Input
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Example>
      <Example title="With a value">
        <Input defaultValue="gabs@fabricator.dev" />
      </Example>
      <Example title="Invalid">
        <Input aria-invalid defaultValue="not an email" />
      </Example>
      <Example title="Disabled">
        <Input
          editable={false}
          defaultValue="Read only"
          className="opacity-50"
        />
      </Example>
    </ExampleWrapper>
  )
}

export { InputExample }
