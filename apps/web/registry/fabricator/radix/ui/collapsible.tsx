"use client"

import { cn } from "cn"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"

// Fabricator override of the upstream collapsible: the trigger gets the
// pointer cursor and the content opens and closes like Accordion content, with
// the same keyframes (its height variable is mapped onto the accordion one).
// Same exports, props and data-slots as upstream.

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      className={cn("cn-collapsible-trigger", className)}
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        "cn-collapsible-content overflow-hidden [--radix-accordion-content-height:var(--radix-collapsible-content-height)]",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
