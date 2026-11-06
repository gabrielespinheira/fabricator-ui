import type { PlanStep } from "@fabricator-ui/setup"

/** What the command does, one line per step. */
export function PlanList({ steps }: { steps: PlanStep[] }) {
  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <li key={step.id} className="flex gap-3">
          <span
            aria-hidden
            className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium tabular-nums"
          >
            {index + 1}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-sm font-medium">{step.title}</h3>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {step.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
