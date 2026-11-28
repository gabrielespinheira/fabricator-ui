import { Example, ExampleWrapper } from "@/examples/native/example"

import { Delta } from "@/registry/native/ui/delta"

function DeltaExample() {
  return (
    <ExampleWrapper>
      <Example title="Up and down">
        <Delta change={12.4} />
        <Delta change={-3.1} />
      </Example>
      <Example title="Down is good">
        <Delta change={-0.4} isGoodWhenUp={false} unit="pt" />
        <Delta change={2.1} isGoodWhenUp={false} />
      </Example>
      <Example title="No change and no data">
        <Delta change={0} />
        <Delta change={null} />
      </Example>
    </ExampleWrapper>
  )
}

export { DeltaExample }
