import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"

const LOADERS = [
  { name: "skeleton", label: "Skeleton" },
  { name: "blueprint", label: "Blueprint" },
] as const

// A form card loading: the base components (avatar, lines of text, an input,
// two buttons) and one content block. With the blueprint loader the
// components are traced and the block, which is layout, stays calm.
export function SkeletonLoader() {
  return (
    <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
      {LOADERS.map(({ name, label }) => (
        <div key={name} data-loader={name} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="flex flex-col gap-4 rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-9 w-full" />
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
