"use client"

import * as React from "react"
import {
  BrainIcon,
  FilterIcon,
  MailIcon,
  MessageSquareIcon,
  SparklesIcon,
  WebhookIcon,
} from "@fabricator-ui/icons"

import {
  Canvas,
  CanvasControls,
  CanvasHandle,
  CanvasLibrary,
  CanvasMinimap,
  CanvasNode,
  CanvasNodeContent,
  CanvasNodeDescription,
  CanvasNodeFooter,
  CanvasNodeHeader,
  CanvasNodeIcon,
  CanvasNodeStatus,
  CanvasNodeTitle,
  CanvasPanel,
  CanvasSearch,
  type CanvasEdgeRecord,
  type CanvasLibraryItem,
  type CanvasNodeComponent,
  type CanvasNodeProps,
} from "@/styles/base-fabricator/ui/canvas"

type StepKind = "trigger" | "ai" | "filter" | "action"

type StepData = {
  title: string
  description: string
  kind: StepKind
  input?: string
  output?: string
}

const ICONS: Record<StepKind, React.ReactNode> = {
  trigger: <WebhookIcon />,
  ai: <SparklesIcon />,
  filter: <FilterIcon />,
  action: <MailIcon />,
}

function isStepData(data: Record<string, unknown>): data is StepData {
  return typeof data.title === "string" && typeof data.kind === "string"
}

// A workflow step: what runs, what it takes in and what it gives out. The
// handles carry value types, so a step only connects to one that takes its
// output.
function StepNode({ data }: CanvasNodeProps) {
  if (!isStepData(data)) return null
  return (
    <CanvasNode>
      <CanvasNodeHeader>
        <CanvasNodeIcon>{ICONS[data.kind]}</CanvasNodeIcon>
        <CanvasNodeTitle>{data.title}</CanvasNodeTitle>
        <CanvasNodeStatus />
      </CanvasNodeHeader>
      <CanvasNodeContent>
        <CanvasNodeDescription>{data.description}</CanvasNodeDescription>
      </CanvasNodeContent>
      <CanvasNodeFooter />
      {data.input && (
        <CanvasHandle kind="target" side="left" accepts={[data.input]} />
      )}
      {data.output && (
        <CanvasHandle
          kind="source"
          side="right"
          produces={data.output}
          max={data.kind === "trigger" ? 1 : undefined}
        />
      )}
    </CanvasNode>
  )
}

const nodeTypes: Record<string, CanvasNodeComponent> = { step: StepNode }

const nodes = [
  {
    id: "ticket",
    type: "step",
    position: { x: 0, y: 120 },
    color: "blue" as const,
    status: "success" as const,
    data: {
      title: "New ticket",
      description: "Runs when a customer writes to support.",
      kind: "trigger",
      output: "ticket",
    },
  },
  {
    id: "classify",
    type: "step",
    position: { x: 320, y: 120 },
    color: "purple" as const,
    status: "running" as const,
    data: {
      title: "Classify",
      description: "Reads the ticket and labels its topic and urgency.",
      kind: "ai",
      input: "ticket",
      output: "ticket",
    },
  },
  {
    id: "billing",
    type: "step",
    position: { x: 640, y: 0 },
    color: "orange" as const,
    data: {
      title: "Billing only",
      description: "Lets through tickets about invoices and refunds.",
      kind: "filter",
      input: "ticket",
      output: "ticket",
    },
  },
  {
    id: "draft",
    type: "step",
    position: { x: 640, y: 240 },
    color: "purple" as const,
    data: {
      title: "Draft a reply",
      description: "Writes an answer from the help center.",
      kind: "ai",
      input: "ticket",
      output: "text",
    },
  },
  {
    id: "send",
    type: "step",
    position: { x: 960, y: 240 },
    color: "green" as const,
    invalid: "Choose who the reply is sent from.",
    data: {
      title: "Send email",
      description: "Replies to the customer.",
      kind: "action",
      input: "text",
    },
  },
  {
    id: "note",
    type: "note",
    position: { x: 320, y: 340 },
    width: 240,
    height: 104,
    data: {
      text: "Replies wait for review until the drafts are good enough to send on their own.",
    },
  },
]

const edges: CanvasEdgeRecord[] = [
  {
    id: "ticket-classify",
    source: "ticket",
    target: "classify",
    animated: true,
  },
  {
    id: "classify-billing",
    source: "classify",
    target: "billing",
    label: "Billing",
  },
  { id: "classify-draft", source: "classify", target: "draft" },
  { id: "draft-send", source: "draft", target: "send" },
]

let nextId = 1
const library: CanvasLibraryItem[] = [
  {
    id: "ai",
    label: "AI step",
    description: "Ask a model to read or write",
    group: "Steps",
    icon: <BrainIcon />,
    create: (position) => ({
      id: `ai-${nextId++}`,
      type: "step",
      position,
      color: "purple",
      data: {
        title: "AI step",
        description: "Describe what the model should do.",
        kind: "ai",
        input: "ticket",
        output: "text",
      },
    }),
  },
  {
    id: "filter",
    label: "Filter",
    description: "Only let some tickets through",
    group: "Steps",
    icon: <FilterIcon />,
    create: (position) => ({
      id: `filter-${nextId++}`,
      type: "step",
      position,
      color: "orange",
      data: {
        title: "Filter",
        description: "Choose which tickets continue.",
        kind: "filter",
        input: "ticket",
        output: "ticket",
      },
    }),
  },
  {
    id: "slack",
    label: "Post to Slack",
    description: "Tell the team in a channel",
    group: "Actions",
    icon: <MessageSquareIcon />,
    create: (position) => ({
      id: `slack-${nextId++}`,
      type: "step",
      position,
      color: "green",
      data: {
        title: "Post to Slack",
        description: "Sends a message to #support.",
        kind: "action",
        input: "text",
      },
    }),
  },
]

export function CanvasDemo() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      nodeTypes={nodeTypes}
      library={library}
      edgeDefaults={{ type: "smoothstep" }}
      label="Support triage workflow"
      fitView={{
        padding: { top: "64px", right: "48px", bottom: "72px", left: "300px" },
      }}
      className="h-[560px] w-full rounded-xl"
    >
      <CanvasPanel position="top-start">
        <CanvasLibrary items={library} />
      </CanvasPanel>
      <CanvasPanel position="top-end">
        <CanvasSearch />
      </CanvasPanel>
      <CanvasControls />
      <CanvasMinimap />
    </Canvas>
  )
}
