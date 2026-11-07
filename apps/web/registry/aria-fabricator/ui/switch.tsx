"use client"

import { cn } from "cn"
import {
  composeRenderProps,
  Switch as SwitchPrimitive,
  type SwitchProps as SwitchPrimitiveProps,
} from "react-aria-components"

function Switch({
  className,
  size = "default",
  children,
  ...props
}: SwitchPrimitiveProps & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex h-(--density-20) w-[calc(var(--density-20)+var(--density-14))] shrink-0 cursor-pointer items-center rounded-full border-0 px-0.5 ring-offset-background transition-all duration-feedback ease-feedback outline-none not-data-selected:bg-accent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-1 aria-invalid:ring-destructive/50 aria-invalid:ring-offset-2 data-focus-visible:ring-1 data-focus-visible:ring-ring data-focus-visible:ring-offset-2 data-hovered:not-data-selected:bg-[color-mix(in_oklab,var(--accent),rgb(var(--overlay))_10%)] data-invalid:ring-1 data-invalid:ring-destructive/50 data-invalid:ring-offset-2 data-[size=sm]:density-compact data-checked:bg-primary data-checked:hover:bg-primary/90 data-unchecked:bg-accent data-unchecked:hover:bg-[color-mix(in_oklab,var(--accent),rgb(var(--overlay))_10%)] data-selected:bg-primary data-hovered:data-selected:bg-primary/90 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            data-slot="switch-thumb"
            data-selected={isSelected || undefined}
            className="pointer-events-none relative block size-[calc(var(--density-20)-4px)] rounded-full bg-transparent ring-0 transition-transform duration-move ease-move not-data-selected:translate-x-0 before:absolute before:inset-0 before:rounded-full before:bg-white before:shadow-[0_1px_2px_rgb(0_0_0/0.15),0_0_0_0.5px_rgb(0_0_0/0.04)] before:transition-[inset,background-color] before:duration-move before:ease-move group-active/switch:before:inset-y-0.5 group-data-hovered/switch:not-data-selected:before:-right-0.5 group-data-pressed/switch:before:inset-y-0.5 group-data-pressed/switch:not-data-selected:before:-right-1 motion-reduce:before:transition-none data-checked:translate-x-(--density-14) data-checked:before:bg-primary-foreground group-hover/switch:data-checked:before:-left-0.5 group-active/switch:data-checked:before:-left-1 data-unchecked:translate-x-0 group-hover/switch:data-unchecked:before:-right-0.5 group-active/switch:data-unchecked:before:-right-1 data-selected:translate-x-(--density-14) data-selected:before:bg-primary-foreground group-data-hovered/switch:data-selected:before:-left-0.5 group-data-pressed/switch:data-selected:before:-left-1"
          />
          {children}
        </>
      ))}
    </SwitchPrimitive>
  )
}

export { Switch }
