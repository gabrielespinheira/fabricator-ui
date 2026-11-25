import { OnboardingChoiceCards } from "@/registry/bases/__base__/blocks/onboarding-01/components/onboarding-controls"
import {
  isOnboardingUse,
  withUse,
  type OnboardingAnswers,
  type OnboardingUse,
} from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import {
  FieldDescription,
  FieldTitle,
} from "@/registry/bases/__base__/ui/field"
import { Kbd } from "@/registry/bases/__base__/ui/kbd"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const OPTIONS: {
  value: OnboardingUse
  title: string
  consequence: string
  icon: React.ReactNode
}[] = [
  {
    value: "projects",
    title: "Plan and ship work",
    consequence: "Starts with projects, owners and dates.",
    icon: (
      <IconPlaceholder
        lucide="SquareCheckIcon"
        tabler="IconSquareCheck"
        hugeicons="CheckmarkSquare02Icon"
        phosphor="CheckSquareIcon"
        remixicon="RiCheckboxLine"
      />
    ),
  },
  {
    value: "customers",
    title: "Look after customers",
    consequence: "Starts with a pipeline and owners.",
    icon: (
      <IconPlaceholder
        lucide="UsersIcon"
        tabler="IconUsers"
        hugeicons="UserGroupIcon"
        phosphor="UsersIcon"
        remixicon="RiGroupLine"
      />
    ),
  },
  {
    value: "reports",
    title: "Follow the numbers",
    consequence: "Starts with charts that update every hour.",
    icon: (
      <IconPlaceholder
        lucide="ChartLineIcon"
        tabler="IconChartLine"
        hugeicons="Chart03Icon"
        phosphor="ChartLineIcon"
        remixicon="RiLineChartLine"
      />
    ),
  },
]

/** The use behind the keys 1 to 3. */
export const ONBOARDING_USE_KEYS = OPTIONS.map(({ value }) => value)

/** What the workspace is for. It decides every step after this one. */
export function OnboardingStepUse({
  labelledBy,
  answers,
  onChange,
}: {
  labelledBy: string
  answers: OnboardingAnswers
  onChange: (answers: OnboardingAnswers) => void
}) {
  return (
    <OnboardingChoiceCards
      labelledBy={labelledBy}
      value={answers.use}
      onValueChange={(use) => {
        if (isOnboardingUse(use)) onChange(withUse(answers, use))
      }}
      options={OPTIONS.map((option, index) => ({
        value: option.value,
        content: (
          <span className="flex items-start gap-(--density-12)">
            <span className="mt-0.5 shrink-0 text-muted-foreground [&>svg]:size-(--density-icon-16)">
              {option.icon}
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <FieldTitle>{option.title}</FieldTitle>
              <FieldDescription className="text-foreground/70">
                {option.consequence}
              </FieldDescription>
            </span>
            <Kbd className="pointer-coarse:hidden">{index + 1}</Kbd>
          </span>
        ),
      }))}
    />
  )
}
