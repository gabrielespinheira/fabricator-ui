import { Rating } from "@/styles/aria-fabricator/ui/rating"

export function RatingDemo() {
  return (
    <Rating defaultValue={3.5} step={0.5} size="lg" aria-label="Your rating" />
  )
}
