import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/radix-fabricator/ui/number-field"

export function NumberFieldBasic() {
  return (
    <NumberField defaultValue={0} className="max-w-40">
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput aria-label="Guests" />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  )
}
