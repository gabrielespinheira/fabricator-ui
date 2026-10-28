import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { siteConfig } from "@/lib/config"
import { Badge } from "@/styles/base-fabricator/ui/badge"

export function Announcement() {
  return (
    <Badge variant="outline" render={<Link href="/docs/changelog" />}>
      v{siteConfig.version}
      <ArrowRightIcon data-icon="inline-end" />
    </Badge>
  )
}
