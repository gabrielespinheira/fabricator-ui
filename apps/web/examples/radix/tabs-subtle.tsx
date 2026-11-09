import { CodeIcon, EyeIcon, HistoryIcon, SettingsIcon } from "lucide-react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/radix-fabricator/ui/tabs"

export function TabsSubtle() {
  return (
    <Tabs defaultValue="preview" className="w-full max-w-sm">
      <TabsList variant="subtle">
        <TabsTrigger value="preview">
          <EyeIcon />
          Preview
        </TabsTrigger>
        <TabsTrigger value="code">
          <CodeIcon />
          Code
        </TabsTrigger>
        <TabsTrigger value="history">
          <HistoryIcon />
          History
        </TabsTrigger>
        <TabsTrigger value="settings">
          <SettingsIcon />
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent value="preview">The rendered result.</TabsContent>
      <TabsContent value="code">The source.</TabsContent>
      <TabsContent value="history">Every saved version.</TabsContent>
      <TabsContent value="settings">How this file builds.</TabsContent>
    </Tabs>
  )
}
