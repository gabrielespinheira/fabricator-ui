import { TimeInput } from "@/styles/aria-fabricator/ui/time-input"

export function TimeInputDemo() {
  return (
    <TimeInput
      aria-label="Start time"
      placeholder="Pick or type a time"
      className="max-w-48"
    />
  )
}
