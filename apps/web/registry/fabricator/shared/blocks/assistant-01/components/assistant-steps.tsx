"use client"

import * as React from "react"
import { cn } from "cn"

import { AssistantDisclosure } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-controls"
import { AssistantSourceList } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-sources"
import {
  getStepsSummary,
  type AssistantPartGroup,
  type AssistantStep,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightTitle,
} from "@/registry/bases/__base__/ui/syntax-highlight"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The work behind an answer. While it runs, its steps appear one by one; once
// the answer starts they fold into one line that opens to the list, and each
// step opens to what it read or ran. A step that needs the person stays out,
// with the button that unblocks it.

function StepIcon({ step }: { step: AssistantStep }) {
  if (step.status === "running") return <Spinner />
  if (step.status === "error") {
    return (
      <IconPlaceholder
        lucide="CircleAlertIcon"
        tabler="IconAlertCircle"
        hugeicons="AlertCircleIcon"
        phosphor="WarningCircleIcon"
        remixicon="RiErrorWarningLine"
        className="text-destructive-text"
      />
    )
  }
  if (step.status === "stopped") {
    return (
      <IconPlaceholder
        lucide="CircleStopIcon"
        tabler="IconPlayerStop"
        hugeicons="StopCircleIcon"
        phosphor="StopCircleIcon"
        remixicon="RiStopCircleLine"
      />
    )
  }
  if (step.kind === "search") {
    return (
      <IconPlaceholder
        lucide="GlobeIcon"
        tabler="IconWorld"
        hugeicons="GlobeIcon"
        phosphor="GlobeIcon"
        remixicon="RiGlobalLine"
      />
    )
  }
  if (step.kind === "code") {
    return (
      <IconPlaceholder
        lucide="CodeIcon"
        tabler="IconCode"
        hugeicons="SourceCodeIcon"
        phosphor="CodeIcon"
        remixicon="RiCodeLine"
      />
    )
  }
  return (
    <IconPlaceholder
      lucide="FileTextIcon"
      tabler="IconFileText"
      hugeicons="File01Icon"
      phosphor="FileTextIcon"
      remixicon="RiFileTextLine"
    />
  )
}

function StepCode({
  title,
  language,
  code,
}: {
  title: string
  language: string
  code: string
}) {
  return (
    <SyntaxHighlight code={code} language={language}>
      <SyntaxHighlightHeader>
        <SyntaxHighlightTitle>{title}</SyntaxHighlightTitle>
        <SyntaxHighlightCopy />
      </SyntaxHighlightHeader>
      <SyntaxHighlightContent />
    </SyntaxHighlight>
  )
}

const ICON =
  "flex size-(--density-icon-16) shrink-0 items-center justify-center text-muted-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)"

const ROW =
  "flex min-h-(--density-28) items-center gap-(--density-8) text-(length:--density-text-13)"

function StepSummary({ step }: { step: AssistantStep }) {
  const isRunning = step.status === "running"
  const detail = step.status === "stopped" ? "Stopped" : step.detail
  return (
    <>
      <span className={ICON}>
        <StepIcon step={step} />
      </span>
      <span
        className={cn(
          "min-w-0 text-start",
          isRunning ? "shimmer" : "text-foreground"
        )}
      >
        {isRunning ? `${step.runningLabel}…` : step.label}
      </span>
      {!isRunning && detail && (
        <span
          className={cn(
            "shrink-0 tabular-nums",
            step.status === "error"
              ? "text-destructive-text"
              : "text-muted-foreground"
          )}
        >
          {detail}
        </span>
      )}
    </>
  )
}

function AssistantStepRow({ step }: { step: AssistantStep }) {
  const [isOpen, setOpen] = React.useState(false)
  const hasDetails = Boolean(
    step.input || step.output || (step.sources && step.sources.length > 0)
  )

  if (!hasDetails || step.status === "running") {
    return (
      <div data-slot="assistant-step" className={ROW}>
        <StepSummary step={step} />
      </div>
    )
  }

  return (
    <AssistantDisclosure
      isOpen={isOpen}
      onOpenChange={setOpen}
      triggerClassName={ROW}
      trigger={<StepSummary step={step} />}
    >
      {/* Indented to the label's start edge: alignment, not a rule, ties the
          details to their row. */}
      <div className="ms-[calc(var(--density-icon-16)+var(--density-8))] mt-(--density-4) mb-(--density-12) flex flex-col gap-(--density-8)">
        {step.sources && <AssistantSourceList sources={step.sources} />}
        {step.input && <StepCode title="Input" {...step.input} />}
        {step.output && <StepCode title="Output" {...step.output} />}
      </div>
    </AssistantDisclosure>
  )
}

function AssistantBlockedStep({
  step,
  onConnect,
}: {
  step: AssistantStep
  onConnect: (stepId: string, service: string) => void
}) {
  const service = step.connection
  return (
    <div
      data-slot="assistant-blocked-step"
      className="flex items-center gap-(--density-8) text-(length:--density-text-13)"
    >
      <span className={ICON}>
        <IconPlaceholder
          lucide="TriangleAlertIcon"
          tabler="IconAlertTriangle"
          hugeicons="Alert02Icon"
          phosphor="WarningIcon"
          remixicon="RiAlertLine"
          className="text-warning-text"
        />
      </span>
      <span className="flex min-w-0 flex-wrap gap-x-(--density-8)">
        <span className="text-foreground">{step.label}</span>
        <span className="text-warning-text">{step.detail}</span>
      </span>
      {service && (
        <Button
          variant="outline"
          size="sm"
          className="ms-(--density-4) shrink-0 pointer-coarse:ms-auto pointer-coarse:min-h-11"
          onClick={() => onConnect(step.id, service)}
        >
          Connect {service}
        </Button>
      )}
    </div>
  )
}

export function AssistantSteps({
  group,
  isLive,
  onConnect,
}: {
  group: Extract<AssistantPartGroup, { type: "steps" }>
  /** The reply is still working on these steps. */
  isLive: boolean
  onConnect: (stepId: string, service: string) => void
}) {
  // Open while it works and folded once it's done, until someone decides.
  const [choice, setChoice] = React.useState<boolean | null>(null)
  const { settled, blocked } = group
  const [onlyStep] = settled

  return (
    <div className="flex flex-col gap-(--density-4)">
      {settled.length === 1 && onlyStep && !isLive ? (
        <AssistantStepRow step={onlyStep} />
      ) : (
        settled.length > 0 && (
          <AssistantDisclosure
            isOpen={choice ?? isLive}
            onOpenChange={setChoice}
            triggerClassName={cn(ROW, "text-muted-foreground")}
            trigger={
              isLive ? (
                <span role="status" className="shimmer">
                  Working…
                </span>
              ) : (
                <span>{getStepsSummary(settled)}</span>
              )
            }
          >
            <ol aria-label="Steps" className="flex flex-col">
              {settled.map((step) => (
                <li key={step.id}>
                  <AssistantStepRow step={step} />
                </li>
              ))}
            </ol>
          </AssistantDisclosure>
        )
      )}
      {blocked.map((step) => (
        <AssistantBlockedStep key={step.id} step={step} onConnect={onConnect} />
      ))}
    </div>
  )
}
