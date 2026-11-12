import { Rating } from "@/styles/aria-fabricator/ui/rating"

export function RatingReadOnly() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium tabular-nums">4.3</span>
      <Rating value={4.3} readOnly size="sm" aria-label="Average rating" />
      <span className="text-sm text-muted-foreground">1,284 reviews</span>
    </div>
  )
}
