import { Slider } from "@/styles/aria-fabricator/ui/slider"

export function SliderSizes() {
  return (
    <div className="mx-auto grid w-full max-w-xs gap-8">
      <Slider aria-label="Small" size="sm" defaultValue={25} />
      <Slider aria-label="Default" defaultValue={50} />
      <Slider aria-label="Large" size="lg" defaultValue={75} />
    </div>
  )
}
