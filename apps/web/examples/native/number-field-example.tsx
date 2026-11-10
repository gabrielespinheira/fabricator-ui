import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/native/ui/number-field"

function NumberFieldExample() {
  return (
    <ExampleWrapper fit>
      <Example title="Stepper">
        <NumberField defaultValue={3} min={0} max={10}>
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput accessibilityLabel="Quantity" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Example>
      <Example title="Currency and fractional steps">
        <NumberField
          defaultValue={19.95}
          min={0}
          step={0.05}
          format={{ style: "currency", currency: "EUR" }}
        >
          <NumberFieldGroup>
            <NumberFieldInput accessibilityLabel="Price" />
            <NumberFieldDecrement align="inline-end" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Example>
      <Example title="Disabled and read only">
        <View className="w-full gap-4">
          {[true, false].map((disabled) => (
            <NumberField
              key={String(disabled)}
              defaultValue={5}
              disabled={disabled}
              readOnly={!disabled}
            >
              <NumberFieldGroup>
                <NumberFieldDecrement />
                <NumberFieldInput
                  accessibilityLabel={
                    disabled ? "Disabled quantity" : "Read only quantity"
                  }
                />
                <NumberFieldIncrement />
              </NumberFieldGroup>
            </NumberField>
          ))}
        </View>
      </Example>
    </ExampleWrapper>
  )
}
export { NumberFieldExample }
