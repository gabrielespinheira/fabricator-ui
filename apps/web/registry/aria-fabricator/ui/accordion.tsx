"use client"

import * as React from "react"
import { cn } from "cn"
import {
  DisclosurePanel as AccordionContentPrimitive,
  Heading as AccordionHeaderPrimitive,
  Disclosure as AccordionItemPrimitive,
  DisclosureGroup as AccordionPrimitive,
  Button as AccordionTriggerPrimitive,
  type ButtonProps,
  type DisclosureGroupProps,
  type DisclosurePanelProps,
  type DisclosureProps,
} from "react-aria-components"

import {
  FluidHoverHighlight,
  useFluidHover,
  useMergedRef,
} from "@/registry/aria-fabricator/lib/fluid-hover"
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
}: DisclosureGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: TRIGGER,
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  return (
    <AccordionPrimitive
      data-slot="accordion"
      className={cn("relative isolate flex w-full flex-col", className)}
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
      {(values) => (
        <>
          <FluidHoverHighlight hover={fluid.hover} />
          {typeof children === "function" ? children(values) : children}
        </>
      )}
    </AccordionPrimitive>
  )
}

function AccordionItem({ className, ...props }: DisclosureProps) {
  return (
    <AccordionItemPrimitive
      data-slot="accordion-item"
      className={cn("border-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: Omit<ButtonProps, "children"> & { children: React.ReactNode }) {
  return (
    <AccordionHeaderPrimitive className="flex">
      <AccordionTriggerPrimitive
        slot="trigger"
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger relative flex flex-1 cursor-pointer items-start justify-between rounded-lg border border-transparent px-(--density-12) py-(--density-8) text-start text-(length:--density-text-13) leading-5 font-normal text-muted-foreground transition-all duration-feedback outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 in-data-[fluid-hover]:hover:bg-transparent aria-expanded:font-semibold aria-expanded:text-foreground data-fluid-hover-active:text-foreground **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:mt-0.5 **:data-[slot=accordion-trigger-icon]:size-4",
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
          className="pointer-events-none shrink-0 -rotate-90 stroke-[1.5] text-muted-foreground transition-[rotate,color,stroke-width] duration-disclosure ease-enter group-hover/accordion-trigger:stroke-2 group-hover/accordion-trigger:text-foreground group-aria-expanded/accordion-trigger:hidden group-aria-expanded/accordion-trigger:rotate-0 group-aria-expanded/accordion-trigger:stroke-2 group-aria-expanded/accordion-trigger:text-foreground group-aria-expanded/accordion-trigger:not-[[data-slot=accordion-trigger-icon]~*]:inline-block group-data-fluid-hover-active/accordion-trigger:stroke-2 group-data-fluid-hover-active/accordion-trigger:text-foreground motion-reduce:transition-colors rtl:rotate-90 group-aria-expanded/accordion-trigger:[[data-slot=accordion-trigger-icon]~&]:hidden"
        />
        <IconPlaceholder
          lucide="ChevronUpIcon"
          tabler="IconChevronUp"
          data-slot="accordion-trigger-icon"
          hugeicons="ArrowUp01Icon"
          phosphor="CaretUpIcon"
          remixicon="RiArrowUpSLine"
          className="pointer-events-none hidden shrink-0 -rotate-90 stroke-[1.5] text-muted-foreground transition-[rotate,color,stroke-width] duration-disclosure ease-enter group-hover/accordion-trigger:stroke-2 group-hover/accordion-trigger:text-foreground group-aria-expanded/accordion-trigger:inline group-aria-expanded/accordion-trigger:rotate-0 group-aria-expanded/accordion-trigger:stroke-2 group-aria-expanded/accordion-trigger:text-foreground group-aria-expanded/accordion-trigger:not-[[data-slot=accordion-trigger-icon]~*]:inline-block group-data-fluid-hover-active/accordion-trigger:stroke-2 group-data-fluid-hover-active/accordion-trigger:text-foreground motion-reduce:transition-colors rtl:rotate-90 group-aria-expanded/accordion-trigger:[[data-slot=accordion-trigger-icon]~&]:hidden"
        />
      </AccordionTriggerPrimitive>
    </AccordionHeaderPrimitive>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: DisclosurePanelProps) {
  return (
    <AccordionContentPrimitive
      data-slot="accordion-content"
      className="h-(--disclosure-panel-height) overflow-clip text-(length:--density-text-13) text-muted-foreground transition-[height] motion-disclosure data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "px-(--density-12) pt-1 pb-(--density-12) [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionContentPrimitive>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
