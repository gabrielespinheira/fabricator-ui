import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  PreviewRail,
  type PreviewRailItem,
} from "@/registry/native/ui/preview-rail"
import { Text } from "@/registry/native/ui/text"

const SECTIONS = [
  {
    value: "introduction",
    label: "Introduction",
    description: "What the library is and who it's for.",
  },
  {
    value: "installation",
    label: "Installation",
    description: "Add the CLI and set up your first project.",
  },
  {
    value: "theming",
    label: "Theming",
    description: "Colours, radius and fonts from one look.",
  },
  {
    value: "density",
    label: "Density",
    description: "Compact, default and spacious sizes per region.",
  },
  {
    value: "motion",
    label: "Motion",
    description: "Four speeds that retime every animation.",
  },
  {
    value: "components",
    label: "Components",
    description: "Every control, surface and layout piece.",
  },
  {
    value: "icons",
    label: "Icons",
    description: "Outline, duotone, brand and file icons.",
  },
  {
    value: "changelog",
    label: "Changelog",
    description: "What shipped in each release.",
  },
]

const FOLDERS = [
  { value: "inbox", label: "Inbox", description: "12 unread" },
  { value: "starred", label: "Starred", description: "4 conversations" },
  { value: "drafts", label: "Drafts", description: "2 drafts" },
  { value: "sent", label: "Sent", description: "Last sent today at 09:40" },
  { value: "archive", label: "Archive", description: "1,284 conversations" },
  { value: "spam", label: "Spam", description: "Empty", disabled: true },
  { value: "trash", label: "Trash", description: "Emptied every 30 days" },
]

const CHAPTERS = [
  { value: "0", label: "Welcome", time: "0:00" },
  { value: "45", label: "Setting up the project", time: "0:45" },
  { value: "190", label: "Your first screen", time: "3:10" },
  { value: "372", label: "Forms and validation", time: "6:12" },
  { value: "530", label: "Dark mode", time: "8:50" },
  { value: "641", label: "Motion and density", time: "10:41" },
  { value: "802", label: "Shipping to the App Store", time: "13:22" },
  { value: "955", label: "Wrapping up", time: "15:55" },
]

const TIME_BY_VALUE = new Map(
  CHAPTERS.map((chapter) => [chapter.value, chapter.time])
)

function renderChapter(item: PreviewRailItem) {
  return (
    <View className="gap-1">
      <Text className="text-xs text-muted-foreground tabular-nums">
        {TIME_BY_VALUE.get(item.value)}
      </Text>
      <Text className="font-medium text-foreground">{item.label}</Text>
    </View>
  )
}

function PreviewRailExample() {
  const [folder, setFolder] = React.useState("inbox")
  const label = FOLDERS.find((item) => item.value === folder)?.label
  return (
    <ExampleWrapper>
      <Example title="Default">
        <PreviewRail
          items={SECTIONS}
          defaultValue="components"
          aria-label="Documentation"
        />
      </Example>
      <Example title="Horizontal, with a custom card">
        <View className="w-full items-center pt-20">
          <PreviewRail
            items={CHAPTERS}
            orientation="horizontal"
            renderPreview={renderChapter}
            aria-label="Chapters"
          />
        </View>
      </Example>
      <Example title="Controlled, card before the rail, one disabled">
        <View className="w-full flex-row items-center justify-end gap-8">
          <Text className="text-sm text-muted-foreground">
            Showing <Text className="font-medium text-foreground">{label}</Text>
          </Text>
          <PreviewRail
            items={FOLDERS}
            value={folder}
            onValueChange={setFolder}
            side="start"
            aria-label="Folders"
          />
        </View>
      </Example>
    </ExampleWrapper>
  )
}

export { PreviewRailExample }
