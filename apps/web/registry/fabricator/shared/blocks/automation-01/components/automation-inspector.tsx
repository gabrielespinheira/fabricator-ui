"use client"

import * as React from "react"

import { automationIcons } from "@/registry/bases/__base__/blocks/automation-01/components/automation-icons"
import { AUTOMATION_STATS } from "@/registry/bases/__base__/blocks/automation-01/lib/automation-data"
import {
  formatDuration,
  readStep,
  type AutomationRun,
  type AutomationStepData,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-model"
import {
  type CanvasEdge,
  type CanvasNode,
} from "@/registry/bases/__base__/lib/canvas-model"
import {
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import { Badge } from "@/registry/bases/__base__/ui/badge"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Field, FieldLabel } from "@/registry/bases/__base__/ui/field"
import { Input } from "@/registry/bases/__base__/ui/input"

type InspectorProps = {
  nodes: readonly CanvasNode[]
  edges: readonly CanvasEdge[]
  run: AutomationRun | null
  /** The step picked on the canvas; the workflow's summary without one. */
  selectedId: string | null
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onShowStep: (id: string) => void
}

const STATUS_LABELS: Record<string, string> = {
  running: "Running",
  success: "Passed",
  skipped: "Skipped",
  error: "Failed",
  warning: "Needs a look",
}

/** The panel beside the canvas: the picked step's settings, or the workflow. */
export function AutomationInspector(props: InspectorProps) {
  const node = props.nodes.find(({ id }) => id === props.selectedId)
  const step = readStep(node)
  return (
    <>
      <AppShellPanelHeader className="ps-(--density-16)">
        <AppShellPanelTitle>{step ? "Step" : "Workflow"}</AppShellPanelTitle>
        <AppShellPanelClose />
      </AppShellPanelHeader>
      <AppShellPanelContent className="flex flex-col gap-(--density-24) px-(--density-16) pt-(--density-8) pb-[max(var(--density-24),env(safe-area-inset-bottom))]">
        {node && step ? (
          <StepDetails key={node.id} node={node} step={step} {...props} />
        ) : (
          <WorkflowSummary {...props} />
        )}
      </AppShellPanelContent>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-(--density-8)">
      <h3 className="text-(length:--density-text-12) text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function Facts({
  facts,
}: {
  facts: readonly { label: string; value: string }[]
}) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-(--density-16) gap-y-(--density-6)">
      {facts.map((fact) => (
        <div key={fact.label} className="contents">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd
            className={
              fact.value === "Not set"
                ? "min-w-0 text-destructive-text"
                : "min-w-0 wrap-break-word"
            }
          >
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function StepLinks({
  ids,
  nodes,
  empty,
  onShowStep,
}: {
  ids: readonly string[]
  nodes: readonly CanvasNode[]
  empty: string
  onShowStep: (id: string) => void
}) {
  const steps = ids.flatMap((id) => {
    const step = readStep(nodes.find((node) => node.id === id))
    return step ? [{ id, step }] : []
  })
  if (steps.length === 0)
    return <p className="text-muted-foreground">{empty}</p>
  return (
    <ul className="-mx-(--density-8) flex flex-col">
      {steps.map(({ id, step }) => (
        <li key={id}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => onShowStep(id)}
          >
            {automationIcons[step.icon]}
            <span className="truncate">{step.title}</span>
          </Button>
        </li>
      ))}
    </ul>
  )
}

function StepDetails({
  node,
  step,
  nodes,
  edges,
  onRename,
  onDelete,
  onShowStep,
}: InspectorProps & { node: CanvasNode; step: AutomationStepData }) {
  const id = React.useId()
  const [title, setTitle] = React.useState(step.title)
  const isResource = (id: string) =>
    readStep(nodes.find((other) => other.id === id))?.kind === "resource"
  const incoming = edges.filter((edge) => edge.target === node.id)
  const before = incoming.filter(({ source }) => !isResource(source))
  const uses = incoming.filter(({ source }) => isResource(source))
  const after = edges.filter((edge) => edge.source === node.id)
  const status = node.status && STATUS_LABELS[node.status]

  function saveTitle() {
    const next = title.trim()
    if (next && next !== step.title) onRename(node.id, next)
    else setTitle(step.title)
  }

  return (
    <>
      <div className="flex flex-col gap-(--density-12)">
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>Name</FieldLabel>
          <Input
            id={`${id}-title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveTitle()
              if (event.key === "Escape") setTitle(step.title)
            }}
          />
        </Field>
        <p className="text-pretty text-muted-foreground">{step.description}</p>
        <div className="flex flex-wrap gap-(--density-6)">
          <Badge variant="secondary">
            {automationIcons[step.icon]}
            {step.app}
          </Badge>
          {status && (
            <Badge
              variant={
                node.status === "success"
                  ? "success"
                  : node.status === "running"
                    ? "info"
                    : "outline"
              }
            >
              {status}
            </Badge>
          )}
        </div>
        {node.invalid && (
          <p className="text-destructive-text">{node.invalid}</p>
        )}
      </div>
      <Section title="Settings">
        <Facts facts={step.settings} />
      </Section>
      {step.kind === "agent" && (
        <Section title="Uses">
          <StepLinks
            ids={uses.map(({ source }) => source)}
            nodes={nodes}
            empty="No model yet. Connect one to its Model port."
            onShowStep={onShowStep}
          />
        </Section>
      )}
      {step.kind !== "trigger" && step.kind !== "resource" && (
        <Section title="Runs after">
          <StepLinks
            ids={before.map(({ source }) => source)}
            nodes={nodes}
            empty="Nothing yet. Connect a step into this one."
            onShowStep={onShowStep}
          />
        </Section>
      )}
      <Section title={step.kind === "resource" ? "Used by" : "Runs before"}>
        <StepLinks
          ids={after.map(({ target }) => target)}
          nodes={nodes}
          empty="Nothing. The run ends here."
          onShowStep={onShowStep}
        />
      </Section>
      {node.status === "success" && step.sample && (
        <Section title="Last test run">
          <div className="flex flex-col gap-(--density-4) rounded-(--radius-control) bg-muted px-(--density-12) py-(--density-8)">
            <span className="font-mono text-(length:--density-text-12) wrap-break-word">
              {step.sample.output}
            </span>
            <span className="text-(length:--density-text-12) text-muted-foreground tabular-nums">
              {formatDuration(step.sample.durationMs)}
            </span>
          </div>
        </Section>
      )}
      <Button
        variant="outline"
        className="self-start text-destructive-text"
        onClick={() => onDelete(node.id)}
      >
        {automationIcons.trash}
        Delete step
      </Button>
    </>
  )
}

function WorkflowSummary({ nodes, edges, run, onShowStep }: InspectorProps) {
  const steps = nodes.filter((node) => readStep(node))
  const issues = steps.filter((node) => node.invalid)
  return (
    <>
      <p className="text-pretty text-muted-foreground">
        Pick a step on the canvas to rename it, check its settings and see what
        it returned in the last test run.
      </p>
      <Section title="Overview">
        <Facts
          facts={[
            { label: "Steps", value: String(steps.length) },
            { label: "Connections", value: String(edges.length) },
            ...AUTOMATION_STATS,
          ]}
        />
      </Section>
      <Section title={issues.length > 0 ? "Fix before publishing" : "Ready"}>
        {issues.length > 0 ? (
          <StepLinks
            ids={issues.map(({ id }) => id)}
            nodes={nodes}
            empty=""
            onShowStep={onShowStep}
          />
        ) : (
          <p className="text-muted-foreground">Every step is set up.</p>
        )}
      </Section>
      {run && (
        <Section title="Last test run">
          <Facts
            facts={[
              {
                label: "Result",
                value:
                  run.status === "running"
                    ? "Running"
                    : run.status === "stopped"
                      ? "Stopped"
                      : "Passed",
              },
              { label: "Steps", value: String(run.path.length) },
              { label: "Took", value: formatDuration(run.durationMs) },
            ]}
          />
        </Section>
      )}
    </>
  )
}
