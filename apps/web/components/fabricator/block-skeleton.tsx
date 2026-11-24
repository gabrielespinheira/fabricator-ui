import { type BlockLayout } from "@/lib/block-page"
import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"

// What a block preview shows while its page loads: one quiet block per region
// of the page it will become. It sits in the frame's own box, so its container
// queries see the page's size (1280px wide in a scaled frame) and follow the
// breakpoints of the page they stand for.
export function BlockSkeleton({ layout }: { layout: BlockLayout }) {
  switch (layout) {
    case "app":
      return <AppSkeleton />
    case "auth":
      return <AuthSkeleton />
    case "onboarding":
      return <OnboardingSkeleton />
  }
}

// The inset App Shell: its frame's colour (app-shell.css), a 256px sidebar on
// it, and from 768px the main column as a card 8px from the window's edges.
function AppSkeleton() {
  return (
    <div className="@container/block-skeleton flex size-full bg-[color-mix(in_oklab,var(--surface-1),black_4%)] dark:bg-[color-mix(in_oklab,var(--surface-1),black_22%)]">
      <div className="hidden w-64 shrink-0 p-2 @3xl/block-skeleton:block">
        <Skeleton className="size-full rounded-xl" />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden bg-surface-1 @3xl/block-skeleton:my-2 @3xl/block-skeleton:me-2 @3xl/block-skeleton:rounded-xl @3xl/block-skeleton:shadow-surface-2">
        <Skeleton className="size-full rounded-none" />
      </div>
    </div>
  )
}

// The auth blocks' 384px column, under their 64px header and a share of the
// window's height.
function AuthSkeleton() {
  return (
    <div className="[container-type:size] size-full overflow-hidden bg-surface-0">
      <div className="px-4 pt-21 @min-[40rem]:pt-[calc(4rem+clamp(1.5rem,16cqh,12rem))]">
        <Skeleton className="mx-auto h-96 w-full max-w-96 rounded-xl" />
      </div>
    </div>
  )
}

// The questions, and from 768px the preview that follows the answers.
function OnboardingSkeleton() {
  return (
    <div className="@container/block-skeleton flex size-full gap-4 bg-surface-0 px-4 pt-14 pb-4">
      <div className="min-w-0 flex-1 @3xl/block-skeleton:max-w-md @3xl/block-skeleton:px-6 @3xl/block-skeleton:py-10">
        <Skeleton className="size-full rounded-xl" />
      </div>
      <div className="hidden min-w-0 flex-1 @3xl/block-skeleton:block">
        <Skeleton className="size-full rounded-xl" />
      </div>
    </div>
  )
}
