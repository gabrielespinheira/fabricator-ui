"use client"

import * as React from "react"
import { cn } from "cn"
import { Accordion as AccordionPrimitive } from "radix-ui"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/radix/lib/fluid-hover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// Fabricator override of the upstream accordion: the root is a fluid hover
// container, so one highlight glides between triggers. The pointer lights a
// trigger only while it is over one; open panels switch it off (and a click
// in a panel never toggles a trigger).
const TRIGGER = '[data-slot="accordion-trigger"]'

function Accordion({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: TRIGGER,
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("cn-accordion flex w-full flex-col", className)}
      ref={mergedRef}
      {...fluid.props}
      onPointerMove={(event: React.PointerEvent<HTMLDivElement>) => {
        if ((event.target as Element).closest(TRIGGER)) {
          fluid.props.onPointerMove(event)
        } else {
          fluid.props.onPointerLeave()
        }
      }}
      {...props}
    >
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </AccordionPrimitive.Root>
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("cn-accordion-item", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "cn-accordion-trigger group/accordion-trigger relative flex flex-1 items-start justify-between border border-transparent transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconChevronDown"
          data-slot="accordion-trigger-icon"
          hugeicons="ArrowDown01Icon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
          className="cn-accordion-trigger-icon pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        />
        <IconPlaceholder
          lucide="ChevronUpIcon"
          tabler="IconChevronUp"
          data-slot="accordion-trigger-icon"
          hugeicons="ArrowUp01Icon"
          phosphor="CaretUpIcon"
          remixicon="RiArrowUpSLine"
          className="cn-accordion-trigger-icon pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="cn-accordion-content overflow-hidden"
      {...props}
    >
      <div
        className={cn(
          "cn-accordion-content-inner h-(--radix-accordion-content-height) [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
