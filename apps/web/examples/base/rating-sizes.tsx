import { Rating } from "@/styles/base-fabricator/ui/rating"

export function RatingSizes() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Rating size="sm" defaultValue={4} aria-label="Small rating" />
      <Rating defaultValue={4} aria-label="Default rating" />
      <Rating size="lg" defaultValue={4} aria-label="Large rating" />
    </div>
  )
}
