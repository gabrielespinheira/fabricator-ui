import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { Image } from "react-native"

import { AspectRatio } from "@/registry/native/ui/aspect-ratio"
import { Text } from "@/registry/native/ui/text"
import { ToggleGroup, ToggleGroupItem } from "@/registry/native/ui/toggle-group"

const RATIOS = [
  { label: "16:9", ratio: 16 / 9 },
  { label: "1:1", ratio: 1 },
  { label: "3:4", ratio: 3 / 4 },
]

const LAKE =
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80"

const PHOTO =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"

function AspectRatioExample() {
  const [selected, setSelected] = React.useState(RATIOS[0])
  return (
    <ExampleWrapper>
      <Example title="Changing the ratio: the frame glides">
        <AspectRatio
          ratio={selected.ratio}
          className="w-56 overflow-hidden rounded-xl bg-muted"
        >
          <Image
            src={LAKE}
            alt="A rowing boat on a turquoise mountain lake"
            className="size-full"
          />
        </AspectRatio>
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[selected.label]}
          onValueChange={(next) => {
            const match = RATIOS.find((item) => item.label === next[0])
            if (match) setSelected(match)
          }}
        >
          {RATIOS.map((item) => (
            <ToggleGroupItem key={item.label} value={item.label}>
              {item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Example>
      <Example title="16:9" className="items-stretch">
        <AspectRatio
          ratio={16 / 9}
          className="overflow-hidden rounded-lg bg-muted"
        >
          <Image
            src={PHOTO}
            alt="An office with plants by the window"
            className="size-full"
          />
        </AspectRatio>
      </Example>
      <Example title="Square" className="items-stretch">
        <AspectRatio
          ratio={1}
          className="items-center justify-center rounded-lg bg-muted md:w-60"
        >
          <Text className="text-muted-foreground">1:1</Text>
        </AspectRatio>
      </Example>
      <Example title="Portrait" className="items-stretch">
        <AspectRatio
          ratio={9 / 16}
          className="w-1/2 items-center justify-center rounded-lg bg-muted"
        >
          <Text className="text-muted-foreground">9:16</Text>
        </AspectRatio>
      </Example>
    </ExampleWrapper>
  )
}

export { AspectRatioExample }
