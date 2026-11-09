import { DatePicker } from "@/styles/radix-fabricator/ui/date-picker"

export function DatePickerEditable() {
  return (
    <DatePicker
      aria-label="Due date"
      editable
      placeholder="Type or pick a date"
      className="max-w-56"
    />
  )
}
