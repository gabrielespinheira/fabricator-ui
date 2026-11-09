import Image from "next/image"

import { AspectRatio } from "@/styles/aria-nova/ui/aspect-ratio"

export function AspectRatioPortrait() {
  return (
    <AspectRatio
      ratio={9 / 16}
      className="w-full max-w-[10rem] overflow-hidden rounded-xl bg-muted"
    >
      <Image
        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&auto=format&fit=crop&q=80"
        alt="A rowing boat on a turquoise mountain lake"
        fill
        sizes="160px"
        className="object-cover"
      />
    </AspectRatio>
  )
}
