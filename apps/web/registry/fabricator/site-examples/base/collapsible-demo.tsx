"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/styles/base-nova/ui/collapsible"

// Fabricator demo: the collapsible reads like an Accordion item. The title
// row lights on hover and turns its chevron down on the spring; the details
// open with the content's height animation.
const DETAILS = [
  { label: "Estimated delivery", value: "Thursday, October 8" },
  { label: "Shipping address", value: "100 Market St, San Francisco" },
  { label: "Items", value: "2x Studio Headphones" },
]

export default function CollapsibleDemo() {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px]">
      <CollapsibleTrigger className="group/trigger flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] leading-5 text-muted-foreground transition-colors duration-fast outline-none hover:bg-hover hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring aria-expanded:font-semibold aria-expanded:text-foreground">
        Order #4189
        <span className="ms-auto text-xs font-normal text-muted-foreground">
          Shipped
        </span>
        <ChevronDownIcon className="size-4 -rotate-90 stroke-[1.5] transition-[rotate,stroke-width] duration-moderate ease-spring group-hover/trigger:stroke-2 group-aria-expanded/trigger:rotate-0 group-aria-expanded/trigger:stroke-2 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="flex flex-col gap-2 px-3 pt-1 pb-3 text-[13px]">
          {DETAILS.map((detail) => (
            <div key={detail.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{detail.label}</dt>
              <dd className="text-end text-foreground">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}
