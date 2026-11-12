import { Rating } from "@/styles/radix-fabricator/ui/rating"

const variants = [
  { variant: "default", label: "Default" },
  { variant: "primary", label: "Primary" },
  { variant: "info", label: "Info" },
  { variant: "success", label: "Success" },
  { variant: "warning", label: "Warning" },
  { variant: "error", label: "Error" },
] as const

export function RatingVariants() {
  return (
    <div className="grid w-fit grid-cols-[auto_auto] items-center gap-x-6 gap-y-3">
      {variants.map(({ variant, label }) => (
        <div key={variant} className="contents">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Rating
            variant={variant}
            defaultValue={3.5}
            step={0.5}
            aria-label={`${label} rating`}
          />
        </div>
      ))}
    </div>
  )
}
