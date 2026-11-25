import { cn } from "cn"

/** One mark per seat: taken, taken by this invitation, past the plan, free. */
export function MembersSeatStrip({
  used,
  filled,
  over,
  total,
  className,
}: {
  used: number
  filled: number
  over: number
  total: number
  className?: string
}) {
  const free = Math.max(0, total - used - filled)
  const marks = [
    ...Array.from({ length: used }, () => "bg-foreground/60"),
    ...Array.from({ length: filled }, () => "bg-info"),
    ...Array.from({ length: over }, () => "bg-warning"),
    ...Array.from({ length: free }, () => "bg-foreground/15"),
  ]
  return (
    <div
      role="img"
      aria-label={`${used} seats taken, ${filled} by this invitation, ${free} free${over > 0 ? `, ${over} more than the plan has` : ""}`}
      className={cn("flex gap-(--density-4)", className)}
    >
      {marks.map((mark, index) => (
        <span
          key={index}
          className={cn(
            "h-(--density-6) min-w-0 flex-1 rounded-full transition-colors duration-feedback ease-feedback",
            mark
          )}
        />
      ))}
    </div>
  )
}
