"use client"

import * as React from "react"

import { notifyAutomation } from "@/registry/bases/__base__/blocks/automation-01/components/automation-controls"
import { AutomationHeader } from "@/registry/bases/__base__/blocks/automation-01/components/automation-header"
import { automationIcons } from "@/registry/bases/__base__/blocks/automation-01/components/automation-icons"
import { AutomationInspector } from "@/registry/bases/__base__/blocks/automation-01/components/automation-inspector"
import { automationNodeTypes } from "@/registry/bases/__base__/blocks/automation-01/components/automation-nodes"
import { AutomationSidebar } from "@/registry/bases/__base__/blocks/automation-01/components/automation-sidebar"
import { useAutomationRun } from "@/registry/bases/__base__/blocks/automation-01/hooks/use-automation-run"
import {
  AUTOMATION_EDGES,
  AUTOMATION_NAME,
  AUTOMATION_NODES,
  AUTOMATION_SAMPLE,
  AUTOMATION_TEMPLATES,
  createStep,
  type AutomationTemplate,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-data"
import {
  connectNewStep,
  exportWorkflow,
  formatDuration,
  getFlowHandles,
  insertStepOnEdge,
  readStep,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-model"
import { type CanvasApi } from "@/registry/bases/__base__/hooks/use-canvas"
import { type CanvasLayoutEngine } from "@/registry/bases/__base__/lib/canvas-layout"
import { layoutWithDagre } from "@/registry/bases/__base__/lib/canvas-layout-dagre"
import {
  type CanvasEdge,
  type CanvasPosition,
} from "@/registry/bases/__base__/lib/canvas-model"
import { type CanvasFitOptions } from "@/registry/bases/__base__/lib/canvas-viewport"
import {
  AppShell,
  AppShellMain,
  AppShellPanel,
  useShellPanel,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  Canvas,
  CanvasControls,
  CanvasIssues,
  CanvasLibrary,
  CanvasMinimap,
  CanvasPanel,
  CanvasSearch,
  useCanvas,
  useCanvasState,
  type CanvasLibraryItem,
} from "@/registry/bases/__base__/ui/canvas"

// For an operations team that wires its tools together: the workflow is the
// page, edge to edge, with the step you pick beside it. Steps carry typed
// ports, so an agent only takes a model, memory and tools from below, and
// Test run plays the path a sample ticket takes. Toasts report runs: mount
// your Toaster once in the app's layout.

const PANEL = "step"

// Flows read left to right, so Tidy up ranks them that way.
const layoutRight: CanvasLayoutEngine = (graph, options) =>
  layoutWithDagre(graph, {
    ...options,
    direction: "right",
    nodeGap: 40,
    rankGap: 80,
  })

// The flow opens on where tickets come in and split; the lanes run on to
// the right, a pan or the minimap away.
const OPENING_STEPS = [
  "new-ticket",
  "classify",
  "model",
  "help-center",
  "route-topic",
  "find-invoice",
  "create-issue",
  "draft-reply",
  "assign-oncall",
]

const FIT: CanvasFitOptions = {
  padding: { top: "72px", right: "32px", bottom: "32px", left: "32px" },
  minZoom: 0.5,
}

const OPENING_FIT = { ...FIT, nodeIds: OPENING_STEPS }

// The step a dropped connection or an edge's + adds, to be set up.
const FALLBACK_TEMPLATE = AUTOMATION_TEMPLATES.find(({ id }) => id === "http")
const TOOL_TEMPLATE = AUTOMATION_TEMPLATES.find(({ id }) => id === "tool")
const NEW_STEP_OFFSET = { x: 120, y: 48 }

function createStepId() {
  return `step-${crypto.randomUUID().slice(0, 8)}`
}

export default function AutomationPage() {
  return (
    <AppShell storageKey="automation-01" sidebarWidth="14rem">
      <Automation />
    </AppShell>
  )
}

/** Hands the canvas's commands to the page, which sits outside it. */
function CanvasApiBridge({
  apiRef,
}: {
  apiRef: React.RefObject<CanvasApi | null>
}) {
  const { api } = useCanvas()
  React.useEffect(() => {
    apiRef.current = api
    return () => {
      apiRef.current = null
    }
  }, [api, apiRef])
  return null
}

function Automation() {
  const { nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange } =
    useCanvasState(AUTOMATION_NODES, AUTOMATION_EDGES)
  const [workflowId, setWorkflowId] = React.useState("support-triage")
  const [isLibraryOpen, setLibraryOpen] = React.useState(false)
  const canvas = React.useRef<CanvasApi | null>(null)
  const panel = useShellPanel(PANEL)
  const { run, isRunning, start, stop } = useAutomationRun({
    setNodes,
    setEdges,
  })

  const selectedId =
    nodes.find((node) => node.selected && readStep(node))?.id ?? null
  const issueCount = nodes.filter((node) => node.invalid).length

  const library = React.useMemo<CanvasLibraryItem[]>(
    () =>
      AUTOMATION_TEMPLATES.map((template) => ({
        id: template.id,
        label: template.data.title,
        description: template.data.description,
        group: template.group,
        icon: automationIcons[template.data.icon],
        create: (position) => createStep(template, createStepId(), position),
      })),
    []
  )

  function addStep(
    template: AutomationTemplate,
    position: CanvasPosition,
    connect: (id: string) => CanvasEdge[]
  ) {
    const id = createStepId()
    const step = createStep(template, id, {
      x: position.x - NEW_STEP_OFFSET.x,
      y: position.y - NEW_STEP_OFFSET.y,
    })
    setNodes((current) => [
      ...current.map((node) =>
        node.selected ? { ...node, selected: false } : node
      ),
      step,
    ])
    setEdges(() => connect(id))
    panel.setOpen(true)
  }

  function showStep(id: string) {
    canvas.current?.select({ nodeIds: [id] })
    canvas.current?.focusNode(id)
  }

  function exportFile() {
    const file = new Blob([exportWorkflow(AUTOMATION_NAME, nodes, edges)], {
      type: "application/json",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(file)
    link.download = `${workflowId}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <>
      <AutomationSidebar activeId={workflowId} onNavigate={setWorkflowId} />
      <AppShellMain>
        <AutomationHeader
          name={AUTOMATION_NAME}
          issueCount={issueCount}
          run={run}
          onRun={() =>
            start(nodes, edges, AUTOMATION_SAMPLE.choices, (done) =>
              notifyAutomation(
                "Test run passed",
                `${AUTOMATION_SAMPLE.title} · ${done.path.length} steps in ${formatDuration(done.durationMs)}`
              )
            )
          }
          onStop={stop}
          menu={[
            [
              {
                id: "tidy",
                label: "Tidy up",
                icon: automationIcons.workflow,
                onSelect: () => {
                  canvas.current?.layout(layoutRight)
                  requestAnimationFrame(() =>
                    canvas.current?.fitView({ padding: FIT.padding })
                  )
                },
              },
              {
                id: "library",
                label: isLibraryOpen ? "Hide steps" : "Add a step",
                icon: automationIcons.add,
                onSelect: () => setLibraryOpen((open) => !open),
              },
            ],
            [
              {
                id: "export",
                label: "Export as JSON",
                icon: automationIcons.download,
                onSelect: exportFile,
              },
            ],
          ]}
        />
        <div className="relative min-h-0 flex-1">
          <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={automationNodeTypes}
            edgeDefaults={{ type: "smoothstep", ...getFlowHandles() }}
            library={library}
            layout={layoutRight}
            allowCycles={false}
            guides
            fitView={OPENING_FIT}
            mode={isRunning ? "view" : "edit"}
            label={`${AUTOMATION_NAME} workflow`}
            onNodeOpen={() => panel.setOpen(true)}
            onConnectToPane={({ position, source }) => {
              // Model and memory are kinds the library doesn't add, so
              // those ports stay open.
              const port = source.handleId
              if (port === "model" || port === "memory") return
              const template =
                port === "tool" ? TOOL_TEMPLATE : FALLBACK_TEMPLATE
              if (!template) return
              addStep(template, position, (id) => [
                ...edges,
                connectNewStep(source, id),
              ])
            }}
            onEdgeInsert={(edgeId, position) => {
              if (!FALLBACK_TEMPLATE) return
              addStep(FALLBACK_TEMPLATE, position, (id) =>
                insertStepOnEdge(edges, edgeId, id)
              )
            }}
            className="absolute inset-0"
          >
            <CanvasApiBridge apiRef={canvas} />
            {isLibraryOpen && (
              <CanvasPanel position="top-start">
                <CanvasLibrary items={library} title="Add a step" />
              </CanvasPanel>
            )}
            <CanvasPanel position="top-end">
              <CanvasSearch />
            </CanvasPanel>
            <CanvasPanel position="bottom-start">
              <CanvasIssues />
            </CanvasPanel>
            <CanvasControls />
            <CanvasMinimap />
          </Canvas>
        </div>
      </AppShellMain>
      <AppShellPanel
        id={PANEL}
        label="Step"
        defaultOpen
        defaultWidth={320}
        minWidth={280}
        maxWidth={440}
      >
        <AutomationInspector
          nodes={nodes}
          edges={edges}
          run={run}
          selectedId={selectedId}
          onRename={(id, title) =>
            canvas.current?.updateNodeData(id, { title })
          }
          onDelete={(id) => canvas.current?.deleteElements({ nodeIds: [id] })}
          onShowStep={showStep}
        />
      </AppShellPanel>
    </>
  )
}
