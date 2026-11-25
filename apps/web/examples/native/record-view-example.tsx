import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  RecordView,
  RecordViewSection,
  type RecordViewMode,
  type RecordViewProps,
} from "@/registry/native/ui/record-view"
import { Text } from "@/registry/native/ui/text"

const states: NonNullable<RecordViewProps["state"]>[] = [
  "ready",
  "loading",
  "missing",
  "error",
]

function RecordViewExample() {
  const [open, setOpen] = React.useState(false)
  const [state, setState] = React.useState<RecordViewProps["state"]>("ready")
  const [title, setTitle] = React.useState("Northwind Traders")
  const [mode, setMode] = React.useState<RecordViewMode>("side")
  return (
    <ExampleWrapper>
      <Example title="States">
        <View className="flex-row flex-wrap gap-2">
          {states.map((next) => (
            <Button
              key={next}
              variant="outline"
              onPress={() => {
                setState(next)
                setOpen(true)
              }}
            >
              {next.charAt(0).toUpperCase() + next.slice(1)}
            </Button>
          ))}
        </View>
        <RecordView
          open={open}
          onOpenChange={setOpen}
          mode={mode}
          onModeChange={setMode}
          context="Accounts"
          state={state}
          onRetry={() => setState("ready")}
          title={title}
          onTitleChange={setTitle}
        >
          <RecordViewSection title="Last call">
            <Text>
              They want a security review before the trial ends, and a price for
              60 seats.
            </Text>
          </RecordViewSection>
        </RecordView>
      </Example>
    </ExampleWrapper>
  )
}

export { RecordViewExample }
