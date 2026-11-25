import { type OnboardingStep } from "@/registry/bases/__base__/blocks/onboarding-01/lib/onboarding-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import { Progress } from "@/registry/bases/__base__/ui/progress"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** Where you are and the way out, and nothing else. */
export function OnboardingTopBar({
  step,
  position,
  onExit,
}: {
  step: OnboardingStep
  position: { index: number; count: number }
  onExit: () => void
}) {
  const isDone = step === "ready"
  return (
    <header className="flex h-14 shrink-0 items-center gap-(--density-16) px-(--density-16) md:px-(--density-24)">
      <a
        href="/"
        aria-label="Home"
        className="flex size-(--density-32) shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconPlaceholder
          lucide="GalleryVerticalEndIcon"
          tabler="IconLayoutRows"
          hugeicons="LayoutBottomIcon"
          phosphor="RowsIcon"
          remixicon="RiGalleryLine"
          className="size-(--density-icon-16)"
        />
      </a>
      <Progress
        value={isDone ? 100 : (position.index / (position.count + 1)) * 100}
        aria-label="Set up"
        className="w-full max-w-40"
      />
      <span
        aria-live="polite"
        className="shrink-0 text-(length:--density-text-12) text-muted-foreground tabular-nums"
      >
        {isDone ? "Done" : `${position.index} of ${position.count}`}
      </span>
      {!isDone && (
        <Button
          variant="ghost"
          size="sm"
          className="ms-auto -me-3"
          onClick={onExit}
        >
          Save and exit
        </Button>
      )}
    </header>
  )
}
