import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"
import { useCSSVariable } from "uniwind"

import { Badge } from "@/registry/native/ui/badge"
import { Button } from "@/registry/native/ui/button"
import {
  Gooey,
  GooeyProvider,
  type GooeySettings,
} from "@/registry/native/ui/gooey"
import { Slider } from "@/registry/native/ui/slider"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/native/ui/tabs"

function GooeyExample() {
  const [mode, setMode] = React.useState<GooeySettings["mode"]>("expressive")
  const [waviness, setWaviness] = React.useState(0.35)
  const [morph, setMorph] = React.useState(0)
  const [melt, setMelt] = React.useState(0)
  const [neutral, blue, green] = useCSSVariable([
    "--muted",
    "--info-surface-4",
    "--success-surface-4",
  ])

  return (
    <GooeyProvider mode={mode} waviness={waviness}>
      <ExampleWrapper fit>
        <Example title="Gooey settings">
          <View className="flex-row flex-wrap gap-2">
            {(["off", "subtle", "expressive"] as const).map((choice) => (
              <Button
                key={choice}
                variant={mode === choice ? "secondary" : "outline"}
                accessibilityState={{ selected: mode === choice }}
                onPress={() => setMode(choice)}
              >
                {choice[0].toUpperCase() + choice.slice(1)}
              </Button>
            ))}
          </View>
          <Slider
            accessibilityLabel="Waviness"
            gooey={false}
            value={waviness}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(next) => {
              if (typeof next === "number") setWaviness(next)
            }}
          />
        </Example>
        <Example title="Move · Tabs">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              Your project at a glance.
            </TabsContent>
            <TabsContent value="activity">
              Recent changes to your project.
            </TabsContent>
            <TabsContent value="files">
              Files shared with your team.
            </TabsContent>
          </Tabs>
        </Example>
        <Example title="Bend · Slider">
          <Slider accessibilityLabel="Volume" defaultValue={45} />
        </Example>
        <Example title="Morph · Button">
          <View className="relative h-16 w-44 flex-row items-center justify-center gap-1">
            <Gooey
              effect="morph"
              progress={morph}
              fill={typeof neutral === "string" ? neutral : undefined}
              width="100%"
              height="100%"
              style={{ position: "absolute" }}
            />
            <Button
              size="sm"
              variant="ghost"
              onPress={() => setMorph(morph > 0 ? 0 : 1)}
            >
              Add
            </Button>
            {morph > 0 && (
              <Button size="sm" variant="ghost" onPress={() => setMorph(0)}>
                Import
              </Button>
            )}
          </View>
          <Slider
            accessibilityLabel="Split actions"
            gooey={false}
            value={morph}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(next) => {
              if (typeof next === "number") setMorph(next)
            }}
          />
        </Example>
        <Example title="Melt · Badge">
          <View className="relative h-16 w-44 flex-row items-center justify-center gap-1">
            <Gooey
              effect="melt"
              progress={melt}
              fill={typeof blue === "string" ? blue : undefined}
              accentFill={typeof green === "string" ? green : undefined}
              width="100%"
              height="100%"
              style={{ position: "absolute" }}
            />
            <Badge variant="ghost">Draft</Badge>
            <Badge variant="ghost">Ready</Badge>
          </View>
          <Slider
            accessibilityLabel="Blend badges"
            gooey={false}
            value={melt}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(next) => {
              if (typeof next === "number") setMelt(next)
            }}
          />
        </Example>
      </ExampleWrapper>
    </GooeyProvider>
  )
}

export { GooeyExample }
