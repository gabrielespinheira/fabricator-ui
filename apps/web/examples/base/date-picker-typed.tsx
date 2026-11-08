import { DatePicker } from "@/styles/base-fabricator/ui/date-picker"

export function DatePickerTyped() {
  return (
    <DatePicker
      aria-label="Due date"
      placeholder="Pick or type a date"
      className="max-w-56"
    />
  )
}
