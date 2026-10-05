import { cn } from "@/lib/utils"

// A bordered stage for the live demos on the Foundations pages.
export function DemoFrame({
  className,
  caption,
  children,
  ...props
}: React.ComponentProps<"div"> & { caption?: React.ReactNode }) {
  return (
    <figure className="not-typeset my-6 flex flex-col overflow-hidden rounded-xl border bg-background">
      <div
        className={cn(
          "flex min-h-56 flex-wrap items-center justify-center gap-8 p-6 sm:p-10",
          className
        )}
        {...props}
      >
        {children}
      </div>
      {caption ? (
        <figcaption className="border-t px-4 py-3 text-[13px] text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  )
}

// A labelled column inside a DemoFrame, for side-by-side comparisons.
export function DemoColumn({
  label,
  note,
  className,
  children,
}: {
  label: React.ReactNode
  note?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex w-52 flex-col gap-3", className)}>
      {children}
      <div className="flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        {note ? (
          <span className="text-[12px] text-muted-foreground">{note}</span>
        ) : null}
      </div>
    </div>
  )
}
