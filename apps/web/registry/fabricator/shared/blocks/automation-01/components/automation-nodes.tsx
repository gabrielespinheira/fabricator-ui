"use client"

import { automationIcons } from "@/registry/bases/__base__/blocks/automation-01/components/automation-icons"
import {
  formatDuration,
  isStepData,
  type AutomationResource,
  type AutomationRoute,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-model"
import {
  CanvasHandle,
  CanvasNode,
  CanvasNodeContent,
  CanvasNodeDescription,
  CanvasNodeFooter,
  CanvasNodeHeader,
  CanvasNodeIcon,
  CanvasNodeStatus,
  CanvasNodeTitle,
  type CanvasNodeComponent,
  type CanvasNodeProps,
} from "@/registry/bases/__base__/ui/canvas"

// Steps pass one kind of value, an item, from output to input. An agent also
// takes resources from below: one model, one memory and any number of tools,
// and each resource's handle only fits its own port.

const FLOW = "item"

const PORTS: { id: AutomationResource; label: string; max?: number }[] = [
  { id: "model", label: "Model", max: 1 },
  { id: "memory", label: "Memory", max: 1 },
  { id: "tool", label: "Tools" },
]

function StepNode({ data, status, invalid }: CanvasNodeProps) {
  if (!isStepData(data)) return null
  const hasRoutes = data.routes !== undefined
  const duration =
    status === "success" && data.sample?.durationMs
      ? formatDuration(data.sample.durationMs)
      : undefined
  return (
    <CanvasNode className="w-[calc(var(--density-36)*6.75)]">
      <CanvasNodeHeader>
        <CanvasNodeIcon>{automationIcons[data.icon]}</CanvasNodeIcon>
        <CanvasNodeTitle>{data.title}</CanvasNodeTitle>
        <CanvasNodeStatus />
      </CanvasNodeHeader>
      <CanvasNodeContent>
        <CanvasNodeDescription>{data.description}</CanvasNodeDescription>
      </CanvasNodeContent>
      {data.routes && <StepRoutes routes={data.routes} />}
      <CanvasNodeFooter>
        {invalid ? undefined : (
          <>
            <span className="truncate">{data.app}</span>
            {duration && (
              <span className="ms-auto shrink-0 tabular-nums">{duration}</span>
            )}
          </>
        )}
      </CanvasNodeFooter>
      {data.kind === "agent" && <AgentPorts />}
      {data.kind !== "trigger" && (
        <CanvasHandle kind="target" side="left" id={FLOW} accepts={[FLOW]} />
      )}
      {!hasRoutes && (
        <CanvasHandle kind="source" side="right" id={FLOW} produces={FLOW} />
      )}
    </CanvasNode>
  )
}

/** A router's or condition's outputs, one row each with its own handle. */
function StepRoutes({ routes }: { routes: readonly AutomationRoute[] }) {
  return (
    <ul className="-mx-(--density-12) flex flex-col border-t border-border/60 pt-(--density-4)">
      {routes.map((route) => (
        <li
          key={route.id}
          className="relative flex items-center justify-end px-(--density-12) py-(--density-4) text-(length:--density-text-12) text-muted-foreground"
        >
          {route.label}
          <CanvasHandle
            kind="source"
            side="right"
            id={route.id}
            label={route.label}
            produces={FLOW}
            max={1}
            // The row names the route; the handle's own label would repeat it.
            className="[&>[data-slot=canvas-handle-label]]:sr-only"
          />
        </li>
      ))}
    </ul>
  )
}

/** An agent's resource ports along its bottom edge. */
function AgentPorts() {
  return (
    <div className="-mx-(--density-12) -mb-(--density-12) grid grid-cols-3 border-t border-border/60">
      {PORTS.map((port) => (
        <div
          key={port.id}
          className="relative flex justify-center pt-(--density-6) pb-(--density-10) text-(length:--density-text-11) text-muted-foreground"
        >
          {port.label}
          <CanvasHandle
            kind="target"
            side="bottom"
            id={port.id}
            label={port.label}
            accepts={[port.id]}
            max={port.max}
            className="[&>[data-slot=canvas-handle-label]]:sr-only"
          />
        </div>
      ))}
    </div>
  )
}

/** A model, memory or tool an agent uses; it plugs in from below. */
function ResourceNode({ data }: CanvasNodeProps) {
  if (!isStepData(data) || !data.resource) return null
  return (
    <CanvasNode className="w-[calc(var(--density-36)*4.75)] min-w-0 gap-(--density-4) rounded-full py-(--density-8) ps-(--density-8) pe-(--density-16)">
      <CanvasNodeHeader>
        <CanvasNodeIcon className="rounded-full">
          {automationIcons[data.icon]}
        </CanvasNodeIcon>
        <CanvasNodeTitle className="text-(length:--density-text-13)">
          {data.title}
        </CanvasNodeTitle>
      </CanvasNodeHeader>
      <CanvasHandle
        kind="source"
        side="top"
        id={data.resource}
        produces={data.resource}
      />
    </CanvasNode>
  )
}

export const automationNodeTypes: Record<string, CanvasNodeComponent> = {
  step: StepNode,
  resource: ResourceNode,
}
