import { ImageCompare } from "@/styles/radix-fabricator/ui/image-compare"

export function ImageCompareDisabled() {
  return (
    <ImageCompare
      beforeSrc="/media/image-compare-before.webp"
      afterSrc="/media/image-compare-after.webp"
      beforeAlt="A fishing village on a rocky coast at sunset, straight from the camera"
      afterAlt="The same village after a warm colour grade"
      defaultValue={40}
      disabled
      className="w-full max-w-xl"
    />
  )
}
