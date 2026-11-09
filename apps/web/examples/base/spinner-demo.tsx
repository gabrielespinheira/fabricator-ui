import { SPINNERS } from "@/styles/base-fabricator/lib/spinner-model"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"

export function SpinnerDemo() {
  return (
    <div className="grid w-full max-w-xl grid-cols-3 gap-x-8 gap-y-8 py-6 sm:grid-cols-4">
      {SPINNERS.map(({ value: variant, label }) => (
        <div key={variant} className="flex flex-col items-center gap-3">
          <Spinner
            variant={variant}
            className="size-8"
            aria-label={`${variant} loading animation`}
          />
          <span className="text-sm text-muted-foreground capitalize">
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
