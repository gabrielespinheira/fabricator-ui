import Link from "next/link"

import { siteConfig } from "@/lib/config"
import { Badge } from "@/styles/base-fabricator/ui/badge"

export function Announcement() {
  return (
    <Badge
      variant="secondary"
      className="rounded-full text-muted-foreground tabular-nums [a]:hover:text-foreground"
      render={<Link href="/docs/changelog" />}
    >
      v{siteConfig.version}
    </Badge>
  )
}
