import { Field, FieldLabel } from "@/styles/base-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/base-fabricator/ui/number-field"

export function NumberFieldFormat() {
  return (
    <div className="flex w-full max-w-48 flex-col gap-6">
      <Field>
        <FieldLabel htmlFor="number-field-format-price">Price</FieldLabel>
        <NumberField
          id="number-field-format-price"
          defaultValue={49}
          min={0}
          step={0.5}
          format={{ style: "currency", currency: "USD" }}
        >
          <NumberFieldGroup>
            <NumberFieldInput />
            <NumberFieldDecrement align="inline-end" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <FieldLabel htmlFor="number-field-format-discount">Discount</FieldLabel>
        <NumberField
          id="number-field-format-discount"
          defaultValue={0.15}
          min={0}
          max={1}
          step={0.05}
          format={{ style: "percent" }}
        >
          <NumberFieldGroup>
            <NumberFieldInput />
            <NumberFieldDecrement align="inline-end" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <FieldLabel htmlFor="number-field-format-distance">Distance</FieldLabel>
        <NumberField
          id="number-field-format-distance"
          defaultValue={5}
          min={0}
          format={{ style: "unit", unit: "kilometer", unitDisplay: "short" }}
        >
          <NumberFieldGroup>
            <NumberFieldInput />
            <NumberFieldDecrement align="inline-end" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
    </div>
  )
}
