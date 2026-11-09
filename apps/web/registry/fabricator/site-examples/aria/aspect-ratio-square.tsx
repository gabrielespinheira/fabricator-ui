import Image from "next/image"

import { AspectRatio } from "@/styles/aria-nova/ui/aspect-ratio"

export function AspectRatioSquare() {
  return (
    <AspectRatio
      ratio={1 / 1}
      className="w-full max-w-[12rem] overflow-hidden rounded-xl bg-muted"
    >
      <Image
        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80"
        alt="A rowing boat on a turquoise mountain lake"
        fill
        sizes="192px"
        className="object-cover"
      />
    </AspectRatio>
  )
}
