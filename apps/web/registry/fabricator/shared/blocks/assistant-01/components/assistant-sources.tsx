"use client"

import * as React from "react"
import {
  HubspotIcon,
  MixpanelIcon,
  PosthogIcon,
  StripeIcon,
  SubstackIcon,
  type BrandIconComponent,
} from "@fabricator-ui/icons/brands"
import { cn } from "cn"

import { AssistantPopover } from "@/registry/bases/__base__/blocks/assistant-01/components/assistant-controls"
import { type AssistantSource } from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-chat-model"
import {
  FluidHoverHighlight,
  useFluidHover,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Where an answer comes from: the sites' marks beside the answer, and the
// pages themselves in the list they open.

const SOURCE_LOGOS: Record<string, BrandIconComponent> = {
  "hubspot.com": HubspotIcon,
  "mixpanel.com": MixpanelIcon,
  "posthog.com": PosthogIcon,
  "stripe.com": StripeIcon,
  "substack.com": SubstackIcon,
}

const MAX_MARKS = 3

function AssistantSourceMark({ domain }: { domain: string }) {
  const Logo = SOURCE_LOGOS[domain]
  if (Logo) {
    return (
      <Logo
        aria-hidden
        color="brand"
        className="size-(--density-icon-16) shrink-0"
      />
    )
  }
  return (
    <IconPlaceholder
      lucide="GlobeIcon"
      tabler="IconWorld"
      hugeicons="GlobeIcon"
      phosphor="GlobeIcon"
      remixicon="RiGlobalLine"
      className="size-(--density-icon-16) shrink-0 text-muted-foreground"
    />
  )
}

export function AssistantSourceList({
  sources,
  className,
}: {
  sources: AssistantSource[]
  className?: string
}) {
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
      className={cn(
        "relative isolate -mx-(--density-8) flex flex-col",
        className
      )}
    >
      <FluidHoverHighlight hover={hover} />
      {sources.map((source) => (
        <li key={source.url}>
          <a
            data-slot="assistant-source"
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-(--density-36) items-center gap-(--density-8) rounded-(--radius-control) px-(--density-8) py-(--density-6) text-(length:--density-text-13) outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11"
          >
            <AssistantSourceMark domain={source.domain} />
            <span className="min-w-0 flex-1">{source.title}</span>
            <span className="shrink-0 text-muted-foreground">
              {source.domain}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export function AssistantSources({ sources }: { sources: AssistantSource[] }) {
  if (sources.length === 0) return null
  const label = `${sources.length} ${sources.length === 1 ? "source" : "sources"}`
  return (
    <AssistantPopover
      title="Sources"
      trigger={
        <>
          <span aria-hidden className="flex items-center gap-1">
            {sources.slice(0, MAX_MARKS).map((source) => (
              <AssistantSourceMark key={source.url} domain={source.domain} />
            ))}
          </span>
          {label}
        </>
      }
    >
      <AssistantSourceList sources={sources} className="mx-0" />
    </AssistantPopover>
  )
}
