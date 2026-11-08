import { MonthInput } from "@/styles/aria-fabricator/ui/month-input"

export function MonthInputDemo() {
  return (
    <MonthInput
      aria-label="Billing month"
      placeholder="Pick or type a month"
      className="max-w-52"
    />
  )
}
