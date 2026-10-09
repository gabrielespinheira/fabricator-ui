"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "cn"

// Fabricator override of the upstream collapsible: the trigger gets the
// pointer cursor and the content opens and closes like Accordion content, with
// the same keyframes (its height variable is mapped onto the accordion one).
// Same exports, props and data-slots as upstream.

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  className,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn("cn-collapsible-trigger", className)}
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "cn-collapsible-content overflow-hidden [--accordion-panel-height:var(--collapsible-panel-height)]",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
