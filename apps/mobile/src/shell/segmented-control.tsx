import { type ViewStyle } from "react-native"

import { Tabs, TabsList, TabsTrigger } from "@/registry/native/ui/tabs"

/**
 * One choice of a few: Fabricator's tab track, as the panel's tabs use it. It's the
 * library's Tabs, so its selection slides and a finger can drag along it.
 */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
  style,
}: {
  label: string
  options: readonly { value: Value; label: string }[]
  value: Value | null
  onChange: (value: Value) => void
  style?: ViewStyle
}) {
  return (
    <Tabs
      value={value ?? ""}
      onValueChange={(next) => {
        const picked = options.find((option) => option.value === next)
        if (picked) onChange(picked.value)
      }}
    >
      <TabsList
        accessibilityLabel={label}
        className="self-stretch"
        style={style}
      >
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            accessibilityLabel={`${label}: ${option.label}`}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
