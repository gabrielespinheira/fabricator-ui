import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { CodeIcon, EyeIcon } from "@fabricator-ui/icons-react-native"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/native/ui/tabs"
import { Text } from "@/registry/native/ui/text"

function TabsExample() {
  const [tab, setTab] = React.useState("analytics")
  return (
    <ExampleWrapper fit>
      <Example title="Default">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">Your account at a glance.</TabsContent>
          <TabsContent value="analytics">Traffic and conversions.</TabsContent>
          <TabsContent value="reports">Reports you have saved.</TabsContent>
        </Tabs>
      </Example>
      <Example title="Line">
        <Tabs defaultValue="preview" className="w-full">
          <TabsList variant="line">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">The rendered result.</TabsContent>
          <TabsContent value="code">The source.</TabsContent>
        </Tabs>
      </Example>
      <Example title="Icons">
        <Tabs defaultValue="preview" className="w-full">
          <TabsList>
            <TabsTrigger value="preview">
              <EyeIcon />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code">
              <CodeIcon />
              Code
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Example>
      <Example title="Vertical">
        <Tabs orientation="vertical" defaultValue="account" className="w-full">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          <TabsContent value="account">gabs@fabricator.dev</TabsContent>
          <TabsContent value="password">Changed last week.</TabsContent>
        </Tabs>
      </Example>
      <Example title="Controlled, keeping panels mounted">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent keepMounted value="overview">
            Overview
          </TabsContent>
          <TabsContent keepMounted value="analytics">
            Analytics
          </TabsContent>
        </Tabs>
        <Text className="text-muted-foreground">Showing: {tab}</Text>
      </Example>
      <Example title="A disabled tab">
        <Tabs defaultValue="open" className="w-full">
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="locked" disabled>
              Locked
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Example>
    </ExampleWrapper>
  )
}

export { TabsExample }
