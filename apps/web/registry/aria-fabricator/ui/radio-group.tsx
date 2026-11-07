"use client"

import { cn } from "cn"
import {
  composeRenderProps,
  RadioGroup as RadioGroupPrimitive,
  Radio as RadioPrimitive,
  type RadioGroupProps,
  type RadioProps,
} from "react-aria-components"

// Fabricator override of the upstream radio group: the indicator stays
// mounted so the dot scales out as well as in (driven by its state attributes
// in the style map), instead of unmounting when another radio is picked.

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-(--density-16)", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, children, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-[calc(var(--density-icon-16)+2px)] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[1.5px]! border-foreground/25 bg-transparent transition-[background-color,border-color,box-shadow,scale] duration-feedback ease-feedback outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-foreground/45 focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 aria-invalid:border-destructive data-focus-visible:ring-1 data-focus-visible:ring-focus-ring data-focus-visible:ring-offset-2 data-focus-visible:ring-offset-background data-hovered:border-foreground/45 data-invalid:border-destructive data-pressed:scale-90 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:data-pressed:scale-100 data-checked:border-primary data-checked:bg-primary data-checked:hover:border-primary aria-invalid:data-checked:border-destructive aria-invalid:data-checked:bg-destructive data-selected:border-primary data-selected:bg-primary data-selected:data-hovered:border-primary data-invalid:data-selected:border-destructive data-invalid:data-selected:bg-destructive",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            data-slot="radio-group-indicator"
            data-checked={isSelected ? "" : undefined}
            data-unchecked={isSelected ? undefined : ""}
            className="flex size-full scale-0 items-center justify-center opacity-0 transition-[opacity,scale] duration-feedback-exit ease-exit motion-reduce:transition-none data-checked:scale-100 data-checked:opacity-100 data-checked:duration-move data-checked:ease-enter"
          >
            <span className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
          </span>
          {children}
        </>
      ))}
    </RadioPrimitive>
  )
}

export { RadioGroup, RadioGroupItem }
