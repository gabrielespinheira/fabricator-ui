import { type AuthShape, type BlockLayout } from "@/lib/block-page"
import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"

// What a block preview shows while its page loads: the outline of the page
// it will become, so nothing jumps when the page fades in. It sits in the
// frame's own box, so its container queries see the page's width (1280px
// in a scaled frame) and follow the App Shell's 768px breakpoint.
export function BlockSkeleton({ layout }: { layout: BlockLayout }) {
  return layout.kind === "auth" ? (
    <AuthSkeleton shape={layout} />
  ) : (
    <AppSkeleton />
  )
}

const NAV_WIDTHS = ["w-20", "w-28", "w-24", "w-16", "w-24", "w-20"]

function AppSkeleton() {
  return (
    // The App Shell's frame colour, from app-shell.css.
    <div className="@container/block-skeleton flex size-full bg-[color-mix(in_oklab,var(--surface-1),black_4%)] dark:bg-[color-mix(in_oklab,var(--surface-1),black_22%)]">
      <div className="hidden w-64 shrink-0 flex-col gap-6 p-4 @3xl/block-skeleton:flex">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="flex flex-col gap-4 px-1">
          {NAV_WIDTHS.map((width, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-sm" />
              <Skeleton className={`h-3 ${width}`} />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      </div>
      {/* The inset main column: a card on the frame from 768px. */}
      <div className="@container/block-skeleton-main flex min-w-0 flex-1 flex-col overflow-hidden bg-surface-1 @3xl/block-skeleton:my-2 @3xl/block-skeleton:me-2 @3xl/block-skeleton:rounded-xl @3xl/block-skeleton:shadow-surface-2">
        <div className="flex h-12 shrink-0 items-center justify-between px-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="flex flex-col gap-6 px-6 pt-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
          </div>
          {/* Like the blocks' grids, by the column's width (896px). */}
          <div className="grid grid-cols-2 gap-4 @4xl/block-skeleton-main:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// The auth blocks' column: the same order and gaps (24px between parts,
// 20px between fields), so it has the page's height.
function AuthSkeleton({ shape }: { shape: AuthShape }) {
  return (
    <div className="flex size-full flex-col items-center justify-center bg-surface-0 px-4 py-10">
      <div className="flex w-full max-w-96 flex-col items-center gap-6">
        <Skeleton className="size-10 rounded-xl" />
        {shape.hasSteps && <Skeleton className="h-3 w-20" />}
        <div className="flex w-full flex-col items-center gap-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        {shape.hasProviders && (
          <>
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <Skeleton className="h-3 w-32" />
          </>
        )}
        <div className="flex w-full flex-col gap-5">
          {Array.from({ length: shape.fields }, (_, index) => (
            <div key={index} className="flex w-full flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <Skeleton className="h-3.5 w-48" />
      </div>
      {shape.hasProviders && (
        <div className="mt-10 flex flex-col items-center gap-1.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
      )}
    </div>
  )
}
