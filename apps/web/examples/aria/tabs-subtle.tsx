import { CodeIcon, EyeIcon, HistoryIcon, SettingsIcon } from "lucide-react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/aria-fabricator/ui/tabs"

export function TabsSubtle() {
  return (
    <Tabs defaultSelectedKey="preview" className="w-full max-w-sm">
      <TabsList variant="subtle">
        <TabsTrigger id="preview">
          <EyeIcon />
          Preview
        </TabsTrigger>
        <TabsTrigger id="code">
          <CodeIcon />
          Code
        </TabsTrigger>
        <TabsTrigger id="history">
          <HistoryIcon />
          History
        </TabsTrigger>
        <TabsTrigger id="settings">
          <SettingsIcon />
          Settings
        </TabsTrigger>
      </TabsList>
      <TabsContent id="preview">The rendered result.</TabsContent>
      <TabsContent id="code">The source.</TabsContent>
      <TabsContent id="history">Every saved version.</TabsContent>
      <TabsContent id="settings">How this file builds.</TabsContent>
    </Tabs>
  )
}
