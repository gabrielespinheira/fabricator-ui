import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Separator } from "@/registry/aria-fabricator/ui/separator"

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-(--density-8) has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          "**:data-slot:rounded-r-none [&_[data-slot]~[data-slot]]:rounded-l-none [&_[data-slot]~[data-slot]]:border-l-0 [&>[data-slot=input-group]:focus-within]:relative [&>[data-slot=input-group]:focus-within]:z-10 [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg! [&>[data-slot]~:is([data-slot=input],[data-slot=input-group],[data-slot=select-trigger])]:-ml-px",
        vertical:
          "flex-col **:data-slot:rounded-b-none [&_[data-slot]~[data-slot]]:rounded-t-none [&_[data-slot]~[data-slot]]:border-t-0 [&>[data-slot=input-group]:focus-within]:relative [&>[data-slot=input-group]:focus-within]:z-10 [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg! [&>[data-slot]~:is([data-slot=input],[data-slot=input-group],[data-slot=select-trigger])]:-mt-px",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  )
}

function ButtonGroupText({
  className,
  render,
  ...props
}: React.ComponentProps<"div"> & {
  render?: (props: React.HTMLAttributes<HTMLElement>) => React.ReactNode
}) {
  if (render) {
    const renderProps = {
      "data-slot": "button-group-text",
      className: cn(
        "flex items-center gap-(--density-8) rounded-lg border border-border bg-hover px-(--density-12) text-(length:--density-text-13) font-medium text-muted-foreground [&_svg]:pointer-events-none [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      ),
      ...props,
    }

    return render(renderProps)
  }

  return (
    <div
      data-slot="button-group-text"
      className={cn(
        "flex items-center gap-(--density-8) rounded-lg border border-border bg-hover px-(--density-12) text-(length:--density-text-13) font-medium text-muted-foreground [&_svg]:pointer-events-none [&_svg]:stroke-[1.5] [&_svg:not([class*='size-'])]:size-(--density-icon-16)",
        className
      )}
      {...props}
    />
  )
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-border data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className
      )}
      {...props}
    />
  )
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
