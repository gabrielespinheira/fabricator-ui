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
} from "@/registry/bases/aria/lib/fluid-hover"
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
      className={cn("cn-accordion-item", className)}
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
      className="cn-accordion-content h-(--disclosure-panel-height) overflow-clip transition-[height]"
      {...props}
    >
      <div
        className={cn(
          "cn-accordion-content-inner [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
          className
        )}
      >
        {children}
      </div>
    </AccordionContentPrimitive>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
