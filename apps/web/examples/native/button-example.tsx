import { Example, ExampleWrapper } from "@/examples/native/example"
import { ArrowRightIcon, PlusIcon } from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"

const VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const

function ButtonExample() {
  return (
    <ExampleWrapper>
      <Example title="Variants" className="flex-row flex-wrap">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </Example>
      <Example title="Sizes" className="flex-row flex-wrap items-center">
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
      </Example>
      <Example title="Icon sizes" className="flex-row flex-wrap items-center">
        <Button size="icon-xs" variant="outline" accessibilityLabel="Add">
          <PlusIcon />
        </Button>
        <Button size="icon-sm" variant="outline" accessibilityLabel="Add">
          <PlusIcon />
        </Button>
        <Button size="icon" variant="outline" accessibilityLabel="Add">
          <PlusIcon />
        </Button>
        <Button size="icon-lg" variant="outline" accessibilityLabel="Add">
          <PlusIcon />
        </Button>
      </Example>
      <Example title="With an icon" className="flex-row flex-wrap">
        <Button>
          <PlusIcon />
          New task
        </Button>
        <Button variant="outline">
          Continue
          <ArrowRightIcon />
        </Button>
      </Example>
      <Example title="Disabled">
        <View className="flex-row gap-(--density-16)">
          <Button disabled>Disabled</Button>
          <Button disabled variant="outline">
            Disabled
          </Button>
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { ButtonExample }
