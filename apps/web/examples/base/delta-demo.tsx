import { Delta } from "@/styles/base-fabricator/ui/delta"

// Up is good for revenue and bad for churn; rates change in points; no change
// is an outline; a missing comparison says so.
export function DeltaDemo() {
  return (
    <div className="flex flex-wrap items-center gap-(--density-8)">
      <Delta change={12.4} />
      <Delta change={-3.1} />
      <Delta change={-0.4} isGoodWhenUp={false} unit="pt" />
      <Delta change={2.1} isGoodWhenUp={false} />
      <Delta change={0} />
      <Delta change={null} />
    </div>
  )
}
