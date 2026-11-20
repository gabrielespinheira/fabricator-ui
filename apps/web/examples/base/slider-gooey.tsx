import { Slider } from "@/styles/base-fabricator/ui/slider"

export function SliderGooey() {
  return (
    <Slider
      aria-label="Volume"
      defaultValue={[45]}
      gooey={{ effect: "bend", intensity: 1, waviness: 0.6 }}
      className="mx-auto w-full max-w-xs"
    />
  )
}
