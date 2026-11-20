import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/styles/base-fabricator/ui/tabs"

export function TabsGooey() {
  return (
    <Tabs defaultValue="overview">
      <TabsList
        aria-label="Project views"
        gooey={{ effect: "move", intensity: 1, waviness: 0.35 }}
      >
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Your project at a glance.</TabsContent>
      <TabsContent value="activity">
        Recent changes to your project.
      </TabsContent>
      <TabsContent value="files">Files shared with your team.</TabsContent>
    </Tabs>
  )
}
