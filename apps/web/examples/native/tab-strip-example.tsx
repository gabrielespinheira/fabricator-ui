import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import {
  CodeIcon,
  FileTextIcon,
  GlobeIcon,
  TerminalIcon,
  TrashIcon,
} from "@fabricator-ui/icons-react-native"
import { View } from "react-native"

import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
  type TabStripStatus,
} from "@/registry/native/ui/tab-strip"
import { Text } from "@/registry/native/ui/text"

type Doc = {
  title: string
  icon: React.ComponentProps<typeof TabStripTab>["icon"]
  status?: TabStripStatus
}

const INITIAL_DOCS: Record<string, Doc> = {
  readme: { title: "README.md", icon: FileTextIcon, status: "dirty" },
  shell: { title: "app-shell.tsx", icon: CodeIcon },
  docs: { title: "Docs", icon: GlobeIcon, status: "loading" },
  terminal: { title: "Terminal", icon: TerminalIcon, status: "waiting" },
  broken: { title: "Failed build", icon: FileTextIcon, status: "error" },
}

function TabStripExample() {
  const [docs, setDocs] = React.useState(INITIAL_DOCS)
  const [smallValue, setSmallValue] = React.useState("one")
  const [defaultValue, setDefaultValue] = React.useState("one")
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["readme", "shell", "docs", "terminal", "broken"],
      pinned: [],
      recent: ["shell"],
      preview: "docs",
      closed: [],
    },
  })

  const openNew = () => {
    const id = `untitled-${Object.keys(docs).length}`
    setDocs((current) => ({
      ...current,
      [id]: { title: "Untitled", icon: FileTextIcon },
    }))
    tabs.open(id)
  }

  return (
    <ExampleWrapper>
      <Example title="Long press a tab for its menu" className="gap-0 p-0">
        <TabStrip
          {...tabs.stripProps}
          onNew={openNew}
          onRename={(id, title) =>
            setDocs((current) => {
              const doc = current[id]
              return doc ? { ...current, [id]: { ...doc, title } } : current
            })
          }
          className="w-full"
        >
          <TabStripList aria-label="Open files">
            {tabs.state.tabs.map((id) => {
              const doc = docs[id]
              if (!doc) return null
              return (
                <TabStripTab
                  key={id}
                  value={id}
                  icon={doc.icon}
                  status={doc.status}
                  pinned={tabs.state.pinned.includes(id)}
                  preview={tabs.state.preview === id}
                  actions={[
                    {
                      id: "delete",
                      label: "Delete file",
                      icon: TrashIcon,
                      destructive: true,
                      separatorBefore: true,
                      onSelect: () => tabs.close([id]),
                    },
                  ]}
                >
                  {doc.title}
                </TabStripTab>
              )
            })}
          </TabStripList>
          <TabStripNew />
          <TabStripOverflow />
        </TabStrip>
        <View className="min-h-24 w-full border-t border-border p-4">
          <Text className="text-muted-foreground">
            {tabs.activeId ? docs[tabs.activeId]?.title : "No open tabs"}
          </Text>
        </View>
      </Example>
      <Example title="Size sm" className="p-0">
        <TabStrip
          value={smallValue}
          onValueChange={setSmallValue}
          size="sm"
          className="w-full"
        >
          <TabStripList>
            <TabStripTab value="one">One</TabStripTab>
            <TabStripTab value="two">Two</TabStripTab>
          </TabStripList>
        </TabStrip>
      </Example>
      <Example title="Size default, nothing closable" className="p-0">
        <TabStrip
          value={defaultValue}
          onValueChange={setDefaultValue}
          size="default"
          className="w-full"
        >
          <TabStripList>
            <TabStripTab value="one">One</TabStripTab>
            <TabStripTab value="two" closable={false}>
              Two
            </TabStripTab>
          </TabStripList>
        </TabStrip>
      </Example>
    </ExampleWrapper>
  )
}

export { TabStripExample }
