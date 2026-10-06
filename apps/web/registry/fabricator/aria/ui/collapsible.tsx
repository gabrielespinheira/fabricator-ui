"use client"

import { cn } from "cn"
import {
  DisclosurePanel as CollapsibleContentPrimitive,
  Disclosure as CollapsiblePrimitive,
  Button as CollapsibleTriggerPrimitive,
  composeRenderProps,
  type ButtonProps,
  type DisclosurePanelProps,
  type DisclosureProps,
} from "react-aria-components"

// Fabricator override of the upstream collapsible: the trigger gets the
// pointer cursor and the content's height animates open and closed like
// Accordion content. Same exports, props and data-slots as upstream.

function Collapsible({ ...props }: DisclosureProps) {
  return <CollapsiblePrimitive data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({ className, ...props }: ButtonProps) {
  return (
    <CollapsibleTriggerPrimitive
      slot="trigger"
      data-slot="collapsible-trigger"
      className={composeRenderProps(className, (className) =>
        cn("cn-collapsible-trigger", className)
      )}
      {...props}
    />
  )
}

function CollapsibleContent({ className, ...props }: DisclosurePanelProps) {
  return (
    <CollapsibleContentPrimitive
      data-slot="collapsible-content"
      className={composeRenderProps(className, (className) =>
        cn(
          "cn-collapsible-content-aria h-(--disclosure-panel-height) overflow-clip transition-[height]",
          className
        )
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
