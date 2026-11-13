import { Rating } from "@/styles/radix-fabricator/ui/rating"

export function RatingDemo() {
  return (
    <Rating defaultValue={3.5} step={0.5} size="lg" aria-label="Your rating" />
  )
}
