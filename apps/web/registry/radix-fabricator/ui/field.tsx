"use client"

import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { Label } from "@/registry/radix-fabricator/ui/label"
import { Separator } from "@/registry/radix-fabricator/ui/separator"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-(--density-16) has-[>[data-slot=checkbox-group]]:gap-(--density-12) has-[>[data-slot=radio-group]]:gap-(--density-12)",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 font-medium text-foreground data-[variant=label]:text-(length:--density-text-13) data-[variant=legend]:text-(length:--density-text-14)",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-(--density-20) data-[slot=checkbox-group]:gap-(--density-16) *:data-[slot=field-group]:gap-(--density-16)",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field flex w-full gap-(--density-6) has-[>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch])]:gap-(--density-10) data-[invalid=true]:text-destructive-text",
  {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  }
)

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-0.5 leading-snug [[data-slot=field]:has(>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch]))>&]:relative",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-(--density-8) text-(length:--density-text-13) leading-snug group-data-[disabled=true]/field:opacity-50 group-data-[invalid=true]/field:text-destructive-text in-[[data-slot=field]:has(>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch]))>[data-slot=field-content]]:after:absolute in-[[data-slot=field]:has(>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch]))>[data-slot=field-content]]:after:inset-x-0 in-[[data-slot=field]:has(>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch]))>[data-slot=field-content]]:after:-inset-y-(--density-10) in-[[data-slot=field]:has([data-slot=checkbox],[data-slot=switch],[data-slot=radio-group-item])]:cursor-pointer has-data-checked:bg-active has-[[data-slot=checkbox],[data-slot=switch],[data-slot=radio-group-item]]:cursor-pointer has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:ring-1 has-[>[data-slot=field]]:ring-border has-[>[data-slot=field]]:transition-[background-color,box-shadow] has-[>[data-slot=field]]:duration-feedback has-[>[data-slot=field]]:ease-feedback has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-hover has-[>[data-slot=field]]:has-data-checked:ring-foreground/20 has-[>[data-slot=field]]:has-data-checked:hover:bg-active has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring *:data-[slot=field]:p-(--density-12) dark:has-data-checked:bg-active [[data-slot=checkbox]~&]:cursor-pointer [[data-slot=field]:has(>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch]))>&]:-my-(--density-10) [[data-slot=field]:has(>:is([data-slot=checkbox],[data-slot=radio-group-item],[data-slot=switch]))>&]:py-(--density-10) [[data-slot=radio-group-item]~&]:cursor-pointer [[data-slot=switch]~&]:cursor-pointer",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-(--density-8) text-(length:--density-text-13) leading-snug font-medium text-foreground group-data-[disabled=true]/field:opacity-50 group-data-[invalid=true]/field:text-destructive-text",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-left text-(length:--density-text-12) leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [&_a]:relative [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-(--density-20) text-(length:--density-text-12) group-data-[variant=outline]/field-group:-mb-2",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-(--density-8) text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn(
        "text-(length:--density-text-12) font-normal text-destructive-text",
        className
      )}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
