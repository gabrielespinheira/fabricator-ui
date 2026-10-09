import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Badge } from "@/styles/aria-fabricator/ui/badge"

export default function BadgeStatus() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Badge variant="info">
        <InfoIcon data-icon="inline-start" />
        Info
      </Badge>
      <Badge variant="success">
        <CircleCheckIcon data-icon="inline-start" />
        Success
      </Badge>
      <Badge variant="warning">
        <TriangleAlertIcon data-icon="inline-start" />
        Warning
      </Badge>
      <Badge variant="error">
        <CircleAlertIcon data-icon="inline-start" />
        Error
      </Badge>
    </div>
  )
}
