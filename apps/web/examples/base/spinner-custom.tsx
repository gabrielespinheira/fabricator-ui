import { Spinner } from "@/styles/base-fabricator/ui/spinner"

export function SpinnerCustom() {
  return (
    <div className="flex items-center gap-8">
      <Spinner
        variant="ripple"
        speed={0.6}
        className="size-8"
        aria-label="Slow ripple"
      />
      <Spinner variant="ripple" className="size-8" aria-label="Normal ripple" />
      <Spinner
        variant="ripple"
        speed={1.5}
        className="size-8"
        aria-label="Fast ripple"
      />
      <Spinner
        variant="ripple"
        animated={false}
        className="size-8"
        aria-label="Paused ripple"
      />
    </div>
  )
}
