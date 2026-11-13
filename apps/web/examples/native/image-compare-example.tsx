import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { ImageCompare } from "@/registry/native/ui/image-compare"
import { Text } from "@/registry/native/ui/text"

const MEDIA = "https://fabricator-ui.vercel.app/media"
const BEFORE = `${MEDIA}/image-compare-before.webp`
const AFTER = `${MEDIA}/image-compare-after.webp`
const BEFORE_ALT =
  "A fishing village on a rocky coast at sunset, straight from the camera"
const AFTER_ALT = "The same village after a warm colour grade"

const STOPS = [
  { label: "Raw", value: 100 },
  { label: "Split", value: 50 },
  { label: "Graded", value: 0 },
]

function ImageCompareExample() {
  const [value, setValue] = React.useState(50)
  return (
    <ExampleWrapper fit>
      <Example title="Default">
        <ImageCompare
          beforeSrc="https://fabricator-ui.vercel.app/media/image-compare-before.webp"
          afterSrc="https://fabricator-ui.vercel.app/media/image-compare-after.webp"
          beforeAlt="A fishing village on a rocky coast at sunset, straight from the camera"
          afterAlt="The same village after a warm colour grade"
          className="w-full"
        />
      </Example>
      <Example title="Labels and shape">
        <ImageCompare
          beforeSrc={BEFORE}
          afterSrc={AFTER}
          beforeAlt={BEFORE_ALT}
          afterAlt={AFTER_ALT}
          beforeLabel="Raw"
          afterLabel="Graded"
          defaultValue={30}
          className="aspect-4/5 w-full max-w-xs rounded-3xl"
        />
      </Example>
      <Example title="Controlled, without labels">
        <ImageCompare
          beforeSrc={BEFORE}
          afterSrc={AFTER}
          beforeAlt={BEFORE_ALT}
          afterAlt={AFTER_ALT}
          beforeLabel="Raw"
          afterLabel="Graded"
          hasLabels={false}
          value={value}
          onValueChange={setValue}
          className="w-full"
        />
        <View className="flex-row items-center gap-2">
          {STOPS.map((stop) => (
            <Button
              key={stop.label}
              variant={
                Math.round(value) === stop.value ? "secondary" : "outline"
              }
              size="sm"
              onPress={() => setValue(stop.value)}
            >
              {stop.label}
            </Button>
          ))}
        </View>
        <Text className="text-(length:--density-text-12) text-muted-foreground">
          Raw {Math.round(value)}%
        </Text>
      </Example>
      <Example title="Disabled">
        <ImageCompare
          beforeSrc={BEFORE}
          afterSrc={AFTER}
          beforeAlt={BEFORE_ALT}
          afterAlt={AFTER_ALT}
          defaultValue={40}
          disabled
          className="w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}

export { ImageCompareExample }
