import { Example, ExampleWrapper } from "@/examples/native/example"
import { Image } from "react-native"

import { AspectRatio } from "@/registry/native/ui/aspect-ratio"
import { Text } from "@/registry/native/ui/text"

const PHOTO =
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&auto=format&fit=crop&q=80"

function AspectRatioExample() {
  return (
    <ExampleWrapper>
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
          className="items-center justify-center rounded-lg bg-muted"
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
