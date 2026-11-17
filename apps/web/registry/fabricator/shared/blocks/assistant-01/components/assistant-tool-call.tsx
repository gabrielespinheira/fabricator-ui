"use client"

import {
  HubspotIcon,
  MixpanelIcon,
  PosthogIcon,
  StripeIcon,
  SubstackIcon,
  type BrandIconComponent,
} from "@fabricator-ui/icons/brands"
import { cn } from "cn"

import {
  type AssistantSource,
  type AssistantToolCall as AssistantToolCallData,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  FluidHoverHighlight,
  useFluidHover,
} from "@/registry/bases/__base__/lib/fluid-hover"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/registry/bases/__base__/ui/collapsible"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightTitle,
} from "@/registry/bases/__base__/ui/syntax-highlight"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A tool call between the assistant's words: one quiet row with what the
// tool did and its result, which opens to show the input and output.

const SOURCE_LOGOS: Record<string, BrandIconComponent> = {
  "hubspot.com": HubspotIcon,
  "mixpanel.com": MixpanelIcon,
  "posthog.com": PosthogIcon,
  "stripe.com": StripeIcon,
  "substack.com": SubstackIcon,
}

function ToolIcon({ tool }: { tool: AssistantToolCallData }) {
  if (tool.status === "running") return <Spinner />
  if (tool.status === "error") {
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
  if (tool.kind === "search") {
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
  if (tool.kind === "code") {
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

function ToolSummary({ tool }: { tool: AssistantToolCallData }) {
  const isRunning = tool.status === "running"
  return (
    <>
      <span className="flex size-(--density-icon-16) shrink-0 items-center justify-center text-muted-foreground [&_svg:not([class*='size-'])]:size-(--density-icon-16)">
        <ToolIcon tool={tool} />
      </span>
      <span
        className={cn(
          "min-w-0 truncate",
          isRunning ? "shimmer" : "text-foreground"
        )}
      >
        {isRunning ? `${tool.runningLabel}…` : tool.label}
      </span>
      {!isRunning && tool.detail && (
        <span
          className={cn(
            "shrink-0",
            tool.status === "error"
              ? "text-destructive-text"
              : "text-muted-foreground"
          )}
        >
          {tool.detail}
        </span>
      )}
    </>
  )
}

function ToolSources({ sources }: { sources: AssistantSource[] }) {
  const {
    attach,
    props: fluidProps,
    hover,
  } = useFluidHover<HTMLUListElement>({
    items: "[data-slot=assistant-source]",
  })
  return (
    <ul
      ref={attach}
      {...fluidProps}
      aria-label="Sources"
      className="relative isolate -mx-(--density-8) flex flex-col"
    >
      <FluidHoverHighlight hover={hover} />
      {sources.map((source) => {
        const Logo = SOURCE_LOGOS[source.domain]
        return (
          <li key={source.url}>
            <a
              data-slot="assistant-source"
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-(--density-32) items-center gap-(--density-8) rounded-lg px-(--density-8) text-(length:--density-text-13) outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Logo ? (
                <Logo
                  color="brand"
                  className="size-(--density-icon-16) shrink-0"
                />
              ) : (
                <IconPlaceholder
                  lucide="GlobeIcon"
                  tabler="IconWorld"
                  hugeicons="GlobeIcon"
                  phosphor="GlobeIcon"
                  remixicon="RiGlobalLine"
                  className="size-(--density-icon-16) shrink-0 text-muted-foreground"
                />
              )}
              <span className="min-w-0 flex-1 truncate">{source.title}</span>
              <span className="shrink-0 text-muted-foreground">
                {source.domain}
              </span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function ToolCode({
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

const ROW =
  "flex h-(--density-28) items-center gap-(--density-8) text-(length:--density-text-13)"

export function AssistantToolCall({ tool }: { tool: AssistantToolCallData }) {
  const hasDetails = Boolean(tool.input || tool.output || tool.sources?.length)

  if (!hasDetails || tool.status === "running") {
    return (
      <div data-slot="assistant-tool-call" className={cn(ROW, "max-w-full")}>
        <ToolSummary tool={tool} />
      </div>
    )
  }

  return (
    <Collapsible className="w-full">
      <CollapsibleTrigger
        className={cn(
          ROW,
          "w-fit",
          // The hover wash reaches past the text by its padding, so the
          // icon stays on the message's start edge.
          "group/tool -mx-(--density-8) max-w-[calc(100%+var(--density-16))] rounded-lg px-(--density-8) outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
        )}
      >
        <ToolSummary tool={tool} />
        <IconPlaceholder
          lucide="ChevronRightIcon"
          tabler="IconChevronRight"
          hugeicons="ArrowRight01Icon"
          phosphor="CaretRightIcon"
          remixicon="RiArrowRightSLine"
          className="size-(--density-icon-16) shrink-0 text-muted-foreground transition-transform duration-move ease-move group-aria-expanded/tool:rotate-90"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Indented to the label's start edge: alignment, not a rule, ties
            the details to their row. */}
        <div className="ms-[calc(var(--density-icon-16)+var(--density-8))] mt-(--density-4) mb-(--density-12) flex flex-col gap-(--density-8)">
          {tool.sources && <ToolSources sources={tool.sources} />}
          {tool.input && (
            <ToolCode
              title="Input"
              language={tool.input.language}
              code={tool.input.code}
            />
          )}
          {tool.output && (
            <ToolCode
              title="Output"
              language={tool.output.language}
              code={tool.output.code}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
