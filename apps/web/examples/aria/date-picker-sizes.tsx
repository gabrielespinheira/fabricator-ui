import { DatePicker } from "@/styles/aria-fabricator/ui/date-picker"

export function DatePickerSizes() {
  return (
    <div className="flex w-full max-w-64 flex-col gap-4">
      <DatePicker
        aria-label="Compact date"
        className="density-compact"
        defaultValue={new Date(2026, 10, 12)}
      />
      <DatePicker aria-label="Date" defaultValue={new Date(2026, 10, 12)} />
      <DatePicker
        aria-label="Spacious date"
        className="density-spacious"
        defaultValue={new Date(2026, 10, 12)}
      />
    </div>
  )
}
