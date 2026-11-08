import { TimeInput } from "@/styles/radix-fabricator/ui/time-input"

export function TimeInputDemo() {
  return (
    <TimeInput
      aria-label="Start time"
      hasSeconds
      placeholder="Pick or type a time"
      className="max-w-48"
    />
  )
}
