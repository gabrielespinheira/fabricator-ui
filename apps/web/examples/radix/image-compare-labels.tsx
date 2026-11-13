import { ImageCompare } from "@/styles/radix-fabricator/ui/image-compare"

export function ImageCompareLabels() {
  return (
    <ImageCompare
      beforeSrc="/media/image-compare-before.webp"
      afterSrc="/media/image-compare-after.webp"
      beforeAlt="A fishing village on a rocky coast at sunset, straight from the camera"
      afterAlt="The same village after a warm colour grade"
      beforeLabel="Raw"
      afterLabel="Graded"
      defaultValue={30}
      className="aspect-4/5 w-full max-w-xs rounded-3xl"
    />
  )
}
