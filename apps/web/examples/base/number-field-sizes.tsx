import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"

export function NumberFieldSizes() {
  return (
    <div className="flex w-full max-w-40 flex-col gap-4">
      <NumberField defaultValue={1} className="density-compact">
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label="Compact" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <NumberField defaultValue={2}>
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label="Default" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <NumberField defaultValue={3} className="density-spacious">
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput aria-label="Spacious" />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </div>
  )
}
