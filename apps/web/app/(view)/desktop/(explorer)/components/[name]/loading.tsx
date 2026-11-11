import { Skeleton } from "@/styles/base-fabricator/ui/skeleton"

export default function DesktopComponentLoading() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading component documentation</span>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
