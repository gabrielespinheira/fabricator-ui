import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Alert, AlertTitle } from "@/styles/radix-fabricator/ui/alert"

const STATUSES = [
  { variant: "default", title: "Default", Icon: InfoIcon },
  { variant: "info", title: "Info", Icon: InfoIcon },
  { variant: "success", title: "Success", Icon: CircleCheckIcon },
  { variant: "warning", title: "Warning", Icon: TriangleAlertIcon },
  { variant: "error", title: "Error", Icon: CircleAlertIcon },
] as const

export default function AlertStatus() {
  return (
    <div className="grid w-full max-w-xl gap-x-4 gap-y-2 sm:grid-cols-2">
      {(["low", "high"] as const).map((contrast) => (
        <div key={contrast} className="flex flex-col gap-2">
          <p className="px-1 text-xs text-muted-foreground capitalize">
            {contrast} contrast
          </p>
          {STATUSES.map(({ variant, title, Icon }) => (
            <Alert key={variant} variant={variant} contrast={contrast}>
              <Icon />
              <AlertTitle>{title}</AlertTitle>
            </Alert>
          ))}
        </div>
      ))}
    </div>
  )
}
