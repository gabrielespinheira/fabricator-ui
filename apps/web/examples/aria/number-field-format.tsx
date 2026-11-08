import { Field, FieldLabel } from "@/styles/aria-fabricator/ui/field"
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/styles/aria-fabricator/ui/number-field"

export function NumberFieldFormat() {
  return (
    <div className="flex w-full max-w-48 flex-col gap-6">
      <Field>
        <NumberField
          defaultValue={49}
          minValue={0}
          step={0.5}
          formatOptions={{ style: "currency", currency: "USD" }}
        >
          <FieldLabel>Price</FieldLabel>
          <NumberFieldGroup>
            <NumberFieldInput />
            <NumberFieldDecrement align="inline-end" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <NumberField
          defaultValue={0.15}
          minValue={0}
          maxValue={1}
          step={0.05}
          formatOptions={{ style: "percent" }}
        >
          <FieldLabel>Discount</FieldLabel>
          <NumberFieldGroup>
            <NumberFieldInput />
            <NumberFieldDecrement align="inline-end" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Field>
      <Field>
        <NumberField
          defaultValue={5}
          minValue={0}
          formatOptions={{
            style: "unit",
            unit: "kilometer",
            unitDisplay: "short",
          }}
        >
          <FieldLabel>Distance</FieldLabel>
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
