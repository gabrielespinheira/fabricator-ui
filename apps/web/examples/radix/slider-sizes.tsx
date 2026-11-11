import { Slider } from "@/styles/radix-fabricator/ui/slider"

export function SliderSizes() {
  return (
    <div className="mx-auto grid w-full max-w-xs gap-8">
      <Slider aria-label="Small" size="sm" defaultValue={[25]} max={100} />
      <Slider aria-label="Default" defaultValue={[50]} max={100} />
      <Slider aria-label="Large" size="lg" defaultValue={[75]} max={100} />
    </div>
  )
}
