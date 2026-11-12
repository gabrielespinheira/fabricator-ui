import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { Rating } from "@/registry/native/ui/rating"
import { Text } from "@/registry/native/ui/text"

const VARIANTS = [
  { variant: "default", label: "Default" },
  { variant: "primary", label: "Primary" },
  { variant: "info", label: "Info" },
  { variant: "success", label: "Success" },
  { variant: "warning", label: "Warning" },
  { variant: "error", label: "Error" },
] as const

function RatingExample() {
  const [value, setValue] = React.useState(2.5)
  return (
    <ExampleWrapper>
      <Example title="Half stars">
        <Rating
          defaultValue={3.5}
          step={0.5}
          size="lg"
          aria-label="Your rating"
        />
      </Example>
      <Example title="Variants">
        <View className="gap-3">
          {VARIANTS.map(({ variant, label }) => (
            <View key={variant} className="flex-row items-center gap-4">
              <Text className="w-20 text-(length:--density-text-13) text-muted-foreground">
                {label}
              </Text>
              <Rating
                variant={variant}
                defaultValue={3.5}
                step={0.5}
                aria-label={`${label} rating`}
              />
            </View>
          ))}
        </View>
      </Example>
      <Example title="Sizes">
        <View className="gap-4">
          <Rating size="sm" defaultValue={4} aria-label="Small rating" />
          <Rating defaultValue={4} aria-label="Default rating" />
          <Rating size="lg" defaultValue={4} aria-label="Large rating" />
        </View>
      </Example>
      <Example title="Read-only">
        <View className="flex-row items-center gap-2">
          <Text className="text-(length:--density-text-14) font-medium">
            4.3
          </Text>
          <Rating value={4.3} readOnly size="sm" aria-label="Average rating" />
          <Text className="text-(length:--density-text-14) text-muted-foreground">
            1,284 reviews
          </Text>
        </View>
      </Example>
      <Example title="Controlled">
        <View className="flex-row items-center gap-4">
          <Rating
            value={value}
            onValueChange={setValue}
            step={0.5}
            aria-label="Delivery"
          />
          <Text className="text-(length:--density-text-14) text-muted-foreground">
            {value} / 5
          </Text>
          <Button
            variant="outline"
            size="sm"
            disabled={value === 0}
            onPress={() => setValue(0)}
          >
            Clear
          </Button>
        </View>
      </Example>
      <Example title="Invalid">
        <Rating defaultValue={0} aria-invalid aria-label="Rate your stay" />
      </Example>
      <Example title="Disabled">
        <Rating defaultValue={3} disabled aria-label="Rating" />
      </Example>
    </ExampleWrapper>
  )
}

export { RatingExample }
