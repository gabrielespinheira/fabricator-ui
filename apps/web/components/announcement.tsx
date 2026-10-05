import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

export function Announcement() {
  return (
    <Link
      href="/docs/changelog"
      className="flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium text-foreground transition-colors duration-80 ease-spring outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-focus-ring [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
    >
      Now with Fluid Hover <ArrowRightIcon />
    </Link>
  )
}
