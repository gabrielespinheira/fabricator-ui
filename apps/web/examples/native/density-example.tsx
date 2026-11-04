import { Example, ExampleWrapper } from "@/examples/native/example"

import { Button } from "@/registry/native/ui/button"
import { DensityProvider } from "@/registry/native/ui/density"
import { Input } from "@/registry/native/ui/input"

const DENSITIES = ["compact", "default", "spacious"] as const

function DensityExample() {
  return (
    <ExampleWrapper>
      {DENSITIES.map((density) => (
        <Example key={density} title={density}>
          <DensityProvider density={density}>
            <Button>Control</Button>
            <Input placeholder="Text field" />
          </DensityProvider>
        </Example>
      ))}
    </ExampleWrapper>
  )
}

export { DensityExample }
