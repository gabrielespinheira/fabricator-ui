import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/aria-fabricator/ui/tabs"

export function TabsGooey() {
  return (
    <Tabs defaultSelectedKey="overview">
      <TabsList
        aria-label="Project views"
        gooey={{ effect: "move", intensity: 1, waviness: 0.35 }}
      >
        <TabsTrigger id="overview">Overview</TabsTrigger>
        <TabsTrigger id="activity">Activity</TabsTrigger>
        <TabsTrigger id="files">Files</TabsTrigger>
      </TabsList>
      <TabsContent id="overview">Your project at a glance.</TabsContent>
      <TabsContent id="activity">
        Recent changes to your project.
      </TabsContent>
      <TabsContent id="files">Files shared with your team.</TabsContent>
    </Tabs>
  )
}
