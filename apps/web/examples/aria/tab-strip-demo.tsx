"use client"

import * as React from "react"
import { CodeIcon, FileTextIcon, GlobeIcon, TerminalIcon } from "lucide-react"

import {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
  type TabStripStatus,
} from "@/styles/aria-fabricator/ui/tab-strip"

type Doc = {
  title: string
  icon: React.ComponentType<{ className?: string }>
  status?: TabStripStatus
}

const INITIAL_DOCS: Record<string, Doc> = {
  readme: { title: "README.md", icon: FileTextIcon, status: "dirty" },
  shell: { title: "app-shell.tsx", icon: CodeIcon },
  docs: { title: "Docs", icon: GlobeIcon, status: "loading" },
  terminal: { title: "Terminal", icon: TerminalIcon, status: "waiting" },
}

export function TabStripDemo() {
  const [docs, setDocs] = React.useState(INITIAL_DOCS)
  const tabs = useTabStripState({
    defaultState: {
      tabs: ["readme", "shell", "docs", "terminal"],
      pinned: [],
      recent: ["shell"],
      preview: "docs",
      closed: [],
    },
  })

  const openNew = () => {
    const id = `untitled-${Date.now()}`
    setDocs((current) => ({
      ...current,
      [id]: { title: "Untitled", icon: FileTextIcon },
    }))
    tabs.open(id)
  }

  return (
    <div className="w-full max-w-2xl overflow-hidden rounded-xl border bg-sidebar">
      <TabStrip
        {...tabs.stripProps}
        onNew={openNew}
        onRename={(id, title) =>
          setDocs((current) => {
            const doc = current[id]
            return doc ? { ...current, [id]: { ...doc, title } } : current
          })
        }
        panelId="tab-strip-demo-panel"
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
              >
                {doc.title}
              </TabStripTab>
            )
          })}
        </TabStripList>
        <TabStripNew />
        <TabStripOverflow />
      </TabStrip>
      <div
        id="tab-strip-demo-panel"
        role="tabpanel"
        className="min-h-40 border-t bg-background p-4 text-sm text-muted-foreground"
      >
        {tabs.activeId ? docs[tabs.activeId]?.title : "No open tabs"}
      </div>
    </div>
  )
}
