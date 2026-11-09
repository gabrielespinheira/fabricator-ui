import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Badge } from "@/registry/native/ui/badge"
import { Button } from "@/registry/native/ui/button"
import { Spinner } from "@/registry/native/ui/spinner"
import { Text } from "@/registry/native/ui/text"

function SpinnerExample() {
  return (
    <ExampleWrapper>
      <Example
        title="Matrix patterns"
        className="flex-row flex-wrap items-center"
      >
        {(
          [
            "orbit",
            "ripple",
            "cascade",
            "wave",
            "pulse",
            "braid",
            "comet",
            "bounce",
            "equalizer",
            "flip",
            "scan",
            "quad-swap",
            "quad-fold",
            "tic-tac",
            "bloom",
            "checker",
            "diagonal",
            "triangle",
            "square",
            "rings",
            "hex",
            "ring",
          ] as const
        ).map((value) => (
          <View key={value} className="items-center gap-3">
            <Spinner variant={value} className="size-8" />
            <Text>
              {value.charAt(0).toUpperCase() +
                value.slice(1).replaceAll("-", " ")}
            </Text>
          </View>
        ))}
      </Example>
      <Example title="Sizes" className="flex-row items-center">
        <Spinner className="size-3" />
        <Spinner />
        <Spinner className="size-6" />
        <Spinner className="size-8" />
      </Example>
      <Example title="Colours" className="flex-row items-center">
        <Spinner className="text-primary" />
        <Spinner className="text-destructive" />
        <Spinner className="text-muted-foreground" />
      </Example>
      <Example title="In a button" className="flex-row flex-wrap items-center">
        <Button disabled>
          <Spinner />
          Saving
        </Button>
        <Button variant="outline" disabled>
          <Spinner />
          Loading
        </Button>
      </Example>
      <Example title="In a badge">
        <Badge variant="secondary">
          <Spinner className="size-3" />
          Syncing
        </Badge>
      </Example>
      <Example title="Labelled">
        <Spinner aria-label="Sending your message" />
      </Example>
    </ExampleWrapper>
  )
}

export { SpinnerExample }
