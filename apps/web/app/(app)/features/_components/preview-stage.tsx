import { cn } from "@/lib/utils"

// The inset stage every feature preview sits on: level 2, so the surfaces
// inside it lift on their own shadow. Caption and controls sit under it.
export function PreviewStage({
  caption,
  controls,
  className,
  children,
}: {
  caption?: React.ReactNode
  controls?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <figure className="flex flex-col overflow-hidden rounded-3xl bg-surface-2 shadow-surface-2">
      <div
        className={cn(
          "relative flex min-h-[26rem] flex-1 items-center justify-center p-6 sm:p-10",
          className
        )}
      >
        {children}
      </div>
      {caption || controls ? (
        <figcaption className="flex flex-col gap-3 px-6 pb-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className="text-pretty">{caption}</span>
          {controls ? (
            <span className="flex shrink-0 flex-wrap items-center gap-3">
              {controls}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  )
}

// A label under a column of the preview, for side-by-side comparisons.
export function PreviewColumn({
  label,
  note,
  className,
  children,
}: {
  label: React.ReactNode
  note: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {children}
      <div className="flex flex-col gap-0.5 px-1">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="text-[12px] text-muted-foreground">{note}</span>
      </div>
    </div>
  )
}
