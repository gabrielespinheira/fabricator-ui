import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/registry/native/ui/resizable"
import { Text } from "@/registry/native/ui/text"

function Pane({ children }: { children: string }) {
  return (
    <View className="h-full items-center justify-center p-1">
      <Text numberOfLines={1} className="font-semibold">
        {children}
      </Text>
    </View>
  )
}

function ResizableExample() {
  const [sidebar, setSidebar] = React.useState(25)
  return (
    <ExampleWrapper>
      <Example title="Nested" className="items-stretch">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-52 rounded-lg border border-border"
        >
          <ResizablePanel defaultSize="50%">
            <Pane>One</Pane>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="50%">
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel defaultSize="25%">
                <Pane>Two</Pane>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="75%">
                <Pane>Three</Pane>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Example>
      <Example title="Limits, and reading the size" className="items-stretch">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-40 rounded-lg border border-border"
        >
          <ResizablePanel
            defaultSize="25%"
            minSize="15%"
            maxSize="60%"
            onResize={(size) => setSidebar(Math.round(size.asPercentage))}
          >
            <Pane>Sidebar</Pane>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>
            <Pane>Content</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
        <Text className="text-muted-foreground">Sidebar at {sidebar}%</Text>
      </Example>
      <Example title="Vertical, without a grip" className="items-stretch">
        <ResizablePanelGroup
          orientation="vertical"
          className="h-52 rounded-lg border border-border"
        >
          <ResizablePanel defaultSize="25%">
            <Pane>Header</Pane>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="75%">
            <Pane>Content</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Example>
      <Example title="Disabled" className="items-stretch">
        <ResizablePanelGroup
          orientation="horizontal"
          disabled
          className="h-32 rounded-lg border border-border"
        >
          <ResizablePanel>
            <Pane>One</Pane>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>
            <Pane>Two</Pane>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Example>
    </ExampleWrapper>
  )
}

export { ResizableExample }
