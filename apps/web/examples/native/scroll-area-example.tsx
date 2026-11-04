import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { ScrollArea, ScrollBar } from "@/registry/native/ui/scroll-area"
import { Text } from "@/registry/native/ui/text"

const TAGS = Array.from(
  { length: 50 },
  (_, index) => `v1.2.0-beta.${50 - index}`
)

const ARTWORKS = [
  { artist: "Ornella Binni", tone: "bg-primary" },
  { artist: "Tom Byrom", tone: "bg-info" },
  { artist: "Vladimir Malyavko", tone: "bg-success" },
  { artist: "Maria Santos", tone: "bg-warning" },
  { artist: "Gabs", tone: "bg-destructive" },
]

function ScrollAreaExample() {
  return (
    <ExampleWrapper>
      <Example title="Vertical" className="items-stretch">
        <ScrollArea className="h-72 rounded-md border border-border">
          <View className="gap-2 p-4">
            <Text className="font-medium">Tags</Text>
            {TAGS.map((tag) => (
              <Text key={tag}>{tag}</Text>
            ))}
          </View>
        </ScrollArea>
      </Example>
      <Example title="Horizontal" className="items-stretch">
        <ScrollArea className="rounded-md border border-border">
          <View className="flex-row gap-4 p-4">
            {ARTWORKS.map((artwork) => (
              <View key={artwork.artist} className="shrink-0 gap-2">
                <View className={`h-40 w-32 rounded-md ${artwork.tone}`} />
                <Text className="text-xs text-muted-foreground">
                  Photo by {artwork.artist}
                </Text>
              </View>
            ))}
          </View>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </Example>
      <Example
        title="On a card, with its colour for the fade"
        className="items-stretch"
      >
        <ScrollArea className="h-40" fadeColor="#ffffff">
          {TAGS.map((tag) => (
            <Text key={tag}>{tag}</Text>
          ))}
        </ScrollArea>
      </Example>
      <Example title="Plain text scrolls too" className="items-stretch">
        <ScrollArea className="h-24">
          Bare text in the area needs no wrapper of its own.
        </ScrollArea>
      </Example>
    </ExampleWrapper>
  )
}

export { ScrollAreaExample }
