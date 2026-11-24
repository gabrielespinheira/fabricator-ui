import {
  getReadyAction,
  getReviewRows,
  type OnboardingAnswers,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** The end: what exists now, and the one thing to do next. */
export function OnboardingStepReady({
  answers,
  onStart,
}: {
  answers: OnboardingAnswers
  onStart: () => void
}) {
  const action = getReadyAction(answers)
  return (
    <div className="flex flex-col gap-(--density-24)">
      <ul className="flex flex-col gap-(--density-12)">
        {getReviewRows(answers).map((row) => (
          <li key={row.step} className="flex items-start gap-(--density-10)">
            <IconPlaceholder
              lucide="CircleCheckIcon"
              tabler="IconCircleCheck"
              hugeicons="CheckmarkCircle02Icon"
              phosphor="CheckCircleIcon"
              remixicon="RiCheckboxCircleLine"
              className="mt-0.5 size-(--density-icon-16) shrink-0 text-success"
            />
            <span className="flex min-w-0 flex-col">
              {row.label}
              <span className="text-(length:--density-text-12) break-words text-muted-foreground">
                {row.value}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-(--density-8)">
        <Button className="w-full" onClick={onStart}>
          {action.label}
          <IconPlaceholder
            lucide="ArrowRightIcon"
            tabler="IconArrowRight"
            hugeicons="ArrowRight02Icon"
            phosphor="ArrowRightIcon"
            remixicon="RiArrowRightLine"
            data-icon="inline-end"
          />
        </Button>
        <p className="text-center text-(length:--density-text-12) text-pretty text-muted-foreground">
          {action.detail}
        </p>
      </div>
    </div>
  )
}
